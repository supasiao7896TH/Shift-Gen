# CLAUDE.md — ShiftGen

## Project Context
- ชื่อแอป: ShiftGen
- Stack: Multi-File (Vite + ES Modules) · IndexedDB (local-only, ไม่มี Firebase/Gemini)
- Deploy: ยังไม่ deploy ขึ้น URL จริง (รันผ่าน `npm run dev` / build local ก่อน)
- Branch: main

## Commands
- `npm run check` — lint + secret scan + unit test + e2e (ต้องเขียวก่อน deploy)
- `npm run check:local` — ชุดเดียวกันแต่ไม่รวม e2e (เครื่องที่ลง Chromium ไม่ได้)
- `npm test` — unit อย่างเดียว (เร็ว ใช้ระหว่างแก้โค้ด)
- `npm run dev` — Vite dev server + hot reload

## Architecture
- Pattern: ES module ต่อไฟล์ใน `src/modules/` (ดู `vibe-coding-multifile` §21)
- State: Reactive Pub/Sub via `StateStore` (`src/modules/state-store.js`)
- Storage: IndexedDB เท่านั้น (ไม่มี cloud sync) — stores: `patterns` (pattern override), `export_history`
- หัวใจธุรกิจ: `src/modules/rotation-engine.js` — pure function ล้วน คำนวณจาก
  `AppConfig.PATTERNS[].anchorDate` + `.phaseMap` (12 แถว) เท่านั้น ไม่มี state ผูกกับปีไหนปีหนึ่ง
- โมดูลประกาศด้วย `export const`/`export function` — ES module ไม่ auto-global, ปุ่มใน
  `index.html` ทั้งหมดผูก event ผ่าน `addEventListener`/event delegation ใน `app-core.js`
  ไม่มี inline `onclick` จึงไม่ต้อง `window.foo = ...`

## ข้อมูลอ้างอิงสำคัญ — ห้ามแก้ `AppConfig.PATTERNS` มั่วมือ
`src/modules/app-config.js` เก็บ "golden dataset" ที่แกะและ verify จาก
`ตารางกะ 2026.xls` ของจริง (โฟลเดอร์แม่ `Shift Esey/`) — phaseMap ทั้ง 2 pattern
(`12hr-3-3`, `8hr-4-2`) ตรงกับไฟล์ต้นฉบับครบ **365 วัน ปี 2026 ไม่มี exception**
มี golden-dataset test คุมไว้ที่ `tests/unit/rotation-engine.test.mjs` +
fixture `tests/fixtures/shiftgen-2026-golden.json` — **ถ้าจะแก้ phaseMap เริ่มต้น
ต้องรัน `npm test` แล้วดูว่า golden test ยังผ่านไหมก่อนเสมอ** ถ้าไม่ผ่านแปลว่าพิมพ์ผิด
ไม่ใช่ไฟล์ต้นฉบับเปลี่ยน

## Brand Rules
- A(i)CODER brand dock ชุด Studio ต้องมีทุกแอป (พื้นอ่าน var(--surface)/var(--border) ของแอปเอง)
- สี ok/warn/crit ใช้บอกสถานะเท่านั้น · accent-2 (อำพัน) ใช้กับข้อมูลอ้างอิงเท่านั้น
- Font: Noto Sans Thai อย่างเดียว · ตัวเลขในตาราง/KPI ใส่ tabular-nums
- Dark/Light mode: CSS variables บังคับ ครบทั้ง 3 สถานะ

## Current Phase
- [x] Phase 1: Local-First (scaffold จาก `design-lab/starter-multifile/`) — เสร็จแล้ว
- [ ] Phase 2: AI — ข้าม (ไม่จำเป็น logic เป็นสูตรคณิตศาสตร์ล้วน)
- [ ] Phase 3: Cloud Sync — ข้าม เว้นแต่พี่ A อยากให้ทีมเห็นพร้อมกัน real-time ในอนาคต
- [ ] Phase 4: Deploy — ยังไม่ทำ (รอพี่ A ตัดสินใจ Cloudflare Workers/GitHub Pages)

## Known Issues
→ ติดตามที่ GitHub Issues ของ repo นี้ (ไม่ต้องจดซ้ำในไฟล์นี้ เพราะจะตกยุคทันที)

## DO NOT
- ❌ ห้ามแก้ `AppConfig.PATTERNS.phaseMap` โดยไม่รัน golden-dataset test ก่อน-หลัง
- ❌ ห้ามแก้ไฟล์ `sw.js` โดยไม่แจ้ง (จริงๆ ไฟล์นี้ auto-generate จาก `vite-plugin-pwa` ไม่ต้องแตะเลย)
- ❌ ห้าม hardcode API key (ไม่มี API ภายนอกในแอปนี้อยู่แล้ว)
- ❌ ห้ามเปลี่ยน `DB_VERSION` โดยไม่ทำ migration
- ❌ ห้าม deploy โดยที่ `npm run check` ยังไม่เขียว
