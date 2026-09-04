/* NEW · PDF_EXPORT — export ภาพรวมทั้งปีเป็น PDF มีสี (ไฮไลต์เสาร์-อาทิตย์/วันหยุดนักขัตฤกษ์
   เหมือนที่เห็นบนจอ) สำหรับปริ้น/ส่งอีเมลให้ทีมงาน — ต่างจาก xlsx-export.js ตรงที่ต้องคุมสี
   เอง (canvas ไม่รู้จัก CSS variable ตามธีมปัจจุบันของหน้าเว็บ) จึงใช้สีคงที่ hardcode ไว้
   ในสไตล์ .pdf-page เท่านั้น ไม่พึ่ง var(--...) ของหน้าเว็บ — กัน PDF ออกมาเป็นธีมมืดโดยไม่ตั้งใจ */
/* global html2pdf */
import { RotationEngine } from "./rotation-engine.js";
import { UiRenderer } from "./ui-renderer.js";

const MONTH_NAME_TH = [
  "",
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม"
];

/* พิกเซลของหน้า A4 แนวนอนที่ 96dpi (297mm x 210mm) — ให้ jsPDF ใช้ unit "px" ตรงๆ
   ไม่ต้องแปลง mm เอง กัน rounding error ระหว่างทาง */
const PAGE_WIDTH = 1122;
const PAGE_HEIGHT = 794;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = String(text);
  return n;
}

function legendSwatch(cls, label) {
  const span = el("span");
  span.appendChild(el("span", `legend-swatch ${cls}`));
  span.appendChild(document.createTextNode(label));
  return span;
}

function buildLegend() {
  const legend = el("div", "pdf-legend");
  legend.appendChild(legendSwatch("col-weekend", "เสาร์-อาทิตย์"));
  legend.appendChild(legendSwatch("col-holiday", "วันหยุดนักขัตฤกษ์"));
  return legend;
}

function buildMonthPage(patterns, year, month) {
  const page = el("div", "pdf-page");
  page.appendChild(el("div", "pdf-page-header", `ตารางกะ ${year} — ${MONTH_NAME_TH[month]}`));

  patterns.forEach((pattern) => {
    page.appendChild(el("div", "pdf-section-title", pattern.name));
    const monthData = RotationEngine.generateMonth(pattern, year, month);
    page.appendChild(UiRenderer.buildMonthTable(pattern, monthData));
  });

  page.appendChild(buildLegend());
  return page;
}

function buildYearContainer(patterns, year) {
  const root = el("div", "pdf-export-root");
  for (let month = 1; month <= 12; month++) {
    const page = buildMonthPage(patterns, year, month);
    if (month < 12) page.style.pageBreakAfter = "always";
    root.appendChild(page);
  }
  return root;
}

async function exportYearPdf(patterns, year) {
  const root = buildYearContainer(patterns, year);

  /* ซ่อน root ด้วย wrapper ภายนอก (height:0; overflow:hidden;) แทนการตั้ง position:fixed
     บน root เอง — html2pdf.js clone element ที่ .from() ไปวางในโครง container ของตัวเองก่อน
     render เสมอ ถ้า element ต้นทางมี position:fixed ติดมา จะได้ canvas สูง 0px เงียบๆ (ทดสอบ
     จริงแล้วเจอ: ได้ PDF เปล่าไม่มี error ให้เห็นเลย) root ที่ position:static ปกติ ผ่านการ
     ทดสอบแล้วว่า capture ได้ถูกต้อง */
  const hiddenWrap = document.createElement("div");
  hiddenWrap.style.height = "0";
  hiddenWrap.style.overflow = "hidden";
  hiddenWrap.appendChild(root);
  document.body.appendChild(hiddenWrap);

  try {
    await html2pdf()
      .from(root)
      .set({
        margin: 0,
        filename: `ShiftGen_Master_${year}_color.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, windowWidth: PAGE_WIDTH },
        jsPDF: { unit: "px", format: [PAGE_WIDTH, PAGE_HEIGHT], orientation: "landscape" },
        pagebreak: { mode: ["css"] }
      })
      .save();
  } finally {
    document.body.removeChild(hiddenWrap);
  }
}

export const PdfExport = { exportYearPdf };
