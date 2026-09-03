// ============================================================
// app.js - エントリポイント。ルーティングと各ビューの描画。
// ============================================================

import { $, $$ } from './util.js';
import { renderHome } from './views/home.js';
import { renderCalendar } from './views/calendar.js';
import { renderMoney } from './views/money.js';
import { renderTodo } from './views/todo.js';
import { renderMemo } from './views/memo.js';

const TITLES = {
  home: '今日',
  calendar: '予定',
  money: '家計簿',
  todo: 'TODO',
  memo: 'メモ',
};

const RENDERERS = {
  home: renderHome,
  calendar: renderCalendar,
  money: renderMoney,
  todo: renderTodo,
  memo: renderMemo,
};

let currentRoute = 'home';

/** 現在のルートを再描画(データ変更後に呼ぶ) */
export async function refresh() {
  await navigate(currentRoute, true);
}

async function navigate(route, isRefresh = false) {
  if (!RENDERERS[route]) route = 'home';
  currentRoute = route;

  // タブのアクティブ状態
  $$('.tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.route === route);
  });

  // タイトル & ヘッダーアクション初期化
  $('#page-title').textContent = TITLES[route];
  $('#header-action').innerHTML = '';

  const view = $('#view');
  view.innerHTML = '';
  if (!isRefresh) view.scrollTop = 0;

  // 各ビューを描画。ビューは { navigate, refresh } を使える。
  await RENDERERS[route](view, { navigate, refresh });
}

function init() {
  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => navigate(tab.dataset.route));
  });
  navigate('home');

  // Service Worker(オフライン対応)。file:// では登録されないが害もない。
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init();
