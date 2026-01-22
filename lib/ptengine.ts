/**
 * PTEngine 事件追踪工具类
 * 通过 postMessage 向父窗口发送追踪事件
 */

export interface PTEventData {
  event: string;
  properties?: Record<string, unknown>;
}

/**
 * 向父窗口发送 PTEngine 追踪事件
 */
export function trackPTEvent(eventName: string, properties?: Record<string, unknown>) {
  try {
    // Check if running in browser
    if (typeof window === 'undefined') return;

    // Disable tracking for EU region
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (params.get('region') === 'eu' || params.get('region') === 'EU' || (window as any).__REGION === 'eu') return;

    // 检查是否在 iframe 中
    if (window.parent && window.parent !== window) {
      const eventData: PTEventData = {
        event: eventName,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          source: 'pool-design-iframe'
        }
      };

      // 向父窗口发送消息
      window.parent.postMessage({
        type: 'ptengine_track',
        data: eventData
      }, '*');

      // 开发环境下打印日志
      if (process.env.NODE_ENV === 'development') {
        console.log('[PTEngine Track]', eventName, properties);
      }
    }
  } catch (error) {
    console.error('[PTEngine] Failed to track event:', error);
  }
}

/**
 * 追踪页面浏览
 */
export function trackPageView(pageName: string, properties?: Record<string, unknown>) {
  trackPTEvent('page_view', {
    page_name: pageName,
    ...properties
  });
}

/**
 * 追踪用户交互
 */
export function trackInteraction(action: string, properties?: Record<string, unknown>) {
  trackPTEvent('user_interaction', {
    action,
    ...properties
  });
}

/**
 * 追踪转化事件
 */
export function trackConversion(conversionType: string, properties?: Record<string, unknown>) {
  trackPTEvent('conversion', {
    conversion_type: conversionType,
    ...properties
  });
}

/**
 * 追踪错误
 */
export function trackError(errorMessage: string, properties?: Record<string, unknown>) {
  trackPTEvent('error', {
    error_message: errorMessage,
    ...properties
  });
}
