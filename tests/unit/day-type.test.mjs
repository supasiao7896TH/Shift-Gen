import { describe, expect, it } from "vitest";
import { DayType } from "../../src/modules/day-type.js";
import { RotationEngine } from "../../src/modules/rotation-engine.js";
import { AppConfig } from "../../src/modules/app-config.js";

describe("DayType — จัดประเภทวันสำหรับไฮไลต์ (เสาร์-อาทิตย์ / วันหยุดนักขัตฤกษ์)", () => {
  it("2026-01-01 (New Year, Thu) ต้องถูกจัดเป็น holiday แม้ตรงกับวันธรรมดา", () => {
    const result = DayType.classifyDay("2026-01-01", "Thu");
    expect(result.type).toBe("holiday");
    expect(result.label).toBe("วันขึ้นปีใหม่");
  });

  it("วันเสาร์/อาทิตย์ปกติ (ไม่ใช่วันหยุดนักขัตฤกษ์) ต้องถูกจัดเป็น weekend", () => {
    expect(DayType.classifyDay("2026-01-03", "Sat").type).toBe("weekend");
    expect(DayType.classifyDay("2026-01-04", "Sun").type).toBe("weekend");
  });

  it("วันธรรมดาที่ไม่ใช่วันหยุด ต้องเป็น normal", () => {
    const result = DayType.classifyDay("2026-01-05", "Mon");
    expect(result.type).toBe("normal");
    expect(result.label).toBeNull();
  });

  it("holiday มาก่อน weekend เสมอ (วันหยุดที่ตรงเสาร์-อาทิตย์พอดี เช่น 2026-05-31 เป็น Sun)", () => {
    const result = DayType.classifyDay("2026-05-31", "Sun");
    expect(result.type).toBe("holiday");
  });

  it("ปีที่ไม่มีข้อมูลวันหยุด (เช่น 2027) ยังจัด weekend ได้ปกติ ไม่ throw", () => {
    expect(() => DayType.classifyDay("2027-01-02", "Sat")).not.toThrow();
    expect(DayType.classifyDay("2027-01-02", "Sat").type).toBe("weekend");
    expect(DayType.classifyDay("2027-01-04", "Mon").type).toBe("normal");
  });

  it("รายการวันหยุด 2026 ทุกวันต้องจัด type เป็น holiday ผ่าน generateMonth จริง", () => {
    const pattern = AppConfig.PATTERNS[0];
    const holidays2026 = AppConfig.THAI_PUBLIC_HOLIDAYS[2026];
    Object.keys(holidays2026).forEach((dateStr) => {
      const [, month] = dateStr.split("-").map(Number);
      const monthData = RotationEngine.generateMonth(pattern, 2026, month);
      const i = monthData.dates.indexOf(dateStr);
      expect(i, `${dateStr} ต้องอยู่ใน generateMonth ของเดือนนั้น`).toBeGreaterThanOrEqual(0);
      const result = DayType.classifyDay(monthData.dates[i], monthData.weekdays[i]);
      expect(result.type).toBe("holiday");
    });
  });
});
