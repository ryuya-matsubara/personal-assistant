// ============================================================
// util.js - 共通ユーティリティ(日付・DOM・フォーマット)
// ============================================================

/** HTMLエスケープ(XSS防止・ユーザー入力の表示用) */
export function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 要素を作るショートハンド el('div', {class:'x'}, [children]) */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v !== null && v !== undefined && v !== false) {
      node.setAttribute(k, v);
    }
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

/** querySelector ショートハンド */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---- 日付ヘルパー ------------------------------------------

export function todayISO() {
  return toDateISO(new Date());
}

/** Date -> 'YYYY-MM-DD' (ローカル時間) */
export function toDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM' */
export function toMonthKey(d) {
  return toDateISO(d).slice(0, 7);
}

const WD = ['日', '月', '火', '水', '木', '金', '土'];

/** '2026-09-03' -> '9月3日(木)' */
export function fmtDateJP(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const wd = WD[new Date(y, m - 1, d).getDay()];
  return `${m}月${d}日(${wd})`;
}

/** 曜日インデックス取得 */
export function weekday(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** 金額を ¥1,234 形式に */
export function yen(n) {
  const v = Number(n) || 0;
  return '¥' + v.toLocaleString('ja-JP');
}

/** 指定した年月の日数 */
export function daysInMonth(year, month /* 1-12 */) {
  return new Date(year, month, 0).getDate();
}
