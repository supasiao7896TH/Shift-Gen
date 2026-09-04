/* 6 · DEBUG_MODULE — เปิดด้วย ?debug=1 เท่านั้น production จึงเงียบสนิท
   แต่ ring buffer เก็บ log ไว้เสมอ เพื่อให้ปุ่ม "รายงานปัญหา" มีอะไรให้แนบ */
let ring = []; /* เก็บแค่ 20 รายการล่าสุด — พอให้ debug ไม่กินหน่วยความจำ */

function on() {
  return new URLSearchParams(location.search).get("debug") === "1";
}

function log(...args) {
  ring.push(`${new Date().toISOString().slice(11, 19)} ${args.join(" ")}`);
  if (ring.length > 20) ring.shift();
  if (on()) console.log(...args);
}

export const DebugModule = {
  log,
  recent: () => ring.slice(),
  version() {
    const m = document.querySelector('meta[name="app-version"]');
    return m ? m.content : "dev";
  }
};
