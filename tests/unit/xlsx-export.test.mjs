/**
 * xlsx-export.js ใช้ตัวแปร global `XLSX` ที่มาจาก CDN (SheetJS) จริงเฉพาะตอนรันในเบราว์เซอร์
 * เทสต์นี้ stub XLSX ด้วย fake ที่คืนโครง {sheets:[[name, aoaRows]]} แทน — พิสูจน์แค่ว่า
 * ShiftGen สร้าง "แถวข้อมูล" (aoa rows) ถูกต้อง ไม่ได้พิสูจน์ตัว SheetJS เอง (นั่นคือหน้าที่ของ
 * SheetJS ไม่ใช่ของเรา — ดู e2e smoke test สำหรับพิสูจน์ว่าไฟล์จริง .xlsx ดาวน์โหลดได้)
 */
import { beforeEach, describe, expect, it } from "vitest";
import { AppConfig } from "../../src/modules/app-config.js";

function installFakeXlsx() {
  const wb = { sheets: [] };
  globalThis.XLSX = {
    utils: {
      book_new: () => wb,
      aoa_to_sheet: (rows) => ({ rows }),
      book_append_sheet: (book, ws, name) => book.sheets.push([name, ws.rows])
    },
    writeFile: () => {}
  };
  return wb;
}

describe("XlsxExport — buildMasterWorkbook", () => {
  beforeEach(() => installFakeXlsx());

  it("สร้าง 2 ชีท Jan-Jun / Jul-Dec ตามปีที่ขอ", async () => {
    const { XlsxExport } = await import("../../src/modules/xlsx-export.js");
    const wb = XlsxExport.buildMasterWorkbook(AppConfig.PATTERNS, 2027);
    expect(wb.sheets.map(([name]) => name)).toEqual(["Jan-Jun 2027", "Jul-Dec 2027"]);
  });

  it("แถวแรกของแต่ละ block เดือนคือ DATE ตามด้วยเลขวันครบ 31 วันสำหรับเดือน ม.ค.", async () => {
    const { XlsxExport } = await import("../../src/modules/xlsx-export.js");
    const wb = XlsxExport.buildMasterWorkbook(AppConfig.PATTERNS, 2026);
    const [, rows] = wb.sheets[0]; // Jan-Jun 2026
    const dateRow = rows.find((r) => r[0] === "DATE");
    expect(dateRow.slice(1)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
  });

  it("แถว role (M) ของเดือน ม.ค. 2026 ตรงกับ golden dataset (B,B,A,A,A,C,C,C,D,D,D,B,B,...)", async () => {
    const { XlsxExport } = await import("../../src/modules/xlsx-export.js");
    const pattern12hr = AppConfig.PATTERNS.find((p) => p.id === "12hr-3-3");
    const wb = XlsxExport.buildMasterWorkbook([pattern12hr], 2026);
    const [, rows] = wb.sheets[0];
    const mRow = rows.find((r) => r[0] === "M");
    expect(mRow.slice(1, 11)).toEqual(["B", "B", "A", "A", "A", "C", "C", "C", "D", "D"]);
  });
});

describe("XlsxExport — buildTeamWorkbook", () => {
  beforeEach(() => installFakeXlsx());

  it("สร้าง 1 ชีทต่อ 1 ทีมต่อ 1 pattern (รวม 4+3 = 7 ชีท)", async () => {
    const { XlsxExport } = await import("../../src/modules/xlsx-export.js");
    const wb = XlsxExport.buildTeamWorkbook(AppConfig.PATTERNS, 2026);
    expect(wb.sheets.length).toBe(7);
    expect(wb.sheets.map(([name]) => name)).toContain("12Hr 3-3 A");
    expect(wb.sheets.map(([name]) => name)).toContain("8Hr 4-2 C");
  });

  it("แต่ละชีททีมมีแถวข้อมูลครบ 365 วัน + 1 แถว header", async () => {
    const { XlsxExport } = await import("../../src/modules/xlsx-export.js");
    const wb = XlsxExport.buildTeamWorkbook(AppConfig.PATTERNS, 2026);
    const [, rows] = wb.sheets[0];
    expect(rows.length).toBe(366);
    expect(rows[0]).toEqual(["วันที่", "วัน", "ตำแหน่ง (Role)"]);
  });
});
