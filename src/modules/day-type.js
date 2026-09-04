/* NEW · DAY_TYPE — จัดประเภทวัน (ปกติ/เสาร์-อาทิตย์/วันหยุดนักขัตฤกษ์) สำหรับไฮไลต์ในตาราง
   pure function ล้วน อ่านจาก AppConfig.THAI_PUBLIC_HOLIDAYS เท่านั้น ไม่แตะ DOM */
import { AppConfig } from "./app-config.js";

function classifyDay(dateStr, weekday) {
  const year = Number(dateStr.slice(0, 4));
  const holidays = AppConfig.THAI_PUBLIC_HOLIDAYS[year];
  const holidayName = holidays?.[dateStr];
  if (holidayName) return { type: "holiday", label: holidayName };
  if (weekday === "Sat" || weekday === "Sun") return { type: "weekend", label: null };
  return { type: "normal", label: null };
}

export const DayType = { classifyDay };
