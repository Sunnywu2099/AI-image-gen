import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ImageLoader } from "next/image";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 自定义 Shopify CDN 图片 Loader：
// - 作用：与 next/image 搭配，按需为 URL 追加 width/quality 参数
// - 优点：浏览器直连 Shopify CDN，不占用 Vercel Image Optimization 流量
// - 注意：仅当传入的 width/quality 为有效数字时才追加参数，避免出现 undefined
export const shopifyImageLoader: ImageLoader = ({ src, width, quality }) => {
  try {
    const url = new URL(src);
    if (typeof width === "number" && Number.isFinite(width) && width > 0) {
      url.searchParams.set("width", String(width));
    }
    if (typeof quality === "number" && Number.isFinite(quality) && quality > 0) {
      url.searchParams.set("quality", String(quality));
    }
    return url.toString();
  } catch {
    // 如果 URL 构造失败（非常规 src），回退为追加查询参数的方式
    const sep = src.includes("?") ? "&" : "?";
    const params: string[] = [];
    if (typeof width === "number" && Number.isFinite(width) && width > 0) {
      params.push(`width=${width}`);
    }
    if (typeof quality === "number" && Number.isFinite(quality) && quality > 0) {
      params.push(`quality=${quality}`);
    }
    return params.length ? `${src}${sep}${params.join("&")}` : src;
  }
};
