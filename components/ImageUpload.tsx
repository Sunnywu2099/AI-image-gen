"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useDropzone } from "react-dropzone";
import { ImageCarousel } from "./ImageCarousel";
// import { trackInteraction, trackPageView, trackError, trackConversion } from "@/lib/ptengine";
import { MeshGradient } from "@paper-design/shaders-react";
import { Button } from "./ui/button";
import { DesignDetails } from "@/lib/types";
import ReactMarkdown from "react-markdown";

interface ImageUploadProps {
  onImageSelect: (imageData: string, theme?: string) => void;
  currentImage: string | null;
  onError?: (error: string) => void;
  isGenerating?: boolean;
  generatedImage?: string | null;
  isSubscribed?: boolean;
  onSubscribe?: (email: string) => void;
  designDetails?: DesignDetails;
}

// 预设主题列表
const PRESET_THEMES = [
  { key: "themeChristmas", value: "Christmas" },
  { key: "themeHalloween", value: "Halloween" },
  { key: "themeParty", value: "Party" },
  { key: "themeTropical", value: "Tropical" },
  { key: "themeMinimalist", value: "Minimalist" },
];

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
}


export function ImageUpload({ onImageSelect, currentImage, onError, isGenerating = false, generatedImage, isSubscribed = false, onSubscribe, designDetails }: ImageUploadProps) {
  const t = useTranslations();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customTheme, setCustomTheme] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null); // 预览图片
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  
  // 吸顶元素的 ref
  const leftStickyRef = useRef<HTMLDivElement>(null);
  const rightStickyRef = useRef<HTMLDivElement>(null);
  
  const isCompleted = !isGenerating && generatedImage;
  
  // iframe 内吸顶同步逻辑 - 监听父页面发送的 STICKY_SYNC 消息
  useEffect(() => {
    const leftElement = leftStickyRef.current;
    const rightElement = rightStickyRef.current;
    
    // 至少有一个元素才继续
    if (!leftElement && !rightElement) return;

    // 缓存元素状态和尺寸信息
    interface ElementState {
      originalTop: number;
      isActive: boolean;
      containerHeight: number;
      elementHeight: number;
    }
    const elementsState = new Map<HTMLDivElement, ElementState>();
    
    // 初始化元素
    const initElement = (el: HTMLDivElement | null) => {
      if (!el) return;
      const originalTop = parseInt(getComputedStyle(el).top) || 16;
      const container = el.parentElement;
      elementsState.set(el, { 
        originalTop, 
        isActive: false,
        containerHeight: container?.offsetHeight || 0,
        elementHeight: el.offsetHeight
      });
      el.style.willChange = 'transform';
      el.style.transition = 'transform 50ms linear';
    };
    
    initElement(leftElement);
    initElement(rightElement);

    // 使用 RAF 节流
    let rafId: number | null = null;
    let pendingOffset: number | null = null;

    // 更新缓存的尺寸（在窗口 resize 时调用）
    const updateCachedSizes = () => {
      const updateElement = (el: HTMLDivElement | null) => {
        if (!el) return;
        const state = elementsState.get(el);
        if (!state) return;
        const container = el.parentElement;
        state.containerHeight = container?.offsetHeight || 0;
        state.elementHeight = el.offsetHeight;
      };
      updateElement(leftElement);
      updateElement(rightElement);
    };

    // 处理 sticky 位置更新
    const processElements = () => {
      rafId = null;
      if (pendingOffset === null) return;

      const offset = pendingOffset;
      pendingOffset = null;

      const processElement = (el: HTMLDivElement | null) => {
        if (!el) return;
        const state = elementsState.get(el);
        if (!state) return;

        if (offset > 0) {
          state.isActive = true;
          
          // 使用缓存的尺寸计算最大偏移
          const maxOffset = state.containerHeight - state.elementHeight - state.originalTop;
          const clampedOffset = Math.min(offset, Math.max(0, maxOffset));

          el.style.transform = `translate3d(0, ${clampedOffset}px, 0)`;
          
        } else {
          if (state.isActive) {
            el.style.transform = 'translate3d(0, 0, 0)';
            state.isActive = false;
          }
        }
      };

      processElement(leftElement);
      processElement(rightElement);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'STICKY_SYNC') return;

      pendingOffset = event.data.offset;

      // 使用 RAF 确保每帧只处理一次
      if (rafId === null) {
        rafId = requestAnimationFrame(processElements);
      }
    };

    // 监听 resize 更新缓存尺寸
    const handleResize = () => {
      updateCachedSizes();
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('resize', handleResize);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      // 重置样式
      const resetElement = (el: HTMLDivElement | null) => {
        if (!el) return;
        el.style.willChange = '';
        el.style.transform = '';
        el.style.transition = '';
      };
      resetElement(leftElement);
      resetElement(rightElement);
    };
  }, []);

  // 获取当前主题（自定义输入优先于选中的预设）
  const getCurrentTheme = () => customTheme || selectedTheme || "";

  // 邮箱验证
  const validateEmail = useCallback((value: string) => {
    if (!value.trim()) {
      return t('processing.emailRequired');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return t('processing.emailInvalid');
    }
    return null;
  }, [t]);

  // 处理订阅
  const handleSubscribe = async () => {
    const v = email.trim();
    
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
      /*
      trackConversion('subscription', {
        email: v
      });
      */
      setEmailError(null);
    } catch (error) {
      /*
      trackError('subscribe_failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      */
    } finally {
      setIsSubscribing(false);
    }
  };

  // 处理预设主题点击
  const handleThemeClick = (themeValue: string) => {
    if (selectedTheme === themeValue) {
      setSelectedTheme(null);
      setCustomTheme(""); // 取消选择时清空输入框
    } else {
      setSelectedTheme(themeValue);
      setCustomTheme(themeValue); // 将主题名称填入输入框
    }
    // 追踪主题选择
    /*
    trackInteraction('theme_selected', {
      theme: themeValue,
      type: 'preset'
    });
    */
  };

  // 处理自定义主题输入
  const handleCustomThemeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTheme(e.target.value);
    if (e.target.value) {
      setSelectedTheme(null); // 清空预设选择
    }
  };

  // 追踪页面浏览
  useEffect(() => {
    if (!currentImage) {
      /*
      trackPageView('upload_page', {
        step: 'initial'
      });
      */
    } else {
      /*
      trackPageView('upload_page', {
        step: 'image_selected'
      });
      */
    }
  }, [currentImage]);

  // Update the selected file when the current image changes
  useEffect(() => {
    if (!currentImage) {
      setSelectedFile(null);
    }
  }, [currentImage]);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections) => {
      if (fileRejections?.length > 0) {
        const error = fileRejections[0].errors[0];
        // 追踪文件上传错误
        /*
        trackError('file_upload_rejected', {
          error_type: error.code,
          error_message: error.message
        });
        */
        onError?.(error.message);
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      // 追踪文件选择
      /*
      trackInteraction('file_selected', {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type
      });
      */

      setSelectedFile(file);
      setIsLoading(true);

      // Convert the file to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          const result = event.target.result as string;
          // 追踪图片上传成功
          /*
          trackInteraction('image_uploaded', {
            file_name: file.name,
            file_size: file.size,
            file_type: file.type
          });
          */
          // 只设置预览图片，不立即生成
          setPreviewImage(result);
        }
        setIsLoading(false);
      };
      reader.onerror = () => {
        // 追踪文件读取错误
        /*
        trackError('file_read_error', {
          file_name: file.name
        });
        */
        onError?.("Error reading file. Please try again.");
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    },
    [onError]
  );

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"]
    },
    maxSize: 3 * 1024 * 1024, // 3MB
    multiple: false,
    noClick: false,
    noKeyboard: false
  });


// 统一布局 - 始终显示步骤 1、步骤 2、Generate 按钮
  return (
    <div className="w-full md:max-w-[1200px] mx-auto md:pt-4 pb-[80px] md:pb-[100px] md:px-10 lg:px-0">
        <div className="bg-white rounded-[40px] p-0 min-h-[360px] flex flex-col md:flex-row gap-5 md:gap-2.5">
          {/* 内容区 - 在移动端为垂直排列的第一部分 */}
          <div className="w-full md:flex-1 md:basis-0 md:min-w-0 md:max-w-[560px] flex items-start md:pr-20 px-5 md:px-0 pt-4 pb-0 md:pt-0 md:pb-0">
            {/* 左侧内容 sticky 吸顶，当右侧内容更长时保持可见 */}
            <div 
              ref={leftStickyRef}
              className="sticky-sidebar flex flex-col justify-start gap-8 flex-1 min-w-0 md:sticky md:top-4"
            >
              {/* 文本内容 */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1 w-full min-w-0">
                  <div className="text-brand-blue font-semibold text-body-3 font-brand text-left leading-body-3">
                    {t('upload.badge')}
                  </div>
                  <h2 className="text-text-1 font-extrabold text-display-4 font-brand text-left leading-display-4">
                    {t('upload.headline')}
                  </h2>
                </div>
                <p className="text-text-3 font-normal text-body-3 leading-body-3 font-brand text-left w-full">
                  {t('upload.description')}
                </p>
              </div>

              {/* 步骤 1: 上传图片 */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-text-1 font-semibold text-body-3 font-brand leading-body-3">
                    {t('upload.step1Title')}
                  </p>
                  <p className="text-text-3 font-normal text-body-4 font-brand leading-body-4">
                    {t('upload.step1Desc')}
                  </p>
                </div>
                
                {/* 虚线边框上传区域 / 图片预览区域 */}
                <div
                  {...getRootProps()}
                  className={`
                    border border-dashed border-[rgba(82,82,86,0.35)] rounded-[24px] h-[240px] w-full max-w-[480px]
                    flex items-center justify-center cursor-pointer overflow-hidden
                    hover:border-[rgba(82,82,86,0.5)] transition-colors
                    ${isLoading ? "opacity-50 cursor-wait" : ""}
                    ${previewImage ? "border-solid border-[rgba(187,187,188,0.35)]" : ""}
                  `}
                  aria-label="Upload an image of your backyard or pool"
                >
                  <input {...getInputProps()} />
                  {previewImage ? (
                    // 图片预览
                    <div className="relative w-full h-full group">
                      <img 
                        src={previewImage} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      {/* PC端 hover 遮罩 + 重新上传按钮 */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage(null);
                            setSelectedFile(null);
                            // 打开文件选择器
                            setTimeout(() => open(), 100);
                          }}
                          className="bg-white text-text-1 px-4 py-2 rounded-[8px] text-body-3 font-brand font-semibold hover:bg-white/90 transition-colors"
                        >
                          {t('upload.ctaReupload')}
                        </button>
                      </div>
                      {/* 移动端始终显示按钮 */}
                      <div className="absolute bottom-3 right-3 md:hidden">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage(null);
                            setSelectedFile(null);
                            // 打开文件选择器
                            setTimeout(() => open(), 100);
                          }}
                          className="bg-white/90 backdrop-blur-sm text-text-1 px-3 py-1.5 rounded-[8px] text-body-4 font-brand font-semibold hover:bg-white transition-colors"
                        >
                          {t('upload.ctaReupload')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 空白上传区域
                    <div className="flex flex-col items-center gap-3 w-[328px]">
                      {/* 上传图标 */}
                      <div className="w-12 h-12 bg-[#f3f5f7] rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M4 14.8994V16.9994C4 18.1039 4.89543 18.9994 6 18.9994H18C19.1046 18.9994 20 18.1039 20 16.9994V14.9994M16 9.99938L12 5.99938M12 5.99938L8 9.99938M12 5.99938L12 15.4994" stroke="#242426" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      {/* 上传文字 */}
                      <div className="flex flex-col items-center gap-1 text-center">
                        <p className="text-text-1 font-semibold text-body-4 font-brand leading-body-4">
                          Upload the image as reference
                        </p>
                        <p className="text-text-3 font-normal text-body-4 font-brand leading-body-4">
                          {t('upload.fileFormatHint')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 步骤 2: 设置主题 */}
              <div className="flex flex-col gap-3 items-start w-full max-w-[480px]">
                <p className="text-text-1 font-semibold text-body-3 font-brand leading-body-3">
                  {t('upload.step2Title')}
                </p>
                
                {/* 主题输入框 */}
                <input
                  type="text"
                  value={customTheme}
                  onChange={handleCustomThemeChange}
                  placeholder={t('upload.themePlaceholder')}
                  className="bg-white border border-[rgba(187,187,188,0.35)] rounded-[12px] h-[45px] w-full px-3 text-body-4 font-brand leading-body-4 text-text-1 placeholder:text-text-1-35 outline-none focus:border-[rgba(187,187,188,0.6)] transition-colors"
                />
                
                {/* 预设主题标签 */}
                <div className="flex flex-wrap gap-2 w-full">
                  {PRESET_THEMES.map((theme) => (
                    <button
                      key={theme.key}
                      onClick={() => handleThemeClick(theme.value)}
                      className={`
                        px-3 py-1 rounded-[24px] text-body-4 font-brand font-normal leading-body-4
                        transition-all duration-200
                        ${selectedTheme === theme.value
                          ? "bg-text-1 text-white"
                          : "bg-[#f3f5f7] text-text-1-80 hover:bg-[#e8eaec]"
                        }
                      `}
                    >
                      {t(`upload.${theme.key}`)}
                    </button>
                  ))}
                </div>

                {/* 生成按钮 */}
                <button
                  onClick={() => {
                    if (previewImage) {
                      // 已有预览图片，开始生成
                      const theme = getCurrentTheme();
                      /*
                      trackInteraction('generate_clicked', {
                        theme: theme || 'none',
                        has_image: true
                      });
                      */
                      onImageSelect(previewImage, theme);
                    } else {
                      // 没有预览图片，打开文件选择
                      open();
                    }
                  }}
                  disabled={isLoading || isGenerating}
                  className={`
                    w-full bg-text-1 text-white rounded-[12px] h-[48px] 
                    font-brand font-semibold text-body-3 leading-body-3
                    transition-colors
                    flex items-center justify-center gap-2
                    ${(isLoading || isGenerating) ? "opacity-50 cursor-wait" : "cursor-pointer hover:bg-text-1-80"}
                  `}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M17.2611 6.77344L17.0556 7.24484C16.9053 7.58994 16.428 7.58994 16.2775 7.24484L16.0721 6.77344C15.7059 5.9329 15.0462 5.26369 14.223 4.89758L13.59 4.61603C13.2477 4.46379 13.2477 3.96569 13.59 3.81344L14.1876 3.54763C15.032 3.1721 15.7035 2.47812 16.0634 1.60904L16.2744 1.09962C16.4215 0.744585 16.9118 0.744585 17.0588 1.09962L17.2698 1.60904C17.6298 2.47812 18.3013 3.1721 19.1456 3.54763L19.7432 3.81344C20.0855 3.96569 20.0855 4.46379 19.7432 4.61603L19.1102 4.89758C18.287 5.26369 17.6274 5.9329 17.2611 6.77344ZM2.49313 2.50001H11.6666V4.16668H3.33329V15.8333L11.6666 7.50001L16.6666 12.5V9.16668H18.3333V16.6722C18.3333 17.1293 17.9539 17.5 17.5068 17.5H2.49313C2.03667 17.5 1.66663 17.1293 1.66663 16.6722V3.32784C1.66663 2.87064 2.04605 2.50001 2.49313 2.50001ZM16.6666 14.857L11.6666 9.85701L5.69032 15.8333H16.6666V14.857ZM6.66663 9.16668C5.74615 9.16668 4.99996 8.42051 4.99996 7.50001C4.99996 6.57954 5.74615 5.83334 6.66663 5.83334C7.5871 5.83334 8.33329 6.57954 8.33329 7.50001C8.33329 8.42051 7.5871 9.16668 6.66663 9.16668Z" fill="white"/>
                  </svg>
                  Generate
                </button>
                <input {...getInputProps()} className="hidden" />
              </div>
            </div>
          </div>
          
          {/* 图片区域 - 在移动端为垂直排列的第二部分 */}
          <div className="w-full md:flex-1 md:basis-0 md:min-w-0 md:max-w-[630px]">
            {/* 轮播图/生成中/生成结果展示区域 - 桌面端 sticky 吸顶 */}
            <div 
              ref={rightStickyRef}
              className="sticky-sidebar md:sticky md:top-4 relative flex flex-col items-start px-5 md:px-0 min-w-0 gap-5"
            >
              {isGenerating ? (
                // 生成中状态
                <div className="w-full aspect-[630/360] relative rounded-[24px] overflow-hidden">
                  {/* 预览图片作为背景 */}
                  {previewImage && (
                    <img 
                      src={previewImage} 
                      alt="Processing" 
                      className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                  )}
                  {/* MeshGradient 动画 */}
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
                  {/* 处理中提示文案 */}
                  <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                    <span className="text-center font-extrabold font-brand text-transparent text-display-7 leading-display-7 bg-[linear-gradient(93deg,_#FFF_-0.7%,_rgba(255,255,255,0.60)_99.98%)] bg-clip-text [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]">
                      {t('processing.magic')}
                    </span>
                  </div>
                </div>
              ) : generatedImage ? (
                // 生成完成状态
                <div className="w-full aspect-[630/360] relative rounded-[24px] overflow-hidden shadow-[0px_4px_40px_0px_rgba(0,0,0,0.12)]">
                  <img 
                    src={generatedImage} 
                    alt="Generated" 
                    className="w-full h-full object-cover"
                  />
                  
                  {/* 订阅覆盖层 - 只在未订阅时显示 */}
                  {isCompleted && !isSubscribed && (
                    <div className="absolute inset-0 z-10">
                      {/* 模糊渐变遮罩 */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent backdrop-blur-[2px]" />
                      
                      {/* 订阅表单 */}
                      <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 px-5">
                        <p className="text-body-3 leading-body-3 font-brand font-semibold text-white text-center w-full drop-shadow-lg mb-4">
                          {t('processing.subscribeTitle')}
                        </p>
                        
                        <div className="w-full max-w-[360px] mx-auto bg-white/95 backdrop-blur-sm rounded-[50px] flex items-center gap-2 relative z-20 py-[3px] pr-[3px] pl-5 shadow-lg">
                          <input
                            type="email"
                            placeholder={t('processing.emailPlaceholder')}
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (emailError) setEmailError(null);
                            }}
                            className="flex-1 bg-transparent border-0 outline-none text-[#242426] placeholder:text-[rgba(36,36,38,0.6)] text-body-3 font-brand h-auto p-0"
                          />
                          <Button 
                            onClick={handleSubscribe}
                            disabled={isSubscribing}
                            className="bg-text-1 hover:bg-text-1/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-[24px] text-body-3 font-brand font-semibold relative z-30 px-3 py-[11px] flex items-center gap-2 shadow-sm" 
                          >
                            {isSubscribing && (
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            )}
                            {t('processing.subscribe')}
                          </Button>
                        </div>
                        {emailError && (
                          <p className="mt-2 text-xs text-red-300 text-center w-full drop-shadow-lg">
                            {emailError}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // 默认轮播图
                <ImageCarousel />
              )}

              {/* 建议区域 - 仅在订阅完成后显示，放在右侧图片下方 */}
              {isCompleted && isSubscribed && designDetails && (
                <div className="w-full bg-[#F5F5F7] rounded-[24px] p-5 md:p-6">
                  <h3 className="text-display-8 leading-display-8 font-extrabold text-left font-brand text-text-1 mb-4">
                    {t('processing.suggestion.title')}
                  </h3>
                  
                  <div className="space-y-4">
                    {/* 设计说明 */}
                    <div>
                      <h4 className="text-body-3 leading-body-3 font-semibold font-brand text-text-1 mb-1">
                        {t('processing.suggestion.desc')}
                      </h4>
                      <div className="text-body-4 leading-body-4 font-normal text-left font-brand text-text-3 prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="text-body-4 leading-body-4 font-normal text-left font-brand text-text-3 mb-1">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-text-1">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc pl-5 space-y-0.5">{children}</ul>,
                            li: ({ children }) => <li className="text-body-4 leading-body-4 font-normal text-left font-brand text-text-3">{children}</li>
                          }}
                        >
                          {designDetails.designDescription}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* 材料建议 */}
                    <div>
                      <h4 className="text-body-3 leading-body-3 font-semibold font-brand text-text-1 mb-1">
                        {t('processing.suggestion.materials')}
                      </h4>
                      <div className="text-body-4 leading-body-4 font-normal text-left font-brand text-text-3 prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="text-body-4 leading-body-4 font-normal text-left font-brand text-text-3 mb-1">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-text-1">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc pl-5 space-y-0.5">{children}</ul>,
                            li: ({ children }) => <li className="text-body-4 leading-body-4 font-normal text-left font-brand text-text-3">{children}</li>
                          }}
                        >
                          {designDetails.materialSuggestions}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* 成本估算 */}
                    <div>
                      <h4 className="text-body-3 leading-body-3 font-semibold font-brand text-text-1 mb-1">
                        {t('processing.suggestion.cost')}
                      </h4>
                      <div className="text-body-4 leading-body-4 font-normal text-left font-brand text-text-3 prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="text-body-4 leading-body-4 font-normal text-left font-brand text-text-3 mb-1">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-text-1">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc pl-5 space-y-0.5">{children}</ul>,
                            li: ({ children }) => <li className="text-body-4 leading-body-4 font-normal text-left font-brand text-text-3">{children}</li>
                          }}
                        >
                          {designDetails.costEstimate}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* 施工要点 */}
                    <div>
                      <h4 className="text-body-3 leading-body-3 font-semibold font-brand text-text-1 mb-1">
                        {t('processing.suggestion.construction')}
                      </h4>
                      <div className="text-body-4 leading-body-4 font-normal text-left font-brand text-text-3 prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="text-body-4 leading-body-4 font-normal text-left font-brand text-text-3 mb-1">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-text-1">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc pl-5 space-y-0.5">{children}</ul>,
                            li: ({ children }) => <li className="text-body-4 leading-body-4 font-normal text-left font-brand text-text-3">{children}</li>
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
          </div>
        </div>
      </div>
  );
}
