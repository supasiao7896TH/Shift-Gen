/**
 * Golden-dataset test — พิสูจน์ว่า RotationEngine + AppConfig.PATTERNS.phaseMap คำนวณตรงกับ
 * ตารางกะ 2026.xls ของจริง (พี่ A GC-M PTA) ครบทั้ง 365 วัน ทั้ง 2 pattern ไม่มี exception
 *
 * ที่มา fixture: แกะจากไฟล์ Excel จริงด้วยสคริปต์แยก (pandas) แล้ว verify มือแล้วว่า
 * phase = (วันที่ − anchorDate) mod 12 ตรงกับทุกวันในไฟล์ 100% ก่อน hardcode ลง app-config.js
 * เทสต์นี้คือด่านกันไม่ให้ใครพิมพ์ phaseMap ผิดมือแล้วไม่มีใครจับได้จนขึ้นปีใหม่จริง
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { AppConfig } from "../../src/modules/app-config.js";
import { RotationEngine } from "../../src/modules/rotation-engine.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const golden = JSON.parse(
  readFileSync(resolve(ROOT, "tests/fixtures/shiftgen-2026-golden.json"), "utf8")
);

const TABLE_NAME_BY_PATTERN_ID = {
  "12hr-3-3": "PRODUCTION SHIFT WORK (12 Hr.) 3 - 3",
  "8hr-4-2": "PRODUCTION SHIFT WORK (8 Hr.) 4 - 2"
};

describe("RotationEngine — golden dataset ปี 2026 (ตารางกะ 2026.xls จริง)", () => {
  AppConfig.PATTERNS.forEach((pattern) => {
    it(`${pattern.id}: ตรงกับไฟล์ต้นฉบับครบ 365 วัน`, () => {
      const goldenRows = golden[TABLE_NAME_BY_PATTERN_ID[pattern.id]];
      expect(goldenRows.length).toBe(365);

      const generated = RotationEngine.generateYear(pattern, 2026);
      expect(generated.length).toBe(365);

      goldenRows.forEach((expected, i) => {
        const actual = generated[i];
        expect(actual.date, `date mismatch at index ${i}`).toBe(expected.date);
        expect(actual.weekday, `weekday mismatch on ${expected.date}`).toBe(expected.weekday);
        pattern.roles.forEach((role) => {
          expect(actual.roles[role], `role ${role} mismatch on ${expected.date}`).toBe(
            expected[role]
          );
        });
      });
    });
  });
});

describe("RotationEngine — คุณสมบัติที่ต้องเป็นจริงเสมอ (ไม่ผูกกับปีใดปีหนึ่ง)", () => {
  const pattern = AppConfig.PATTERNS[0];

  it("ทุกวันมีทีมครบทุก role เสมอ ไม่มีช่องว่าง", () => {
    RotationEngine.generateYear(pattern, 2027).forEach((row) => {
      pattern.roles.forEach((role) => {
        expect(pattern.teams).toContain(row.roles[role]);
      });
    });
  });

  it("แต่ละวันไม่มีทีมซ้ำกันข้าม role เดียวกัน (ทีมละ 1 role ต่อวัน)", () => {
    RotationEngine.generateYear(pattern, 2027).forEach((row) => {
      const assigned = pattern.roles.map((r) => row.roles[r]);
      expect(new Set(assigned).size).toBe(assigned.length);
    });
  });

  it("ปีอธิกสุรทิน (2028, 366 วัน) คำนวณได้ครบไม่พัง — mod-12 ไม่สนใจจำนวนวันในปี", () => {
    const rows = RotationEngine.generateYear(pattern, 2028);
    expect(rows.length).toBe(366);
    expect(rows[rows.length - 1].date).toBe("2028-12-31");
  });

  it("cycle ต่อเนื่องข้ามปี — วันสุดท้ายของปีหนึ่ง กับวันแรกของปีถัดไป ห่างกัน 1 phase ตามจริง", () => {
    const endOf2026 = RotationEngine.phaseForDate(pattern, "2026-12-31");
    const startOf2027 = RotationEngine.phaseForDate(pattern, "2027-01-01");
    expect(startOf2027).toBe((endOf2026 + 1) % pattern.cycleLength);
  });

  it("วันที่ก่อน anchorDate ก็คำนวณ phase ได้ถูกต้อง (mod ติดลบต้อง wrap เป็นบวก)", () => {
    const phase = RotationEngine.phaseForDate(pattern, "2020-01-01");
    expect(phase).toBeGreaterThanOrEqual(0);
    expect(phase).toBeLessThan(pattern.cycleLength);
  });

  it("roleOfTeam กับ rolesForDate ต้องสอดคล้องกัน (ไป-กลับได้)", () => {
    const dateStr = "2027-03-15";
    const roles = RotationEngine.rolesForDate(pattern, dateStr);
    pattern.teams.forEach((team) => {
      const role = RotationEngine.roleOfTeam(pattern, dateStr, team);
      expect(roles[role]).toBe(team);
    });
  });
});

describe("RotationEngine — generateMonth / teamMonthSchedule", () => {
  const pattern = AppConfig.PATTERNS[0];

  it("generateMonth คืนจำนวนวันตรงกับปฏิทินจริง (กุมภาพันธ์ปีอธิกสุรทิน = 29)", () => {
    const feb2028 = RotationEngine.generateMonth(pattern, 2028, 2);
    expect(feb2028.days.length).toBe(29);
    expect(feb2028.roles.M.length).toBe(29);
  });

  it("teamMonthSchedule ของทีมหนึ่งต้องตรงกับ role ที่ generateMonth ให้ทีมนั้นในวันเดียวกัน", () => {
    const month = RotationEngine.generateMonth(pattern, 2026, 1);
    const teamA = RotationEngine.teamMonthSchedule(pattern, "A", 2026, 1);
    teamA.forEach((row, i) => {
      const expectedRole = pattern.roles.find((r) => month.roles[r][i] === "A");
      expect(row.role).toBe(expectedRole);
    });
  });
});
