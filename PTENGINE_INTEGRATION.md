# PTEngine 事件追踪集成文档

## 概述

本应用已集成 PTEngine 事件追踪功能,通过 `window.postMessage` 向父窗口发送追踪事件。当应用以 iframe 方式嵌入到主应用时,主应用可以接收这些事件并转发给 PTEngine。

## 主应用集成步骤

### 1. 在主应用中监听 postMessage 事件

```javascript
// 在主应用中添加事件监听器
window.addEventListener('message', function(event) {
  // 验证消息来源(可选,建议添加)
  // if (event.origin !== 'https://your-iframe-domain.com') return;
  
  // 检查是否为 PTEngine 追踪事件
  if (event.data && event.data.type === 'ptengine_track') {
    const { event: eventName, properties } = event.data.data;
    
    // 调用 PTEngine API 发送事件
    if (window._pt && window._pt.push) {
      window._pt.push(['trackEvent', eventName, properties]);
    }
    
    // 或者使用 PTEngine 的其他 API
    // ptengine('track', eventName, properties);
  }
});
```

### 2. PTEngine 初始化

确保主应用已正确加载 PTEngine 脚本:

```html
<!-- PTEngine 追踪代码 -->
<script>
  window._pt_lt = new Date().getTime();
  window._pt_sp_2 = [];
  _pt_sp_2.push('setAccount,your-account-id');
  var _protocol = (("https:" == document.location.protocol) ? " https://" : " http://");
  (function() {
    var atag = document.createElement('script'); 
    atag.type = 'text/javascript'; 
    atag.async = true;
    atag.src = _protocol + 'js.ptengine.cn/your-account-id.js';
    var stag = document.getElementsByTagName('script')[0];
    stag.parentNode.insertBefore(atag, stag);
  })();
</script>
```

## 追踪事件列表

### 页面浏览事件 (page_view)

| 事件名 | 触发时机 | 属性 |
|--------|---------|------|
| `upload_page` | 用户访问上传页面 | `step`: 'initial' \| 'image_selected' |
| `processing_page` | 用户访问处理页面 | `status`: 'processing' \| 'completed_not_subscribed' \| 'completed_subscribed' |

### 用户交互事件 (user_interaction)

| 事件名 | 触发时机 | 属性 |
|--------|---------|------|
| `file_selected` | 用户选择文件 | `file_name`, `file_size`, `file_type` |
| `image_uploaded` | 图片上传成功 | `file_name`, `file_size`, `file_type` |
| `image_removed` | 用户移除图片 | `file_name` |
| `replace_image_attempt` | 用户尝试替换图片 | `file_name`, `file_size`, `file_type` |
| `replace_image_success` | 替换图片成功 | `file_name`, `file_size` |
| `replace_and_regenerate` | 替换图片并重新生成 | `had_previous_generation` |
| `subscribe_attempt` | 用户尝试订阅 | `has_email` |
| `subscription_request` | 发送订阅请求 | `email` |

### 转化事件 (conversion)

| 事件名 | 触发时机 | 属性 |
|--------|---------|------|
| `image_generation` | 图片生成成功 | `has_history`, `generation_type`: 'initial' \| 'replace' |
| `subscription` | 用户订阅成功 | `email` |

### 错误事件 (error)

| 事件名 | 触发时机 | 属性 |
|--------|---------|------|
| `file_upload_rejected` | 文件上传被拒绝 | `error_type`, `error_message` |
| `file_read_error` | 文件读取错误 | `file_name` |
| `replace_image_file_too_large` | 替换图片文件过大 | `file_size` |
| `replace_image_read_error` | 替换图片读取错误 | `file_name` |
| `subscribe_validation_error` | 订阅验证错误 | `error_type`: 'email_required' \| 'email_invalid' |
| `subscribe_failed` | 订阅失败 | `error_message` |
| `subscription_api_failed` | 订阅 API 失败 | `error_message` |
| `subscription_error` | 订阅错误 | `error_message` |
| `image_generation_no_result` | 图片生成无结果 | `generation_type` |
| `image_generation_failed` | 图片生成失败 | `error_message`, `generation_type` |

## 事件数据结构

所有事件都遵循以下数据结构:

```typescript
interface PTEventData {
  event: string;                    // 事件名称
  properties?: {                    // 事件属性
    [key: string]: unknown;
    timestamp: string;              // ISO 8601 格式时间戳
    source: 'pool-design-iframe';   // 固定值,标识来源
  };
}

// postMessage 消息格式
{
  type: 'ptengine_track',
  data: PTEventData
}
```

## 示例:完整的主应用集成代码

```html
<!DOCTYPE html>
<html>
<head>
  <title>主应用</title>
  <!-- PTEngine 追踪代码 -->
  <script>
    window._pt_lt = new Date().getTime();
    window._pt_sp_2 = [];
    _pt_sp_2.push('setAccount,your-account-id');
    var _protocol = (("https:" == document.location.protocol) ? " https://" : " http://");
    (function() {
      var atag = document.createElement('script'); 
      atag.type = 'text/javascript'; 
      atag.async = true;
      atag.src = _protocol + 'js.ptengine.cn/your-account-id.js';
      var stag = document.getElementsByTagName('script')[0];
      stag.parentNode.insertBefore(atag, stag);
    })();
  </script>
</head>
<body>
  <!-- iframe 嵌入 -->
  <iframe 
    id="pool-design-iframe" 
    src="https://your-pool-design-app.com"
    width="100%"
    height="800"
  ></iframe>

  <script>
    // 监听来自 iframe 的消息
    window.addEventListener('message', function(event) {
      // 可选:验证消息来源
      // if (event.origin !== 'https://your-pool-design-app.com') return;
      
      // 处理 PTEngine 追踪事件
      if (event.data && event.data.type === 'ptengine_track') {
        const { event: eventName, properties } = event.data.data;
        
        console.log('[PTEngine]', eventName, properties);
        
        // 发送到 PTEngine
        if (window._pt && window._pt.push) {
          window._pt.push(['trackEvent', eventName, properties]);
        }
      }
      
      // 处理 iframe 高度调整消息(已有功能)
      if (event.data && event.data.type === 'resize') {
        const iframe = document.getElementById('pool-design-iframe');
        if (iframe) {
          iframe.style.height = event.data.height + 'px';
        }
      }
    });
  </script>
</body>
</html>
```

## 开发环境调试

在开发环境下,所有追踪事件会在控制台输出:

```
[PTEngine Track] file_selected { file_name: 'backyard.jpg', file_size: 1234567, ... }
```

## 注意事项

1. **跨域安全**: 建议在生产环境中验证 `event.origin` 以确保消息来自可信来源
2. **PTEngine API**: 根据你使用的 PTEngine 版本,API 调用方式可能略有不同,请参考 PTEngine 官方文档
3. **隐私合规**: 订阅事件中包含用户邮箱,请确保符合 GDPR 等隐私法规要求
4. **事件去重**: 如果需要,可以在主应用中添加事件去重逻辑

## 相关文件

- `lib/ptengine.ts` - PTEngine 工具类
- `components/ImageUpload.tsx` - 上传组件追踪
- `components/ProcessingView.tsx` - 处理视图追踪
- `app/page.tsx` - 主页面追踪

## 参考资源

- [PTEngine 官方文档](https://www.ptengine.com/blog/)
- [Window.postMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
