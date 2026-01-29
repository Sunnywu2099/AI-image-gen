"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, ChangeEvent, useEffect } from "react";
import { DesignDetails } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import { MeshGradient } from "@paper-design/shaders-react";
import { useTranslations } from "next-intl";
// import { trackInteraction, trackPageView, trackConversion, trackError } from "@/lib/ptengine";

interface ProcessingViewProps {
  uploadedImage: string;
  generatedImage?: string;
  isProcessing?: boolean;
  isSubscribed?: boolean;
  onSubscribe?: (email: string) => void;
  onReplaceImage?: (imageData: string) => void;
  designDetails?: DesignDetails;
  onError?: (error: string) => void;
}

export function ProcessingView({ 
  uploadedImage, 
  generatedImage, 
  isProcessing = false,
  isSubscribed = false,
  onSubscribe,
  onReplaceImage,
  designDetails,
  onError
}: ProcessingViewProps) {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showDesignDetails, setShowDesignDetails] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const isCompleted = !isProcessing && generatedImage;
  const canReplace = !!(isCompleted && isSubscribed);

  // 追踪页面状态
  useEffect(() => {
    /*
    if (isProcessing) {
      trackPageView('processing_page', {
        status: 'processing'
      });
    } else if (isCompleted && !isSubscribed) {
      trackPageView('processing_page', {
        status: 'completed_not_subscribed'
      });
    } else if (isCompleted && isSubscribed) {
      trackPageView('processing_page', {
        status: 'completed_subscribed'
      });
    }
    */
  }, [isProcessing, isCompleted, isSubscribed]);

  // 文件替换：选择并上传新原图后，沿用上层的 handleImageSelect 流程
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 追踪替换图片尝试
    /*
    trackInteraction('replace_image_attempt', {
      file_name: file.name,
      file_size: file.size,
      file_type: file.type
    });
    */
    
    // 检查文件大小限制 (3MB)
    if (file.size > 3 * 1024 * 1024) {
      /*
      trackError('replace_image_file_too_large', {
        file_size: file.size
      });
      */
      onError?.(t('upload.fileTooLarge'));
      return;
    }
    
    const inputEl = e.target;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      // 追踪替换图片成功
      /*
      trackInteraction('replace_image_success', {
        file_name: file.name,
        file_size: file.size
      });
      */
      onReplaceImage?.(result);
      // 清空文件选择，便于再次选择同一文件也能触发 onChange
      inputEl.value = "";
    };
    reader.onerror = () => {
      /*
      trackError('replace_image_read_error', {
        file_name: file.name
      });
      */
      inputEl.value = "";
    };
    reader.readAsDataURL(file);
  };

  // 当开始新一轮流程（未完成态）时，清空邮箱输入与错误
  useEffect(() => {
    if (!isCompleted) {
      setEmail("");
      setEmailError(null);
    }
  }, [isCompleted, uploadedImage]);

  const validateEmail = (value: string): string | null => {
    const v = value.trim();
    if (!v) return null;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(v) ? null : t('processing.emailInvalid');
  };

  // 150ms 防抖：在输入停顿后再执行校验，不对空值报错
  useEffect(() => {
    const timer = setTimeout(() => {
      const v = email.trim();
      if (!v) {
        setEmailError(null);
      } else {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        setEmailError(re.test(v) ? null : t('processing.emailInvalid'));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [email, t]);

  const handleSubscribe = async () => {
    const v = email.trim();
    
    // 追踪订阅尝试
    /*
    trackInteraction('subscribe_attempt', {
      has_email: !!v
    });
    */
    
    if (!v) {
      /*
      trackError('subscribe_validation_error', {
        error_type: 'email_required'
      });
      */
      setEmailError(t('processing.emailRequired'));
      return;
    }
    const err = validateEmail(v);
    if (err) {
      /*
      trackError('subscribe_validation_error', {
        error_type: 'email_invalid'
      });
      */
      setEmailError(err);
      return;
    }
    if (!onSubscribe) return;
    try {
      setIsSubscribing(true);
      await onSubscribe(v);
      // 追踪订阅成功（转化事件）
      /*
      trackConversion('subscription', {
        email: v
      });
      */
      setEmailError(null);
      setTimeout(() => {
        setShowDesignDetails(true);
      }, 500);
    } catch (error) {
      // 追踪订阅失败
      /*
      trackError('subscribe_failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      */
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="w-full md:max-w-[1200px] mx-auto flex flex-col items-center gap-5 md:gap-[40px] pt-4 md:pt-6 pb-[80px] md:pb-[100px] md:px-10 lg:px-0">
        {/* 顶部区域 - 标题 */}
      <div className="w-full flex justify-center items-center md:px-[60px]">
        <div className="flex flex-col justify-center items-center gap-6 flex-1">
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-display-4 leading-display-4 md:text-display-7 md:leading-display-7 font-extrabold text-center font-brand text-text-1">
              {isCompleted ? t('processing.completed') : t('processing.designing')}
            </h2>
          </div>
        </div>
      </div>

      {/* 图片区域 */}
      <div className="flex flex-col md:flex-row justify-center items-center gap-5 md:gap-[40px] w-full px-5 pt-[5px] pb-4 md:p-0">
        {/* 原图 - 桌面端左侧，移动端缩略图；仅在“生成完成 且 已订阅成功”后可点击替换 */}
        <div
          className={`hidden md:block md:flex-1 md:basis-0 md:min-w-0 md:max-w-[480px] h-[360px] border-[12px] border-white rounded-[24px] shadow-[0px_4px_40px_0px_rgba(0,0,0,0.12)] overflow-hidden relative transition-colors duration-200 ease-out ${canReplace ? 'cursor-pointer group hover:border-[#999999]' : ''}`}
          title={canReplace ? t('upload.ctaPrefix') + t('upload.ctaBackyard') + t('upload.ctaOr') + t('upload.ctaPool') : undefined}
        >
          <img
            src={uploadedImage}
            alt="Uploaded"
            className="w-full h-full object-cover"
          />
          {/* Hover overlay (Figma: Frame 1612707301) - only when canReplace; purely visual, does not block input */}
          {canReplace && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              {/* darkening layer per design: ~40% black */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out" />
              {/* centered pill CTA */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out">
                <div className="text-white px-3 py-[11px] flex items-center gap-1 shadow-sm">
                  {/* upload icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="21" height="20" viewBox="0 0 21 20" fill="none">
                    <path d="M15.9482 16.3062C14.4873 17.5692 12.5831 18.3333 10.5003 18.3333C5.89795 18.3333 2.16699 14.6023 2.16699 9.99999C2.16699 5.39761 5.89795 1.66666 10.5003 1.66666C15.1027 1.66666 18.8337 5.39761 18.8337 9.99999C18.8337 11.7801 18.2755 13.4298 17.3247 14.7838L14.667 9.99999H17.167C17.167 6.31809 14.1822 3.33332 10.5003 3.33332C6.81843 3.33332 3.83366 6.31809 3.83366 9.99999C3.83366 13.6819 6.81843 16.6667 10.5003 16.6667C12.2922 16.6667 13.9188 15.9597 15.1168 14.8097L15.9482 16.3062Z" fill="white"/>
                  </svg>
                  <span className="text-body-3 leading-body-3 font-brand font-semibold">{t('upload.ctaReupload')}</span>
                </div>
              </div>
            </div>
          )}
          {/* 透明覆盖的原生文件输入，确保点击可靠触发 */}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className={`absolute inset-0 w-full h-full opacity-0 z-20 ${canReplace ? 'cursor-pointer' : 'cursor-default pointer-events-none'}`}
            onChange={handleFileChange}
            disabled={!canReplace}
            aria-hidden={!canReplace}
            tabIndex={canReplace ? 0 : -1}
          />
        </div>

        {/* 箭头 - 仅桌面端显示 */}
        <div className="hidden md:flex md:flex-none w-[40px] h-[40px] items-center justify-center bg-white rounded-[24px]">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M26.9527 18.3332L18.0127 9.39315L20.3697 7.03613L33.3334 19.9998L20.3697 32.9633L18.0127 30.6063L26.9527 21.6665H6.66675V18.3332H26.9527Z" fill="black"/>
        </svg>
        </div>

        {/* 主图片区域 */}
        <div className="w-full md:flex-1 md:basis-0 md:min-w-0 md:max-w-[480px] p-0">
          <div className="w-full h-[265px] md:h-[360px] relative">
          {generatedImage ? (
            <div className="w-full h-full border-[10px] md:border-[12px] border-white rounded-[24px] shadow-[0px_4px_40px_0px_rgba(0,0,0,0.08)] md:shadow-[0px_4px_40px_0px_rgba(0,0,0,0.12)] overflow-hidden relative">
              
                <div className="relative w-full h-full">
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {/* 订阅overlay - 只在未订阅且完成时显示 */}
                  {isCompleted && !isSubscribed && (
                    <div className="absolute inset-x-0 bottom-0 top-[62px] md:top-[77px] z-10 pointer-events-auto">
                      {/* progressive-blur-container: 7 层分段蒙版 + 递进模糊 */}
                      {/* 第 1 层：无模糊，仅提供过渡区段蒙版 */}
                      <div
                        className="absolute inset-0 backdrop-blur-0 pointer-events-none"
                        style={{
                          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 10%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 40%)',
                          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 10%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 40%)'
                        }}
                      />

                      {/* 第 2 层：2px 模糊 */}
                      <div
                        className="absolute inset-0 backdrop-blur-[2px] pointer-events-none"
                        style={{
                          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 10%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 50%)',
                          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 10%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 50%)'
                        }}
                      />

                      {/* 第 3 层：4px 模糊 */}
                      <div
                        className="absolute inset-0 backdrop-blur-[4px] pointer-events-none"
                        style={{
                          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 15%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 60%)',
                          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 15%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 60%)'
                        }}
                      />

                      {/* 第 4 层：8px 模糊 */}
                      <div
                        className="absolute inset-0 backdrop-blur-[8px] pointer-events-none"
                        style={{
                          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 20%, rgba(0,0,0,1) 40%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 70%)',
                          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 20%, rgba(0,0,0,1) 40%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 70%)'
                        }}
                      />

                      {/* 第 5 层：16px 模糊 */}
                      <div
                        className="absolute inset-0 backdrop-blur-[16px] pointer-events-none"
                        style={{
                          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,1) 60%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 90%)',
                          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,1) 60%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 90%)'
                        }}
                      />

                      {/* 第 6 层：32px 模糊 */}
                      <div
                        className="absolute inset-0 backdrop-blur-[32px] pointer-events-none"
                        style={{
                          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 80%)',
                          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,1) 80%)'
                        }}
                      />

                      {/* 第 7 层：64px 模糊 */}
                      <div
                        className="absolute inset-0 backdrop-blur-[64px] pointer-events-none"
                        style={{
                          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 70%, rgba(0,0,0,1) 100%)',
                          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 70%, rgba(0,0,0,1) 100%)'
                        }}
                      />

                      {/* 渐变叠加层 */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.00) 0%, #000 100%)'
                        }}
                      />
                      
                      {/* 内容层 */}
                      <div className="relative z-10 flex flex-col items-center gap-[19px] pt-20 px-5 pb-8 md:pt-[160px] md:pb-8 h-full justify-end">
                        <p className="text-body-3 leading-body-3 font-brand font-semibold text-white text-center w-full drop-shadow-lg">
                          {t('processing.subscribeTitle')}
                        </p>
                        
                        <div className="w-full max-w-[360px] mx-auto bg-white/95 backdrop-blur-sm rounded-[50px] flex items-center gap-2 relative z-20 py-[3px] pr-[3px] pl-5 shadow-lg">
                          <Input
                            type="email"
                            placeholder={t('processing.emailPlaceholder')}
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                            }}
                            onBlur={() => setEmailError(validateEmail(email))}
                            aria-invalid={!!emailError}
                            aria-describedby="processing-email-error"
                            className="flex-1 border-0 bg-transparent text-body-3 font-brand focus-visible:ring-0 focus-visible:ring-offset-0 outline-none text-text-1 placeholder:text-text-3"
                            style={{ padding: '8px 0', minHeight: '20px' }}
                          />
                          <Button 
                            onClick={handleSubscribe}
                            disabled={isSubscribing}
                            className="bg-text-1 hover:bg-text-1/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-[24px] text-body-3 font-brand font-semibold relative z-30 px-3 py-[11px] flex items-center gap-2 shadow-sm" 
                          >
                            {isSubscribing && (
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                              </svg>
                            )}
                            {t('processing.subscribe')}
                          </Button>
                          {emailError && (
                            <p id="processing-email-error" className="absolute left-0 right-0 top-full mt-1.5 text-xs text-red-300 text-center w-full drop-shadow-lg pointer-events-none" aria-live="polite">
                              {emailError}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
          ) : (
            <div className="w-full h-full bg-bg-2 border-[10px] md:border-[12px] border-white rounded-[24px] shadow-[0px_4px_40px_0px_rgba(0,0,0,0.08)] md:shadow-[0px_4px_40px_0px_rgba(0,0,0,0.12)] flex items-center justify-center relative overflow-hidden">
              
              {/* 扫光动画 - 使用 Paper Shaders MeshGradient */}
              {isProcessing && (
                <div className="absolute inset-0">
                  <MeshGradient
                    width={"100%"}
                    height={"100%"}
                    colors={["#e0eaff", "#241d9a", "#f75092", "#9f50d3"]}
                    distortion={0.8}
                    swirl={0.1}
                    grainMixer={0}
                    grainOverlay={0}
                    speed={1}
                  />
                </div>
              )}

              {/* 处理中提示文案，垂直水平居中 */}
              {isProcessing && (
                <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                  <span
                    className="text-center font-extrabold font-brand text-transparent text-display-7 leading-display-7 bg-[linear-gradient(93deg,_#FFF_-0.7%,_rgba(255,255,255,0.60)_99.98%)] bg-clip-text [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]"
                  >
                    {t('processing.magic')}
                  </span>
                </div>
              )}
            </div>
          )}
          {/* 移动端缩略图 */}
          <div className="md:hidden absolute left-0 top-0">
            <div className="flex-none shrink-0 rotate-[-15deg]">
              <div
                className={`w-20 h-[60px] aspect-[4/3] border-2 border-white rounded-[4px] shadow-[0px_0.667px_6.667px_0px_rgba(0,0,0,0.12)] overflow-hidden relative ${canReplace ? 'cursor-pointer group' : ''}`}
                title={canReplace ? t('upload.ctaPrefix') + t('upload.ctaBackyard') + t('upload.ctaOr') + t('upload.ctaPool') : undefined}
              >
                <img
                  src={uploadedImage}
                  alt="Uploaded thumbnail"
                  className="w-full h-full object-cover"
                />
                {/* 透明覆盖的原生文件输入，确保移动端点击也可靠触发 */}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className={`absolute inset-0 w-full h-full opacity-0 z-20 ${canReplace ? 'cursor-pointer' : 'cursor-default pointer-events-none'}`}
                  onChange={handleFileChange}
                  disabled={!canReplace}
                  aria-hidden={!canReplace}
                  tabIndex={canReplace ? 0 : -1}
                />
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
      
      {/* 建议区域 - 仅在订阅完成后显示 */}
      {isCompleted && isSubscribed && designDetails && (
        <div className="w-[calc(100%-40px)] md:w-full md:max-w-[1080px] bg-[#F5F5F7] rounded-[24px] p-6 md:px-8 md:py-6 mx-5 md:mx-0">
          <h3 className="text-display-8 leading-display-8 font-extrabold text-left font-brand text-text-1 mb-5">
            {t('processing.suggestion.title')}
          </h3>
          
          <div className="space-y-5">
            {/* 设计说明 */}
            <div>
              <h4 className="text-body-3 leading-body-3 font-semibold font-brand text-text-1 mb-2">
                {t('processing.suggestion.desc')}
              </h4>
              <div className="text-body-3 leading-body-3 font-normal text-left font-brand text-text-3 prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="text-body-3 leading-body-3 font-normal text-left font-brand text-text-3 mb-2">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-text-1">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc pl-6 space-y-1">{children}</ul>,
                    li: ({ children }) => <li className="text-body-3 leading-body-3 font-normal text-left font-brand text-text-3">{children}</li>
                  }}
                >
                  {designDetails.designDescription}
                </ReactMarkdown>
              </div>
            </div>

            {/* 材料建议 */}
            <div>
              <h4 className="text-body-3 leading-body-3 font-semibold font-brand text-text-1 mb-2">
                {t('processing.suggestion.materials')}
              </h4>
              <div className="text-body-3 leading-body-3 font-normal text-left font-brand text-text-3 prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="text-body-3 leading-body-3 font-normal text-left font-brand text-text-3 mb-2">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-text-1">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc pl-6 space-y-1">{children}</ul>,
                    li: ({ children }) => <li className="text-body-3 leading-body-3 font-normal text-left font-brand text-text-3">{children}</li>
                  }}
                >
                  {designDetails.materialSuggestions}
                </ReactMarkdown>
              </div>
            </div>

            {/* 成本估算 */}
            <div>
              <h4 className="text-body-3 leading-body-3 font-semibold font-brand text-text-1 mb-2">
                {t('processing.suggestion.cost')}
              </h4>
              <div className="text-body-3 leading-body-3 font-normal text-left font-brand text-text-3 prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="text-body-3 leading-body-3 font-normal text-left font-brand text-text-3 mb-2">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-text-1">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc pl-6 space-y-1">{children}</ul>,
                    li: ({ children }) => <li className="text-body-3 leading-body-3 font-normal text-left font-brand text-text-3">{children}</li>
                  }}
                >
                  {designDetails.costEstimate}
                </ReactMarkdown>
              </div>
            </div>

            {/* 施工要点 */}
            <div>
              <h4 className="text-body-3 leading-body-3 font-semibold font-brand text-text-1 mb-2">
                {t('processing.suggestion.construction')}
              </h4>
              <div className="text-body-3 leading-body-3 font-normal text-left font-brand text-text-3 prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="text-body-3 leading-body-3 font-normal text-left font-brand text-text-3 mb-2">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-text-1">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc pl-6 space-y-1">{children}</ul>,
                    li: ({ children }) => <li className="text-body-3 leading-body-3 font-normal text-left font-brand text-text-3">{children}</li>
                  }}
                >
                  {designDetails.constructionTips}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}  
    </div>
  );
}
