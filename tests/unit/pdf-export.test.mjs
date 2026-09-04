/**
 * pdf-export.js ใช้ตัวแปร global `html2pdf` ที่มาจาก CDN จริงเฉพาะตอนรันในเบราว์เซอร์
 * เทสต์นี้ stub html2pdf ด้วย fake ที่จับ element/options ที่ส่งเข้าไปแทน — พิสูจน์ว่า
 * ShiftGen สร้างโครง DOM (2 หน้าครึ่งปี, 6 เดือนต่อหน้า, เฉพาะ pattern ที่เลือก, ไฮไลต์ถูก
 * class) และเก็บกวาด DOM ชั่วคราวหลัง export เสร็จ ไม่ได้พิสูจน์ตัว html2pdf/html2canvas เอง
 */
import { describe, expect, it } from "vitest";
import { AppConfig } from "../../src/modules/app-config.js";

function installFakeHtml2pdf(capture) {
  globalThis.html2pdf = () => ({
    from(element) {
      capture.element = element;
      return {
        set(opts) {
          capture.opts = opts;
          return { save: () => Promise.resolve() };
        }
      };
    }
  });
}

describe("PdfExport — exportYearPdf", () => {
  it("สร้าง 2 หน้า (ครึ่งปีละหน้า) แนบเข้า DOM ชั่วคราว แล้วลบออกหลัง save เสร็จ", async () => {
    const capture = {};
    installFakeHtml2pdf(capture);
    const { PdfExport } = await import("../../src/modules/pdf-export.js");
    await PdfExport.exportYearPdf(AppConfig.PATTERNS, 2026, "12hr-3-3");

    expect(capture.element.querySelectorAll(".pdf-page").length).toBe(2);
    expect(capture.opts.filename).toBe("ShiftGen_Master_2026_color.pdf");
    expect(capture.opts.jsPDF.orientation).toBe("landscape");
    expect(document.body.contains(capture.element)).toBe(false);
  });

  it("แต่ละหน้ามี 6 ตารางเดือน (ครึ่งปี) เฉพาะ pattern ที่เลือก ไม่ปนกับ pattern อื่น", async () => {
    const capture = {};
    installFakeHtml2pdf(capture);
    const { PdfExport } = await import("../../src/modules/pdf-export.js");
    await PdfExport.exportYearPdf(AppConfig.PATTERNS, 2026, "12hr-3-3");

    const pages = capture.element.querySelectorAll(".pdf-page");
    pages.forEach((page) => {
      expect(page.querySelectorAll("table").length).toBe(6);
      expect(page.querySelector(".pdf-page-header").textContent).toContain("12 Hr.");
      expect(page.querySelector(".pdf-page-header").textContent).not.toContain("8 Hr.");
    });
  });

  it("เลือก pattern อื่น (8hr-4-2) ได้ตามที่ dropdown ส่งมา ไม่ fallback ไป pattern แรกเงียบๆ", async () => {
    const capture = {};
    installFakeHtml2pdf(capture);
    const { PdfExport } = await import("../../src/modules/pdf-export.js");
    await PdfExport.exportYearPdf(AppConfig.PATTERNS, 2026, "8hr-4-2");

    const firstPage = capture.element.querySelector(".pdf-page");
    expect(firstPage.querySelector(".pdf-page-header").textContent).toContain("8 Hr.");
    // 8hr-4-2 มี role แค่ M/N/O (3 แถว) ไม่ใช่ M/N/OM/ON (4 แถว) แบบ 12hr-3-3
    const firstTable = firstPage.querySelector("table");
    expect(firstTable.querySelectorAll("tbody tr").length).toBe(3);
  });

  it("patternId ที่ไม่มีอยู่จริงต้อง throw ทันที ไม่ใช่เดา pattern อื่นมาแทน", async () => {
    const { PdfExport } = await import("../../src/modules/pdf-export.js");
    await expect(PdfExport.exportYearPdf(AppConfig.PATTERNS, 2026, "ไม่มีจริง")).rejects.toThrow();
  });

  it("มกราคม 2026 (หน้าแรก) ต้องเห็นทั้งไฮไลต์วันหยุดและเสาร์-อาทิตย์", async () => {
    const capture = {};
    installFakeHtml2pdf(capture);
    const { PdfExport } = await import("../../src/modules/pdf-export.js");
    await PdfExport.exportYearPdf(AppConfig.PATTERNS, 2026, "12hr-3-3");

    const h1Page = capture.element.querySelectorAll(".pdf-page")[0];
    expect(h1Page.querySelectorAll("th.col-holiday, td.col-holiday").length).toBeGreaterThan(0);
    expect(h1Page.querySelectorAll("th.col-weekend, td.col-weekend").length).toBeGreaterThan(0);
  });

  it("ไม่มีแถว SHIFT (ชื่อวันเป็นตัวหนังสือ) ในตารางอัดแน่น — เหลือแค่ DATE + role rows", async () => {
    const capture = {};
    installFakeHtml2pdf(capture);
    const { PdfExport } = await import("../../src/modules/pdf-export.js");
    await PdfExport.exportYearPdf(AppConfig.PATTERNS, 2026, "12hr-3-3");

    const firstTable = capture.element.querySelector("table");
    const headerCells = [...firstTable.querySelectorAll("thead tr")].map(
      (tr) => tr.cells[0].textContent
    );
    expect(headerCells).toEqual(["DATE"]);
    expect(firstTable.querySelectorAll("tbody tr").length).toBe(4); // M, N, OM, ON
  });

  it("ถ้า html2pdf โยน error ต้องยังลบ DOM ชั่วคราวออก (finally) ไม่ทิ้งค้าง", async () => {
    globalThis.html2pdf = () => ({
      from: () => ({
        set: () => ({ save: () => Promise.reject(new Error("จำลอง error")) })
      })
    });
    const { PdfExport } = await import("../../src/modules/pdf-export.js");
    const before = document.body.querySelectorAll(".pdf-export-root").length;
    await expect(PdfExport.exportYearPdf(AppConfig.PATTERNS, 2026, "12hr-3-3")).rejects.toThrow();
    expect(document.body.querySelectorAll(".pdf-export-root").length).toBe(before);
  });
});
