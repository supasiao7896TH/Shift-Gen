/* entry point — เดิมคือ APP_CORE.init() ที่ผูกกับ DOMContentLoaded ใน Single HTML File
   ตอนนี้แยกเป็น 2 หน้าที่: main.js = ต่อสายไฟ, app-core.js = logic จริง */
import { AppCore } from "./modules/app-core.js";

/* virtual:pwa-register มาจาก vite-plugin-pwa (ดู vite.config.js) — ให้ปลั๊กอินเป็นคน
   generate service worker ให้เอง แทนการเขียน sw.js มือแล้วต้องจำ bump CACHE_NAME
   (บั๊กที่เกิดจริงมาแล้วหลายครั้งฝั่ง Single HTML File — ดู vibe-coding-quality §25.4) */
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

document.addEventListener("DOMContentLoaded", AppCore.init);
