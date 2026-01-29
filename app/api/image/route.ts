import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { GoogleGenAI } from "@google/genai";
import { HistoryItem, HistoryPart } from "@/lib/types";

// Initialize the Google AI Studio client through Cloudflare AI Gateway
const GOOGLE_AI_STUDIO_TOKEN = process.env.GOOGLE_AI_STUDIO_TOKEN || process.env.GEMINI_API_KEY || "";
// const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || process.env.CF_AIG_ACCOUNT_ID || "";
// const CF_GATEWAY_NAME = process.env.CF_GATEWAY_NAME || process.env.CF_AIG_GATEWAY || "";
// const CF_AIG_TOKEN = process.env.CF_AIG_TOKEN || "";

// Global rate limiter (Vercel 官方推荐：Upstash Ratelimit + Vercel KV)
// 默认：每分钟 10 次，可通过环境变量覆盖
const RL_LIMIT = Number(process.env.RATE_LIMIT_MAX || 10);
type AllowedUnit = "ms" | "s" | "m" | "h" | "d";
type DurationString = `${number} ${AllowedUnit}` | `${number}${AllowedUnit}`;
function parseDurationEnv(value?: string | null): DurationString {
  if (!value) return "1 m";
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+)\s*(ms|s|m|h|d)$/);
  if (match) {
    return `${match[1]} ${match[2]}` as DurationString;
  }
  return "1 m";
}
const RL_WINDOW: DurationString = parseDurationEnv(process.env.RATE_LIMIT_WINDOW || null);

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(RL_LIMIT, RL_WINDOW),
  analytics: true,
});

let ai: GoogleGenAI | null = null;

function getAIClient() {
  if (ai) return ai;
  
  if (!GOOGLE_AI_STUDIO_TOKEN) {
    return null;
  }

  const options: any = {
    apiKey: GOOGLE_AI_STUDIO_TOKEN,
    vertexai: true,
  };

  // 只有在明确需要使用 Cloudflare Gateway 且确定不是 Vertex AI 时才设置 baseUrl
  // 但目前错误提示 "API keys are not supported by this API" 通常是因为被误识别为 Vertex AI
  // 或者 BaseURL 指向了错误的服务端点
  /*
  // if (CF_ACCOUNT_ID && CF_GATEWAY_NAME) {
    // 确保 URL 格式正确，Google AI Studio 的 gateway URL 格式可能有所不同
    // 这里先暂时注释掉 Cloudflare 配置，直接直连 Google，排除 Gateway 配置错误的可能性
    // options.baseUrl = `https://gateway.ai.cloudflare.com/v1/${CF_ACCOUNT_ID}/${CF_GATEWAY_NAME}/google-ai-studio`;
  // }
  */

  ai = new GoogleGenAI(options);
  return ai;
}

const MODEL_ID = "gemini-2.5-flash-image";

// Define interface for the formatted history item
interface FormattedHistoryItem {
  role: "user" | "model";
  parts: Array<{
    text?: string;
    inlineData?: { data: string; mimeType: string };
  }>;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP (优先 x-forwarded-for，其次常见代理头)
    const xff = req.headers.get("x-forwarded-for");
    const realIp =
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-client-ip") ||
      req.headers.get("fastly-client-ip") ||
      req.headers.get("fly-client-ip") ||
      req.headers.get("true-client-ip");
    const clientIp = (xff?.split(",")[0]?.trim()) || realIp || "127.0.0.1";

    const { success, limit, reset, remaining } = await ratelimit.limit(`img:${clientIp}`);
    if (!success) {
      const retryAfterSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
      return new NextResponse(
        JSON.stringify({ success: false, error: "Too many requests" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSeconds),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(Math.max(0, remaining)),
            "X-RateLimit-Reset": String(Math.floor(reset / 1000)),
          },
        }
      );
    }

    // 预先准备成功响应需要附带的限流头（可选）
    const rateLimitOkHeaders = {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(Math.max(0, remaining)),
      "X-RateLimit-Reset": String(Math.floor(reset / 1000)),
    } as Record<string, string>;

    // Make sure we have an API key configured
    if (!GOOGLE_AI_STUDIO_TOKEN) {
      console.error("GEMINI_API_KEY is not configured");
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Parse JSON request
    const requestData = await req.json().catch((err) => {
      console.error("Failed to parse JSON body:", err);
      return null;
    });
    
    if (!requestData) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { prompt, image: inputImage, history } = requestData;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "Prompt is required" },
        { status: 400 }
      );
    }

    let response;

    // Validate the image if provided
    if (inputImage) {
      if (typeof inputImage !== "string" || !inputImage.startsWith("data:")) {
        console.error("Invalid image data URL format", { inputImage });
        return NextResponse.json(
          { success: false, error: "Invalid image data URL format" },
          { status: 400 }
        );
      }
      const imageParts = inputImage.split(",");
      if (imageParts.length < 2) {
        console.error("Malformed image data URL", { inputImage });
        return NextResponse.json(
          { success: false, error: "Malformed image data URL" },
          { status: 400 }
        );
      }
      const base64Image = imageParts[1];
      // Check for non-empty and valid base64 (basic check)
      if (!base64Image || !/^([A-Za-z0-9+/=]+)$/.test(base64Image.replace(/\s/g, ""))) {
        console.error("Image data is empty or not valid base64", { base64Image });
        return NextResponse.json(
          { success: false, error: "Image data is empty or not valid base64" },
          { status: 400 }
        );
      }
    }

    try {
      // Convert history to the format expected by Gemini API
      const formattedHistory: FormattedHistoryItem[] =
        history && history.length > 0
          ? history
              .map((item: HistoryItem) => {
                return {
                  role: item.role,
                  parts: item.parts
                    .map((part: HistoryPart) => {
                      if (part.text && part.text.trim().length > 0) {
                        return { text: part.text };
                      }
                      if (part.image && item.role === "user") {
                        const imgParts = part.image.split(",");
                        if (imgParts.length > 1) {
                          return {
                            inlineData: {
                              data: imgParts[1],
                              mimeType: part.image.includes("image/png")
                                ? "image/png"
                                : "image/jpeg",
                            },
                          };
                        }
                      }
                      return null as unknown as { text?: string; inlineData?: { data: string; mimeType: string } };
                    })
                    .filter((part) => Boolean(part)), // Remove empty parts
                };
              })
              .filter((item: FormattedHistoryItem) => item.parts.length > 0) // Remove items with no parts
          : [];

      // Prepare the current message parts
      const messageParts: FormattedHistoryItem["parts"] = [];

      // Optimized prompt: prioritize image generation first
      const enhancedPrompt = `${prompt}

please return an image and provide helpful information in this JSON format:
{
  "designDescription": "Brief description of the pool design and key features",
  "materialSuggestions": "Recommended materials for construction",
  "costEstimate": "Estimated cost breakdown and budget considerations(just in one line but in detail)",
  "constructionTips": "Important construction notes and installation tips"
}`;

      messageParts.push({ text: enhancedPrompt });

      // Add the image if provided
      if (inputImage) {
        // For image editing
        console.log("Processing image edit request");

        // Check if the image is a valid data URL
        if (!inputImage.startsWith("data:")) {
          throw new Error("Invalid image data URL format");
        }

        const imageParts = inputImage.split(",");
        if (imageParts.length < 2) {
          throw new Error("Invalid image data URL format");
        }

        const base64Image = imageParts[1];
        const mimeType = inputImage.includes("image/png")
          ? "image/png"
          : "image/jpeg";
        console.log(
          "Base64 image length:",
          base64Image.length,
          "MIME type:",
          mimeType
        );

        // Add the image to message parts
        messageParts.push({
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        });
      }
      // Build final contents with current user message
      const contents: FormattedHistoryItem[] = [
        ...formattedHistory,
        {
          role: "user",
          parts: messageParts,
        },
      ];

      // Generate the content
      const aiClient = getAIClient();
      if (!aiClient) {
        console.error("GEMINI_API_KEY missing when getting client");
        throw new Error("GEMINI_API_KEY is not configured");
      }

      console.log("Calling Gemini API with model:", MODEL_ID);
      
      // 注意：使用 REST API 风格的调用，避免 Vertex AI 混淆
      // 如果您的 key 是 Google AI Studio 的，确保不要设置任何 vertex 相关参数
      // 强制使用 Google AI Studio 的 Endpoint
      response = await aiClient.models.generateContent({
        model: MODEL_ID,
        contents,
        config: {
          temperature: 1.2,
          topP: 0.95,
          topK: 50,
        },
      });
      console.log("Gemini API call successful");
    } catch (error) {
      console.error("Error in chat.sendMessage:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error in AI processing";
      
      // Check for common error types
      if (errorMessage.includes("403") || errorMessage.includes("permission")) {
        console.error("Permission denied error from Gemini API. Check API key and service enablement.");
      }
      
      return NextResponse.json(
        { success: false, error: "Gemini API error", details: errorMessage },
        { status: 500 }
      );
    }

    let textResponse = null;
    let imageData = null;
    let mimeType = "image/png";
    let designDetails = null;
    // console.log("Response:", JSON.stringify(response));
   
    // Process the response
    if (response && response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      const parts = candidate.content?.parts || [];
      console.log("Number of parts in response:", parts.length);

      for (const part of parts) {
        console.log("Part:", part);
        if ("inlineData" in part && part.inlineData) {
          // Get the image data
          imageData = part.inlineData.data;
          mimeType = part.inlineData.mimeType || "image/png";
          console.log(
            "Image data received, length:",
            imageData?.length || 0,
            "MIME type:",
            mimeType
          );
        } else if ("text" in part && part.text) {
          // Store the text
          textResponse = part.text;
          console.log(
            "Text response received:",
            textResponse.substring(0, 50) + "..."
          );
          
          // Try to parse JSON from text response
          try {
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              designDetails = JSON.parse(jsonMatch[0]);
              console.log("Parsed design details:", designDetails);
            }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (parseError) {
            console.log("Failed to parse JSON from text response, using raw text");
          }
        }
      }
    } else {
      console.error("No response from Gemini API", JSON.stringify(response));
      return NextResponse.json(
        { success: false, error: "No response from Gemini API" },
        { status: 500 }
      );
    }

    if (!imageData) {
      console.error("No image data in Gemini response", { response });
      // Fallback: return the original input image so the UI can proceed gracefully
      return NextResponse.json(
        {
          success: true,
          image: inputImage,
          description: textResponse || null,
          designDetails: designDetails || {
            designDescription: "",
            materialSuggestions: "",
            costEstimate: "",
            constructionTips: ""
          }
        },
        { headers: rateLimitOkHeaders }
      );
    }

    // Return the base64 image and design details as JSON
    return NextResponse.json(
      {
        success: true,
        image: `data:${mimeType};base64,${imageData}`,
        description: textResponse || null,
        designDetails: designDetails || {
          designDescription: "",
          materialSuggestions: "",
          costEstimate: "",
          constructionTips: ""
        }
      },
      { headers: rateLimitOkHeaders }
    );
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
