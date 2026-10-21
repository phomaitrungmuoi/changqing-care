'use strict';

/* ============================================================
   長青園照護看板
   所有資料存放於瀏覽器 localStorage；首次開啟時載入示範長者。
   ============================================================ */

const STORE_KEY = 'changqing-care:v1';

const ZONES = [
  ['A棟寢室', '🛏️'], ['B棟寢室', '🛏️'], ['大廳', '🛋️'], ['餐廳', '🍵'], ['活動室', '🎨'],
  ['復健室', '🦯'], ['庭院花園', '🌿'], ['醫護站', '🩺'], ['浴室', '🛁'],
];
const ZONE_ICON = Object.fromEntries(ZONES);

const STATUS = {
  rest:    { label: '休息中', tone: 'calm' },
  active:  { label: '活動中', tone: 'green' },
  meal:    { label: '用餐中', tone: 'amber' },
  rehab:   { label: '復健中', tone: 'blue' },
  medical: { label: '就醫中', tone: 'rose' },
  alert:   { label: '需留意', tone: 'red' },
};

// 參考範圍（僅作為畫面提示，不能取代醫療判斷）
const VITALS = [
  { key: 'bp',    label: '血壓',   unit: 'mmHg' },
  { key: 'temp',  label: '體溫',   unit: '°C',    range: [35.8, 37.4] },
  { key: 'pulse', label: '脈搏',   unit: '次/分', range: [60, 100] },
  { key: 'spo2',  label: '血氧',   unit: '%',     range: [94, 100] },
  { key: 'sugar', label: '血糖',   unit: 'mg/dL', range: [70, 180] },
  { key: 'resp',  label: '呼吸',   unit: '次/分', range: [12, 20] },
];
const RANGE = { sys: [90, 139], dia: [60, 89], ...Object.fromEntries(VITALS.filter(v => v.range).map(v => [v.key, v.range])) };
const NUM_KEYS = ['sys', 'dia', 'temp', 'pulse', 'spo2', 'sugar', 'resp'];

/* ---------- 工具 ---------- */
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (window.crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const pad = n => String(n).padStart(2, '0');
const dayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localDT = (d = new Date()) => `${dayStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const hhmm = s => { const d = new Date(s); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function dayLabel(s) {
  const d = new Date(s), t = new Date(), y = new Date();
  y.setDate(t.getDate() - 1);
  if (dayStr(d) === dayStr(t)) return '今天';
  if (dayStr(d) === dayStr(y)) return '昨天';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
const when = s => `${dayLabel(s)} ${hhmm(s)}`;
const isAbn = (k, v) => v !== '' && v != null && RANGE[k] && (v < RANGE[k][0] || v > RANGE[k][1]);
const vitalAbn = v => NUM_KEYS.some(k => isAbn(k, v[k]));

/* ---------- 頭像（SVG 插畫） ---------- */
function avatar(a, cls = '') {
  const { skin, hair, style, glasses, bg, shirt } = a;
  const head = `<ellipse cx="40" cy="38" rx="15" ry="17" fill="${skin}"/>`;
  const ears = `<circle cx="25" cy="40" r="3.6" fill="${skin}"/><circle cx="55" cy="40" r="3.6" fill="${skin}"/>`;
  const hairs = {
    short: `<path d="M24.5 36c-.5-12 6.5-19 15.5-19s16 7 15.5 19c-2.5-6-8-9.5-15.5-9.5S27 30 24.5 36Z" fill="${hair}"/>`,
    bun:   `<circle cx="40" cy="17" r="7" fill="${hair}"/><path d="M24.5 37c-.5-12 6.5-18.5 15.5-18.5S56 25 55.5 37c-3-7-8.5-10-15.5-10S27.5 30 24.5 37Z" fill="${hair}"/>`,
    bald:  `<path d="M24.6 41c-.8-5 .2-9 3-11.5l.6 11.5ZM55.4 41c.8-5-.2-9-3-11.5l-.6 11.5Z" fill="${hair}"/>`,
    curly: `<g fill="${hair}"><circle cx="28" cy="29" r="6"/><circle cx="35" cy="23" r="6.5"/><circle cx="45" cy="23" r="6.5"/><circle cx="52" cy="29" r="6"/><circle cx="40" cy="21" r="6"/><circle cx="26" cy="35" r="4.5"/><circle cx="54" cy="35" r="4.5"/></g>`,
  };
  const face = `
    <path d="M32.5 40q2.5-2.4 5 0M42.5 40q2.5-2.4 5 0" stroke="#4a3a2e" stroke-width="1.7" fill="none" stroke-linecap="round"/>
    <path d="M35.5 47.5q4.5 3.6 9 0" stroke="#9a5a44" stroke-width="1.7" fill="none" stroke-linecap="round"/>
    <circle cx="31" cy="45" r="2.6" fill="#e59b88" opacity=".45"/><circle cx="49" cy="45" r="2.6" fill="#e59b88" opacity=".45"/>
    <path d="M30 37.5l-1.6-.8M50 37.5l1.6-.8" stroke="#4a3a2e" stroke-width="1" opacity=".4" stroke-linecap="round"/>`;
  const specs = glasses ? `<g stroke="#5b4636" stroke-width="1.5" fill="none"><circle cx="35" cy="40" r="5"/><circle cx="45" cy="40" r="5"/><path d="M40 40h0M30 39.5l-4.5-1M50 39.5l4.5-1"/></g>` : '';
  return `<svg class="avatar ${cls}" viewBox="0 0 80 80" aria-hidden="true">
    <circle cx="40" cy="40" r="40" fill="${bg}"/>
    <path d="M13 82c2-15 13-24 27-24s25 9 27 24Z" fill="${shirt}"/>
    <rect x="34" y="50" width="12" height="10" rx="5" fill="${skin}"/>
    ${head}${ears}${hairs[style] || ''}${face}${specs}
  </svg>`;
}

/* ---------- 示範資料 ---------- */
function sampleData() {
  const now = new Date();
  const at = (minsAgo) => localDT(new Date(now - minsAgo * 6e4));
  const M = (minsAgo, zone, note = '') => ({ id: uid(), at: at(minsAgo), zone, note });
  const V = (minsAgo, sys, dia, temp, pulse, spo2, sugar = '', resp = '') => ({ id: uid(), at: at(minsAgo), sys, dia, temp, pulse, spo2, sugar, resp });
  const y = now.getFullYear();
  return [
    {
      name: '陳秀英', title: '陳奶奶', gender: '女', birthYear: y - 84, room: 'A101', status: 'active',
      avatar: { skin: '#f3cfb3', hair: '#e9e4de', style: 'bun', glasses: true, bg: '#f6e4d6', shirt: '#c98b6b' },
      conditions: ['高血壓', '輕度失智'], allergies: ['盤尼西林'], meds: ['Amlodipine 5mg（早餐後）'],
      mobility: '使用助行器', diet: '低鹽飲食', contact: '女兒 陳美玲 0900-000-001', note: '喜歡唱老歌，午睡後情緒較穩定。',
      vitals: [V(1500, 132, 80, 36.4, 74, 97, 118, 16), V(150, 128, 78, 36.5, 72, 97, 110, 16)],
      moves: [M(320, 'A棟寢室', '起床、盥洗'), M(270, '餐廳', '早餐'), M(210, '大廳'), M(95, '活動室', '懷舊歌唱課')],
    },
    {
      name: '林文雄', title: '林爺爺', gender: '男', birthYear: y - 88, room: 'A103', status: 'rehab',
      avatar: { skin: '#e8b994', hair: '#d8d4cf', style: 'bald', glasses: true, bg: '#e5eedc', shirt: '#7c9a6d' },
      conditions: ['第二型糖尿病', '慢性腎臟病第三期'], allergies: ['蝦、蟹（海鮮）'], meds: ['Metformin 500mg（三餐後）', '胰島素（睡前）'],
      mobility: '輪椅', diet: '糖尿病餐、限蛋白', contact: '兒子 林志明 0900-000-002', note: '飯前需測血糖。',
      vitals: [V(1440, 148, 90, 36.6, 78, 96, 165, 18), V(120, 152, 92, 36.7, 80, 96, 192, 18)],
      moves: [M(300, 'A棟寢室'), M(255, '餐廳', '早餐，進食約八分'), M(200, '醫護站', '測血糖'), M(60, '復健室', '上肢肌力訓練')],
    },
    {
      name: '王麗華', title: '王奶奶', gender: '女', birthYear: y - 79, room: 'B201', status: 'rest',
      avatar: { skin: '#f6d6bd', hair: '#cfc9c3', style: 'curly', glasses: false, bg: '#f8ebcc', shirt: '#d9a74a' },
      conditions: ['骨質疏鬆', '白內障術後'], allergies: [], meds: ['鈣片（午餐後）', '人工淚液（每日四次）'],
      mobility: '可自行步行，需注意防跌', diet: '一般飲食', contact: '姪女 王雅婷 0900-000-003', note: '',
      vitals: [V(180, 122, 74, 36.3, 70, 98)],
      moves: [M(290, 'B棟寢室'), M(260, '餐廳'), M(200, '庭院花園', '散步、澆花'), M(40, 'B棟寢室', '午休')],
    },
    {
      name: '張國明', title: '張爺爺', gender: '男', birthYear: y - 91, room: 'B203', status: 'alert',
      avatar: { skin: '#e2b08c', hair: '#f1eeea', style: 'short', glasses: false, bg: '#fbe2dc', shirt: '#9a6a5a' },
      conditions: ['帕金森氏症', '心房顫動'], allergies: ['阿斯匹靈'], meds: ['Levodopa（每日三次）', '抗凝血劑（晚餐後）'],
      mobility: '需一人協助行走', diet: '軟質飲食，防嗆咳', contact: '太太 張林月娥 0900-000-004', note: '服用抗凝血劑，留意瘀青與出血。',
      vitals: [V(1400, 126, 76, 37.0, 84, 95, '', 18), V(30, 118, 70, 37.9, 102, 93, '', 22)],
      moves: [M(310, 'B棟寢室'), M(250, '餐廳', '早餐有輕微嗆咳'), M(180, '大廳'), M(70, 'B棟寢室', '精神較差，回房休息')],
    },
    {
      name: '黃美鳳', title: '黃奶奶', gender: '女', birthYear: y - 86, room: 'A105', status: 'meal',
      avatar: { skin: '#f1c9a8', hair: '#bdb6ae', style: 'short', glasses: false, bg: '#f6e0e5', shirt: '#b56f86' },
      conditions: ['中度失智症（有遊走傾向）', '高血脂'], allergies: ['花生'], meds: ['Donepezil 5mg（睡前）'],
      mobility: '可自行步行', diet: '一般飲食，避免花生', contact: '兒子 黃建華 0900-000-005', note: '常會走到大廳門口找家人，請多留意動線。',
      vitals: [V(240, 134, 82, 36.6, 76, 97)],
      moves: [M(330, 'A棟寢室'), M(280, '大廳', '在門口徘徊，已陪同'), M(240, '餐廳'), M(200, '庭院花園'), M(150, '大廳'), M(110, '活動室', '摺紙'), M(20, '餐廳', '午餐')],
    },
    {
      name: '李志強', title: '李爺爺', gender: '男', birthYear: y - 82, room: 'B205', status: 'medical',
      avatar: { skin: '#dba882', hair: '#a9a29a', style: 'short', glasses: true, bg: '#e0ebf1', shirt: '#5f7f96' },
      conditions: ['慢性阻塞性肺病（COPD）'], allergies: ['磺胺類藥物'], meds: ['吸入型支氣管擴張劑（早晚）'],
      mobility: '可自行步行，易喘', diet: '一般飲食', contact: '女兒 李佩君 0900-000-006', note: '活動後血氧可能下降，必要時給氧。',
      vitals: [V(1380, 130, 78, 36.8, 88, 93, '', 20), V(45, 136, 84, 36.9, 92, 92, '', 22)],
      moves: [M(300, 'B棟寢室'), M(260, '餐廳'), M(130, '浴室', '協助沐浴'), M(45, '醫護站', '血氧偏低，護理師評估中')],
    },
  ].concat(extraSamples()).map(r => ({ id: uid(), ...r }));
}

// 第二批示範長者（舊資料升級時也會補上）
function extraSamples() {
  const now = new Date();
  const at = (minsAgo) => localDT(new Date(now - minsAgo * 6e4));
  const M = (minsAgo, zone, note = '') => ({ id: uid(), at: at(minsAgo), zone, note });
  const V = (minsAgo, sys, dia, temp, pulse, spo2, sugar = '', resp = '') => ({ id: uid(), at: at(minsAgo), sys, dia, temp, pulse, spo2, sugar, resp });
  const y = now.getFullYear();
  return [
    {
      name: '吳金龍', title: '吳爺爺', gender: '男', birthYear: y - 87, room: 'A107', status: 'active',
      avatar: { skin: '#e6b48f', hair: '#ece8e3', style: 'bald', glasses: false, bg: '#efe8df', shirt: '#8a7b6c' },
      conditions: ['腦中風後遺症（右側無力）', '吞嚥困難'], allergies: [], meds: ['Clopidogrel 75mg（早餐後）'],
      mobility: '輪椅，轉位需一人協助', diet: '細碎飲食、液體需增稠', contact: '兒子 吳俊傑 0900-000-007', note: '進食時需坐正 90 度，餵食後保持坐姿 30 分鐘。',
      vitals: [V(1420, 138, 84, 36.5, 76, 96), V(200, 134, 80, 36.6, 74, 96, '', 18)],
      moves: [M(320, 'A棟寢室'), M(270, '餐廳', '協助餵食'), M(150, '復健室', '站立訓練'), M(50, '大廳', '看電視')],
    },
    {
      name: '劉玉蘭', title: '劉奶奶', gender: '女', birthYear: y - 92, room: 'B207', status: 'rest',
      avatar: { skin: '#f4d2b8', hair: '#f1eeea', style: 'bun', glasses: true, bg: '#e0ebf1', shirt: '#7d97ab' },
      conditions: ['心臟衰竭', '退化性關節炎'], allergies: ['碘造影劑'], meds: ['利尿劑（早餐後）', '止痛貼片（每三天更換）'],
      mobility: '臥床為主，每兩小時翻身', diet: '低鹽、限水 1200 ml/日', contact: '孫女 劉怡君 0900-000-008', note: '每日早晨量體重，注意下肢水腫。',
      vitals: [V(1460, 118, 70, 36.4, 82, 95, '', 18), V(90, 112, 68, 36.5, 88, 94, '', 20)],
      moves: [M(600, 'B棟寢室'), M(160, '浴室', '床上擦澡後推輪椅沐浴'), M(110, 'B棟寢室', '返回休息')],
    },
    {
      name: '周志明', title: '周爺爺', gender: '男', birthYear: y - 76, room: 'A109', status: 'active',
      avatar: { skin: '#dcaa84', hair: '#6b6058', style: 'short', glasses: true, bg: '#e5eedc', shirt: '#6f8f61' },
      conditions: ['憂鬱症', '高血壓'], allergies: ['乳膠'], meds: ['Sertraline 50mg（早餐後）', 'Losartan 50mg（早餐後）'],
      mobility: '可自行步行', diet: '一般飲食', contact: '太太 周陳美惠 0900-000-009', note: '近期話變少，鼓勵參與團體活動。照護時請使用非乳膠手套。',
      vitals: [V(300, 136, 86, 36.6, 70, 98)],
      moves: [M(330, 'A棟寢室'), M(280, '餐廳'), M(230, '活動室', '書法班'), M(80, '庭院花園', '下棋')],
    },
    {
      name: '蔡淑芬', title: '蔡奶奶', gender: '女', birthYear: y - 81, room: 'B209', status: 'meal',
      avatar: { skin: '#f0c7a4', hair: '#a9a29a', style: 'curly', glasses: true, bg: '#f8ebcc', shirt: '#c7954a' },
      conditions: ['第二型糖尿病', '視力退化（黃斑部病變）'], allergies: ['頭孢菌素類抗生素'], meds: ['胰島素（三餐前）'],
      mobility: '使用助行器，夜間需開燈', diet: '糖尿病飲食', contact: '女兒 蔡雅雯 0900-000-010', note: '視力差，請先出聲再靠近，避免驚嚇。',
      vitals: [V(1440, 142, 84, 36.5, 80, 97, 168), V(25, 146, 88, 36.6, 84, 97, 212)],
      moves: [M(310, 'B棟寢室'), M(265, '餐廳'), M(200, '醫護站', '注射胰島素'), M(140, '活動室'), M(15, '餐廳', '午餐')],
    },
  ];
}

/* ---------- 儲存 ---------- */
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (d && Array.isArray(d.residents)) {
      d.notices = Array.isArray(d.notices) ? d.notices : [];
      if ((d.version || 1) < 2) {
        const names = new Set(d.residents.map(r => r.name));
        d.residents.push(...extraSamples().filter(r => !names.has(r.name)).map(r => ({ id: uid(), ...r })));
        if (!d.notices.length) d.notices = freshData().notices;
        d.version = 2;
      }
      return d;
    }
  } catch { /* 忽略 */ }
  return freshData();
}
function freshData() {
  const now = Date.now();
  const ago = m => localDT(new Date(now - m * 6e4));
  return {
    version: 2,
    residents: sampleData(),
    notices: [
      { id: uid(), at: ago(240), level: 'important', author: '早班 王護理師', text: '張爺爺今晨早餐有嗆咳，午餐改為軟質並全程陪同。' },
      { id: uid(), at: ago(120), level: 'normal', author: '社工 林小姐', text: '下午 3 點活動室有懷舊電影欣賞，請協助行動不便長者前往。' },
    ],
  };
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
  catch { toast('無法儲存：瀏覽器封鎖了本機儲存空間'); }
}

let db = load();
try { localStorage.removeItem('changqing-care:apikey'); } catch { /* 舊版 Claude 金鑰，已不使用 */ }
if (!localStorage.getItem(STORE_KEY)) save();
const ui = { view: 'residents', zone: 'all', query: '', selectedId: null, tab: 'health', mq: '', mzone: 'all', mday: 'today' };

const byId = id => db.residents.find(r => r.id === id);
const latest = (arr) => arr.reduce((a, x) => (!a || x.at > a.at ? x : a), null);
const currentMove = r => latest(r.moves);
const currentZone = r => currentMove(r)?.zone || '';
const age = r => new Date().getFullYear() - r.birthYear;
const fold = s => String(s ?? '').toLowerCase();

/* ---------- 畫面 ---------- */
function render() {
  document.querySelectorAll('.view-btn').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === ui.view));
  const badge = alerts().filter(a => a.level !== 'low').length;
  const nb = $('#noticeBadge');
  nb.textContent = badge;
  nb.hidden = !badge;
  ({ residents: renderResidents, moves: renderMoves, notices: renderNotices, ai: renderAI })[ui.view]();
  renderDetail();
}
function commit() { save(); render(); }

function vitalsMini(v) {
  if (!v) return '<span>尚無生命徵象紀錄</span>';
  const item = (label, text, abn) => (text === '' ? '' : `<span class="${abn ? 'abn' : ''}">${label} <b>${esc(text)}</b></span>`);
  return [
    item('血壓', v.sys !== '' ? `${v.sys}/${v.dia}` : '', isAbn('sys', v.sys) || isAbn('dia', v.dia)),
    item('體溫', v.temp !== '' ? `${v.temp}°` : '', isAbn('temp', v.temp)),
    item('脈搏', v.pulse, isAbn('pulse', v.pulse)),
    item('血氧', v.spo2 !== '' ? `${v.spo2}%` : '', isAbn('spo2', v.spo2)),
  ].join('');
}

function residentCard(r) {
  const st = STATUS[r.status];
  const mv = currentMove(r);
  return `<article class="card${r.status === 'alert' ? ' alert' : ''}" role="button" tabindex="0" data-open="${esc(r.id)}">
    <div class="card-head">
      ${avatar(r.avatar)}
      <div class="who">
        <h3>${esc(r.name)}<small>${esc(r.title)}</small></h3>
        <p>${age(r)} 歲 · ${esc(r.gender)} · 房號 ${esc(r.room)}</p>
      </div>
    </div>
    <div class="card-row">
      <span class="pill tone-${st.tone}">${st.label}</span>
      <span class="loc">${mv ? `${ZONE_ICON[mv.zone] || '📍'} ${esc(mv.zone)} <span class="since">${hhmm(mv.at)} 起</span>` : '位置未記錄'}</span>
    </div>
    ${r.allergies.length ? `<div class="tags">${r.allergies.map(a => `<span class="tag allergy">⚠ 過敏：${esc(a)}</span>`).join('')}</div>` : ''}
    <div class="mini-vitals">${vitalsMini(latest(r.vitals))}</div>
  </article>`;
}

function renderResidents() {
  const rs = db.residents;
  const abn = rs.filter(r => { const v = latest(r.vitals); return v && vitalAbn(v); }).length;
  const sum = (label, n, tone = '') => `<div class="sum ${n ? tone : ''}"><div class="sum-label">${label}</div><div class="sum-value">${n}</div></div>`;
  const count = z => rs.filter(r => currentZone(r) === z).length;
  const q = fold(ui.query.trim());
  const list = rs
    .filter(r => ui.zone === 'all' || currentZone(r) === ui.zone)
    .filter(r => !q || fold([r.name, r.title, r.room, ...r.conditions].join(' ')).includes(q))
    .sort((a, b) => (b.status === 'alert') - (a.status === 'alert') || a.room.localeCompare(b.room));

  $('#main').innerHTML = `
    <section class="summary" aria-label="今日摘要">
      ${sum('在園長者', rs.length)}
      ${sum('需留意', rs.filter(r => r.status === 'alert').length, 'red')}
      ${sum('就醫中', rs.filter(r => r.status === 'medical').length, 'rose')}
      ${sum('生命徵象異常', abn, 'amber')}
    </section>

    <h2 class="section-title">長者目前所在區域</h2>
    <div class="zones">
      <button class="zone-chip" data-zone="all" aria-pressed="${ui.zone === 'all'}">全部 <span class="n">${rs.length}</span></button>
      ${ZONES.map(([z, ic]) => `<button class="zone-chip${count(z) ? '' : ' empty-zone'}" data-zone="${z}" aria-pressed="${ui.zone === z}">${ic} ${z} <span class="n">${count(z)}</span></button>`).join('')}
    </div>

    ${(() => { const hi = alerts().filter(a => a.level === 'high').length; return hi ? `<button class="banner" data-view="notices">⚠ 目前有 <b>${hi}</b> 則重要提醒，點此查看通知中心</button>` : ''; })()}

    <div class="toolbar">
      <button class="btn btn-primary" data-action="add">＋ 新增長者</button>
      <label class="search">🔍<input id="q" type="search" placeholder="搜尋姓名、房號、病史…" value="${esc(ui.query)}" autocomplete="off" aria-label="搜尋長者"></label>
      <span class="result-note">${ui.zone === 'all' ? '' : `目前在「${esc(ui.zone)}」：`}共 ${list.length} 位</span>
    </div>

    <section class="grid">
      ${list.length ? list.map(residentCard).join('') : '<div class="empty">沒有符合條件的長者</div>'}
    </section>`;
}

function renderMoves() {
  const q = fold(ui.mq.trim());
  const today = dayStr();
  const rows = db.residents
    .flatMap(r => r.moves.map(m => ({ ...m, r })))
    .filter(m => ui.mzone === 'all' || m.zone === ui.mzone)
    .filter(m => ui.mday === 'all' || m.at.startsWith(today))
    .filter(m => !q || fold([m.r.name, m.r.title, m.r.room, m.note].join(' ')).includes(q))
    .sort((a, b) => b.at.localeCompare(a.at));

  $('#main').innerHTML = `
    <h2 class="section-title" style="margin-top:0">園區動線紀錄 — 查詢長者曾經去過哪些區域</h2>
    <div class="filters">
      <label class="search">🔍<input id="mq" type="search" placeholder="輸入長者姓名或房號…" value="${esc(ui.mq)}" autocomplete="off" aria-label="搜尋動線"></label>
      <select id="mzone" aria-label="區域">
        <option value="all">所有區域</option>
        ${ZONES.map(([z, ic]) => `<option value="${z}"${ui.mzone === z ? ' selected' : ''}>${ic} ${z}</option>`).join('')}
      </select>
      <select id="mday" aria-label="日期">
        <option value="today"${ui.mday === 'today' ? ' selected' : ''}>今天</option>
        <option value="all"${ui.mday === 'all' ? ' selected' : ''}>全部日期</option>
      </select>
    </div>
    <p class="result-note">共 ${rows.length} 筆紀錄（由新到舊）</p>
    <div class="move-list">
      ${rows.length ? rows.map(m => `
        <div class="move-item" role="button" tabindex="0" data-open="${esc(m.r.id)}" data-tab="moves">
          <span class="t">${hhmm(m.at)}<small>${dayLabel(m.at)}</small></span>
          ${avatar(m.r.avatar, 'sm')}
          <span><span class="name">${esc(m.r.name)}<small>${esc(m.r.room)}</small></span>${m.note ? `<br><span class="note">${esc(m.note)}</span>` : ''}</span>
          <span class="zone">${ZONE_ICON[m.zone] || '📍'} ${esc(m.zone)}</span>
        </div>`).join('') : '<div class="empty">查無紀錄</div>'}
    </div>`;
}

function vitalTiles(v) {
  if (!v) return '<p class="result-note">尚無紀錄，可在「生命徵象」分頁新增。</p>';
  return `<div class="vital-tiles">${VITALS.map(({ key, label, unit }) => {
    const val = key === 'bp' ? (v.sys !== '' ? `${v.sys}/${v.dia}` : '') : v[key];
    const abn = key === 'bp' ? isAbn('sys', v.sys) || isAbn('dia', v.dia) : isAbn(key, v[key]);
    return `<div class="vt${abn ? ' abn' : ''}"><div class="k">${label}${abn ? ' ⚠' : ''}</div><div class="v">${val === '' ? '—' : esc(val)}<small>${val === '' ? '' : unit}</small></div></div>`;
  }).join('')}</div>`;
}

function healthTab(r) {
  const tags = (arr, cls = '') => (arr.length ? `<div class="tags">${arr.map(x => `<span class="tag ${cls}">${esc(x)}</span>`).join('')}</div>` : '—');
  return `<div class="box"><h3>基本資料與病史</h3>
    <dl class="info">
      <dt>病史</dt><dd>${tags(r.conditions)}</dd>
      <dt>過敏</dt><dd>${r.allergies.length ? tags(r.allergies, 'allergy') : '無已知過敏'}</dd>
      <dt>用藥</dt><dd>${r.meds.length ? r.meds.map(esc).join('<br>') : '—'}</dd>
      <dt>行動能力</dt><dd>${esc(r.mobility) || '—'}</dd>
      <dt>飲食</dt><dd>${esc(r.diet) || '—'}</dd>
      <dt>緊急聯絡</dt><dd>${esc(r.contact) || '—'}</dd>
      ${r.note ? `<dt>照護備註</dt><dd>${esc(r.note)}</dd>` : ''}
    </dl></div>`;
}

function vitalsTab(r) {
  const rows = [...r.vitals].sort((a, b) => b.at.localeCompare(a.at));
  const f = (name, label, step = '1') => `<label class="field"><span>${label}</span><input name="${name}" type="number" inputmode="decimal" step="${step}"></label>`;
  const td = (k, val, txt = val) => `<td class="${isAbn(k, val) ? 'abn' : ''}">${val === '' ? '—' : esc(txt)}</td>`;
  return `<form class="box" data-form="vital"><h3>新增測量 <small>只填有量的項目即可</small></h3>
      <div class="form-row">
        ${f('sys', '收縮壓 mmHg')}${f('dia', '舒張壓 mmHg')}${f('temp', '體溫 °C', '0.1')}
        ${f('pulse', '脈搏 次/分')}${f('spo2', '血氧 %')}${f('sugar', '血糖 mg/dL')}
        ${f('resp', '呼吸 次/分')}
        <label class="field" style="grid-column: span 2"><span>測量時間</span><input name="at" type="datetime-local" value="${localDT()}" required></label>
      </div>
      <div class="form-actions"><button class="btn btn-primary" type="submit">儲存測量</button></div>
    </form>
    <div class="box"><h3>歷次紀錄 <small>紅字為超出參考範圍</small></h3>
      ${rows.length ? `<div class="table-wrap" style="margin-top:0"><table>
        <thead><tr><th>時間</th><th>血壓</th><th>體溫</th><th>脈搏</th><th>血氧</th><th>血糖</th><th>呼吸</th></tr></thead>
        <tbody>${rows.map(v => `<tr><td>${when(v.at)}</td>
          <td class="${isAbn('sys', v.sys) || isAbn('dia', v.dia) ? 'abn' : ''}">${v.sys === '' ? '—' : `${esc(v.sys)}/${esc(v.dia)}`}</td>
          ${td('temp', v.temp)}${td('pulse', v.pulse)}${td('spo2', v.spo2, `${v.spo2}%`)}${td('sugar', v.sugar)}${td('resp', v.resp)}</tr>`).join('')}
        </tbody></table></div>` : '<p class="result-note">尚無紀錄</p>'}
    </div>`;
}

function movesTab(r) {
  const moves = [...r.moves].sort((a, b) => b.at.localeCompare(a.at));
  let lastDay = '';
  return `<div class="box"><h3>動線紀錄 <small>由新到舊</small></h3>
      ${moves.length ? `<ul class="timeline">${moves.map((m, i) => {
        const d = dayLabel(m.at);
        const sep = d !== lastDay ? `<li class="day-sep" style="padding-left:0">${d}</li>` : '';
        lastDay = d;
        return `${sep}<li class="${i === 0 ? 'now' : ''}">
          <div class="tl-body">
            <div class="tl-time">${hhmm(m.at)}${i === 0 ? '　· 目前位置' : ''}</div>
            <div class="tl-zone">${ZONE_ICON[m.zone] || '📍'} ${esc(m.zone)}</div>
            ${m.note ? `<div class="tl-note">${esc(m.note)}</div>` : ''}
          </div>
          <button class="icon-btn sm" data-action="move-del" data-id="${esc(m.id)}" aria-label="刪除這筆紀錄" title="刪除">✕</button>
        </li>`;
      }).join('')}</ul>` : '<p class="result-note">尚無動線紀錄</p>'}
      <details>
        <summary>補登一筆動線（指定時間或加備註）</summary>
        <form data-form="move" style="margin-top:12px">
          <div class="form-row">
            <label class="field"><span>區域</span><select name="zone">${ZONES.map(([z]) => `<option>${z}</option>`).join('')}</select></label>
            <label class="field" style="grid-column: span 2"><span>時間</span><input name="at" type="datetime-local" value="${localDT()}" required></label>
            <label class="field full"><span>備註</span><input name="note" placeholder="例如：陪同散步、家屬來訪"></label>
          </div>
          <div class="form-actions"><button class="btn btn-primary" type="submit">新增紀錄</button></div>
        </form>
      </details>
    </div>`;
}

function renderDetail() {
  const drawer = $('#detail');
  const r = byId(ui.selectedId);
  if (!r) {
    ui.selectedId = null;
    drawer.hidden = true; $('#scrim').hidden = true; document.body.classList.remove('lock');
    return;
  }
  const scroll = drawer.scrollTop;
  const wasHidden = drawer.hidden;
  const zone = currentZone(r);
  const mv = currentMove(r);
  const v = latest(r.vitals);
  const tab = (k, label) => `<button class="view-btn" data-tab-btn="${k}" aria-pressed="${ui.tab === k}">${label}</button>`;

  drawer.innerHTML = `
    <div class="d-head">
      ${avatar(r.avatar, 'lg')}
      <div class="who">
        <h2 tabindex="-1">${esc(r.name)}<small>${esc(r.title)}</small></h2>
        <p>${age(r)} 歲 · ${esc(r.gender)} · 房號 ${esc(r.room)}</p>
      </div>
      <button class="icon-btn" data-action="close" aria-label="關閉">✕</button>
    </div>
    <div class="d-status">
      <button class="btn btn-ghost" data-action="edit">✎ 編輯資料</button>
      <select data-status aria-label="目前狀態">
        ${Object.entries(STATUS).map(([k, s]) => `<option value="${k}"${k === r.status ? ' selected' : ''}>狀態：${s.label}</option>`).join('')}
      </select>
      <span class="loc">${mv ? `${ZONE_ICON[zone] || '📍'} 目前在 <b>${esc(zone)}</b> <span class="since">（${hhmm(mv.at)} 起）</span>` : '位置未記錄'}</span>
    </div>
    ${r.allergies.length ? `<div class="allergy-banner">⚠ <span><strong>過敏：</strong>${r.allergies.map(esc).join('、')}</span></div>` : ''}

    <div class="box"><h3>最新生命徵象 <small>${v ? when(v.at) : ''}</small></h3>${vitalTiles(v)}</div>

    <div class="box"><h3>記錄移動 <small>點選長者現在要去的區域</small></h3>
      <div class="move-btns">${ZONES.map(([z, ic]) => `<button class="move-btn${z === zone ? ' here' : ''}" data-move="${z}"${z === zone ? ' aria-current="true"' : ''}>${ic} ${z}</button>`).join('')}</div>
    </div>

    <div class="views" style="margin-top:20px; display:inline-flex">
      ${tab('health', '病史與過敏')}${tab('vitals', '生命徵象')}${tab('moves', '動線紀錄')}
    </div>
    ${{ health: healthTab, vitals: vitalsTab, moves: movesTab }[ui.tab](r)}`;

  drawer.hidden = false; $('#scrim').hidden = false; document.body.classList.add('lock');
  drawer.scrollTop = wasHidden ? 0 : scroll;
}


/* ---------- 通知中心 ---------- */
const LEVEL = { high: { label: '緊急', tone: 'red' }, mid: { label: '注意', tone: 'amber' }, low: { label: '提醒', tone: 'calm' } };
const isWanderer = r => [...r.conditions, r.note].join(' ').includes('遊走');

function abnList(v) {
  const out = [];
  if (isAbn('sys', v.sys) || isAbn('dia', v.dia)) out.push(`血壓 ${v.sys}/${v.dia}`);
  if (isAbn('temp', v.temp)) out.push(`體溫 ${v.temp}°C`);
  if (isAbn('pulse', v.pulse)) out.push(`脈搏 ${v.pulse}`);
  if (isAbn('spo2', v.spo2)) out.push(`血氧 ${v.spo2}%`);
  if (isAbn('sugar', v.sugar)) out.push(`血糖 ${v.sugar}`);
  if (isAbn('resp', v.resp)) out.push(`呼吸 ${v.resp}`);
  return out;
}

// 依目前資料自動產生的系統提醒
function alerts() {
  const out = [];
  const now = Date.now();
  for (const r of db.residents) {
    if (r.status === 'alert') out.push({ level: 'high', r, text: '狀態標記為「需留意」' });
    if (r.status === 'medical') out.push({ level: 'mid', r, text: '目前就醫中' });
    const v = latest(r.vitals);
    if (v) {
      const ab = abnList(v);
      if (ab.length) out.push({ level: ab.length >= 2 || isAbn('spo2', v.spo2) ? 'high' : 'mid', r, text: `生命徵象異常：${ab.join('、')}（${when(v.at)}）` });
      if (now - new Date(v.at) > 24 * 36e5) out.push({ level: 'low', r, text: '超過 24 小時未測量生命徵象' });
    } else {
      out.push({ level: 'low', r, text: '尚無生命徵象紀錄' });
    }
    const mv = currentMove(r);
    if (mv && isWanderer(r) && ['大廳', '庭院花園'].includes(mv.zone)) out.push({ level: 'mid', r, text: `有遊走傾向，目前在${mv.zone}，請留意出入口` });
    if (mv && !mv.zone.includes('寢室') && now - new Date(mv.at) > 4 * 36e5) out.push({ level: 'low', r, text: `在${mv.zone}已超過 4 小時未更新位置` });
  }
  const order = { high: 0, mid: 1, low: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

function renderNotices() {
  const list = alerts();
  const notices = [...db.notices].sort((a, b) => b.at.localeCompare(a.at));
  $('#main').innerHTML = `
    <div class="two-col">
      <section>
        <h2 class="section-title" style="margin-top:0">系統提醒 <small>依目前資料自動產生</small></h2>
        <div class="alert-list">
          ${list.length ? list.map(a => `
            <div class="alert-item lv-${a.level}" role="button" tabindex="0" data-open="${esc(a.r.id)}">
              ${avatar(a.r.avatar, 'sm')}
              <div><b>${esc(a.r.name)}</b> <small>${esc(a.r.room)}</small><br><span>${esc(a.text)}</span></div>
              <span class="pill tone-${LEVEL[a.level].tone}">${LEVEL[a.level].label}</span>
            </div>`).join('') : '<div class="empty">目前沒有提醒 🌿</div>'}
        </div>
      </section>
      <section>
        <h2 class="section-title" style="margin-top:0">交班公告</h2>
        <form class="box" data-form="notice" style="margin-top:0">
          <label class="field full"><span>公告內容</span><textarea name="text" rows="3" required placeholder="例如：今晚 B 棟浴室維修，請改用 A 棟浴室。"></textarea></label>
          <div class="form-row" style="margin-top:10px">
            <label class="field"><span>重要程度</span><select name="level"><option value="normal">一般</option><option value="important">重要</option></select></label>
            <label class="field" style="grid-column: span 2"><span>發布人</span><input name="author" placeholder="例如：夜班 陳照服員"></label>
          </div>
          <div class="form-actions"><button class="btn btn-primary" type="submit">發布公告</button></div>
        </form>
        <div class="notice-list">
          ${notices.length ? notices.map(n => `
            <article class="notice${n.level === 'important' ? ' important' : ''}">
              <header><span>${n.level === 'important' ? '📌 重要 · ' : ''}${when(n.at)}${n.author ? ` · ${esc(n.author)}` : ''}</span>
                <button class="icon-btn sm" data-action="notice-del" data-id="${esc(n.id)}" aria-label="刪除公告">✕</button></header>
              <p>${esc(n.text)}</p>
            </article>`).join('') : '<div class="empty">尚無公告</div>'}
        </div>
      </section>
    </div>`;
}

/* ---------- AI 分析 ---------- */
// 本機規則式風險評估：不需網路，資料不會離開裝置
function assess(r) {
  const f = [];
  const add = (pts, text, tip) => f.push({ pts, text, tip });
  const v = latest(r.vitals);
  const prev = [...r.vitals].sort((a, b) => b.at.localeCompare(a.at))[1];
  if (r.status === 'alert') add(3, '照護人員已標記「需留意」', '提高巡視頻率，每 1 小時確認一次狀況');
  if (r.status === 'medical') add(2, '目前就醫中', '追蹤就醫結果並更新用藥、照護計畫');
  if (v) {
    if (isAbn('spo2', v.spo2)) add(3, `血氧偏低（${v.spo2}%）`, '協助半坐臥、評估是否需給氧，30 分鐘後複測');
    if (isAbn('temp', v.temp)) add(2, `體溫異常（${v.temp}°C）`, '補充水分、1 小時後複測體溫，持續發燒請通報護理師');
    if (isAbn('sys', v.sys) || isAbn('dia', v.dia)) add(2, `血壓超出範圍（${v.sys}/${v.dia}）`, '休息 15 分鐘後複測，確認是否按時服用降壓藥');
    if (isAbn('pulse', v.pulse)) add(2, `脈搏異常（${v.pulse}）`, '觀察是否有胸悶、頭暈，必要時通報');
    if (isAbn('sugar', v.sugar)) add(2, `血糖異常（${v.sugar} mg/dL）`, '確認飲食與胰島素時間，依醫囑處理');
    if (isAbn('resp', v.resp)) add(1, `呼吸次數異常（${v.resp}）`, '觀察呼吸型態與膚色');
    if (prev) {
      if (v.sys !== '' && prev.sys !== '' && v.sys - prev.sys >= 15) add(1, `血壓較上次上升 ${v.sys - prev.sys} mmHg`, '持續追蹤血壓趨勢');
      if (v.temp !== '' && prev.temp !== '' && v.temp - prev.temp >= 0.5) add(1, `體溫較上次上升 ${(v.temp - prev.temp).toFixed(1)}°C`, '注意感染徵兆');
      if (v.spo2 !== '' && prev.spo2 !== '' && prev.spo2 - v.spo2 >= 2) add(1, `血氧較上次下降 ${prev.spo2 - v.spo2}%`, '注意呼吸狀況');
    }
    if (Date.now() - new Date(v.at) > 24 * 36e5) add(1, '超過 24 小時未測量生命徵象', '安排今日測量');
  } else add(1, '尚無生命徵象紀錄', '安排測量基準值');

  const fallSigns = /助行器|輪椅|協助|防跌|臥床/.test(r.mobility);
  if (age(r) >= 85 && fallSigns) add(2, `高齡 ${age(r)} 歲且行動需輔助，跌倒風險高`, '保持走道淨空、床欄拉起、移位時全程陪同');
  else if (fallSigns) add(1, '行動需輔助，有跌倒風險', '移位與如廁時陪同');
  if (r.meds.join(' ').includes('抗凝血') || r.meds.join(' ').includes('Clopidogrel')) add(1, '服用抗凝血／抗血小板藥物', '跌倒或碰撞後需檢查瘀青與出血');
  if (/吞嚥|嗆咳/.test([...r.conditions, r.diet, r.note].join(' '))) add(1, '有吞嚥困難或嗆咳情形', '進食時坐正、少量慢食，餐後維持坐姿 30 分鐘');

  const today = dayStr();
  const todayMoves = r.moves.filter(m => m.at.startsWith(today));
  if (isWanderer(r)) {
    const exits = todayMoves.filter(m => ['大廳', '庭院花園'].includes(m.zone)).length;
    if (exits >= 2) add(2, `有遊走傾向，今天已 ${exits} 次到大廳／庭院`, '安排陪伴活動、留意出入口門禁');
    else add(1, '有遊走傾向', '定時確認所在位置');
  }
  const outings = new Set(todayMoves.filter(m => !m.zone.includes('寢室')).map(m => m.zone)).size;
  if (outings === 0 && !/臥床/.test(r.mobility)) add(1, '今天幾乎沒有離開寢室', '鼓勵參加團體活動或到庭院曬太陽');
  if (/憂鬱/.test(r.conditions.join(' '))) add(1, '有憂鬱症病史', '留意情緒與食慾變化，多陪伴聊天');

  const score = f.reduce((n, x) => n + x.pts, 0);
  const level = score >= 6 ? 'high' : score >= 3 ? 'mid' : 'low';
  return { r, score, level, findings: f.sort((a, b) => b.pts - a.pts) };
}
const RISK = { high: { label: '高風險', tone: 'red' }, mid: { label: '中風險', tone: 'amber' }, low: { label: '低風險', tone: 'green' } };

function renderAI() {
  const res = db.residents.map(assess).sort((a, b) => b.score - a.score);
  const n = k => res.filter(x => x.level === k).length;
  const key = (() => { try { return localStorage.getItem(GEMINI_KEY_STORE) || ''; } catch { return ''; } })();
  const aiModel = (() => { try { return localStorage.getItem(GEMINI_MODEL_STORE) || GEMINI_MODELS[0][0]; } catch { return GEMINI_MODELS[0][0]; } })();
  $('#main').innerHTML = `
    <section class="ai-hero">
      <div>
        <h2>🤖 AI 照護分析</h2>
        <p>綜合生命徵象、病史、行動能力與今日動線，自動找出需要優先關注的長者並提供照護建議。結果僅供參考，不能取代醫護專業判斷。</p>
      </div>
      <div class="risk-sum">
        <span class="pill tone-red">高風險 ${n('high')}</span><span class="pill tone-amber">中風險 ${n('mid')}</span><span class="pill tone-green">低風險 ${n('low')}</span>
      </div>
    </section>

    <h2 class="section-title">風險排序（本機分析，資料不會離開這台裝置）</h2>
    <div class="grid">
      ${res.map(x => `
        <article class="card risk-card" role="button" tabindex="0" data-open="${esc(x.r.id)}">
          <div class="card-head">
            ${avatar(x.r.avatar)}
            <div class="who"><h3>${esc(x.r.name)}<small>${esc(x.r.title)}</small></h3><p>房號 ${esc(x.r.room)} · 風險分數 ${x.score}</p></div>
            <span class="pill tone-${RISK[x.level].tone}">${RISK[x.level].label}</span>
          </div>
          ${x.findings.length ? `<ul class="findings">${x.findings.slice(0, 4).map(f => `<li><b>${esc(f.text)}</b><span>→ ${esc(f.tip)}</span></li>`).join('')}</ul>` : '<p class="result-note">目前狀況穩定，維持例行照護即可。</p>'}
        </article>`).join('')}
    </div>

    <section class="box ai-box">
      <h3>✨ 使用 Google Gemini 產生交班摘要 <small>需要 Gemini API 金鑰</small></h3>
      <p class="warn-note">按下「開始分析」後，所選長者的照護資料會傳送給 Google 的 Gemini 處理。系統會以稱呼（如「陳奶奶」）代替全名，且不包含聯絡電話。金鑰只存在你這台裝置的瀏覽器，不會放進網站程式碼。使用實際長者資料前，請先確認符合機構的個資規範。</p>
      <div class="form-row">
        <label class="field"><span>分析對象</span>
          <select id="aiTarget"><option value="all">全體長者</option>${db.residents.map(r => `<option value="${esc(r.id)}">${esc(r.name)}（${esc(r.room)}）</option>`).join('')}</select>
        </label>
        <label class="field"><span>模型</span>
          <select id="aiModel">${GEMINI_MODELS.map(([v, l]) => `<option value="${v}"${v === aiModel ? ' selected' : ''}>${l}</option>`).join('')}</select>
        </label>
        <label class="field"><span>API 金鑰</span><input id="aiKey" type="password" autocomplete="off" placeholder="貼上你的 Gemini API 金鑰" value="${esc(key)}"></label>
      </div>
      <label class="check"><input id="aiRemember" type="checkbox"${key ? ' checked' : ''}> 在這台裝置記住金鑰（只存在本機瀏覽器）</label>
      <div class="form-actions"><button class="btn btn-primary" data-action="ai-run" id="aiRun">開始分析</button></div>
      <div id="aiOut" class="ai-out" hidden></div>
    </section>`;
}

function aiPayload(target) {
  const list = target === 'all' ? db.residents : db.residents.filter(r => r.id === target);
  const today = dayStr();
  return list.map(r => ({
    稱呼: r.title, 年齡: age(r), 性別: r.gender, 房號: r.room, 狀態: STATUS[r.status].label,
    病史: r.conditions, 過敏: r.allergies, 用藥: r.meds, 行動能力: r.mobility, 飲食: r.diet, 照護備註: r.note,
    生命徵象: [...r.vitals].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5)
      .map(v => ({ 時間: v.at, 血壓: v.sys !== '' ? `${v.sys}/${v.dia}` : '', 體溫: v.temp, 脈搏: v.pulse, 血氧: v.spo2, 血糖: v.sugar, 呼吸: v.resp })),
    今日動線: r.moves.filter(m => m.at.startsWith(today)).sort((a, b) => a.at.localeCompare(b.at)).map(m => `${hhmm(m.at)} ${m.zone}${m.note ? `（${m.note}）` : ''}`),
    系統風險評估: assess(r).findings.map(f => f.text),
  }));
}

// 簡易 Markdown 轉換（先跳脫 HTML 再加格式）
function miniMarkdown(md) {
  return esc(md).split('\n').map(line => {
    const l = line.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    if (/^#{1,6}\s/.test(line)) return `<h4>${l.replace(/^#{1,6}\s/, '')}</h4>`;
    if (/^\s*[-*]\s/.test(line)) return `<li>${l.replace(/^\s*[-*]\s/, '')}</li>`;
    return l.trim() ? `<p>${l}</p>` : '';
  }).join('');
}

const GEMINI_KEY_STORE = 'changqing-care:gemini-key';
const GEMINI_MODEL_STORE = 'changqing-care:gemini-model';
const GEMINI_MODELS = [['gemini-flash-latest', 'Gemini Flash（快速）'], ['gemini-pro-latest', 'Gemini Pro（較深入）']];
const AI_SYSTEM = '你是長照機構的資深護理顧問，協助照服員與護理師交班。請一律使用繁體中文，語氣溫和、條列清楚、可直接執行。你不做醫療診斷；遇到可能危急的狀況，要明確建議立即通報護理師或醫師。';

// 呼叫 Gemini：先試 Gemini API（AI Studio 金鑰），若金鑰不被接受再試 Vertex AI 快速模式端點
async function callGemini(key, model, prompt) {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: AI_SYSTEM }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
  });
  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent`,
  ];
  let last;
  for (const url of endpoints) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    last = last || { status: res.status, message: data?.error?.message || '' }; // 顯示第一個端點（Gemini API）的錯誤
    if (![400, 401, 403].includes(res.status)) break; // 只有金鑰類錯誤才改試另一個端點
  }
  throw last;
}

async function runGemini() {
  const key = $('#aiKey').value.trim();
  const model = $('#aiModel').value;
  const out = $('#aiOut');
  const btn = $('#aiRun');
  if (!key) { toast('請先輸入 Gemini API 金鑰'); return; }
  try {
    localStorage.setItem(GEMINI_MODEL_STORE, model);
    if ($('#aiRemember').checked) localStorage.setItem(GEMINI_KEY_STORE, key);
    else localStorage.removeItem(GEMINI_KEY_STORE);
  } catch { /* 忽略 */ }
  out.hidden = false;
  out.innerHTML = '<p class="result-note">Gemini 正在分析，約需 10–60 秒…</p>';
  btn.disabled = true;
  try {
    const prompt = `以下是今天長者的照護資料（JSON）。請整理成交班摘要，包含：\n1. 今日整體重點（三點以內）\n2. 需優先關注的長者：原因與具體照護建議\n3. 其他長者的簡短狀況\n4. 下一班需要追蹤的事項\n\n${JSON.stringify(aiPayload($('#aiTarget').value), null, 1)}`;
    const data = await callGemini(key, model, prompt);
    const cand = data.candidates?.[0];
    const text = (cand?.content?.parts || []).map(p => p.text || '').join('').trim();
    if (!text) {
      const why = data.promptFeedback?.blockReason || cand?.finishReason || '';
      out.innerHTML = `<p class="warn-note">Gemini 沒有回傳內容${why ? `（${esc(why)}）` : ''}，請稍後再試或換一個模型。</p>`;
      return;
    }
    out.innerHTML = `<div class="ai-text">${miniMarkdown(text)}</div><p class="result-note">由 ${esc(model)} 產生 · ${when(localDT())} · 僅供參考</p>`;
  } catch (err) {
    const status = err?.status;
    const msg = [400, 401, 403].includes(status) ? 'API 金鑰無效或沒有使用 Gemini 的權限，請確認金鑰後再試。'
      : status === 404 ? '找不到這個模型，請換另一個模型再試。'
      : status === 429 ? '請求太頻繁或額度不足，請稍後再試。'
      : status ? `Gemini 服務回傳錯誤（${status}）。` : '無法連線到 Gemini，請檢查網路連線。';
    out.innerHTML = `<p class="warn-note">${esc(msg)}${err?.message ? `<br><small>${esc(err.message)}</small>` : ''}</p>`;
  } finally {
    btn.disabled = false;
  }
}

/* ---------- 新增／編輯長者 ---------- */
const AV = {
  style: [['bun', '髮髻'], ['short', '短髮'], ['curly', '捲髮'], ['bald', '少髮']],
  hair: [['#f1eeea', '白髮'], ['#cfc9c3', '銀灰'], ['#a9a29a', '灰髮'], ['#6b6058', '深灰']],
  skin: [['#f6d6bd', '白皙'], ['#ebbd98', '自然'], ['#d6a07a', '小麥']],
  bg: [['#f6e4d6', '#c98b6b'], ['#e5eedc', '#7c9a6d'], ['#f8ebcc', '#c7954a'], ['#e0ebf1', '#6f8aa0'], ['#f6e0e5', '#b56f86'], ['#efe8df', '#8a7b6c']],
};
const splitList = s => String(s || '').split(/[,，、\n]/).map(x => x.trim()).filter(Boolean);

function openEditor(id) {
  const r = id ? byId(id) : null;
  ui.editingId = r ? r.id : null;
  const dlg = $('#editor');
  const a = r ? r.avatar : { style: 'short', hair: '#cfc9c3', skin: '#ebbd98', bg: '#f6e4d6', shirt: '#c98b6b', glasses: false };
  const opt = (list, cur) => list.map(([v, l]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${l}</option>`).join('');
  dlg.innerHTML = `
    <form data-form="resident" class="editor-form">
      <header class="modal-head"><h2>${r ? '編輯長者資料' : '新增長者'}</h2><button type="button" class="icon-btn" data-action="editor-close" aria-label="關閉">✕</button></header>
      <div class="editor-body">
        <div class="av-picker">
          <div id="avPreview">${avatar(a, 'lg')}</div>
          <div class="form-row">
            <label class="field"><span>髮型</span><select name="av_style">${opt(AV.style, a.style)}</select></label>
            <label class="field"><span>髮色</span><select name="av_hair">${opt(AV.hair, a.hair)}</select></label>
            <label class="field"><span>膚色</span><select name="av_skin">${opt(AV.skin, a.skin)}</select></label>
          </div>
          <div class="swatches">${AV.bg.map(([bg, shirt]) => `<label class="swatch" style="--c:${bg}"><input type="radio" name="av_bg" value="${bg}|${shirt}"${bg === a.bg ? ' checked' : ''}><span></span></label>`).join('')}
            <label class="check"><input type="checkbox" name="av_glasses"${a.glasses ? ' checked' : ''}> 戴眼鏡</label></div>
        </div>
        <div class="form-row">
          <label class="field"><span>姓名 *</span><input name="name" required value="${esc(r?.name)}"></label>
          <label class="field"><span>稱呼</span><input name="title" placeholder="例如：陳奶奶" value="${esc(r?.title)}"></label>
          <label class="field"><span>性別</span><select name="gender">${opt([['女', '女'], ['男', '男']], r?.gender || '女')}</select></label>
          <label class="field"><span>年齡 *</span><input name="age" type="number" min="40" max="120" required value="${r ? age(r) : ''}"></label>
          <label class="field"><span>房號 *</span><input name="room" required placeholder="例如：A111" value="${esc(r?.room)}"></label>
          <label class="field"><span>狀態</span><select name="status">${opt(Object.entries(STATUS).map(([k, v]) => [k, v.label]), r?.status || 'rest')}</select></label>
          ${r ? '' : `<label class="field"><span>目前所在區域</span><select name="zone">${opt(ZONES.map(([z]) => [z, z]), 'A棟寢室')}</select></label>`}
          <label class="field full"><span>病史（用頓號或逗號分隔）</span><input name="conditions" placeholder="例如：高血壓、糖尿病" value="${esc(r?.conditions.join('、'))}"></label>
          <label class="field full"><span>過敏（沒有可留空）</span><input name="allergies" placeholder="例如：盤尼西林、花生" value="${esc(r?.allergies.join('、'))}"></label>
          <label class="field full"><span>用藥</span><input name="meds" placeholder="例如：降血壓藥（早餐後）" value="${esc(r?.meds.join('、'))}"></label>
          <label class="field"><span>行動能力</span><input name="mobility" placeholder="例如：使用助行器" value="${esc(r?.mobility)}"></label>
          <label class="field"><span>飲食</span><input name="diet" placeholder="例如：低鹽飲食" value="${esc(r?.diet)}"></label>
          <label class="field"><span>緊急聯絡人</span><input name="contact" placeholder="例如：女兒 0900-…" value="${esc(r?.contact)}"></label>
          <label class="field full"><span>照護備註</span><input name="note" value="${esc(r?.note)}"></label>
        </div>
      </div>
      <footer class="modal-foot">
        ${r ? '<button type="button" class="btn btn-ghost danger" data-action="resident-del" style="margin-right:auto">刪除這位長者</button>' : ''}
        <button type="button" class="btn btn-ghost" data-action="editor-close">取消</button>
        <button type="submit" class="btn btn-primary">${r ? '儲存' : '新增'}</button>
      </footer>
    </form>`;
  dlg.showModal();
  dlg.querySelector('[name="name"]').focus();
}

function editorAvatar(form) {
  const f = new FormData(form);
  const [bg, shirt] = String(f.get('av_bg') || '#f6e4d6|#c98b6b').split('|');
  return { style: f.get('av_style'), hair: f.get('av_hair'), skin: f.get('av_skin'), bg, shirt, glasses: f.get('av_glasses') === 'on' };
}

function saveResident(form) {
  const f = Object.fromEntries(new FormData(form));
  const data = {
    name: f.name.trim(), title: f.title.trim() || `${f.name.trim()[0] || ''}${f.gender === '男' ? '爺爺' : '奶奶'}`,
    gender: f.gender, birthYear: new Date().getFullYear() - Number(f.age), room: f.room.trim().toUpperCase(), status: f.status,
    conditions: splitList(f.conditions), allergies: splitList(f.allergies), meds: splitList(f.meds),
    mobility: f.mobility.trim(), diet: f.diet.trim(), contact: f.contact.trim(), note: f.note.trim(),
    avatar: editorAvatar(form),
  };
  const r = byId(ui.editingId);
  if (r) {
    Object.assign(r, data);
    toast(`已更新 ${data.name} 的資料`);
  } else {
    const nr = { id: uid(), ...data, vitals: [], moves: [{ id: uid(), at: localDT(), zone: f.zone, note: '入住登記' }] };
    db.residents.push(nr);
    ui.selectedId = nr.id;
    ui.tab = 'health';
    toast(`已新增 ${data.name}`);
  }
  $('#editor').close();
  commit();
}

/* ---------- 動作 ---------- */
function open(id, tab = 'health') {
  ui.selectedId = id;
  ui.tab = tab;
  renderDetail();
  $('#detail h2')?.focus();
}
function close() {
  const prev = ui.selectedId;
  ui.selectedId = null;
  render();
  if (prev) document.querySelector(`[data-open="${CSS.escape(prev)}"]`)?.focus();
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
}

document.addEventListener('click', e => {
  const t = e.target;
  const view = t.closest('[data-view]');
  if (view) { ui.view = view.dataset.view; render(); return; }
  const zone = t.closest('[data-zone]');
  if (zone) { ui.zone = zone.dataset.zone; renderResidents(); return; }
  const openEl = t.closest('[data-open]');
  if (openEl) { open(openEl.dataset.open, openEl.dataset.tab); return; }
  const tabBtn = t.closest('[data-tab-btn]');
  if (tabBtn) { ui.tab = tabBtn.dataset.tabBtn; renderDetail(); return; }

  const r = byId(ui.selectedId);
  const mv = t.closest('[data-move]');
  if (mv && r) {
    if (mv.dataset.move === currentZone(r)) return;
    r.moves.push({ id: uid(), at: localDT(), zone: mv.dataset.move, note: '' });
    commit();
    toast(`已記錄：${r.name} → ${mv.dataset.move}`);
    return;
  }
  const act = t.closest('[data-action]')?.dataset.action;
  if (act === 'close') close();
  else if (act === 'add') openEditor();
  else if (act === 'edit') openEditor(ui.selectedId);
  else if (act === 'editor-close') $('#editor').close();
  else if (act === 'ai-run') runGemini();
  else if (act === 'notice-del' && confirm('刪除這則公告？')) {
    const id = t.closest('[data-action]').dataset.id;
    db.notices = db.notices.filter(n => n.id !== id);
    commit();
  } else if (act === 'resident-del') {
    const victim = byId(ui.editingId);
    if (victim && confirm(`確定要刪除「${victim.name}」的所有資料嗎？此動作無法復原。`)) {
      db.residents = db.residents.filter(x => x.id !== victim.id);
      ui.selectedId = null;
      $('#editor').close();
      commit();
      toast('已刪除');
    }
  }
  else if (act === 'move-del' && r && confirm('刪除這筆動線紀錄？')) {
    const id = t.closest('[data-action]').dataset.id;
    r.moves = r.moves.filter(m => m.id !== id);
    commit();
  } else if (act === 'reset' && confirm('確定要清除目前所有資料，並重新載入示範長者嗎？')) {
    db = freshData();
    ui.selectedId = null;
    commit();
    toast('已重設為示範資料');
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'q') {
    ui.query = e.target.value;
    renderResidents();
    const q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length);
  } else if (e.target.id === 'mq') {
    ui.mq = e.target.value;
    renderMoves();
    const q = $('#mq'); q.focus(); q.setSelectionRange(q.value.length, q.value.length);
  }
});

document.addEventListener('change', e => {
  if (e.target.form?.dataset.form === 'resident' && e.target.name?.startsWith('av_')) {
    $('#avPreview').innerHTML = avatar(editorAvatar(e.target.form), 'lg');
    return;
  }
  if (e.target.id === 'mzone') { ui.mzone = e.target.value; renderMoves(); }
  else if (e.target.id === 'mday') { ui.mday = e.target.value; renderMoves(); }
  else if (e.target.matches('[data-status]')) {
    const r = byId(ui.selectedId);
    r.status = e.target.value;
    commit();
    toast(`${r.name}：${STATUS[r.status].label}`);
  }
});

document.addEventListener('submit', e => {
  e.preventDefault();
  const form = e.target;
  if (form.dataset.form === 'resident') { saveResident(form); return; }
  if (form.dataset.form === 'notice') {
    const n = Object.fromEntries(new FormData(form));
    if (!n.text.trim()) return;
    db.notices.push({ id: uid(), at: localDT(), level: n.level, author: n.author.trim(), text: n.text.trim() });
    commit();
    toast('已發布公告');
    return;
  }
  const r = byId(ui.selectedId);
  if (!r) return;
  const f = Object.fromEntries(new FormData(form));
  if (form.dataset.form === 'vital') {
    const v = { id: uid(), at: f.at || localDT() };
    NUM_KEYS.forEach(k => { v[k] = f[k] === '' || f[k] == null ? '' : Number(f[k]); });
    if (NUM_KEYS.every(k => v[k] === '')) { toast('請至少填寫一項數值'); return; }
    r.vitals.push(v);
    toast(vitalAbn(v) ? '已儲存，有數值超出參考範圍，請留意' : '已儲存測量');
  } else if (form.dataset.form === 'move') {
    r.moves.push({ id: uid(), at: f.at || localDT(), zone: f.zone, note: (f.note || '').trim() });
    toast('已新增動線紀錄');
  }
  commit();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && ui.selectedId) close();
  else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-open]')) {
    e.preventDefault();
    open(e.target.dataset.open, e.target.dataset.tab);
  }
});

$('#editor').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });

window.addEventListener('storage', e => { if (e.key === STORE_KEY) { db = load(); render(); } });

$('#today').textContent = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
render();
