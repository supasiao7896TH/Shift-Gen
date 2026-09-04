# context.md — ShiftGen
> อัปเดตล่าสุด: 2569-09-04 | เวอร์ชัน: v1.0

---

## 🎯 ภาพรวมและเป้าหมาย
- **ชื่อแอป:** ShiftGen
- **เป้าหมาย:** แก้ปัญหาที่พี่ A ต้องนั่งกรอกตารางกะ (ตารางกะ 2026.xls) ทั้งปีลงไฟล์ Excel
  ของแต่ละทีมด้วยมือทุกปี — เพราะแท้จริงแล้วตารางกะทั้ง 2 ชุดของโรงงานเป็น **cycle 12 วัน
  ที่หมุนต่อเนื่องตายตัว** ไม่ใช่ข้อมูลสุ่มรายปี ShiftGen จึงคำนวณจากสูตรเดียวแล้ว generate +
  export .xlsx ให้อัตโนมัติทุกปี ไม่ต้องพิมพ์มืออีกต่อไป
- **ผู้ใช้หลัก:** พี่ A และทีม Boardman/Operator กะ GC-M PTA
- **Status:** Deploy แล้ว — https://shiftgen.supasiao.workers.dev (auto-deploy ทุก push เข้า main)

---

## 🏗️ Architecture

### Stack (Multi-File — ดู `vibe-coding-multifile` §21)
- **Frontend:** Vite + ES Modules · Vanilla CSS (design tokens ในตัว `index.html`) · Vanilla JS
- **Storage:** IndexedDB เท่านั้น (local-first) — ไม่มี Firestore/cloud sync
- **AI:** ไม่มี — logic เป็นสูตรคณิตศาสตร์ล้วน ไม่ต้องพึ่ง AI
- **Auth:** ไม่มี — เครื่องมือ generate/export ไม่มีข้อมูลส่วนบุคคล
- **Export:** SheetJS (`xlsx`) โหลดผ่าน CDN (cdnjs) — dynamic import เฉพาะตอนกดปุ่ม export
- **Deploy:** Cloudflare Workers — https://shiftgen.supasiao.workers.dev (`wrangler deploy`
  ธรรมดา ไม่ใช่ versions upload/deploy — ลองแล้วจริงว่า `versions deploy -y` พังเพราะ
  ต้องมี version-id ระบุตรงๆ ถึงจะรันแบบ non-interactive ได้, ShiftGen ไม่ต้อง
  canary/gradual rollout อยู่แล้วเลยไม่คุ้มจะแก้ปัญหานั้น)
- **Test/CI:** Vitest (unit) + Playwright (e2e/a11y) · GitHub Actions (`.github/workflows/ci.yml`)
  รัน check ทุก push/PR แล้ว deploy อัตโนมัติเมื่อ push เข้า main และ check ผ่าน
- **Repo:** https://github.com/supasiao7896TH/Shift-Gen
- **Branch:** main

### JS Modules (ใช้เท่าที่จำเป็น — ตัด CLOUD_SYNC_MANAGER/AUTH_PROVIDER/GEMINI_AI_BRIDGE ออกทั้งหมด)
| Module | ไฟล์ | หน้าที่ |
|--------|------|---------|
| APP_CONFIG | `src/modules/app-config.js` | ค่าคงที่ + golden dataset ของ rotation pattern ทั้ง 2 ชุด |
| STATE_STORE | `src/modules/state-store.js` | Reactive Pub/Sub (เก็บ `overrides` ของ pattern) |
| STORAGE_ENGINE | `src/modules/storage-engine.js` | IndexedDB CRUD (`patterns`, `export_history`) |
| ROTATION_ENGINE | `src/modules/rotation-engine.js` | **หัวใจแอป** — pure function คำนวณตารางกะจาก anchor+phaseMap |
| XLSX_EXPORT | `src/modules/xlsx-export.js` | สร้างไฟล์ .xlsx (master + รายทีม) ผ่าน SheetJS |
| UI_RENDERER | `src/modules/ui-renderer.js` | Component functions (kpi, ตาราง, การ์ดตั้งค่า) — ที่เดียวที่แตะ DOM |
| DEBUG_MODULE | `src/modules/debug-module.js` | Log ring buffer + `?debug=1` |
| APP_CORE | `src/modules/app-core.js` | init, routing (sidebar 2 view), event wiring ทั้งหมด |

### Data Schema (IndexedDB — `shiftgen_db`, DB_VERSION 1)
```
Store: patterns          (override ของ rotation pattern เริ่มต้น — ปกติว่างเปล่า)
  id         : string (PK)  → "12hr-3-3" | "8hr-4-2"
  name, teams, roles, anchorDate, cycleLength, phaseMap : เหมือน AppConfig.PATTERNS
  updatedAt  : timestamp

Store: export_history     (ประวัติการกด export — ยังไม่มี UI แสดงผล เก็บไว้เผื่ออนาคต)
  id         : string (PK)  → `${fileType}-${year}-${timestamp}`
  year       : number
  patternIds : string[]
  fileType   : 'master' | 'teams'
  exportedAt : timestamp
```

### สูตรคำนวณตารางกะ (สิ่งสำคัญที่สุดของโปรเจกต์นี้)
```
phase = ((วันที่ − anchorDate เป็นจำนวนวัน) mod cycleLength + cycleLength) mod cycleLength
roles = pattern.phaseMap[phase]   // {M:'B', N:'C', OM:'D', ON:'A'} หรือ {M:'B', N:'A', O:'C'}
```
- `anchorDate` ของทั้ง 2 pattern คือ `2026-01-01` (phase 0) — verify แล้วว่าตรงกับไฟล์
  `ตารางกะ 2026.xls` ต้นฉบับ **ครบทั้ง 365 วัน ปี 2026 ทั้ง 2 pattern ไม่มี exception เลย**
- พี่ A ยืนยันแล้วว่า cycle นี้ **ต่อเนื่องข้ามปีตลอดไป ไม่เคยมีการรีเซ็ตจุดเริ่มทีม** — จึงคำนวณ
  ปีไหนก็ได้ (อดีต/อนาคต) จากสูตรเดียวโดยไม่ต้องมี input เพิ่มเติมรายปี
- Golden-dataset test: `tests/unit/rotation-engine.test.mjs` + fixture
  `tests/fixtures/shiftgen-2026-golden.json` (แกะจากไฟล์ Excel จริงด้วย pandas)

---

## 🎨 Brand & Design Rules ("Supasit.A Studio")
- เริ่มจาก `design-lab/starter-multifile/` — ไม่ได้สร้าง token ขึ้นใหม่เอง
- A(i)CODER badge → fixed bottom เต็มความกว้าง (บังคับ)
- สี: accent น้ำเงินหมึก `#1D4ED8` = สิ่งที่กดได้ · อำพัน `#8A6410` = ข้อมูลอ้างอิง · ok/warn/crit = สถานะ
- Font: Noto Sans Thai อย่างเดียว · ตัวเลขในตาราง/KPI ใส่ `tabular-nums`
- Dark/Light Mode: CSS variables บังคับ 3 สถานะ (`:root` / `prefers-color-scheme` / `[data-theme]`)
- Layout: sidebar (220px) + content — ออกแบบสำหรับ PC/Desktop เป็นหลักตามที่พี่ A เลือก
  (responsive breakpoint ที่ 900px พับ sidebar ไปด้านบนเผื่อจอเล็ก แต่ไม่ใช่เป้าหมายหลัก)

---

## 📋 Pages / Features
| หน้า/Feature | Status | หมายเหตุ |
|-------------|--------|---------|
| Dashboard — เลือกปี/เดือน + generate | ✅ Done | KPI 4 การ์ด + preview ตาราง master 2 pattern |
| Master preview (month-grid) | ✅ Done | เหมือนไฟล์ Excel ต้นฉบับ (DATE/SHIFT/M/N/OM/ON) |
| ปฏิทินรายทีม (เลือก pattern+ทีม+เดือน) | ✅ Done | |
| Export Master .xlsx (ทั้งปี) | ✅ Done | SheetJS, 2 sheet ครึ่งปี |
| Export ปฏิทินรายทีม .xlsx (ทั้งปี) | ✅ Done | 7 sheet (4 ทีม 12Hr + 3 ทีม 8Hr) |
| ตั้งค่า Rotation Pattern (แก้ phaseMap) | ✅ Done | 3 โหมด view→edit→confirm กันมือลั่น |
| Deploy ขึ้น URL จริง | ✅ Done | shiftgen.supasiao.workers.dev — auto-deploy ทุก push main |

---

## 🚧 Known Issues & TODO
- [ ] ยังไม่ได้ตั้ง repo variable `APP_URL` — step "ตรวจว่า URL จริงเสิร์ฟ commit นี้แล้ว"
  ใน CI จึงข้ามการตรวจอัตโนมัติ (ไม่ fail แค่ไม่ verify) ตั้งได้ที่ Settings → Secrets
  and variables → Actions → Variables → `APP_URL` = `https://shiftgen.supasiao.workers.dev`

---

## 📁 โครงสร้างไฟล์
```
shiftgen/
├── index.html                        ← markup ทั้งหมด, CDN <script> (SheetJS) อยู่ตรงนี้
├── src/
│   ├── main.js                        ← entry point
│   └── modules/
│       ├── app-config.js              ← golden dataset ของ rotation pattern
│       ├── rotation-engine.js         ← หัวใจแอป (pure function)
│       ├── xlsx-export.js             ← สร้างไฟล์ .xlsx
│       ├── state-store.js
│       ├── storage-engine.js
│       ├── ui-renderer.js
│       ├── debug-module.js
│       └── app-core.js
├── tests/
│   ├── unit/*.test.mjs                ← Vitest (golden dataset, xlsx structure, settings flow)
│   ├── e2e/smoke.spec.mjs             ← Playwright (a11y, contrast, focus, service worker)
│   └── fixtures/shiftgen-2026-golden.json  ← ข้อมูลจริงจากไฟล์ Excel ต้นฉบับ (แกะด้วย pandas)
├── package.json
├── manifest.webmanifest               ← generate อัตโนมัติจาก vite-plugin-pwa
├── CLAUDE.md                          ← Claude Code instructions
├── context.md                         ← ไฟล์นี้
└── agents.md                          ← Agent rules
```

---

## 🔗 External Dependencies
- **SheetJS (xlsx):** `https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`
  — โหลดแบบ classic `<script>` ใน `index.html`, ประกาศ `/* global XLSX */` ใน
  `xlsx-export.js`, dynamic-import module นี้เฉพาะตอนกดปุ่ม export (ไม่โหลดตั้งแต่หน้าเปิด)
- ไม่มี Cloudflare Worker / Firebase / external API อื่นในโปรเจกต์นี้

---

## 📄 ที่มาของข้อมูล
ไฟล์ต้นฉบับ `ตารางกะ 2026.xls` อยู่ที่โฟลเดอร์แม่ `Shift Esey/` (นอก repo นี้) — เป็นไฟล์อ้างอิง
ที่พี่ A ใช้ดูภาพรวมทั้งปีเดิม ไม่ได้ถูกแก้ไขหรือ commit เข้า repo นี้
