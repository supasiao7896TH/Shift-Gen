/**
 * ทดสอบ flow "ปลดล็อกแก้ไข → บันทึก → ยืนยันบันทึก" ของหน้าตั้งค่า pattern แบบ end-to-end
 * ผ่าน DOM จริง (jsdom) — เจอบั๊กจริงระหว่างทดสอบด้วยเบราว์เซอร์จริงมาก่อนแล้ว 1 ตัว:
 * btn.closest("[data-pattern-id]") ได้ตัวปุ่มเอง ไม่ใช่การ์ด (ปุ่มก็มี data-pattern-id ด้วย)
 * ทำให้อ่านแถว phase map ได้ 0 แถวแล้ว validate fail เงียบๆ — เทสต์นี้กันไม่ให้บั๊กแบบนี้กลับมา
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "../harness/mount.mjs";
import { AppConfig } from "../../src/modules/app-config.js";
import { AppCore } from "../../src/modules/app-core.js";
import { StorageEngine } from "../../src/modules/storage-engine.js";

async function flush() {
  await new Promise((r) => setTimeout(r, 20));
}

async function goToSettings() {
  document.getElementById("navSettings").click();
  await flush();
}

describe("หน้าตั้งค่า Pattern — flow ปลดล็อก → บันทึก → ยืนยัน", () => {
  beforeEach(async () => {
    mount();
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));
    await AppCore.init();
    await flush();
  });

  it("ปลดล็อกแล้วแก้ไขค่า 1 ช่อง → กดบันทึก → ต้องเข้าโหมดยืนยัน (ไม่ใช่ error จำนวนแถวไม่ครบ)", async () => {
    await goToSettings();
    const pattern = AppConfig.PATTERNS[0];

    document
      .querySelector(`[data-action="unlock-pattern"][data-pattern-id="${pattern.id}"]`)
      .click();
    await flush();

    const input = document.querySelector(
      `[data-pattern-id="${pattern.id}"] tbody tr:last-child input[data-role="M"]`
    );
    expect(input, "ต้องเจอ input ของ phase สุดท้าย column M").not.toBeNull();
    input.value = "C";

    document
      .querySelector(`[data-action="request-save-pattern"][data-pattern-id="${pattern.id}"]`)
      .click();
    await flush();

    /* ถ้าบั๊ก closest() ที่เจอมาก่อนกลับมา จะเห็น error toast แทนปุ่มยืนยัน */
    expect(document.getElementById("errorToast").hidden, "ไม่ควรมี error toast โผล่").toBe(true);
    const confirmBtn = document.querySelector(
      `[data-action="confirm-save-pattern"][data-pattern-id="${pattern.id}"]`
    );
    expect(confirmBtn, "ต้องเข้าโหมดยืนยันบันทึกได้").not.toBeNull();
  });

  it("กดยืนยันบันทึกแล้ว override ต้องถูกเขียนลง StorageEngine จริง และ badge เปลี่ยนเป็น custom", async () => {
    await goToSettings();
    const pattern = AppConfig.PATTERNS[0];

    document
      .querySelector(`[data-action="unlock-pattern"][data-pattern-id="${pattern.id}"]`)
      .click();
    await flush();
    const input = document.querySelector(
      `[data-pattern-id="${pattern.id}"] tbody tr:last-child input[data-role="M"]`
    );
    input.value = "C";
    document
      .querySelector(`[data-action="request-save-pattern"][data-pattern-id="${pattern.id}"]`)
      .click();
    await flush();
    document
      .querySelector(`[data-action="confirm-save-pattern"][data-pattern-id="${pattern.id}"]`)
      .click();
    await flush();

    const saved = await StorageEngine.get("patterns", pattern.id);
    expect(saved.phaseMap[pattern.cycleLength - 1].M).toBe("C");

    const badge = document.querySelector(`[data-pattern-id="${pattern.id}"] .chip`);
    expect(badge.textContent).toBe("custom");
  });

  it("กรอกค่าทีมที่ไม่มีจริง (เช่น 'Z') แล้วบันทึก ต้องขึ้น error ไม่ใช่ผ่านไปเงียบๆ", async () => {
    await goToSettings();
    const pattern = AppConfig.PATTERNS[0];

    document
      .querySelector(`[data-action="unlock-pattern"][data-pattern-id="${pattern.id}"]`)
      .click();
    await flush();
    const input = document.querySelector(
      `[data-pattern-id="${pattern.id}"] tbody tr:first-child input[data-role="M"]`
    );
    input.value = "Z";
    document
      .querySelector(`[data-action="request-save-pattern"][data-pattern-id="${pattern.id}"]`)
      .click();
    await flush();

    expect(document.getElementById("errorToast").hidden).toBe(false);
    expect(document.getElementById("errorToastText").textContent).toContain("Z");
    expect(
      document.querySelector(
        `[data-action="confirm-save-pattern"][data-pattern-id="${pattern.id}"]`
      )
    ).toBeNull();
  });
});
