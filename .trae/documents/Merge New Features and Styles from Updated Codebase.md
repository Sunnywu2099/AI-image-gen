我已更新计划，将**保留您现有的多站点/多语言结构**，并将新功能（风格选择、新 UI、结构化详情）集成到现有的 `HomePage` 组件中，而不是直接替换页面。

**执行计划：**

1. **更新基础配置**：
   - **`lib/types.ts`**：添加 `DesignDetails` 和 `ApiResponse` 接口。
   - **`lib/utils.ts`**：添加 `shopifyImageLoader` 工具函数。
   - **`app/globals.css`**：添加 Roobert 字体和新的设计系统变量。
   - **`i18n/en.json`**：添加新功能所需的英语翻译键值（如 "Set the theme", "Design Suggestion" 等）。

2. **更新后端逻辑**：
   - **`app/api/image/route.ts`**：升级提示词以支持风格化生成，并返回结构化的 JSON 数据（包含设计描述、成本估算等）。

3. **更新 UI 组件**：
   - **`components/ImageUpload.tsx`**：使用新版本替换，支持风格选择（预设+自定义）和吸顶布局。
   - **`components/ProcessingView.tsx`**：使用新版本替换，支持 Markdown 详情展示和“替换图片”功能。

4. **集成到主页 (`components/HomePage.tsx`)**：
   - **保留**现有的 `region` 处理逻辑和订阅接口调用（确保多站点支持不受影响）。
   - **修改** `handleImageSelect` 方法，使其接收新的 `theme` 参数，并构建包含风格的提示词。
   - **引入**新的状态管理（`theme`, `designDetails`）并传递给子组件。

此方案既能引入新功能，又能完全保留您现有的多语言和多站点架构。

