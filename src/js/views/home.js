// ============================================================
// home.js - ホーム(今日の概要)
// 直近の予定・今月の収支・未完了TODOを一覧。全体の司令塔。
// ============================================================

import { el, fmtDateJP, yen, todayISO } from '../util.js';
import { emptyState } from '../ui.js';
import { upcomingEvents } from './calendar.js';
import { monthSummary } from './money.js';
import { pendingTodos } from './todo.js';

export async function renderHome(view, ctx) {
  const [events, money, todos] = await Promise.all([
    upcomingEvents(4),
    monthSummary(),
    pendingTodos(4),
  ]);

  // あいさつ
  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 5 ? 'こんばんは' : hour < 11 ? 'おはようございます' : hour < 18 ? 'こんにちは' : 'こんばんは';
  view.appendChild(el('div', { class: 'section-title', text: `${greet} 👋`, style: 'margin-top:0' }));
  view.appendChild(el('div', { class: 'li-sub', text: fmtDateJP(todayISO()), style: 'margin:-6px 0 14px' }));

  // 今月の収支カード
  const moneyCard = el('div', { class: 'card', onclick: () => ctx.navigate('money') }, [
    el('div', { class: 'card-title', text: '今月の収支' }),
    el('div', { style: 'display:flex;justify-content:space-between;align-items:baseline' }, [
      el('div', { style: `font-size:28px;font-weight:800;${money.balance < 0 ? 'color:var(--danger)' : ''}`, text: yen(money.balance) }),
      el('div', { class: 'li-sub' }, [
        el('span', { class: 'balance-in', text: '+' + yen(money.income).slice(1) }),
        el('span', { text: '  /  ' }),
        el('span', { class: 'balance-out', text: '−' + yen(money.outgo).slice(1) }),
      ]),
    ]),
  ]);
  moneyCard.style.cursor = 'pointer';
  view.appendChild(moneyCard);

  // 直近の予定
  view.appendChild(el('div', { class: 'section-title', text: '📅 直近の予定' }));
  if (events.length === 0) {
    view.appendChild(el('div', { class: 'card' }, [el('div', { class: 'li-sub', text: '予定はありません' })]));
  } else {
    for (const ev of events) {
      const when = ev.date === todayISO() ? `今日 ${ev.time || ''}` : `${fmtDateJP(ev.date)} ${ev.time || ''}`;
      const item = el('div', { class: 'list-item', onclick: () => ctx.navigate('calendar') }, [
        el('div', { class: 'li-main' }, [
          el('div', { class: 'li-title', text: ev.title || '(無題)' }),
          el('div', { class: 'li-sub', text: when.trim() + (ev.place ? `  📍${ev.place}` : '') }),
        ]),
      ]);
      item.style.cursor = 'pointer';
      view.appendChild(item);
    }
  }

  // 未完了TODO
  view.appendChild(el('div', { class: 'section-title', text: `✅ やること (${todos.count})` }));
  if (todos.items.length === 0) {
    view.appendChild(el('div', { class: 'card' }, [el('div', { class: 'li-sub', text: '未完了のTODOはありません' })]));
  } else {
    for (const t of todos.items) {
      const overdue = t.due && t.due < todayISO();
      const item = el('div', { class: 'list-item', onclick: () => ctx.navigate('todo') }, [
        el('div', { class: 'check' }),
        el('div', { class: 'li-main' }, [
          el('div', { class: 'li-title', text: t.text }),
          t.due ? el('div', { class: 'li-sub', text: (overdue ? '⚠️ ' : '📅 ') + fmtDateJP(t.due) }) : null,
        ]),
      ]);
      item.style.cursor = 'pointer';
      view.appendChild(item);
    }
  }
}
