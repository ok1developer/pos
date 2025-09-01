// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // --- ส่วนของ images ที่มีอยู่แล้ว ---
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wttr.in",
        port: "",
        pathname: "/**", // อนุญาตทุก path ภายใต้ wttr.in
      },
    ],
  },
  
  // --- เพิ่มส่วนของ webpack สำหรับจัดการ SVG ---
  webpack(config, { isServer }) {
    // ดักจับ Rule เดิมที่ Next.js ใช้จัดการกับ SVG
    const fileLoaderRule = config.module.rules.find((rule: any) =>
      rule.test?.test?.(".svg")
    );

    config.module.rules.push(
      // เพิ่ม Rule ใหม่เพื่อให้เราสามารถ import SVG เป็น React Component ได้
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      // Rule สำหรับแปลง SVG เป็น Component เมื่อ import แบบปกติ
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] }, // ไม่ใช่ *.svg?url
        use: ["@svgr/webpack"],
      }
    );

    // แก้ไข Rule เดิมไม่ให้จัดการกับ SVG ที่เราจะใช้เป็น Component
    if (fileLoaderRule) {
      fileLoaderRule.exclude = /\.svg$/i;
    }

    return config;
  },
};

export default nextConfig;