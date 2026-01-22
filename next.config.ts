import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  images: {
    // 基于 DPR 的自适应：配合 <Image sizes> 生成多档宽度的 srcset
    // 设备宽度候选（与项目断点保持一致：md=744, lg=1280）
    deviceSizes: [360, 744, 1080, 1280, 1920],
    // 针对固定像素尺寸（如 carousel 在 md 以上固定 400px）提供 DPR 倍数的候选
    imageSizes: [800,1200, 2400],
  },
  turbopack: {
    resolveAlias: {
      canvas: "./empty-module.ts",
    }
  },
};

export default nextConfig;
