/* 5 · UI_RENDERER — ที่เดียวที่แตะ DOM
   กัน XSS: ข้อความจากผู้ใช้/ฐานข้อมูลต้องผ่าน textContent เท่านั้น ห้าม innerHTML */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = String(text);
  return n;
}

/* ตารางกว้างเกินจอ (28-31 คอลัมน์) ต้องเลื่อนแนวนอนได้ด้วยคีย์บอร์ด ไม่ใช่แค่เมาส์/นิ้ว
   (axe rule "scrollable-region-focusable" — .tbl-wrap เฉยๆ ไม่พอ ต้อง tabindex+role+label) */
function scrollableWrap(label) {
  const wrap = el("div", "tbl-wrap");
  wrap.tabIndex = 0;
  wrap.setAttribute("role", "region");
  wrap.setAttribute("aria-label", label);
  return wrap;
}

function kpi(item) {
  const c = el("div", "card kpi");
  c.appendChild(el("div", "k-label", item.label));
  const v = el("div", "k-val");
  v.appendChild(el("span", null, item.value));
  v.appendChild(el("span", "k-unit", item.unit));
  c.appendChild(v);
  const chip = el("span", `chip ${item.tone}`, item.note);
  const foot = el("div", null);
  foot.style.marginTop = "8px";
  foot.appendChild(chip);
  c.appendChild(foot);
  return c;
}

function renderKpis(container, items) {
  container.textContent = "";
  items.forEach((k) => container.appendChild(kpi(k)));
}

/* ตาราง preview รายเดือน: แถว DATE (เลขวัน) · SHIFT (วันในสัปดาห์) · role แต่ละแถว (M/N/OM/ON หรือ M/N/O) */
function monthGridCard(pattern, monthData) {
  const card = el("div", "card month-grid");
  card.appendChild(el("div", "month-grid-title", pattern.name));

  const wrap = scrollableWrap(`ตารางกะ ${pattern.name} เลื่อนแนวนอนได้`);
  const table = el("table");
  const thead = el("thead");
  const trDate = el("tr");
  trDate.appendChild(el("th", null, "DATE"));
  monthData.days.forEach((d) => trDate.appendChild(el("th", "num", d)));
  thead.appendChild(trDate);
  const trShift = el("tr");
  trShift.appendChild(el("th", null, "SHIFT"));
  monthData.weekdays.forEach((w) => trShift.appendChild(el("th", "num", w)));
  thead.appendChild(trShift);
  table.appendChild(thead);

  const tbody = el("tbody");
  pattern.roles.forEach((role) => {
    const tr = el("tr");
    tr.appendChild(el("td", null, role));
    monthData.roles[role].forEach((team) => tr.appendChild(el("td", "num", team)));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  card.appendChild(wrap);
  return card;
}

function renderMasterPreview(container, patternsWithMonthData) {
  container.textContent = "";
  patternsWithMonthData.forEach(({ pattern, monthData }) => {
    container.appendChild(monthGridCard(pattern, monthData));
  });
}

function renderTeamPreview(container, schedule) {
  container.textContent = "";
  const table = el("table");
  const thead = el("thead");
  const tr = el("tr");
  tr.appendChild(el("th", null, "วันที่"));
  tr.appendChild(el("th", null, "วัน"));
  tr.appendChild(el("th", null, "ตำแหน่ง"));
  thead.appendChild(tr);
  table.appendChild(thead);
  const tbody = el("tbody");
  schedule.forEach((row) => {
    const r = el("tr");
    r.appendChild(el("td", null, row.date));
    r.appendChild(el("td", null, row.weekday));
    r.appendChild(el("td", null, row.role ?? "-"));
    tbody.appendChild(r);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

function fillSelect(select, options, selectedValue) {
  select.textContent = "";
  options.forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === selectedValue) o.selected = true;
    select.appendChild(o);
  });
}

/* การ์ดตั้งค่า 1 pattern: badge สถานะ (verified/custom) + ตาราง phase map 12 แถว
   3 โหมด: view (อ่านอย่างเดียว, ค่าเริ่มต้นเสมอ) → edit (กด "ปลดล็อกแก้ไข" แล้วเห็น input)
   → confirm (กด "บันทึก" แล้วต้องกด "ยืนยันบันทึก" อีกครั้งก่อนทับค่าเดิมจริง)
   event ทั้งหมดผูกผ่าน data-action ให้ app-core.js delegate ฟังที่ container เดียว */
function patternSettingsCard(pattern, { isCustom, uiState } = {}) {
  const mode = uiState?.mode || "view";
  const card = el("div", "card section-block");
  card.dataset.patternId = pattern.id;

  const head = el("div", "field-row");
  const title = el("div");
  title.appendChild(el("div", "month-grid-title", pattern.name));
  const meta = el(
    "div",
    "lede",
    `ทีม: ${pattern.teams.join(", ")} · ตำแหน่ง: ${pattern.roles.join(", ")} · anchor: ${pattern.anchorDate} · cycle: ${pattern.cycleLength} วัน`
  );
  meta.style.fontSize = "12.8px";
  title.appendChild(meta);
  head.appendChild(title);

  const badge = el(
    "span",
    `chip ${isCustom ? "c-warn" : "c-ok"}`,
    isCustom ? "custom" : "verified"
  );
  head.appendChild(badge);
  card.appendChild(head);

  if (mode === "confirm") {
    card.appendChild(
      el("div", "chip c-crit", "จะบันทึกทับค่าเดิมถาวร ตรวจสอบตัวเลข/ทีมให้ถูกก่อนกดยืนยัน")
    );
  }

  const displayRows = mode === "confirm" ? uiState.pendingPhaseMap : pattern.phaseMap;
  const wrap = scrollableWrap(`ตาราง phase map ${pattern.name} เลื่อนแนวนอนได้`);
  const table = el("table");
  const thead = el("thead");
  const trh = el("tr");
  trh.appendChild(el("th", null, "phase"));
  pattern.roles.forEach((r) => trh.appendChild(el("th", null, r)));
  thead.appendChild(trh);
  table.appendChild(thead);
  const tbody = el("tbody");
  displayRows.forEach((row, phase) => {
    const tr = el("tr");
    tr.appendChild(el("td", null, phase));
    pattern.roles.forEach((role) => {
      const td = el("td");
      if (mode === "edit") {
        const input = document.createElement("input");
        input.value = row[role];
        input.dataset.phase = String(phase);
        input.dataset.role = role;
        input.setAttribute("aria-label", `${pattern.name} phase ${phase} ${role}`);
        input.style.width = "56px";
        input.style.textAlign = "center";
        td.appendChild(input);
      } else {
        td.textContent = row[role];
        td.className = "num";
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  card.appendChild(wrap);

  const actions = el("div", "field-row");
  if (mode === "edit") {
    const save = el("button", "btn btn-primary", "บันทึก");
    save.type = "button";
    save.dataset.action = "request-save-pattern";
    save.dataset.patternId = pattern.id;
    const cancel = el("button", "btn btn-ghost", "ยกเลิก");
    cancel.type = "button";
    cancel.dataset.action = "cancel-edit";
    cancel.dataset.patternId = pattern.id;
    actions.appendChild(save);
    actions.appendChild(cancel);
  } else if (mode === "confirm") {
    const confirmBtn = el("button", "btn btn-danger", "ยืนยันบันทึก");
    confirmBtn.type = "button";
    confirmBtn.dataset.action = "confirm-save-pattern";
    confirmBtn.dataset.patternId = pattern.id;
    const cancel = el("button", "btn btn-ghost", "ยกเลิก");
    cancel.type = "button";
    cancel.dataset.action = "cancel-edit";
    cancel.dataset.patternId = pattern.id;
    actions.appendChild(confirmBtn);
    actions.appendChild(cancel);
  } else {
    const unlock = el("button", "btn btn-outline", "ปลดล็อกแก้ไข");
    unlock.type = "button";
    unlock.dataset.action = "unlock-pattern";
    unlock.dataset.patternId = pattern.id;
    actions.appendChild(unlock);
    if (isCustom) {
      const reset = el("button", "btn btn-ghost", "คืนค่าเริ่มต้น");
      reset.type = "button";
      reset.dataset.action = "reset-pattern";
      reset.dataset.patternId = pattern.id;
      actions.appendChild(reset);
    }
  }
  card.appendChild(actions);

  return card;
}

function renderPatternSettings(container, patterns, statusByPatternId, uiStateByPatternId) {
  container.textContent = "";
  patterns.forEach((pattern) => {
    const status = statusByPatternId[pattern.id] || {};
    container.appendChild(
      patternSettingsCard(pattern, {
        isCustom: !!status.isCustom,
        uiState: uiStateByPatternId[pattern.id]
      })
    );
  });
}

export const UiRenderer = {
  el,
  renderKpis,
  renderMasterPreview,
  renderTeamPreview,
  fillSelect,
  renderPatternSettings
};
