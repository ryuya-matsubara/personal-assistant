// ============================================================
// money.js - 家計簿
// 収支入力 + 月間集計の可視化(残高・カテゴリ別バー)
// ============================================================

import { el, yen, toDateISO, todayISO, toMonthKey, fmtDateJP } from '../util.js';
import { getAll, put, remove, uid } from '../db.js';
import { openModal, confirmDialog, emptyState } from '../ui.js';

/**
 * 支出/収入モデル:
 * { id, type:'out'|'in', amount:Number, category, memo, date:'YYYY-MM-DD', createdAt }
 */

const EXPENSE_CATS = ['食費', '日用品', '交通', '交際', '趣味', '住居', '光熱', '通信', '医療', 'その他'];
const INCOME_CATS = ['給与', '副収入', '賞与', 'その他'];

// 表示中の月(YYYY-MM)。ビュー内で保持。
let viewMonth = toMonthKey(new Date());

export async function renderMoney(view, ctx) {
  const addBtn = el('button', {
    class: 'header-btn', text: '＋ 記録',
    onclick: () => openExpenseForm(null, ctx),
  });
  document.getElementById('header-action').appendChild(addBtn);

  const all = await getAll('expenses');
  const monthItems = all
    .filter((e) => e.date.slice(0, 7) === viewMonth)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt || 0) - (a.createdAt || 0)));

  // 月ナビ
  view.appendChild(renderMonthNav(ctx));

  // 集計
  const income = sum(monthItems.filter((e) => e.type === 'in'));
  const outgo = sum(monthItems.filter((e) => e.type === 'out'));
  const balance = income - outgo;

  const balanceCard = el('div', { class: 'card balance-card' }, [
    el('div', { class: 'balance-label', text: 'この月の収支' }),
    el('div', { class: 'balance-amount', text: yen(balance), style: balance < 0 ? 'color:var(--danger)' : '' }),
    el('div', { class: 'balance-row' }, [
      el('div', {}, [el('div', { class: 'balance-label', text: '収入' }), el('div', { class: 'balance-in', text: yen(income) })]),
      el('div', {}, [el('div', { class: 'balance-label', text: '支出' }), el('div', { class: 'balance-out', text: yen(outgo) })]),
    ]),
  ]);
  view.appendChild(balanceCard);

  // カテゴリ別バー(支出のみ)
  if (outgo > 0) {
    const byCat = new Map();
    for (const e of monthItems.filter((e) => e.type === 'out')) {
      byCat.set(e.category, (byCat.get(e.category) || 0) + Number(e.amount));
    }
    const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
    const max = sorted[0][1];
    const barCard = el('div', { class: 'card' }, [el('div', { class: 'card-title', text: 'カテゴリ別の支出' })]);
    for (const [cat, amt] of sorted) {
      barCard.appendChild(el('div', { class: 'bar-row' }, [
        el('div', { class: 'bar-cat', text: cat }),
        el('div', { class: 'bar-track' }, [el('div', { class: 'bar-fill', style: `width:${Math.max(4, (amt / max) * 100)}%` })]),
        el('div', { class: 'bar-val', text: yen(amt) }),
      ]));
    }
    view.appendChild(barCard);
  }

  // 明細
  view.appendChild(el('div', { class: 'section-title', text: '明細' }));
  if (monthItems.length === 0) {
    view.appendChild(emptyState('💰', 'この月の記録はありません。「＋記録」から追加してください。'));
    return;
  }
  for (const e of monthItems) {
    view.appendChild(renderExpenseItem(e, ctx));
  }
}

function renderMonthNav(ctx) {
  const [y, m] = viewMonth.split('-').map(Number);
  const prev = el('button', { text: '‹', onclick: () => { viewMonth = shiftMonth(viewMonth, -1); ctx.refresh(); } });
  const next = el('button', { text: '›', onclick: () => { viewMonth = shiftMonth(viewMonth, 1); ctx.refresh(); } });
  return el('div', { class: 'month-nav' }, [
    prev,
    el('div', { class: 'month-label', text: `${y}年 ${m}月` }),
    next,
  ]);
}

function renderExpenseItem(e, ctx) {
  const item = el('div', { class: 'list-item' }, [
    el('div', { class: 'li-main' }, [
      el('div', { class: 'li-title', text: e.category + (e.memo ? ` · ${e.memo}` : '') }),
      el('div', { class: 'li-sub', text: fmtDateJP(e.date) }),
    ]),
    el('div', { class: e.type === 'in' ? 'amount-in' : 'amount-out', text: (e.type === 'in' ? '+' : '−') + yen(e.amount).slice(1) }),
  ]);
  item.addEventListener('click', () => openExpenseForm(e, ctx));
  return item;
}

function openExpenseForm(existing, ctx) {
  const e = existing
    ? Object.assign({}, existing)
    : { id: uid(), type: 'out', amount: '', category: EXPENSE_CATS[0], memo: '', date: todayISO(), createdAt: Date.now() };

  // 収支セグメント
  const seg = el('div', { class: 'seg' });
  const outBtn = el('button', { text: '支出', class: e.type === 'out' ? 'active' : '' });
  const inBtn = el('button', { text: '収入', class: e.type === 'in' ? 'active' : '' });
  seg.append(outBtn, inBtn);

  const catWrap = el('div', { class: 'cat-chips' });
  function renderCats() {
    catWrap.innerHTML = '';
    const cats = e.type === 'out' ? EXPENSE_CATS : INCOME_CATS;
    if (!cats.includes(e.category)) e.category = cats[0];
    for (const c of cats) {
      const chip = el('button', { type: 'button', class: 'cat-chip' + (c === e.category ? ' active' : ''), text: c });
      chip.addEventListener('click', () => { e.category = c; renderCats(); });
      catWrap.appendChild(chip);
    }
  }
  renderCats();

  outBtn.addEventListener('click', () => { e.type = 'out'; outBtn.classList.add('active'); inBtn.classList.remove('active'); renderCats(); });
  inBtn.addEventListener('click', () => { e.type = 'in'; inBtn.classList.add('active'); outBtn.classList.remove('active'); renderCats(); });

  const amountInput = el('input', { class: 'input', type: 'number', inputmode: 'numeric', placeholder: '0', value: e.amount, style: 'font-size:24px;font-weight:700;text-align:right' });
  amountInput.addEventListener('input', () => { e.amount = amountInput.value; });
  const dateInput = el('input', { class: 'input', type: 'date', value: e.date });
  dateInput.addEventListener('input', () => { e.date = dateInput.value; });
  const memoInput = el('input', { class: 'input', placeholder: 'メモ(任意)', value: e.memo });
  memoInput.addEventListener('input', () => { e.memo = memoInput.value; });

  const field = (label, node) => el('div', { class: 'field' }, [el('label', { text: label }), node]);
  const saveBtn = el('button', { class: 'btn btn-primary', text: '保存' });

  const content = el('div', {}, [
    seg,
    field('金額(円)', amountInput),
    field('カテゴリ', catWrap),
    field('日付', dateInput),
    field('メモ', memoInput),
    el('div', { style: 'height:8px' }),
    saveBtn,
  ]);

  if (existing) {
    const delBtn = el('button', { class: 'btn btn-danger', text: '削除' });
    content.appendChild(el('div', { style: 'height:8px' }));
    content.appendChild(delBtn);
    delBtn.addEventListener('click', async () => {
      if (await confirmDialog('この記録を削除しますか?')) { await remove('expenses', e.id); m.close(); ctx.refresh(); }
    });
  }

  const m = openModal(existing ? '記録を編集' : '収支を記録', content);
  saveBtn.addEventListener('click', async () => {
    const amt = Number(e.amount);
    if (!amt || amt <= 0) { amountInput.focus(); amountInput.style.borderColor = 'var(--danger)'; return; }
    e.amount = amt;
    await put('expenses', e);
    m.close();
    ctx.refresh();
  });
}

function sum(list) { return list.reduce((s, e) => s + Number(e.amount || 0), 0); }
function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return toMonthKey(d);
}

/** ホーム用: 今月の収支サマリ */
export async function monthSummary() {
  const key = toMonthKey(new Date());
  const items = (await getAll('expenses')).filter((e) => e.date.slice(0, 7) === key);
  const income = sum(items.filter((e) => e.type === 'in'));
  const outgo = sum(items.filter((e) => e.type === 'out'));
  return { income, outgo, balance: income - outgo };
}
