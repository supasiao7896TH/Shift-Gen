/* 1 · APP_CONFIG — ค่าคงที่ที่โมดูลอื่นห้ามแก้
   PATTERNS คือ "golden dataset" ที่แกะมาจาก ตารางกะ 2026.xls ของจริง (พี่ A GC-M PTA)
   verify แล้วว่า phaseMap ตรงกับไฟล์ต้นฉบับครบทั้ง 365 วันของปี 2026 ไม่มี exception เลย
   สูตร: phase = ((วันที่ − anchorDate ในหน่วยวัน) mod cycleLength + cycleLength) mod cycleLength
   แล้ว lookup phaseMap[phase] เพื่อได้ว่าแต่ละ role (M/N/OM/ON หรือ M/N/O) เป็นทีมไหน
   พี่ A ยืนยันแล้วว่า cycle นี้ต่อเนื่องข้ามปีตลอดไป ไม่เคยมีการรีเซ็ตจุดเริ่มทีม */
export const AppConfig = Object.freeze({
  APP_NAME: "ShiftGen",
  DB_NAME: "shiftgen_db",
  DB_VERSION: 1,
  STORES: ["patterns", "export_history"],
  THEME_KEY: "shiftgen:theme",
  /* ใส่ .../issues/new ของ repo แอปนี้ — ว่างไว้ = ปุ่มรายงานปัญหาจะเงียบ */
  ISSUE_URL: "",

  PATTERNS: [
    {
      id: "12hr-3-3",
      name: "PRODUCTION SHIFT WORK (12 Hr.) 3 - 3",
      shortLabel: "12Hr 3-3",
      teams: ["A", "B", "C", "D"],
      roles: ["M", "N", "OM", "ON"],
      anchorDate: "2026-01-01",
      cycleLength: 12,
      phaseMap: [
        { M: "B", N: "C", OM: "D", ON: "A" },
        { M: "B", N: "C", OM: "D", ON: "A" },
        { M: "A", N: "D", OM: "B", ON: "C" },
        { M: "A", N: "D", OM: "B", ON: "C" },
        { M: "A", N: "D", OM: "B", ON: "C" },
        { M: "C", N: "B", OM: "A", ON: "D" },
        { M: "C", N: "B", OM: "A", ON: "D" },
        { M: "C", N: "B", OM: "A", ON: "D" },
        { M: "D", N: "A", OM: "C", ON: "B" },
        { M: "D", N: "A", OM: "C", ON: "B" },
        { M: "D", N: "A", OM: "C", ON: "B" },
        { M: "B", N: "C", OM: "D", ON: "A" }
      ]
    },
    {
      id: "8hr-4-2",
      name: "PRODUCTION SHIFT WORK (8 Hr.) 4 - 2",
      shortLabel: "8Hr 4-2",
      teams: ["A", "B", "C"],
      roles: ["M", "N", "O"],
      anchorDate: "2026-01-01",
      cycleLength: 12,
      phaseMap: [
        { M: "B", N: "A", O: "C" },
        { M: "C", N: "A", O: "B" },
        { M: "C", N: "A", O: "B" },
        { M: "C", N: "B", O: "A" },
        { M: "C", N: "B", O: "A" },
        { M: "A", N: "B", O: "C" },
        { M: "A", N: "B", O: "C" },
        { M: "A", N: "C", O: "B" },
        { M: "A", N: "C", O: "B" },
        { M: "B", N: "C", O: "A" },
        { M: "B", N: "C", O: "A" },
        { M: "B", N: "A", O: "C" }
      ]
    }
  ]
});
