/* NEW · XLSX_EXPORT — สร้างไฟล์ .xlsx ฝั่ง client ล้วน (SheetJS โหลดผ่าน CDN)
   ไม่มีข้อมูลอะไรออกจากเครื่องเลย เพราะทุกอย่างคำนวณและ export ในเบราว์เซอร์ */
/* global XLSX */
import { RotationEngine } from "./rotation-engine.js";

const MONTH_LABEL = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

function monthBlockRows(pattern, year, month) {
  const m = RotationEngine.generateMonth(pattern, year, month);
  const rows = [
    [`${MONTH_LABEL[month]} '${String(year).slice(-2)}`],
    ["DATE", ...m.days],
    ["SHIFT", ...m.weekdays]
  ];
  pattern.roles.forEach((r) => rows.push([r, ...m.roles[r]]));
  rows.push([]);
  return rows;
}

function halfYearSheetRows(patterns, year, months) {
  const rows = [[`ตารางกะ ${year}`], []];
  patterns.forEach((pattern) => {
    rows.push([pattern.name]);
    months.forEach((month) => rows.push(...monthBlockRows(pattern, year, month)));
  });
  return rows;
}

function buildMasterWorkbook(patterns, year) {
  const wb = XLSX.utils.book_new();
  const h1 = XLSX.utils.aoa_to_sheet(halfYearSheetRows(patterns, year, [1, 2, 3, 4, 5, 6]));
  const h2 = XLSX.utils.aoa_to_sheet(halfYearSheetRows(patterns, year, [7, 8, 9, 10, 11, 12]));
  XLSX.utils.book_append_sheet(wb, h1, `Jan-Jun ${year}`);
  XLSX.utils.book_append_sheet(wb, h2, `Jul-Dec ${year}`);
  return wb;
}

function teamSheetRows(pattern, team, year) {
  const rows = [["วันที่", "วัน", "ตำแหน่ง (Role)"]];
  RotationEngine.teamYearSchedule(pattern, team, year).forEach((row) => {
    rows.push([row.date, row.weekday, row.role]);
  });
  return rows;
}

function buildTeamWorkbook(patterns, year) {
  const wb = XLSX.utils.book_new();
  patterns.forEach((pattern) => {
    pattern.teams.forEach((team) => {
      const sheetName = `${pattern.shortLabel} ${team}`.slice(0, 31);
      const ws = XLSX.utils.aoa_to_sheet(teamSheetRows(pattern, team, year));
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
  });
  return wb;
}

export const XlsxExport = {
  exportMaster(patterns, year) {
    XLSX.writeFile(buildMasterWorkbook(patterns, year), `ShiftGen_Master_${year}.xlsx`);
  },
  exportTeams(patterns, year) {
    XLSX.writeFile(buildTeamWorkbook(patterns, year), `ShiftGen_TeamCalendars_${year}.xlsx`);
  },
  /* เผยฟังก์ชันสร้าง workbook ล้วนๆ ไว้ให้เทสต์ตรวจโครงสร้างได้โดยไม่ต้อง trigger download จริง */
  buildMasterWorkbook,
  buildTeamWorkbook
};
