import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    /* environment: "jsdom" — ต่างจาก design-lab/starter (Single HTML File) ที่ต้องสร้าง
       JSDOM เองใน harness เพื่อ parse ไฟล์ index.html + รันสคริปต์ inline ตรงนี้ไม่ต้อง
       เพราะโมดูลเป็น ES module ธรรมดา import ตรงๆ ได้ — jsdom แค่ให้ document/window ที่โมดูล
       ต้องใช้ (ui-renderer.js, app-core.js) มีอยู่จริงตอนเทสต์ */
    environment: "jsdom",
    setupFiles: ["./tests/setup.mjs"],
    include: ["tests/unit/**/*.test.mjs"],
    testTimeout: 10000
  }
});
