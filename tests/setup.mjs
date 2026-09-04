/**
 * Setup ที่รันก่อนทุกไฟล์เทสต์ (ดู vitest.config.mjs → test.setupFiles)
 *
 * เทียบเท่า beforeParse() ของ design-lab/starter/tests/harness/load-app.mjs แต่ทำที่ระดับ
 * global เพราะไม่มี "window ก้อนใหม่ต่อเทสต์" อีกต่อไป — jsdom ของ Vitest ให้ document/window
 * เดียวกันตลอดทั้งไฟล์ ต้อง reset สถานะที่ข้ามเทสต์ได้เอง (indexedDB, localStorage) ทุกครั้ง
 */
import { beforeEach, vi } from "vitest";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";

beforeEach(() => {
  // indexedDB ก้อนใหม่ทุกเทสต์ — กันข้อมูลปนกันข้ามเทสต์ (เทียบเท่า idb: null ของ loadApp())
  globalThis.indexedDB = new IDBFactory();
  globalThis.IDBKeyRange = IDBKeyRange;

  // jsdom ไม่ implement matchMedia — ต้อง polyfill เอง ค่าเริ่มต้น "ไม่ match dark" เสมอ
  // เทสต์ที่ต้องการ dark mode จริงๆ ให้ vi.spyOn(window, "matchMedia") ทับเฉพาะเทสต์นั้น
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));

  // localStorage ของ jsdom ใช้งานได้จริงอยู่แล้ว — แค่ล้างข้อมูลไม่ให้รั่วข้ามเทสต์
  localStorage.clear();

  // รีเซ็ต data-theme ไม่ให้เทสต์ก่อนหน้าทิ้งรอยไว้
  document.documentElement.removeAttribute("data-theme");

  // ปิดเน็ตโดยตั้งใจ — เทสต์ที่ต้องพึ่ง network คือเทสต์ที่เชื่อถือไม่ได้
  globalThis.fetch = () => Promise.reject(new Error("network ถูกปิดในเทสต์"));
});
