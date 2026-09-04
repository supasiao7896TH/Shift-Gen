import { defineConfig, devices } from "@playwright/test";

/* PW_CHROMIUM_PATH — เครื่องที่มี Chromium อยู่แล้วแต่โหลด build ของ Playwright ไม่ได้
   (เน็ตบริษัทกรอง / container ที่ preinstall ไว้คนละ build) ชี้ path เองได้
   ไม่ตั้ง = ใช้เบราว์เซอร์ที่ `npx playwright install chromium` โหลดมา ตามปกติ */
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  forbidOnly: !!process.env.CI,
  retries: 0, // ไม่ retry โดยตั้งใจ — เทสต์ที่ผ่านบ้างไม่ผ่านบ้าง คือเทสต์ที่ต้องแก้ ไม่ใช่ต้องรันซ้ำ
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: "http://localhost:4173",
    navigationTimeout: 15_000,
    launchOptions: executablePath ? { executablePath } : {},
    screenshot: "only-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    /* build ก่อนทุกครั้ง (ไม่ใช่แค่ preview เฉยๆ) เพื่อให้ `npm run e2e` รันเดี่ยวๆ ได้เสมอ
       โดยไม่ต้องจำสั่ง `npm run build` แยกก่อน — แลกกับเวลาเพิ่ม ~2-3 วิ ต่อรอบ */
    command: "npm run build && npm run preview",
    url: "http://localhost:4173/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
