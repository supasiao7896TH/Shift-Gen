/* NEW · PDF_EXPORT — export ภาพรวมทั้งปีเป็น PDF มีสี (ไฮไลต์เสาร์-อาทิตย์/วันหยุดนักขัตฤกษ์
   เหมือนที่เห็นบนจอ) สำหรับปริ้น/ส่งอีเมลให้ทีมงาน — ต่างจาก xlsx-export.js ตรงที่ต้องคุมสี
   เอง (canvas ไม่รู้จัก CSS variable ตามธีมปัจจุบันของหน้าเว็บ) จึงใช้สีคงที่ hardcode ไว้
   ในสไตล์ .pdf-page เท่านั้น ไม่พึ่ง var(--...) ของหน้าเว็บ — กัน PDF ออกมาเป็นธีมมืดโดยไม่ตั้งใจ

   รูปแบบ "ภาพรวม" (ตามที่พี่ A ขอ): 2 หน้า ครึ่งปีละหน้า (Jan-Jun / Jul-Dec เหมือน xlsx
   master export) แต่ละหน้ามี 6 ตารางเดือนอัดแน่น — เลือกได้ทีละ 1 pattern (dropdown ในหน้า
   dashboard) แทนการ hardcode ตัด pattern ใดออก เพราะ pattern ไหนยัง "ใช้งานจริง" อยู่
   เปลี่ยนได้ตามเวลา (ตอนนี้ 8Hr 4-2 เลิกใช้แล้ว แต่ Dashboard/Excel ยังเก็บไว้อ้างอิงตามเดิม —
   ไฟล์ภาพรวมนี้ที่เดียวที่ต้องเลือกให้ตรงกับสถานการณ์จริง ณ ตอนกด export) */
/* global html2pdf */
import { RotationEngine } from "./rotation-engine.js";
import { DayType } from "./day-type.js";

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

const HALF_YEARS = [
  { label: "มกราคม - มิถุนายน", months: [1, 2, 3, 4, 5, 6] },
  { label: "กรกฎาคม - ธันวาคม", months: [7, 8, 9, 10, 11, 12] }
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

/* ตารางย่อแบบอัดแน่น: มีแถว SHIFT (ชื่อวันในสัปดาห์ย่อ Mon/Tue/Wed) ต่อจาก DATE เพราะ
   สีพื้นคอลัมน์เสาร์-อาทิตย์อย่างเดียวดูยากเวลาเทียบวันที่จริง (พี่ A ขอ 2569-09-04) —
   เผื่อพื้นที่แนวตั้งด้วยการลด padding ใน .pdf-page-compact table th/td (ดู index.html)
   แทน ไม่ใช่ตัดแถวออก */
function buildCompactMonthTable(pattern, monthData) {
  const dayTypes = monthData.dates.map((dateStr, i) =>
    DayType.classifyDay(dateStr, monthData.weekdays[i])
  );

  function dayCell(tag, text, dayType) {
    const cls =
      dayType.type === "holiday" ? "col-holiday" : dayType.type === "weekend" ? "col-weekend" : "";
    const cell = el(tag, cls ? `num ${cls}` : "num", text);
    if (dayType.label) cell.title = dayType.label;
    return cell;
  }

  const table = el("table");
  const thead = el("thead");
  const trDate = el("tr");
  trDate.appendChild(el("th", null, "DATE"));
  monthData.days.forEach((d, i) => trDate.appendChild(dayCell("th", d, dayTypes[i])));
  thead.appendChild(trDate);
  const trShift = el("tr");
  trShift.appendChild(el("th", null, "SHIFT"));
  monthData.weekdays.forEach((w, i) => trShift.appendChild(dayCell("th", w, dayTypes[i])));
  thead.appendChild(trShift);
  table.appendChild(thead);

  const tbody = el("tbody");
  pattern.roles.forEach((role) => {
    const tr = el("tr");
    tr.appendChild(el("td", null, role));
    monthData.roles[role].forEach((team, i) => tr.appendChild(dayCell("td", team, dayTypes[i])));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

function buildHalfYearPage(pattern, year, half) {
  const page = el("div", "pdf-page pdf-page-compact");
  page.appendChild(el("div", "pdf-page-header", `${pattern.name} — ${year} (${half.label})`));

  half.months.forEach((month) => {
    page.appendChild(el("div", "pdf-month-label", MONTH_NAME_TH[month]));
    const monthData = RotationEngine.generateMonth(pattern, year, month);
    page.appendChild(buildCompactMonthTable(pattern, monthData));
  });

  page.appendChild(buildLegend());
  return page;
}

function buildYearContainer(pattern, year) {
  const root = el("div", "pdf-export-root");
  HALF_YEARS.forEach((half, i) => {
    const page = buildHalfYearPage(pattern, year, half);
    if (i < HALF_YEARS.length - 1) page.style.pageBreakAfter = "always";
    root.appendChild(page);
  });
  return root;
}

/* patterns: array ของ pattern ที่ effective อยู่ (รวม override ถ้ามี) · patternId: id ของ
   pattern ที่พี่ A เลือกจาก dropdown ให้ export — ต้องมีอยู่จริงใน patterns เสมอ (dropdown
   สร้างจาก array เดียวกัน) ไม่ fallback เดาเป็น pattern อื่นถ้าหาไม่เจอ เพื่อไม่ให้ export
   ผิด pattern ไปเงียบๆ */
async function exportYearPdf(patterns, year, patternId) {
  const pattern = patterns.find((p) => p.id === patternId);
  if (!pattern) throw new Error(`ไม่พบ pattern id "${patternId}" ใน patterns ที่ให้มา`);

  const root = buildYearContainer(pattern, year);

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
