// ============================================================
// db.js - IndexedDB ラッパー(外部依存なし)
// すべてのデータを端末内(ブラウザ)に保存します。
// ストア: events(予定) / expenses(家計簿) / todos / memos / attachments(添付ファイル)
// ============================================================

const DB_NAME = 'personal-assistant';
const DB_VERSION = 1;

const STORES = ['events', 'expenses', 'todos', 'memos', 'attachments'];

let _dbPromise = null;

/**
 * DBを開く(なければ作成)。以降は同じ接続を再利用。
 */
function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

/**
 * トランザクションを張って callback にストアを渡す汎用関数。
 */
async function tx(store, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const os = t.objectStore(store);
    let result;
    Promise.resolve(fn(os))
      .then((r) => { result = r; })
      .catch(reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---- 汎用CRUD ----------------------------------------------

export async function put(store, record) {
  await tx(store, 'readwrite', (os) => os.put(record));
  return record;
}

export async function get(store, id) {
  return tx(store, 'readonly', (os) => reqToPromise(os.get(id)));
}

export async function getAll(store) {
  return tx(store, 'readonly', (os) => reqToPromise(os.getAll()));
}

export async function remove(store, id) {
  await tx(store, 'readwrite', (os) => os.delete(id));
}

export async function clear(store) {
  await tx(store, 'readwrite', (os) => os.clear());
}

// ---- ユーティリティ ----------------------------------------

/** 一意なIDを生成 */
export function uid() {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 8)
  );
}

/**
 * 添付ファイル(画像/テキスト)を保存。
 * File または {type,name,text} を受け取り、attachments ストアに格納してIDを返す。
 * 予約メールのテキストや乗換アプリのスクショをそのままぶら下げられる。
 */
export async function saveAttachment(fileOrData) {
  const id = uid();
  let record;
  if (fileOrData instanceof File || fileOrData instanceof Blob) {
    record = {
      id,
      kind: 'file',
      name: fileOrData.name || 'attachment',
      mime: fileOrData.type || 'application/octet-stream',
      blob: fileOrData,
      createdAt: Date.now(),
    };
  } else {
    // テキスト添付(貼り付けたメール本文など)
    record = {
      id,
      kind: 'text',
      name: fileOrData.name || 'メモ',
      text: fileOrData.text || '',
      createdAt: Date.now(),
    };
  }
  await put('attachments', record);
  return id;
}

export async function getAttachment(id) {
  return get('attachments', id);
}

export async function removeAttachment(id) {
  return remove('attachments', id);
}

/** Blob添付を表示用のObjectURLに変換 */
export function attachmentURL(record) {
  if (record && record.kind === 'file' && record.blob) {
    return URL.createObjectURL(record.blob);
  }
  return null;
}

/** 全データをJSONでエクスポート(バックアップ用。画像は除く) */
export async function exportJSON() {
  const [events, expenses, todos, memos] = await Promise.all([
    getAll('events'),
    getAll('expenses'),
    getAll('todos'),
    getAll('memos'),
  ]);
  return { version: 1, exportedAt: Date.now(), events, expenses, todos, memos };
}
