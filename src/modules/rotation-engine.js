/* NEW · ROTATION_ENGINE — สูตรคำนวณตารางกะ (pure function ล้วน ไม่แตะ DOM/storage)
   หัวใจของแอปทั้งตัว: ทุกอย่างคำนวณจาก pattern.anchorDate + pattern.phaseMap เพียงสองค่า
   ไม่มีการ "จำ" วันที่ผ่านมาเลย — ขอวันไหนก็คำนวณสดใหม่ได้ทันที รวมถึงปีในอดีต/อนาคตไกลๆ */

const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/* แปลง "YYYY-MM-DD" เป็น epoch-day (จำนวนวันนับจาก 1970-01-01 UTC) — ใช้ UTC ล้วนกันปัญหา
   timezone/DST เพี้ยนวันเวลาข้ามเที่ยงคืน (ไทยไม่มี DST แต่เขียนให้ถูกหลักไว้เผื่อรันบนเครื่องอื่น) */
function toEpochDay(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

function weekdayAbbr(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return WEEKDAY_ABBR[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/* month เป็นเลข 1-12 — ใช้ trick "day 0 ของเดือนถัดไป = วันสุดท้ายของเดือนนี้"
   Date.UTC ทำงานถูกกับปีอธิกสุรทินเองอัตโนมัติ ไม่ต้องเช็คปีอธิกสุรทินมือ */
function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function phaseForDate(pattern, dateStr) {
  const diff = toEpochDay(dateStr) - toEpochDay(pattern.anchorDate);
  const n = pattern.cycleLength;
  return ((diff % n) + n) % n;
}

/* คืน object ใหม่เสมอ {M:'B', N:'C', ...} — กันโค้ดเรียกไปแก้ phaseMap ต้นฉบับโดยไม่ตั้งใจ */
function rolesForDate(pattern, dateStr) {
  return { ...pattern.phaseMap[phaseForDate(pattern, dateStr)] };
}

function roleOfTeam(pattern, dateStr, team) {
  const roles = rolesForDate(pattern, dateStr);
  return pattern.roles.find((r) => roles[r] === team) ?? null;
}

function generateMonth(pattern, year, month) {
  const nDays = daysInMonth(year, month);
  const days = [];
  const dates = [];
  const weekdays = [];
  const roles = {};
  pattern.roles.forEach((r) => (roles[r] = []));

  for (let d = 1; d <= nDays; d++) {
    const dateStr = formatDate(year, month, d);
    days.push(d);
    dates.push(dateStr);
    weekdays.push(weekdayAbbr(dateStr));
    const roleVals = rolesForDate(pattern, dateStr);
    pattern.roles.forEach((r) => roles[r].push(roleVals[r]));
  }
  return { year, month, days, dates, weekdays, roles };
}

function generateYear(pattern, year) {
  const out = [];
  for (let month = 1; month <= 12; month++) {
    const nDays = daysInMonth(year, month);
    for (let d = 1; d <= nDays; d++) {
      const dateStr = formatDate(year, month, d);
      out.push({
        date: dateStr,
        weekday: weekdayAbbr(dateStr),
        roles: rolesForDate(pattern, dateStr)
      });
    }
  }
  return out;
}

function teamMonthSchedule(pattern, team, year, month) {
  const nDays = daysInMonth(year, month);
  const out = [];
  for (let d = 1; d <= nDays; d++) {
    const dateStr = formatDate(year, month, d);
    out.push({
      day: d,
      date: dateStr,
      weekday: weekdayAbbr(dateStr),
      role: roleOfTeam(pattern, dateStr, team)
    });
  }
  return out;
}

function teamYearSchedule(pattern, team, year) {
  return generateYear(pattern, year).map((row) => ({
    date: row.date,
    weekday: row.weekday,
    role: pattern.roles.find((r) => row.roles[r] === team) ?? null
  }));
}

export const RotationEngine = {
  daysInMonth,
  weekdayAbbr,
  phaseForDate,
  rolesForDate,
  roleOfTeam,
  generateMonth,
  generateYear,
  teamMonthSchedule,
  teamYearSchedule
};
