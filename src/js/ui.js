// ============================================================
// ui.js - 共通UI(モーダル・確認ダイアログ)
// ============================================================

import { el } from './util.js';

/**
 * ボトムシート型モーダルを開く。
 * @param {string} title
 * @param {HTMLElement} content
 * @returns {{close: function}}
 */
export function openModal(title, content) {
  const root = document.getElementById('modal-root');

  const closeBtn = el('button', { class: 'modal-close', text: '閉じる' });
  const modal = el('div', { class: 'modal' }, [
    el('div', { class: 'modal-grabber' }),
    el('div', { class: 'modal-header' }, [
      el('div', { class: 'modal-title', text: title }),
      closeBtn,
    ]),
    content,
  ]);
  const backdrop = el('div', { class: 'modal-backdrop' }, [modal]);

  function close() {
    backdrop.remove();
    document.body.style.overflow = '';
  }
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  root.appendChild(backdrop);
  document.body.style.overflow = 'hidden';
  return { close, modal };
}

/** シンプルな確認ダイアログ(Promise<boolean>) */
export function confirmDialog(message) {
  return new Promise((resolve) => {
    const yes = el('button', { class: 'btn btn-danger', text: '削除する' });
    const no = el('button', { class: 'btn btn-ghost', text: 'キャンセル' });
    const content = el('div', {}, [
      el('p', { text: message, style: 'font-size:15px;margin:4px 0 8px;' }),
      el('div', { class: 'row-actions' }, [no, yes]),
    ]);
    const m = openModal('確認', content);
    yes.addEventListener('click', () => { m.close(); resolve(true); });
    no.addEventListener('click', () => { m.close(); resolve(false); });
  });
}

/** 空状態の表示 */
export function emptyState(icon, text) {
  return el('div', { class: 'empty' }, [
    el('span', { class: 'empty-icon', text: icon }),
    el('div', { text }),
  ]);
}
