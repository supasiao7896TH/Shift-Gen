/* 3 · STORAGE_ENGINE — IndexedDB หุ้มด้วย Promise (โครงว่าง เติมตอนใช้จริง)
   import AppConfig ตรงๆ (ไม่ใช่ inject ผ่าน constructor) เพื่อให้ยังเป็น singleton namespace
   เดียวกับตอน Single HTML File — เทสต์ migration ใช้ vi.doMock() ที่ path นี้แทนการ inject */
import { AppConfig } from "./app-config.js";

let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(AppConfig.DB_NAME, AppConfig.DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      AppConfig.STORES.forEach((s) => {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "id" });
      });
    };
    req.onsuccess = () => {
      const db = req.result;
      /* ถ้าแท็บอื่น (หรือแอปเวอร์ชันใหม่) ขอ upgrade — ต้องปิด connection นี้ทิ้ง
         ไม่งั้น upgrade จะถูกบล็อกและแท็บนั้นค้างถาวรโดยไม่มี error ให้เห็น
         (บั๊กจริงที่เจอตอนทดสอบ starter ฝั่ง Single HTML File — พอร์ตกฎมาที่นี่ด้วย) */
      db.onversionchange = () => {
        db.close();
        dbp = null;
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    /* onblocked = มี connection เก่าที่ยังไม่ปิด ต้องบอกให้ชัด ไม่ใช่รอเงียบๆ */
    req.onblocked = () => {
      reject(new Error("อัปเกรดฐานข้อมูลไม่ได้ — ปิดแท็บอื่นที่เปิดแอปนี้อยู่ก่อนค่ะ"));
    };
  });
  return dbp;
}

/* หุ้ม IDBRequest ให้เป็น Promise ที่เดียว — ที่เหลือจะได้ไม่ต้องเขียน onsuccess/onerror ซ้ำ */
function run(store, mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

export const StorageEngine = {
  open,
  /* record ต้องมี id เพราะทุก store สร้างด้วย keyPath:"id" */
  put: (store, record) => run(store, "readwrite", (s) => s.put(record)),
  get: (store, id) => run(store, "readonly", (s) => s.get(id)),
  getAll: (store) => run(store, "readonly", (s) => s.getAll()),
  del: (store, id) => run(store, "readwrite", (s) => s.delete(id))
};
