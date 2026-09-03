// ============================================================
// calendar.js - 予定・カレンダー
// 予約 / 内容 / 時間 / メモ + 自由項目(旅行・飲み会向け) + 添付
// ============================================================

import { el, esc, toDateISO, todayISO, fmtDateJP, yen } from '../util.js';
import { getAll, put, remove, uid } from '../db.js';
import { openModal, confirmDialog, emptyState } from '../ui.js';
import { createAttachmentEditor, renderAttachmentsView } from '../attachments.js';

/**
 * 予定データモデル:
 * {
 *   id, date:'YYYY-MM-DD', time:'HH:MM'|'', endTime, title,
 *   place, howto(行き方), with(誰と), cost(費用),
 *   reservation(予約番号など), memo, checklist:[{text,done}],
 *   attachments:[id], createdAt
 * }
 */

export async function renderCalendar(view, ctx) {
  // ヘッダーに「＋」ボタン
  const addBtn = el('button', {
    class: 'header-btn',
    text: '＋ 予定',
    onclick: () => openEventForm(null, ctx),
  });
  document.getElementById('header-action').appendChild(addBtn);

  const events = (await getAll('events')).sort(sortByDateTime);

  if (events.length === 0) {
    view.appendChild(emptyState('📅', '予定はまだありません。右上の「＋予定」から追加できます。'));
    return;
  }

  // 日付ごとにグループ化
  const groups = groupByDate(events);
  const today = todayISO();

  for (const [date, list] of groups) {
    const label = date === today ? `今日 · ${fmtDateJP(date)}` : fmtDateJP(date);
    view.appendChild(el('div', { class: 'section-title', text: label }));
    for (const ev of list) {
      view.appendChild(renderEventItem(ev, ctx));
    }
  }
}

function renderEventItem(ev, ctx) {
  const timeText = ev.time ? (ev.endTime ? `${ev.time}–${ev.endTime}` : ev.time) : '終日';
  const subParts = [];
  if (ev.place) subParts.push('📍 ' + ev.place);
  if (ev.with) subParts.push('👥 ' + ev.with);
  if (ev.cost) subParts.push('💰 ' + yen(ev.cost));

  const item = el('div', { class: 'list-item' }, [
    el('span', { class: 'li-time', text: timeText }),
    el('div', { class: 'li-main' }, [
      el('div', { class: 'li-title', text: ev.title || '(無題)' }),
      subParts.length
        ? el('div', { class: 'li-sub', text: subParts.join('  ') })
        : null,
      (ev.attachments && ev.attachments.length)
        ? el('div', { class: 'li-sub', text: `📎 添付 ${ev.attachments.length}件` })
        : null,
    ]),
  ]);
  item.addEventListener('click', () => openEventDetail(ev, ctx));
  return item;
}

// ---- 詳細表示 ----------------------------------------------

async function openEventDetail(ev, ctx) {
  const rows = [];
  const addRow = (k, v) => { if (v) rows.push(el('div', { class: 'detail-kv' }, [el('span', { class: 'k', text: k }), el('span', { class: 'v', text: v })])); };

  addRow('日付', fmtDateJP(ev.date));
  addRow('時間', ev.time ? (ev.endTime ? `${ev.time} 〜 ${ev.endTime}` : ev.time) : '終日');
  addRow('場所', ev.place);
  addRow('行き方', ev.howto);
  addRow('誰と', ev.with);
  addRow('予約', ev.reservation);
  addRow('費用', ev.cost ? yen(ev.cost) : '');
  addRow('メモ', ev.memo);

  const content = el('div', {}, rows);

  // チェックリスト(持ち物・やること)
  if (ev.checklist && ev.checklist.length) {
    content.appendChild(el('div', { class: 'card-title', text: '持ち物・やること', style: 'margin-top:14px' }));
    ev.checklist.forEach((c, i) => {
      const check = el('div', { class: 'check' + (c.done ? ' done' : ''), text: c.done ? '✓' : '' });
      const row = el('div', { class: 'list-item', style: 'box-shadow:none;background:var(--bg);margin-bottom:6px' }, [
        check,
        el('div', { class: 'li-main' }, [el('div', { class: 'li-title' + (c.done ? ' done' : ''), text: c.text })]),
      ]);
      check.addEventListener('click', async () => {
        ev.checklist[i].done = !ev.checklist[i].done;
        await put('events', ev);
        check.classList.toggle('done');
        check.textContent = ev.checklist[i].done ? '✓' : '';
        row.querySelector('.li-title').classList.toggle('done');
      });
      content.appendChild(row);
    });
  }

  // 添付表示
  if (ev.attachments && ev.attachments.length) {
    content.appendChild(el('div', { class: 'card-title', text: '添付(予約メール・スクショ)', style: 'margin-top:14px' }));
    content.appendChild(await renderAttachmentsView(ev.attachments));
  }

  const editBtn = el('button', { class: 'btn btn-ghost', text: '編集' });
  const delBtn = el('button', { class: 'btn btn-danger', text: '削除' });
  content.appendChild(el('div', { class: 'row-actions' }, [editBtn, delBtn]));

  const m = openModal(ev.title || '予定', content);
  editBtn.addEventListener('click', () => { m.close(); openEventForm(ev, ctx); });
  delBtn.addEventListener('click', async () => {
    if (await confirmDialog('この予定を削除しますか?')) {
      await remove('events', ev.id);
      m.close();
      ctx.refresh();
    }
  });
}

// ---- 追加・編集フォーム -------------------------------------

function openEventForm(existing, ctx) {
  const ev = existing
    ? JSON.parse(JSON.stringify(existing))
    : {
        id: uid(), date: todayISO(), time: '', endTime: '', title: '',
        place: '', howto: '', with: '', cost: '', reservation: '',
        memo: '', checklist: [], attachments: [], createdAt: Date.now(),
      };

  const field = (label, input) => el('div', { class: 'field' }, [el('label', { text: label }), input]);
  const input = (key, attrs = {}) => {
    const node = el('input', Object.assign({ class: 'input', value: ev[key] || '' }, attrs));
    node.addEventListener('input', () => { ev[key] = node.value; });
    return node;
  };

  const titleInput = input('title', { placeholder: '例: 沖縄旅行 / 部署の飲み会' });
  const dateInput = input('date', { type: 'date' });
  const timeInput = input('time', { type: 'time' });
  const endInput = input('endTime', { type: 'time' });
  const placeInput = input('place', { placeholder: '店・空港・駅など' });
  const howtoInput = input('howto', { placeholder: '航空会社/電車/乗換など' });
  const withInput = input('with', { placeholder: '誰と' });
  const resvInput = input('reservation', { placeholder: '予約番号・確認番号' });
  const costInput = input('cost', { type: 'number', inputmode: 'numeric', placeholder: '0' });

  const memoInput = el('textarea', { class: 'input', placeholder: 'メモ(自由に)' });
  memoInput.value = ev.memo || '';
  memoInput.addEventListener('input', () => { ev.memo = memoInput.value; });

  // チェックリスト編集
  const checklistWrap = el('div', {});
  function renderChecklist() {
    checklistWrap.innerHTML = '';
    ev.checklist.forEach((c, i) => {
      const t = el('input', { class: 'input', value: c.text, placeholder: '持ち物・やること' });
      t.addEventListener('input', () => { ev.checklist[i].text = t.value; });
      const del = el('button', { type: 'button', class: 'btn btn-danger btn-sm', text: '×', onclick: () => { ev.checklist.splice(i, 1); renderChecklist(); } });
      checklistWrap.appendChild(el('div', { class: 'field-row', style: 'margin-bottom:8px' }, [t, el('div', { style: 'flex:0 0 auto' }, [del])]));
    });
  }
  renderChecklist();
  const addCheckBtn = el('button', { type: 'button', class: 'btn-attach', text: '＋ 項目を追加', onclick: () => { ev.checklist.push({ text: '', done: false }); renderChecklist(); } });

  // 添付エディタ
  const attachEditor = createAttachmentEditor(ev.attachments, (ids) => { ev.attachments = ids; });

  const saveBtn = el('button', { class: 'btn btn-primary', text: '保存' });
  const content = el('div', {}, [
    field('内容 / タイトル', titleInput),
    field('日付', dateInput),
    el('div', { class: 'field-row' }, [field('開始', timeInput), field('終了', endInput)]),
    field('場所', placeInput),
    field('行き方(航空会社・電車など)', howtoInput),
    field('誰と', withInput),
    field('予約(番号・確認)', resvInput),
    field('費用(円)', costInput),
    field('メモ', memoInput),
    el('div', { class: 'card-title', text: '持ち物・やること', style: 'margin-top:6px' }),
    checklistWrap,
    addCheckBtn,
    el('div', { class: 'card-title', text: '添付(予約メール貼付・スクショ)', style: 'margin-top:16px' }),
    attachEditor,
    el('div', { style: 'height:16px' }),
    saveBtn,
  ]);

  const m = openModal(existing ? '予定を編集' : '予定を追加', content);
  saveBtn.addEventListener('click', async () => {
    if (!ev.title.trim()) { titleInput.focus(); titleInput.style.borderColor = 'var(--danger)'; return; }
    ev.checklist = ev.checklist.filter((c) => c.text.trim());
    await put('events', ev);
    m.close();
    ctx.refresh();
  });
}

// ---- ヘルパー ----------------------------------------------

function sortByDateTime(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return (a.time || '99:99') < (b.time || '99:99') ? -1 : 1;
}

function groupByDate(events) {
  const map = new Map();
  for (const ev of events) {
    if (!map.has(ev.date)) map.set(ev.date, []);
    map.get(ev.date).push(ev);
  }
  return map;
}

/** ホーム画面用: 今日以降の予定を数件返す */
export async function upcomingEvents(limit = 5) {
  const today = todayISO();
  const events = (await getAll('events'))
    .filter((e) => e.date >= today)
    .sort(sortByDateTime);
  return events.slice(0, limit);
}
