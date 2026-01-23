# 多区域订阅与重复生成优化方案

我将分两步实现您的需求：

## 1. 后端：支持 5 个站点的 Klaviyo 独立配置
我将修改 `app/api/subscribe/route.ts`，根据请求中的 `region` 参数（对应语言代码）来动态选择 API Key 和 List ID。

**环境变量映射规则：**
- `de` -> `KLAVIYO_API_KEY_DE`, `KLAVIYO_LIST_ID_DE`
- `fr` -> `KLAVIYO_API_KEY_FR`, `KLAVIYO_LIST_ID_FR`
- `es` -> `KLAVIYO_API_KEY_ES`, `KLAVIYO_LIST_ID_ES`
- `it` -> `KLAVIYO_API_KEY_IT`, `KLAVIYO_LIST_ID_IT`
- `eu` (泛欧/默认) -> `KLAVIYO_API_KEY_EU`, `KLAVIYO_LIST_ID_EU`

**注意**：您需要在 Vercel 后台配置上述所有环境变量。

## 2. 前端：优化重复上传体验 (`HomePage.tsx`)

### A. 防止重复生成 (节省 Token)
我将在 `handleImageSelect` 和 `handleReplaceImage` 中添加逻辑：
- 记录上一次上传的图片数据。
- 如果用户上传的新图片与当前显示的图片数据完全一致，则直接返回，不发起 API 请求。

### B. 记住订阅状态 (避免重复订阅)
目前代码中 `handleReplaceImage` 会重置 `isSubscribed` 状态：
```typescript
setIsSubscribed(false); // 这一行会被修改
```
我将修改此逻辑：
- 在 `HomePage` 组件中，`isSubscribed` 状态一旦为 `true`，在用户进行图片替换（重新上传）时**不再重置为 false**。
- 这样用户如果已经订阅过一次，下次上传新图片生成后，界面会直接显示结果，而不会再次弹出订阅框。

确认此方案后，我将为您修改代码。