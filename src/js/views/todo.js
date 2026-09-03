// ============================================================
// todo.js - TODOリスト
// ============================================================

import { el, todayISO, fmtDateJP } from '../util.js';
import { getAll, put, remove, uid } from '../db.js';
import { openModal, confirmDialog, emptyState } from '../ui.js';

/**
 * TODOモデル:
 * { id, text, done:false, due:'YYYY-MM-DD'|'', priority:'low'|'mid'|'high', createdAt }
 */

export async function renderTodo(view, ctx) {
  const addBtn = el('button', { class: 'header-btn', text: '＋ 追加', onclick: () => openTodoForm(null, ctx) });
  document.getElementById('header-action').appendChild(addBtn);

  const todos = await getAll('todos');
  const active = todos.filter((t) => !t.done).sort(sortTodo);
  const done = todos.filter((t) => t.done).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // クイック追加
  const quick = el('input', { class: 'input', placeholder: '✍️ やることを入力してEnter', style: 'margin-bottom:14px' });
  quick.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && quick.value.trim()) {
      await put('todos', { id: uid(), text: quick.value.trim(), done: false, due: '', priority: 'mid', createdAt: Date.now() });
      quick.value = '';
      ctx.refresh();
    }
  });
  view.appendChild(quick);

  if (todos.length === 0) {
    view.appendChild(emptyState('✅', 'TODOはまだありません。上の入力欄から追加できます。'));
    return;
  }

  if (active.length) {
    view.appendChild(el('div', { class: 'section-title', text: `未完了 (${active.length})` }));
    active.forEach((t) => view.appendChild(renderTodoItem(t, ctx)));
  }
  if (done.length) {
    view.appendChild(el('div', { class: 'section-title', text: `完了 (${done.length})` }));
    done.forEach((t) => view.appendChild(renderTodoItem(t, ctx)));
  }
}

const PRIO_MARK = { high: '🔴', mid: '🟡', low: '⚪️' };

function renderTodoItem(t, ctx) {
  const check = el('div', { class: 'check' + (t.done ? ' done' : ''), text: t.done ? '✓' : '' });
  check.addEventListener('click', async (e) => {
    e.stopPropagation();
    t.done = !t.done;
    await put('todos', t);
    ctx.refresh();
  });

  const subParts = [];
  if (t.due) {
    const overdue = !t.done && t.due < todayISO();
    subParts.push((overdue ? '⚠️ ' : '📅 ') + fmtDateJP(t.due));
  }
  if (t.priority && t.priority !== 'mid') subParts.push(PRIO_MARK[t.priority] + (t.priority === 'high' ? ' 重要' : ' 低'));

  const main = el('div', { class: 'li-main' }, [
    el('div', { class: 'li-title' + (t.done ? ' done' : ''), text: t.text }),
    subParts.length ? el('div', { class: 'li-sub', text: subParts.join('  ') }) : null,
  ]);

  const item = el('div', { class: 'list-item' }, [check, main]);
  main.addEventListener('click', () => openTodoForm(t, ctx));
  return item;
}

function openTodoForm(existing, ctx) {
  const t = existing ? Object.assign({}, existing) : { id: uid(), text: '', done: false, due: '', priority: 'mid', createdAt: Date.now() };

  const textInput = el('input', { class: 'input', placeholder: 'やること', value: t.text });
  textInput.addEventListener('input', () => { t.text = textInput.value; });
  const dueInput = el('input', { class: 'input', type: 'date', value: t.due });
  dueInput.addEventListener('input', () => { t.due = dueInput.value; });

  const seg = el('div', { class: 'seg' });
  const opts = [['low', '低'], ['mid', '中'], ['high', '重要']];
  const btns = opts.map(([val, label]) => {
    const b = el('button', { text: label, class: t.priority === val ? 'active' : '' });
    b.addEventListener('click', () => { t.priority = val; btns.forEach((x) => x.classList.remove('active')); b.classList.add('active'); });
    return b;
  });
  seg.append(...btns);

  const field = (label, node) => el('div', { class: 'field' }, [el('label', { text: label }), node]);
  const saveBtn = el('button', { class: 'btn btn-primary', text: '保存' });
  const content = el('div', {}, [field('やること', textInput), field('期限', dueInput), field('優先度', seg), el('div', { style: 'height:8px' }), saveBtn]);

  if (existing) {
    const delBtn = el('button', { class: 'btn btn-danger', text: '削除', style: 'margin-top:8px' });
    content.appendChild(delBtn);
    delBtn.addEventListener('click', async () => { if (await confirmDialog('このTODOを削除しますか?')) { await remove('todos', t.id); m.close(); ctx.refresh(); } });
  }

  const m = openModal(existing ? 'TODOを編集' : 'TODOを追加', content);
  saveBtn.addEventListener('click', async () => {
    if (!t.text.trim()) { textInput.focus(); textInput.style.borderColor = 'var(--danger)'; return; }
    await put('todos', t);
    m.close();
    ctx.refresh();
  });
}

function sortTodo(a, b) {
  const prioRank = { high: 0, mid: 1, low: 2 };
  const ah = a.due || '9999';
  const bh = b.due || '9999';
  if (ah !== bh) return ah < bh ? -1 : 1;
  return (prioRank[a.priority] ?? 1) - (prioRank[b.priority] ?? 1);
}

/** ホーム用: 未完了TODO件数と直近 */
export async function pendingTodos(limit = 4) {
  const todos = (await getAll('todos')).filter((t) => !t.done).sort(sortTodo);
  return { count: todos.length, items: todos.slice(0, limit) };
}
