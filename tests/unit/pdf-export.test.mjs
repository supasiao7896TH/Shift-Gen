/**
 * pdf-export.js ใช้ตัวแปร global `html2pdf` ที่มาจาก CDN จริงเฉพาะตอนรันในเบราว์เซอร์
 * เทสต์นี้ stub html2pdf ด้วย fake ที่จับ element/options ที่ส่งเข้าไปแทน — พิสูจน์ว่า
 * ShiftGen สร้างโครง DOM (12 หน้า, ตารางครบ pattern, ไฮไลต์ถูก class) และเก็บกวาด DOM
 * ชั่วคราวหลัง export เสร็จ ไม่ได้พิสูจน์ตัว html2pdf/html2canvas เอง
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
  it("สร้าง 12 หน้า (เดือนละ 1 หน้า) แนบเข้า DOM ชั่วคราว แล้วลบออกหลัง save เสร็จ", async () => {
    const capture = {};
    installFakeHtml2pdf(capture);
    const { PdfExport } = await import("../../src/modules/pdf-export.js");
    await PdfExport.exportYearPdf(AppConfig.PATTERNS, 2026);

    expect(capture.element.querySelectorAll(".pdf-page").length).toBe(12);
    expect(capture.opts.filename).toBe("ShiftGen_Master_2026_color.pdf");
    expect(capture.opts.jsPDF.orientation).toBe("landscape");
    expect(document.body.contains(capture.element)).toBe(false);
  });

  it("แต่ละหน้ามีตารางครบทุก pattern และมกราคม 2026 ต้องเห็นทั้งไฮไลต์วันหยุดและเสาร์-อาทิตย์", async () => {
    const capture = {};
    installFakeHtml2pdf(capture);
    const { PdfExport } = await import("../../src/modules/pdf-export.js");
    await PdfExport.exportYearPdf(AppConfig.PATTERNS, 2026);

    const janPage = capture.element.querySelectorAll(".pdf-page")[0];
    expect(janPage.querySelectorAll("table").length).toBe(AppConfig.PATTERNS.length);
    expect(janPage.querySelectorAll("th.col-holiday, td.col-holiday").length).toBeGreaterThan(0);
    expect(janPage.querySelectorAll("th.col-weekend, td.col-weekend").length).toBeGreaterThan(0);
  });

  it("ถ้า html2pdf โยน error ต้องยังลบ DOM ชั่วคราวออก (finally) ไม่ทิ้งค้าง", async () => {
    globalThis.html2pdf = () => ({
      from: () => ({
        set: () => ({ save: () => Promise.reject(new Error("จำลอง error")) })
      })
    });
    const { PdfExport } = await import("../../src/modules/pdf-export.js");
    const before = document.body.querySelectorAll(".pdf-export-root").length;
    await expect(PdfExport.exportYearPdf(AppConfig.PATTERNS, 2026)).rejects.toThrow();
    expect(document.body.querySelectorAll(".pdf-export-root").length).toBe(before);
  });
});
