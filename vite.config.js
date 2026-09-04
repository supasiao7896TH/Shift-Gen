import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      // generateSW: Workbox สร้าง service worker จาก build manifest จริงให้เอง
      // แก้ปัญหา "ลืม bump CACHE_NAME" ทั้งคลาส เพราะไม่มีเลขเวอร์ชันให้คนพิมพ์เองอีกต่อไป
      strategies: "generateSW",
      registerType: "autoUpdate",
      // เราเรียก registerSW() เองใน src/main.js — ปิดการแทรก <script> ลงทะเบียนอัตโนมัติ
      // (ปลั๊กอินยังแทรก <link rel="manifest"> ให้เสมอเมื่อตั้ง manifest ไว้ ไม่มีสวิตช์แยก
      // ปิดเฉพาะจุดนั้น — ยืนยันจากซอร์สจริงของ vite-plugin-pwa@1.3.0 — ดังนั้น index.html
      // "ห้ามเขียน" <link rel="manifest"> เองซ้ำ ไม่งั้นจะได้ 2 อัน)
      injectRegister: false,
      manifest: {
        name: "ShiftGen — Supasit.A",
        short_name: "ShiftGen",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#F7F9FC",
        theme_color: "#F7F9FC",
        lang: "th",
        icons: [
          { src: "/assets/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/assets/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
        ]
      },
      workbox: {
        // เก็บเฉพาะไฟล์ของตัวเอง — ฟอนต์/CDN ข้ามโดเมนปล่อยผ่าน ไม่ยัดลง precache
        globPatterns: ["**/*.{html,js,css,svg,webmanifest}"],
        navigateFallback: "/index.html"
      }
    })
  ]
});
