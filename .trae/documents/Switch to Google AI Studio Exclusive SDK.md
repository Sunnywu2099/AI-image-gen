I have identified the root cause: the current SDK `@google/genai` is a unified SDK that supports both Vertex AI and Google AI Studio. Despite our configuration, it seems to be inferring a Vertex AI environment (likely due to Vercel's environment variables or internal SDK logic), which triggers the "API keys are not supported" error because Vertex AI requires OAuth tokens, not API keys.

To permanently resolve this, I will switch to the **`@google/generative-ai`** SDK. This library is exclusively designed for Google AI Studio (API Key based) and does not support Vertex AI, making it physically impossible to trigger this specific authentication error.

**Plan:**
1.  **Switch SDKs**:
    *   Uninstall `@google/genai`.
    *   Install `@google/generative-ai`.
2.  **Refactor `app/api/image/route.ts`**:
    *   Update imports to use `GoogleGenerativeAI`.
    *   Rewrite the initialization and generation logic to match the `@google/generative-ai` API signatures (which are slightly different but well-documented).
    *   Ensure image input (base64) and output handling is preserved.
3.  **Deploy**:
    *   Commit the changes to `package.json` and `route.ts`.
    *   Push to GitHub to trigger a Vercel deployment.

This is the most robust solution to ensure your API Key works as expected.