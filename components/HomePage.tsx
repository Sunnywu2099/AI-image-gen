"use client";
import { useState, useEffect } from "react";
import { ImageUpload } from "@/components/ImageUpload";
// import { ProcessingView } from "@/components/ProcessingView";
import { HistoryItem, DesignDetails } from "@/lib/types";
// import { trackInteraction, trackConversion, trackError } from "@/lib/ptengine";

export function HomePage({ region }: { region?: string }) {
  const [currentRegion, setCurrentRegion] = useState(region);

  useEffect(() => {
    // 从 URL 参数中获取 lang 参数
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const lang = params.get('lang');
      if (lang) {
        setCurrentRegion(lang);
      }
    }
  }, []);

  const [image, setImage] = useState<string | null>(null);
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [designDetails, setDesignDetails] = useState<DesignDetails | null>(null);
  const [theme, setTheme] = useState<string | null>(null);

  // 监听body高度变化的MutationObserver
  useEffect(() => {
    const body = document.body;
    
    // 创建MutationObserver:
    const domMo = new MutationObserver(() => {
      // 获取body的高度:
      const currentHeight = body.scrollHeight;
      // 向父页面发消息:
      parent.postMessage({
        type: 'resize',
        height: currentHeight
      }, '*');
    });
    
    // 开始监控body元素的修改:
    domMo.observe(body, {
      attributes: true,
      childList: true,
      subtree: true
    });
    
    // 初始发送高度
    parent.postMessage({
      type: 'resize',
      height: body.scrollHeight
    }, '*');
    
    // 清理函数
    return () => {
      domMo.disconnect();
    };
  }, []);

  const handleImageSelect = async (imageData: string, selectedTheme?: string) => {
    setImage(imageData || null);
    setTheme(selectedTheme || null);
    
    // 立即开始处理图片生成
    if (imageData) {
      try {
        setLoading(true);
        setError(null);

        // 构建带主题的 prompt
        const basePrompt = "redesign this image into a stunning backyard with a beautiful swimming pool based on the original image.";
        const themePrompt = selectedTheme 
          ? ` Apply a ${selectedTheme} theme/style to the design.` 
          : "";
        const fullPrompt = `${basePrompt}${themePrompt} Focus on aesthetics, safety, and innovative features. Generate a realistic, high-quality visual result.`;

        // 直接使用上传的图片数据
        const requestData = {
          // Optimized prompt: Direct generation instruction with intelligent adaptation
          prompt: fullPrompt,
          image: imageData,
          history: history.length > 0 ? history : undefined,
        };

        const response = await fetch("/api/image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to generate image");
        }

        const data = await response.json();

        if (data.image) {
          // 追踪图片生成成功（转化事件）
          /*
          trackConversion('image_generation', {
            has_history: history.length > 0,
            generation_type: 'initial',
            theme: selectedTheme || 'none'
          });
          */
          
          // Update the generated image, description and design details
          setGeneratedImage(data.image);
          setDescription(data.description || null);
          setDesignDetails(data.designDetails || null);

          // Update history locally - add user message
          const userMessage: HistoryItem = {
            role: "user",
            parts: [
              { text: selectedTheme 
                ? `Transform this image into a beautiful pool design with ${selectedTheme} theme` 
                : "Transform this image into a beautiful pool design" 
              },
              { image: imageData },
            ],
          };

          // Add AI response
          const aiResponse: HistoryItem = {
            role: "model",
            parts: [
              ...(data.description ? [{ text: data.description }] : []),
              ...(data.image ? [{ image: data.image }] : []),
            ],
          };

          // Update history with both messages
          setHistory((prevHistory) => [...prevHistory, userMessage, aiResponse]);
        } else {
          /*
          trackError('image_generation_no_result', {
            generation_type: 'initial'
          });
          */
          setError("No image returned from API");
        }
      } catch (error) {
        // 追踪图片生成错误
        /*
        trackError('image_generation_failed', {
          error_message: error instanceof Error ? error.message : 'Unknown error',
          generation_type: 'initial'
        });
        */
        setError(error instanceof Error ? error.message : "An error occurred");
        console.error("Error processing request:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubscribe = async (email: string) => {
    try {
      setError(null);
      
      // 追踪订阅请求
      /*
      trackInteraction('subscription_request', {
        email
      });
      */
      
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, region: currentRegion }),
      });
      const data = await response
        .json()
        .catch(() => ({ success: response.ok }));
      if (!response.ok || data?.success === false) {
        const errorMsg = data?.error || "Failed to subscribe";
        /*
        trackError('subscription_api_failed', {
          error_message: errorMsg
        });
        */
        throw new Error(errorMsg);
      }
      
      // 订阅成功已在 ProcessingView 中追踪
      setIsSubscribed(true);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Subscription failed";
      /*
      trackError('subscription_error', {
        error_message: errorMsg
      });
      */
      setError(errorMsg);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleReset = () => {
    setImage(null);
    setGeneratedImage(null);
    setDescription(null);
    setLoading(false);
    setError(null);
    setHistory([]);
    setIsSubscribed(false);
    setDesignDetails(null);
  };

  // If we have a generated image, we want to edit it next time
  const currentImage = generatedImage || image;

  return (
    <main className="bg-white">
      <div className="w-full mx-auto">
        {error && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg max-w-[1200px] mx-auto">
            {error}
          </div>
        )}

        <ImageUpload
            onImageSelect={handleImageSelect}
            currentImage={currentImage}
            onError={setError}
            isGenerating={loading}
            generatedImage={generatedImage}
            isSubscribed={isSubscribed}
            onSubscribe={handleSubscribe}
            designDetails={designDetails || undefined}
          />
      </div>
    </main>
  );
}
