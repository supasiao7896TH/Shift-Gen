/**
 * mount() — วาง body markup จาก index.html ตัวจริงลงใน document ของเทสต์ (jsdom)
 *
 * ทำไมต้องอ่านจากไฟล์จริง ไม่ใช่ก็อป markup มาวางในเทสต์อีกที: ถ้ามีคนเปลี่ยน id ใน
 * index.html (เช่น #kpiRow → #kpi-row) แต่ลืมแก้ ui-renderer.js เทสต์ที่ mount() จากไฟล์จริง
 * จะจับได้ทันทีเพราะ document.getElementById() คืน null — เทียบเท่ากับสิ่งที่
 * design-lab/starter/tests/harness/load-app.mjs ป้องกันไว้ (ทดสอบไฟล์ที่ deploy จริง)
 * แค่ไม่ต้อง "รันสคริปต์ inline" เพราะ multi-file ไม่มีสคริปต์ inline ให้รันอีกแล้ว
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function mount() {
  const html = readFileSync(resolve(ROOT, "index.html"), "utf8");
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!body) throw new Error("index.html ไม่มี <body> — mount() พังตั้งแต่ parse");
  document.body.innerHTML = body[1];
}
