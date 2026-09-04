/**
 * ชั้นที่ 2 — เบราว์เซอร์จริง กับ build จริง (vite build → vite preview)
 * เทียบเท่า design-lab/starter/tests/e2e/smoke.spec.mjs — ต่างแค่ 2 จุด:
 *   1. ทดสอบ dist/ ที่ build แล้ว ไม่ใช่ source ตรงๆ (Vite ต้อง bundle ES modules ก่อน)
 *   2. service worker มาจาก vite-plugin-pwa (generated) ไม่ใช่ sw.js เขียนมือ
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const THEMES = ["light", "dark"];

/* เทสต์ต้อง hermetic — ไม่แตะเน็ตภายนอกเลย (เหตุผลเดียวกับ design-lab/starter) */
test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.route(/^https?:\/\/(cdnjs|cdn)\./, (r) => r.abort());
});

test.describe("โหลดหน้าได้สะอาด", () => {
  test("ไม่มี JS error และไฟล์ของแอปเองโหลดครบ", async ({ page }, testInfo) => {
    const jsErrors = [];
    page.on("pageerror", (e) => jsErrors.push(String(e)));

    const failedOwn = [];
    const failedThirdParty = [];
    page.on("requestfailed", (r) => {
      const url = r.url();
      (url.startsWith(testInfo.project.use.baseURL) ? failedOwn : failedThirdParty).push(url);
    });

    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    if (failedThirdParty.length) {
      testInfo.annotations.push({
        type: "third-party offline",
        description: failedThirdParty.join(", ")
      });
    }

    expect(jsErrors, "JS error ที่ไม่ถูกดัก").toEqual([]);
    expect(failedOwn, "ไฟล์ของแอปเองที่โหลดไม่ได้").toEqual([]);
  });

  test("แอปต้องอ่านออกแม้ฟอนต์จาก CDN โหลดไม่ได้ (fallback stack ต้องมีจริง)", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    const stack = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--font-ui")
    );
    expect(stack.split(",").length, "--font-ui ต้องมี fallback ไม่ใช่ฟอนต์เดียว").toBeGreaterThan(
      1
    );
    expect(await page.locator("h1").isVisible()).toBe(true);
  });

  test("main.js bundle รันจริงและ generate ตารางกะของเดือน/ปีปัจจุบันสำเร็จ", async ({ page }) => {
    /* แทนที่เทสต์ "โมดูลผูกกับ window" ของ Single HTML File — ES module ไม่ผูก window
       โดยธรรมชาติ (ไม่ใช่บั๊ก) วิธีพิสูจน์ว่า main.js ทำงานจริงคือเช็คผลลัพธ์ที่มันวาด */
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#kpiRow .card")).toHaveCount(4);
    /* 2 pattern (12Hr 3-3 · 8Hr 4-2) = 2 การ์ด month-grid ใน master preview */
    await expect(page.locator("#masterPreview .card")).toHaveCount(2);
    await expect(page.locator("#teamPreview tbody tr").first()).toBeVisible();
  });
});

for (const theme of THEMES) {
  test.describe(`ธีม ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/index.html", { waitUntil: "domcontentloaded" });
      await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    });

    test("ไม่มี a11y violation ระดับ serious/critical (รวม contrast)", async ({ page }) => {
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      const serious = violations.filter((v) => ["serious", "critical"].includes(v.impact));
      expect(
        serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)
      ).toEqual([]);
    });

    test("--surface ต้องต่างจาก --bg จริง (ST: พื้นการ์ดต้องแยกจากพื้นหน้า)", async ({ page }) => {
      const [bg, surface] = await page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        return [cs.getPropertyValue("--bg").trim(), cs.getPropertyValue("--surface").trim()];
      });
      expect(surface).not.toBe(bg);
    });

    for (const width of [390, 1280]) {
      test(`ไม่มีการเลื่อนแนวนอนที่ ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow, "เกินขอบไปกี่ px").toBeLessThanOrEqual(0);
      });
    }

    test("ทุกปุ่มมีชื่อที่ screen reader อ่านได้ และเป้าแตะ ≥44px", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 800 });
      const bad = await page.evaluate(() => {
        const out = { unnamed: [], tooSmall: [] };
        for (const el of document.querySelectorAll("button, a[href], [role=button]")) {
          const name = (el.getAttribute("aria-label") || el.textContent || "").trim();
          if (!name) out.unnamed.push(el.outerHTML.slice(0, 80));
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44))
            out.tooSmall.push(
              `${el.tagName.toLowerCase()} ${Math.round(r.width)}×${Math.round(r.height)} "${name}"`
            );
        }
        return out;
      });
      expect(bad.unnamed, "ปุ่มที่ไม่มีชื่อ").toEqual([]);
      expect(bad.tooSmall, "ปุ่มที่เล็กกว่า 44px").toEqual([]);
    });

    test("กด Tab ไล่ทั้งหน้าแล้วทุกชิ้นต้องมีขอบโฟกัสให้เห็น", async ({ page }) => {
      const seen = [];
      for (let i = 0; i < 30; i++) {
        await page.keyboard.press("Tab");
        const info = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const key = el.id || el.className || el.tagName;
          const cs = getComputedStyle(el);
          return {
            key,
            html: el.outerHTML.slice(0, 70),
            outlineW: parseFloat(cs.outlineWidth) || 0,
            outlineStyle: cs.outlineStyle,
            shadow: cs.boxShadow,
            shadowUnfocused: (() => {
              const c = el.cloneNode(true);
              c.removeAttribute("id");
              c.style.position = "absolute";
              c.style.left = "-9999px";
              el.parentNode.appendChild(c);
              const s = getComputedStyle(c).boxShadow;
              c.remove();
              return s;
            })()
          };
        });
        if (!info) break;
        if (seen.some((s) => s.key === info.key)) break;
        seen.push(info);
      }

      expect(
        seen.length,
        "ไม่มีชิ้นไหนโฟกัสได้เลย — แปลว่าคีย์บอร์ดใช้งานหน้านี้ไม่ได้"
      ).toBeGreaterThan(0);

      const noRing = seen
        .filter(
          (s) =>
            !(s.outlineStyle !== "none" && s.outlineW > 0) &&
            !(s.shadow !== "none" && s.shadow !== s.shadowUnfocused)
        )
        .map((s) => s.html);
      expect(noRing, "ชิ้นที่กด Tab ไปถึงแล้วไม่มีขอบให้เห็น").toEqual([]);
    });
  });
}

test("service worker ลงทะเบียนได้จริง (สร้างโดย vite-plugin-pwa)", async ({ page }) => {
  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
  const registered = await page.evaluate(() =>
    navigator.serviceWorker.ready.then(() => true).catch(() => false)
  );
  expect(registered).toBe(true);

  /* vite-plugin-pwa generate ไฟล์ sw.js จาก build manifest จริงทุกครั้งที่ build —
     พิสูจน์ว่ามันมี precache manifest ของ Workbox ฝังอยู่จริง ไม่ใช่ไฟล์เปล่า
     (นี่คือสิ่งที่แทนที่ cache-guard CI job ของ Single HTML File — ดู vite.config.js) */
  const sw = await (await page.request.get("/sw.js")).text();
  expect(sw, "sw.js ต้องมี precache manifest จาก workbox").toMatch(/precacheAndRoute/);
});
