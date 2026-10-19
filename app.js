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
  ].map(r => ({ id: uid(), ...r }));
}

/* ---------- 儲存 ---------- */
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (d && Array.isArray(d.residents)) return d;
  } catch { /* 忽略 */ }
  return { residents: sampleData() };
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); }
  catch { toast('無法儲存：瀏覽器封鎖了本機儲存空間'); }
}

let db = load();
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
  ui.view === 'residents' ? renderResidents() : renderMoves();
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

    <div class="toolbar">
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
  else if (act === 'move-del' && r && confirm('刪除這筆動線紀錄？')) {
    const id = t.closest('[data-action]').dataset.id;
    r.moves = r.moves.filter(m => m.id !== id);
    commit();
  } else if (act === 'reset' && confirm('確定要清除目前所有資料，並重新載入示範長者嗎？')) {
    db = { residents: sampleData() };
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

window.addEventListener('storage', e => { if (e.key === STORE_KEY) { db = load(); render(); } });

$('#today').textContent = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
render();
