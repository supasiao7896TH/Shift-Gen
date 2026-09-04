/* 2 · STATE_STORE — state กลางแบบ pub/sub: เปลี่ยน state แล้วผู้ที่ subscribe ถูกเรียกเอง
   ตัว state/subs เป็นตัวแปรระดับโมดูล ไม่ใช่ export — เก็บพฤติกรรม "namespace เดียว" แบบเดียวกับ
   var STATE_STORE = (function(){...})() เดิม แค่ขอบเขตปิดคือไฟล์แทนที่จะเป็น IIFE */
let state = { records: [], loading: false, error: null };
let subs = [];

export const StateStore = {
  get(k) {
    return k ? state[k] : state;
  },
  set(patch) {
    Object.assign(state, patch);
    subs.forEach((f) => f(state));
  },
  subscribe(fn) {
    subs.push(fn);
    return () => {
      subs = subs.filter((f) => f !== fn);
    };
  }
};
