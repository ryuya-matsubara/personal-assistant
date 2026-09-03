// ============================================================
// memo.js - メモ(自由記述 + 添付)
// ============================================================

import { el } from '../util.js';
import { getAll, put, remove, uid } from '../db.js';
import { openModal, confirmDialog, emptyState } from '../ui.js';
import { createAttachmentEditor, renderAttachmentsView } from '../attachments.js';

/**
 * メモモデル:
 * { id, title, body, attachments:[id], createdAt, updatedAt }
 */

export async function renderMemo(view, ctx) {
  const addBtn = el('button', { class: 'header-btn', text: '＋ メモ', onclick: () => openMemoForm(null, ctx) });
  document.getElementById('header-action').appendChild(addBtn);

  const memos = (await getAll('memos')).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  if (memos.length === 0) {
    view.appendChild(emptyState('📝', 'メモはまだありません。「＋メモ」から追加できます。'));
    return;
  }

  for (const memo of memos) {
    const preview = (memo.body || '').slice(0, 100);
    const badges = [];
    if (memo.attachments && memo.attachments.length) badges.push(`📎 ${memo.attachments.length}`);
    const item = el('div', { class: 'card' }, [
      el('div', { class: 'li-title', text: memo.title || '(無題)' }),
      preview ? el('div', { class: 'li-sub', text: preview, style: 'margin-top:4px;white-space:pre-wrap' }) : null,
      badges.length ? el('div', { class: 'li-sub', text: badges.join('  '), style: 'margin-top:6px' }) : null,
    ]);
    item.addEventListener('click', () => openMemoDetail(memo, ctx));
    view.appendChild(item);
  }
}

async function openMemoDetail(memo, ctx) {
  const content = el('div', {}, [
    el('div', { class: 'detail-kv' }, [el('span', { class: 'v', text: memo.body || '(本文なし)', style: 'white-space:pre-wrap' })]),
  ]);
  if (memo.attachments && memo.attachments.length) {
    content.appendChild(el('div', { class: 'card-title', text: '添付', style: 'margin-top:12px' }));
    content.appendChild(await renderAttachmentsView(memo.attachments));
  }
  const editBtn = el('button', { class: 'btn btn-ghost', text: '編集' });
  const delBtn = el('button', { class: 'btn btn-danger', text: '削除' });
  content.appendChild(el('div', { class: 'row-actions' }, [editBtn, delBtn]));

  const m = openModal(memo.title || 'メモ', content);
  editBtn.addEventListener('click', () => { m.close(); openMemoForm(memo, ctx); });
  delBtn.addEventListener('click', async () => { if (await confirmDialog('このメモを削除しますか?')) { await remove('memos', memo.id); m.close(); ctx.refresh(); } });
}

function openMemoForm(existing, ctx) {
  const memo = existing ? JSON.parse(JSON.stringify(existing)) : { id: uid(), title: '', body: '', attachments: [], createdAt: Date.now(), updatedAt: Date.now() };

  const titleInput = el('input', { class: 'input', placeholder: 'タイトル', value: memo.title });
  titleInput.addEventListener('input', () => { memo.title = titleInput.value; });
  const bodyInput = el('textarea', { class: 'input', placeholder: '本文', rows: '6' });
  bodyInput.value = memo.body || '';
  bodyInput.addEventListener('input', () => { memo.body = bodyInput.value; });

  const attachEditor = createAttachmentEditor(memo.attachments, (ids) => { memo.attachments = ids; });

  const field = (label, node) => el('div', { class: 'field' }, [el('label', { text: label }), node]);
  const saveBtn = el('button', { class: 'btn btn-primary', text: '保存' });
  const content = el('div', {}, [
    field('タイトル', titleInput),
    field('本文', bodyInput),
    el('div', { class: 'card-title', text: '添付(スクショ・貼り付け)', style: 'margin-top:6px' }),
    attachEditor,
    el('div', { style: 'height:16px' }),
    saveBtn,
  ]);

  const m = openModal(existing ? 'メモを編集' : 'メモを追加', content);
  saveBtn.addEventListener('click', async () => {
    if (!memo.title.trim() && !memo.body.trim()) { titleInput.focus(); titleInput.style.borderColor = 'var(--danger)'; return; }
    memo.updatedAt = Date.now();
    await put('memos', memo);
    m.close();
    ctx.refresh();
  });
}
