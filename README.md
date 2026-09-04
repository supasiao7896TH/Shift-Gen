# ไฟล์ตั้งต้น — Supasit.A Studio (Multi-File)

ก๊อปโฟลเดอร์นี้ทั้งอัน แล้วเริ่มแอปใหม่ได้ทันที **ไม่ต้องให้ AI สร้าง token/โครงใหม่ทุกครั้ง**

เวอร์ชันนี้คือ **Multi-File (Vite + ES Modules)** — ค่าเริ่มต้นของทุกโปรเจกต์ใหม่ตั้งแต่
2569-09-02 (ดู USER.md "การตัดสินใจที่ยืนยันแล้ว") ถ้าโปรเจกต์เป็นเครื่องมือเล็กมากที่ใช้
ครั้งเดียวทิ้ง ไม่ต้อง deploy ถาวร ให้ใช้ `design-lab/starter/` (Single HTML File) แทน

## เริ่มโปรเจกต์ใหม่ 8 ขั้นตอน

1. `cp -r design-lab/starter-multifile <ชื่อโปรเจกต์ใหม่>` — คัดลอกไฟล์ที่ขึ้นต้นด้วยจุดไปด้วย
2. `npm ci && npm test` — **ต้องเขียวก่อนเริ่มเขียนฟีเจอร์แรก**
   ถ้าแดงตั้งแต่ยังไม่ได้แก้อะไร แปลว่าการคัดลอกไม่ครบ · `npm ci` ติดตั้ง git hook ให้ด้วย
3. แก้ชื่อแอป 4 จุด: `<title>` · `.app-name` · `AppConfig.APP_NAME` (`src/modules/app-config.js`)
   · `manifest` ใน `vite.config.js`
4. แก้ `AppConfig.DB_NAME` + `STORES` ให้ตรงกับข้อมูลของแอปนี้
5. ตั้ง `AppConfig.ISSUE_URL` เป็น `https://github.com/<user>/<repo>/issues/new`
   — ปุ่ม "รายงานปัญหา" จะเงียบถ้าเว้นว่างไว้
   · คัดลอก `wrangler.jsonc.example` → `wrangler.jsonc` แล้วแก้ `name`/`account_id`
   · ตั้ง repo variable **`APP_URL`** (Settings → Secrets and variables → Actions → Variables)
     ให้ชี้ URL production
   · ตั้ง repo secret **`CLOUDFLARE_API_TOKEN`** (จำกัดสิทธิ์แค่ "Edit Cloudflare Workers")
6. ลบข้อมูลตัวอย่างใน `AppCore.init()` (`src/modules/app-core.js`) แล้วต่อกับ `StorageEngine` จริง
7. เพิ่ม/แก้โมดูลใน `src/modules/` ตามที่แอปต้องใช้จริง — ไม่บังคับครบ 9 (ดู
   `vibe-coding-multifile` §21)
8. **ไม่มีขั้นตอน bump CACHE_NAME** — `vite-plugin-pwa` generate service worker จาก build
   manifest ให้เองทุกครั้งที่ `npm run build` (ดู "ต่างจาก Single HTML File ตรงไหน" ด้านล่าง)

## คำสั่งที่ใช้จริง

| คำสั่ง | ใช้เมื่อไหร่ | เวลาที่ใช้ |
|---|---|---|
| `npm run dev` | ระหว่างแก้โค้ด — Vite dev server + hot reload | ทันที |
| `npm test` | ระหว่างแก้โค้ด — เร็วที่สุด ไม่ต้องมีเบราว์เซอร์ | ~2 วิ |
| `npm run e2e` | ก่อนส่งงาน — build จริง + เบราว์เซอร์จริง ตรวจ contrast/44px/โฟกัส/service worker | ~15 วิ |
| `npm run check` | **ก่อน deploy ทุกครั้ง** — lint + secret + unit + e2e | ~20 วิ |
| `npm run check:local` | เครื่องที่ลง Chromium ไม่ได้ (ตัด e2e ออก) | ~5 วิ |

> เครื่องที่มี Chromium อยู่แล้วแต่โหลด build ของ Playwright ไม่ได้:
> `PW_CHROMIUM_PATH=/path/to/chrome npm run e2e`

## ต่างจาก Single HTML File (`design-lab/starter/`) ตรงไหน

| จุด | Single HTML File | Multi-File (ที่นี่) |
|---|---|---|
| โมดูล | `var MODULE = (function(){...})()` ในไฟล์เดียว | `export const Module = {...}` คนละไฟล์ใน `src/modules/` |
| เทสต์ unit | parse `index.html` เข้า jsdom แล้วรันสคริปต์ inline (`tests/harness/load-app.mjs`) | `import` โมดูลตรงๆ (`tests/harness/mount.mjs` มีไว้แค่ mount markup ให้ DOM-driven test) |
| Service Worker | เขียนมือใน `sw.js` — ต้องจำ bump `CACHE_NAME` เอง | `vite-plugin-pwa` generate ให้เองจาก build manifest จริง — **ไม่มีเลขให้ลืม** |
| Deploy ขึ้น URL | `assets.directory: "./"` + ต้องมี `.assetsignore` กัน `tests/`/`node_modules` หลุด | `assets.directory: "./dist"` — ไม่มีทางมีไฟล์เทสต์หลุดไปด้วยตั้งแต่ต้น ไม่ต้องมี `.assetsignore` |
| CDN libraries (Tailwind/Chart.js/ฯลฯ) | โหลดผ่าน `<script>` เหมือนเดิม | เหมือนเดิม — ดู `src/modules/chart-theme.js` ตัวอย่างการประกาศ `/* global X */` |

เทสต์ยังแบ่ง 2 ชั้นเหมือนเดิม (unit/jsdom ตรวจ logic · e2e/Playwright ตรวจสิ่งที่ jsdom ทำไม่ได้)
รายละเอียดเต็มอยู่ที่ `vibe-coding-quality` §25 (`references/testing-single-html.md` อธิบาย
หลักการเดียวกัน แค่กลไกโหลดต่างกันตามตารางข้างบน)

## มีอะไรมาให้แล้ว

| ไฟล์ | เนื้อหา |
|---|---|
| `index.html` + `src/` | token Supasit.A Studio ครบ (สว่าง + มืด 3 สถานะ) · component พื้นฐาน · 7 โมดูล ES · ปุ่มสลับธีม · brand dock · CSP · helper กัน XSS |
| `src/modules/chart-theme.js` | ธีม Chart.js ที่อ่านสีจาก CSS variable (ลบทิ้งได้ถ้าไม่ใช้ Chart.js) |
| `vite.config.js` | ตั้งค่า `vite-plugin-pwa` (manifest + service worker อัตโนมัติ) |
| `tests/` | ชุดทดสอบ 2 ชั้นเดียวกับ `design-lab/starter` |
| `.github/workflows/` | CI ที่กันโค้ดไม่ผ่านเทสต์ขึ้น production · preview URL ทุก PR · uptime check รายชั่วโมง |
| `.husky/pre-commit` | รัน format + secret scan + unit test ก่อน commit ให้อัตโนมัติ |
| `wrangler.jsonc.example` | ตัวอย่าง config deploy Cloudflare Workers — `assets.directory: "./dist"` |

## กติกาที่ห้ามพลาด

- **ห้าม `innerHTML` กับข้อมูลจากผู้ใช้** — ใช้ `UiRenderer.el()` ที่เขียนด้วย `textContent` ให้แล้ว
- **`localStorage` ต้องอยู่ใน `try/catch` เสมอ** — โหมดส่วนตัวโยน error ได้
- **ธีมต้องครบ 3 สถานะ** — `:root` (สว่าง) · `prefers-color-scheme` (ตามระบบ) · `[data-theme]` (ผู้ใช้เลือก)
- **ทุกสีต้องมาจาก token** — ห้าม hardcode hex ในโค้ดแอป
- **เป้าแตะบนมือถืออย่างน้อย 44px** — `.btn` ตั้งไว้ให้แล้ว
- **เปลี่ยน `DB_VERSION` ต้องเขียน migration แบบเพิ่มอย่างเดียว** — ไม่มี down-migration
  `StorageEngine.open()` ปิด connection เก่าให้เองเมื่อมีเวอร์ชันใหม่ขอ upgrade (`onversionchange`)
  และ reject พร้อมข้อความที่อ่านรู้เรื่องถ้าโดนบล็อก
- **CDN libraries เดิมยังโหลดผ่าน `<script>` ได้** — โมดูลที่ใช้ประกาศ `/* global X */` แทนการ
  `import` จาก npm (ดู `chart-theme.js`) — อย่าย้าย 2 อย่างพร้อมกัน (แยกไฟล์ + เปลี่ยน import)
