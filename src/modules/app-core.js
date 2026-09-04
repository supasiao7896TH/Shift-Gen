/* 7 · APP_CORE — ประกอบทุกอย่างเข้าด้วยกัน: theme, error boundary, routing (sidebar 2 view),
   generate/preview ตารางกะ, export .xlsx, และหน้าตั้งค่า rotation pattern */
import { AppConfig } from "./app-config.js";
import { UiRenderer } from "./ui-renderer.js";
import { DebugModule } from "./debug-module.js";
import { StorageEngine } from "./storage-engine.js";
import { StateStore } from "./state-store.js";
import { RotationEngine } from "./rotation-engine.js";

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

/* uiState ของหน้าตั้งค่า pattern อยู่นอก StateStore โดยตั้งใจ — เป็น local UI concern
   (โหมด edit/confirm ของแต่ละการ์ด) ไม่ใช่ state ที่โมดูลอื่นต้อง subscribe */
const settingsUiState = {};

function currentTheme() {
  const t = document.documentElement.getAttribute("data-theme");
  if (t) return t;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem(AppConfig.THEME_KEY, t);
  } catch {
    /* โหมดส่วนตัว/localStorage ถูกปิด — ธีมยังใช้ได้ แค่ไม่จำข้ามเซสชัน */
  }
}

function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(AppConfig.THEME_KEY);
  } catch {
    /* เช่นเดียวกับข้างบน */
  }
  if (saved) document.documentElement.setAttribute("data-theme", saved);
}

function showToast(message) {
  const box = document.getElementById("errorToast");
  const txt = document.getElementById("errorToastText");
  if (txt) txt.textContent = message;
  if (box) box.hidden = false;
}

function installErrorBoundary() {
  function report(kind, detail) {
    DebugModule.log(`[${kind}]`, detail);
    showToast("เกิดข้อผิดพลาด — กดรายงานปัญหาได้ค่ะ");
  }

  const btn = document.getElementById("reportBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      const body =
        "**เกิดอะไรขึ้น:** \n\n**กดอะไรก่อนหน้านั้น:** \n\n" +
        `---\nเวอร์ชัน: ${DebugModule.version()}` +
        `\nเบราว์เซอร์: ${navigator.userAgent}` +
        `\n\nlog ล่าสุด:\n\`\`\`\n${DebugModule.recent().join("\n")}\n\`\`\``;
      const url = AppConfig.ISSUE_URL;
      if (!url) {
        DebugModule.log("ยังไม่ได้ตั้ง AppConfig.ISSUE_URL");
        return;
      }
      window.open(
        `${url}?title=${encodeURIComponent("[bug] ")}&body=${encodeURIComponent(body)}`,
        "_blank",
        "noopener"
      );
    });
  }
  window.addEventListener("error", (e) => report("error", e.message));
  window.addEventListener("unhandledrejection", (e) => {
    report("promise", (e.reason && e.reason.message) || String(e.reason));
  });
}

function installNav() {
  const dashBtn = document.getElementById("navDashboard");
  const settingsBtn = document.getElementById("navSettings");
  const dashView = document.getElementById("view-dashboard");
  const settingsView = document.getElementById("view-settings");

  function show(view) {
    const isDash = view === "dashboard";
    dashView.hidden = !isDash;
    settingsView.hidden = isDash;
    dashBtn.setAttribute("aria-current", isDash ? "page" : "false");
    settingsBtn.setAttribute("aria-current", isDash ? "false" : "page");
    if (!isDash) renderSettings();
  }

  dashBtn.addEventListener("click", () => show("dashboard"));
  settingsBtn.addEventListener("click", () => show("settings"));
}

/* --- Pattern overrides (IndexedDB) --- */

function getOverrides() {
  return StateStore.get("overrides") || {};
}

function getEffectivePatterns() {
  const overrides = getOverrides();
  return AppConfig.PATTERNS.map((p) => overrides[p.id] || p);
}

async function loadOverrides() {
  try {
    const rows = await StorageEngine.getAll("patterns");
    const map = {};
    rows.forEach((row) => {
      map[row.id] = row;
    });
    StateStore.set({ overrides: map });
  } catch (err) {
    DebugModule.log("โหลด pattern override ไม่สำเร็จ", err && err.message);
  }
}

/* --- Dashboard: KPI + master preview + team preview --- */

function readYearMonth() {
  const year = parseInt(document.getElementById("yearInput").value, 10);
  const month = parseInt(document.getElementById("monthInput").value, 10);
  return { year, month };
}

function renderKpiRow(year, month) {
  const overrides = getOverrides();
  const isCustom = Object.keys(overrides).length > 0;
  const patterns = getEffectivePatterns();
  UiRenderer.renderKpis(document.getElementById("kpiRow"), [
    { label: "ปีที่แสดง", value: year, unit: "ค.ศ.", note: MONTH_NAME_TH[month], tone: "c-ref" },
    {
      label: "Pattern ใช้งานอยู่",
      value: patterns.length,
      unit: "ชุด",
      note: "12Hr · 8Hr",
      tone: "c-ok"
    },
    {
      label: "จำนวนทีมรวม",
      value: patterns.reduce((sum, p) => sum + p.teams.length, 0),
      unit: "ทีม",
      note: "ทุก pattern",
      tone: "c-ok"
    },
    {
      label: "สถานะสูตร",
      value: isCustom ? "Custom" : "Verified",
      unit: "",
      note: isCustom ? "มีการแก้ไขค่าเริ่มต้น" : "ตรงไฟล์ต้นฉบับ 2569",
      tone: isCustom ? "c-warn" : "c-ok"
    }
  ]);
}

function renderMasterPreview(year, month) {
  const patterns = getEffectivePatterns();
  const data = patterns.map((pattern) => ({
    pattern,
    monthData: RotationEngine.generateMonth(pattern, year, month)
  }));
  UiRenderer.renderMasterPreview(document.getElementById("masterPreview"), data);
}

function refreshTeamSelectors() {
  const patterns = getEffectivePatterns();
  const patternSelect = document.getElementById("teamPatternSelect");
  const prevPatternId = patternSelect.value;
  UiRenderer.fillSelect(
    patternSelect,
    patterns.map((p) => ({ value: p.id, label: p.shortLabel })),
    prevPatternId || patterns[0].id
  );
  refreshTeamOptions();
}

function refreshTeamOptions() {
  const patterns = getEffectivePatterns();
  const patternSelect = document.getElementById("teamPatternSelect");
  const teamSelect = document.getElementById("teamSelect");
  const pattern = patterns.find((p) => p.id === patternSelect.value) || patterns[0];
  const prevTeam = teamSelect.value;
  UiRenderer.fillSelect(
    teamSelect,
    pattern.teams.map((t) => ({ value: t, label: `ทีม ${t}` })),
    pattern.teams.includes(prevTeam) ? prevTeam : pattern.teams[0]
  );
}

function renderTeamPreview(year, month) {
  const patterns = getEffectivePatterns();
  const patternSelect = document.getElementById("teamPatternSelect");
  const teamSelect = document.getElementById("teamSelect");
  const pattern = patterns.find((p) => p.id === patternSelect.value) || patterns[0];
  const team = teamSelect.value || pattern.teams[0];
  const schedule = RotationEngine.teamMonthSchedule(pattern, team, year, month);
  UiRenderer.renderTeamPreview(document.getElementById("teamPreview"), schedule);
}

function generateAndRender() {
  const { year, month } = readYearMonth();
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    showToast("กรอกปีและเดือนให้ครบก่อนสร้างตารางค่ะ");
    return;
  }
  renderKpiRow(year, month);
  renderMasterPreview(year, month);
  refreshTeamSelectors();
  renderTeamPreview(year, month);
}

/* --- Export --- */

async function recordExport(year, patternIds, fileType) {
  try {
    await StorageEngine.put("export_history", {
      id: `${fileType}-${year}-${Date.now()}`,
      year,
      patternIds,
      fileType,
      exportedAt: Date.now()
    });
  } catch (err) {
    DebugModule.log("บันทึกประวัติ export ไม่สำเร็จ", err && err.message);
  }
}

function installExportButtons() {
  document.getElementById("exportMasterBtn").addEventListener("click", async () => {
    const { year } = readYearMonth();
    if (!Number.isInteger(year)) return showToast("กรอกปีก่อน export ค่ะ");
    const { XlsxExport } = await import("./xlsx-export.js");
    const patterns = getEffectivePatterns();
    XlsxExport.exportMaster(patterns, year);
    await recordExport(
      year,
      patterns.map((p) => p.id),
      "master"
    );
  });

  document.getElementById("exportTeamsBtn").addEventListener("click", async () => {
    const { year } = readYearMonth();
    if (!Number.isInteger(year)) return showToast("กรอกปีก่อน export ค่ะ");
    const { XlsxExport } = await import("./xlsx-export.js");
    const patterns = getEffectivePatterns();
    XlsxExport.exportTeams(patterns, year);
    await recordExport(
      year,
      patterns.map((p) => p.id),
      "teams"
    );
  });

  const pdfBtn = document.getElementById("exportPdfBtn");
  pdfBtn.addEventListener("click", async () => {
    const { year } = readYearMonth();
    if (!Number.isInteger(year)) return showToast("กรอกปีก่อน export ค่ะ");
    const originalLabel = pdfBtn.textContent;
    pdfBtn.disabled = true;
    pdfBtn.textContent = "กำลังสร้าง PDF... (รอสักครู่)";
    try {
      const { PdfExport } = await import("./pdf-export.js");
      const patterns = getEffectivePatterns();
      await PdfExport.exportYearPdf(patterns, year);
      await recordExport(
        year,
        patterns.map((p) => p.id),
        "pdf"
      );
    } catch (err) {
      DebugModule.log("export PDF ไม่สำเร็จ", err && err.message);
      showToast("สร้าง PDF ไม่สำเร็จ ลองใหม่อีกครั้งค่ะ");
    } finally {
      pdfBtn.disabled = false;
      pdfBtn.textContent = originalLabel;
    }
  });
}

/* --- Settings: pattern phase-map editor --- */

function statusByPatternId() {
  const overrides = getOverrides();
  const out = {};
  AppConfig.PATTERNS.forEach((p) => {
    out[p.id] = { isCustom: !!overrides[p.id] };
  });
  return out;
}

function renderSettings() {
  UiRenderer.renderPatternSettings(
    document.getElementById("patternSettingsList"),
    getEffectivePatterns(),
    statusByPatternId(),
    settingsUiState
  );
}

function readPendingPhaseMapFromCard(card, pattern) {
  const rows = card.querySelectorAll("tbody tr");
  const phaseMap = [];
  rows.forEach((tr, phase) => {
    const entry = {};
    pattern.roles.forEach((role) => {
      const input = tr.querySelector(`input[data-role="${role}"]`);
      entry[role] = (input ? input.value : "").trim().toUpperCase();
    });
    phaseMap[phase] = entry;
  });
  return phaseMap;
}

function validatePhaseMap(pattern, phaseMap) {
  if (phaseMap.length !== pattern.cycleLength) return "จำนวนแถว phase ไม่ครบ";
  for (const entry of phaseMap) {
    for (const role of pattern.roles) {
      const v = entry[role];
      if (!v) return `phase มีช่องว่าง (${role})`;
      if (!pattern.teams.includes(v))
        return `ค่า "${v}" ไม่ใช่ทีมที่รู้จัก (${pattern.teams.join(", ")})`;
    }
  }
  return null;
}

function installSettingsDelegation() {
  document.getElementById("patternSettingsList").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const patternId = btn.dataset.patternId;
    const pattern = getEffectivePatterns().find((p) => p.id === patternId);
    if (!pattern) return;

    if (action === "unlock-pattern") {
      settingsUiState[patternId] = { mode: "edit" };
      renderSettings();
    } else if (action === "cancel-edit") {
      settingsUiState[patternId] = { mode: "view" };
      renderSettings();
    } else if (action === "request-save-pattern") {
      /* .closest(".card") ไม่ใช่ "[data-pattern-id]" — ปุ่มเองก็มี data-pattern-id ด้วย (ใช้
         หา patternId ตอน delegate) closest() เช็คตัวเองก่อนเสมอ เลยได้ปุ่มแทนการ์ดถ้าใช้ selector เดิม */
      const card = btn.closest(".card");
      const phaseMap = readPendingPhaseMapFromCard(card, pattern);
      const error = validatePhaseMap(pattern, phaseMap);
      if (error) {
        showToast(`บันทึกไม่ได้: ${error}`);
        return;
      }
      settingsUiState[patternId] = { mode: "confirm", pendingPhaseMap: phaseMap };
      renderSettings();
    } else if (action === "confirm-save-pattern") {
      const pending = settingsUiState[patternId]?.pendingPhaseMap;
      if (!pending) return;
      const base = AppConfig.PATTERNS.find((p) => p.id === patternId);
      const record = { ...base, phaseMap: pending, updatedAt: Date.now() };
      await StorageEngine.put("patterns", record);
      const overrides = { ...getOverrides(), [patternId]: record };
      StateStore.set({ overrides });
      settingsUiState[patternId] = { mode: "view" };
      renderSettings();
      generateAndRender();
      showToast("บันทึก pattern เรียบร้อยแล้วค่ะ");
    } else if (action === "reset-pattern") {
      await StorageEngine.del("patterns", patternId);
      const overrides = { ...getOverrides() };
      delete overrides[patternId];
      StateStore.set({ overrides });
      settingsUiState[patternId] = { mode: "view" };
      renderSettings();
      generateAndRender();
    }
  });
}

function installGenerateControls() {
  document.getElementById("generateBtn").addEventListener("click", generateAndRender);
  document.getElementById("teamPatternSelect").addEventListener("change", () => {
    refreshTeamOptions();
    const { year, month } = readYearMonth();
    if (Number.isInteger(year) && Number.isInteger(month)) renderTeamPreview(year, month);
  });
  document.getElementById("teamSelect").addEventListener("change", () => {
    const { year, month } = readYearMonth();
    if (Number.isInteger(year) && Number.isInteger(month)) renderTeamPreview(year, month);
  });
}

async function init() {
  /* กัน UI state ของหน้าตั้งค่าเก่าข้ามรอด init() ถ้าเคยมีจากมาก่อน (ปกติ init() รันครั้งเดียว
     ต่อการโหลดหน้า แต่เทสต์เรียกซ้ำได้หลายครั้งในไฟล์เดียวกัน — ป้องกันไว้ทั้งสองฝั่ง) */
  Object.keys(settingsUiState).forEach((k) => delete settingsUiState[k]);

  installErrorBoundary();
  initTheme();
  document.getElementById("themeBtn").addEventListener("click", () => {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
  });

  installNav();
  installGenerateControls();
  installExportButtons();
  installSettingsDelegation();

  const now = new Date();
  document.getElementById("yearInput").value = String(now.getFullYear());
  document.getElementById("monthInput").value = String(now.getMonth() + 1);

  StateStore.set({ overrides: {} });
  await loadOverrides();
  generateAndRender();

  DebugModule.log("พร้อมใช้งาน", AppConfig.APP_NAME);
}

export const AppCore = { init, currentTheme, applyTheme, initTheme, installErrorBoundary };
