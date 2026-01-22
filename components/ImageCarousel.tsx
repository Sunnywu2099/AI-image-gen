"use client";

import { useEffect, useState, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import type { Swiper as SwiperType } from 'swiper';
import Image from "next/image";
import { shopifyImageLoader } from "@/lib/utils";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const exampleImages = [
  {
    src: "https://cdn.shopify.com/s/files/1/0812/9049/4250/files/img_holder_1_1.webp?v=1759040450",
    alt: "Pool example 1",
  },
  {
    src: "https://cdn.shopify.com/s/files/1/0812/9049/4250/files/img_holder_2_1.webp?v=1759040457", 
    alt: "Pool example 2",
  },
  {
    src: "https://cdn.shopify.com/s/files/1/0812/9049/4250/files/img_holder_3_1.webp?v=1759040437", 
    alt: "Pool example 3",
  }
];

export function ImageCarousel() {
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const swiperRef = useRef<SwiperType | null>(null);


  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="relative w-full flex items-center justify-center">
        <div className="w-full aspect-[353/202] md:max-w-[400px] md:aspect-[400/322] bg-gradient-to-br from-blue-100 to-green-100 rounded-[4px] border-[12px] border-white shadow-[0px_4px_40px_0px_rgba(0,0,0,0.12)]" />
      </div>
    );
  }

  return (
    <div className="relative w-full flex items-center justify-center min-w-0">
      <div className="w-full aspect-[353/202] md:max-w-[630px] md:aspect-[630/360] relative group min-w-0">
        <Swiper
          modules={[Autoplay, Navigation]}
          spaceBetween={0}
          slidesPerView={1}
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          loop={true}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          onSlideChange={(swiper) => {
            setActiveIndex(swiper.realIndex);
          }}
          className="w-full h-full rounded-[4px]"
        >
        {exampleImages.map((image, index) => (
          <SwiperSlide key={index}>
            <div className="relative w-full h-full">
              <Image
                loader={shopifyImageLoader}
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 744px) 2400px, 100vw"
                className="object-cover"
                priority={index === 0}
              />
            </div>
          </SwiperSlide>
        ))}
        </Swiper>
        
        {/* 左侧导航按钮 - 仅在桌面端hover时显示 */}
        <button
          onClick={() => swiperRef.current?.slidePrev()}
          className="hidden md:flex absolute left-4 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/35 backdrop-blur-sm items-center justify-center hover:bg-black/50 transition-all duration-200 opacity-0 group-hover:opacity-100"
          aria-label="Previous slide"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="33" height="32" viewBox="0 0 33 32" fill="none">
            <path d="M11.4336 15.2953L18.7461 8.15662C19.1211 8.56512 19.3086 9.0298 19.3086 9.55065C19.3086 10.0715 19.1211 10.5362 18.7461 10.9447L13.5586 15.9999L18.7461 21.0552C19.1211 21.4637 19.3086 21.9284 19.3086 22.4493C19.3086 22.9701 19.1211 23.4348 18.7461 23.8433L11.4336 16.7046C11.2461 16.5004 11.1523 16.2655 11.1523 16C11.1523 15.7344 11.2461 15.4995 11.4336 15.2953Z" fill="white"/>
            <path d="M11.4336 15.2949L18.7461 8.15625C19.1211 8.56476 19.3086 9.02943 19.3086 9.55028C19.3086 10.0711 19.1211 10.5358 18.7461 10.9443L13.5586 15.9996L18.7461 21.0549C19.1211 21.4634 19.3086 21.928 19.3086 22.4489C19.3086 22.9697 19.1211 23.4344 18.7461 23.8429L11.4336 16.7043C11.2461 16.5 11.1523 16.2651 11.1523 15.9996C11.1523 15.7341 11.2461 15.4992 11.4336 15.2949Z" fill="white"/>
          </svg>
        </button>

        {/* 右侧导航按钮 - 仅在桌面端hover时显示 */}
        <button
          onClick={() => swiperRef.current?.slideNext()}
          className="hidden md:flex absolute right-4 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/35 backdrop-blur-sm items-center justify-center hover:bg-black/50 transition-all duration-200 opacity-0 group-hover:opacity-100"
          aria-label="Next slide"
        >
         <svg xmlns="http://www.w3.org/2000/svg" width="33" height="32" viewBox="0 0 33 32" fill="none">
          <path d="M21.2344 16.7047L13.9219 23.8434C13.5469 23.4349 13.3594 22.9702 13.3594 22.4494C13.3594 21.9285 13.5469 21.4638 13.9219 21.0553L19.1094 16.0001L13.9219 10.9448C13.5469 10.5363 13.3594 10.0716 13.3594 9.55075C13.3594 9.0299 13.5469 8.56522 13.9219 8.15672L21.2344 15.2954C21.4219 15.4996 21.5156 15.7345 21.5156 16.0001C21.5156 16.2656 21.4219 16.5005 21.2344 16.7047Z" fill="white"/>
          <path d="M21.2344 16.7051L13.9219 23.8438C13.5469 23.4352 13.3594 22.9706 13.3594 22.4497C13.3594 21.9289 13.5469 21.4642 13.9219 21.0557L19.1094 16.0004L13.9219 10.9451C13.5469 10.5366 13.3594 10.072 13.3594 9.55111C13.3594 9.03027 13.5469 8.56559 13.9219 8.15708L21.2344 15.2957C21.4219 15.5 21.5156 15.7349 21.5156 16.0004C21.5156 16.2659 21.4219 16.5008 21.2344 16.7051Z" fill="white"/>
        </svg>
        </button>
      </div>
      
      {/* 自定义步骤指示器 */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex items-center gap-2">
          {exampleImages.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-lg transition-all duration-200 ${
                index === activeIndex ? "w-10" : "w-3"
              } ${
                index === activeIndex 
                  ? "bg-text-1-80" 
                  : "bg-text-1-35"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
