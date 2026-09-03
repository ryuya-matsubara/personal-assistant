// ============================================================
// attachments.js - 添付UI(画像スクショ / テキスト貼り付け)
// 「予約メールを貼る」「乗換アプリのスクショを貼る」だけで
// 情報を残せるようにするための共通コンポーネント。
// ============================================================

import { el, esc } from './util.js';
import {
  saveAttachment,
  getAttachment,
  removeAttachment,
  attachmentURL,
} from './db.js';

/**
 * 添付エディタを作る。
 * @param {string[]} attachmentIds 既存の添付ID配列(参照渡しで更新される)
 * @param {function} onChange 変更時コールバック(新しいID配列)
 * @returns {HTMLElement}
 */
export function createAttachmentEditor(attachmentIds, onChange) {
  const ids = [...(attachmentIds || [])];
  const list = el('div', { class: 'attach-list' });

  const notify = () => onChange && onChange([...ids]);

  async function render() {
    list.innerHTML = '';
    for (const id of ids) {
      const rec = await getAttachment(id);
      if (!rec) continue;
      list.appendChild(renderChip(rec, () => {
        const i = ids.indexOf(id);
        if (i >= 0) ids.splice(i, 1);
        removeAttachment(id);
        notify();
        render();
      }));
    }
  }

  function renderChip(rec, onRemove) {
    const remove = el('button', {
      class: 'attach-remove',
      type: 'button',
      'aria-label': '削除',
      text: '×',
      onclick: onRemove,
    });
    if (rec.kind === 'file' && rec.mime && rec.mime.startsWith('image/')) {
      const url = attachmentURL(rec);
      const img = el('img', { src: url, alt: rec.name, class: 'attach-thumb' });
      const a = el('a', { href: url, target: '_blank', rel: 'noopener' }, [img]);
      return el('div', { class: 'attach-chip attach-chip-img' }, [a, remove]);
    }
    if (rec.kind === 'text') {
      const preview = (rec.text || '').slice(0, 80);
      return el('div', { class: 'attach-chip attach-chip-text' }, [
        el('span', { class: 'attach-icon', text: '📝' }),
        el('span', { class: 'attach-name', text: preview || 'テキスト' }),
        remove,
      ]);
    }
    return el('div', { class: 'attach-chip' }, [
      el('span', { class: 'attach-icon', text: '📎' }),
      el('span', { class: 'attach-name', text: rec.name || 'ファイル' }),
      remove,
    ]);
  }

  // 画像/ファイル選択(カメラロールやスクショから)
  const fileInput = el('input', {
    type: 'file',
    accept: 'image/*',
    multiple: 'multiple',
    class: 'hidden-input',
    onchange: async (e) => {
      const files = Array.from(e.target.files || []);
      for (const f of files) {
        const id = await saveAttachment(f);
        ids.push(id);
      }
      e.target.value = '';
      notify();
      render();
    },
  });

  const pickBtn = el('button', {
    type: 'button',
    class: 'btn-attach',
    text: '📷 画像・スクショを追加',
    onclick: () => fileInput.click(),
  });

  // テキスト貼り付け(予約メール本文など)
  const textArea = el('textarea', {
    class: 'attach-textarea',
    placeholder: '予約メールや乗換情報をここに貼り付け…',
    rows: '3',
  });
  const addTextBtn = el('button', {
    type: 'button',
    class: 'btn-attach',
    text: '📝 テキストを追加',
    onclick: async () => {
      const text = textArea.value.trim();
      if (!text) return;
      const id = await saveAttachment({ text, name: text.slice(0, 20) });
      ids.push(id);
      textArea.value = '';
      notify();
      render();
    },
  });

  // 画像の直接ペースト(スクショをクリップボードから貼る)
  textArea.addEventListener('paste', async (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const it of items) {
      if (it.type && it.type.startsWith('image/')) {
        const blob = it.getAsFile();
        if (blob) {
          const id = await saveAttachment(blob);
          ids.push(id);
          notify();
          render();
        }
      }
    }
  });

  const wrap = el('div', { class: 'attach-editor' }, [
    list,
    el('div', { class: 'attach-actions' }, [pickBtn, addTextBtn]),
    textArea,
    fileInput,
  ]);

  render();
  return wrap;
}

/** 表示専用: 添付ID配列からプレビューを描画 */
export async function renderAttachmentsView(attachmentIds) {
  const wrap = el('div', { class: 'attach-view' });
  for (const id of attachmentIds || []) {
    const rec = await getAttachment(id);
    if (!rec) continue;
    if (rec.kind === 'file' && rec.mime && rec.mime.startsWith('image/')) {
      const url = attachmentURL(rec);
      const img = el('img', { src: url, alt: rec.name, class: 'attach-thumb-lg' });
      wrap.appendChild(el('a', { href: url, target: '_blank', rel: 'noopener' }, [img]));
    } else if (rec.kind === 'text') {
      wrap.appendChild(el('pre', { class: 'attach-text-view', text: rec.text || '' }));
    } else {
      wrap.appendChild(el('div', { class: 'attach-file-view', text: '📎 ' + (rec.name || 'ファイル') }));
    }
  }
  return wrap;
}
