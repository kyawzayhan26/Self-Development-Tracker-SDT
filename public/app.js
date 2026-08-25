/**
 * SDT Frontend
 * - Renders month calendar
 * - Click day -> fetch checklist -> tick -> save
 * - Shows "Day X/75" labels and overall progress bar
 * - Shows strikes used/left per task
 */

let current = new Date();
current.setHours(0,0,0,0);

// Challenge settings (edit later)
const CHALLENGE_START = '2026-08-26'; // Day 1 is tomorrow (Jan 2, 2026)
const CHALLENGE_DAYS = 30;
const STRIKES_ALLOWED = 3;

const monthLabel = document.getElementById('monthLabel');
const calendarGrid = document.getElementById('calendarGrid');

const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const todayBtn = document.getElementById('todayBtn');

const overallText = document.getElementById('overallText');
const overallMeta = document.getElementById('overallMeta');
const overallBar = document.getElementById('overallBar');

const strikesMeta = document.getElementById('strikesMeta');
const strikesList = document.getElementById('strikesList');

const dayModalEl = document.getElementById('dayModal');
const dayModal = new bootstrap.Modal(dayModalEl);
const dayModalDate = document.getElementById('dayModalDate');
const tasksList = document.getElementById('tasksList');
const saveBtn = document.getElementById('saveBtn');
const saveStatus = document.getElementById('saveStatus');

let openDateKey = null;
let openTasks = [];

const weekdayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function pad2(n){ return String(n).padStart(2,'0'); }
function dateKey(d){
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function monthKey(d){
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}`;
}
function firstDayMondayIndex(d){
  // JS: Sunday=0..Saturday=6
  // Convert to Monday=0..Sunday=6
  const js = d.getDay();
  return (js + 6) % 7;
}

async function apiGet(url){
  const r = await fetch(url);
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Request failed');
  return j;
}
async function apiPut(url, body){
  const r = await fetch(url, {
    method:'PUT',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'Save failed');
  return j;
}

function setMonthLabel(d){
  const fmt = new Intl.DateTimeFormat(undefined, { month:'long', year:'numeric' });
  monthLabel.textContent = fmt.format(d);
}

function renderWeekdayHeader(){
  for (const name of weekdayNames){
    const el = document.createElement('div');
    el.className = 'weekday-header';
    el.textContent = name;
    calendarGrid.appendChild(el);
  }
}

function ringEl(doneCount, totalCount){
  const pct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
  const el = document.createElement('div');
  el.className = 'ring';
  el.dataset.pct = String(pct);
  el.title = `${doneCount}/${totalCount} completed`;
  el.textContent = `${pct}%`;
  return el;
}

function dayNumberFromStart(dateKeyStr){
  // returns 1..CHALLENGE_DAYS, or null if outside range
  const start = new Date(CHALLENGE_START + 'T00:00:00');
  const d = new Date(dateKeyStr + 'T00:00:00');
  const diffDays = Math.round((d - start) / (1000 * 60 * 60 * 24));
  const n = diffDays + 1;
  if (n < 1 || n > CHALLENGE_DAYS) return null;
  return n;
}

function prettyDateFromKey(dateKeyStr){
  const d = new Date(dateKeyStr + 'T00:00:00');
  const fmt = new Intl.DateTimeFormat(undefined, { month:'short', day:'numeric', year:'numeric' });
  return fmt.format(d);
}

async function loadOverallProgress(){
  try{
    const j = await apiGet(`/api/progress/overall-progress?start=${CHALLENGE_START}&days=${CHALLENGE_DAYS}`);
    overallText.textContent = `${j.pct}% complete`;
    overallMeta.textContent = `${j.completedDays}/${j.days} days completed`;
    overallBar.style.width = `${j.pct}%`;
    overallBar.textContent = `${j.pct}%`;
    overallBar.setAttribute('aria-valuenow', String(j.pct));
  }catch(e){
    overallText.textContent = '—';
    overallMeta.textContent = 'Failed to load';
    overallBar.style.width = '0%';
    overallBar.textContent = '';
    overallBar.setAttribute('aria-valuenow', '0');
  }
}

function renderStrikes(tasks, recordedDays){
  strikesList.innerHTML = '';

  for (const t of tasks){
    const row = document.createElement('div');
    row.className = 'strike-row';

    const top = document.createElement('div');
    top.className = 'd-flex justify-content-between align-items-start gap-3';

    const title = document.createElement('div');
    title.className = 'strike-title';
    title.textContent = t.name;

    const badge = document.createElement('div');
    const left = t.strikesLeft;
    const used = t.strikesUsed;

    badge.className = `badge ${left === 0 ? 'text-bg-danger' : (left === 1 ? 'text-bg-warning' : 'text-bg-success')}`;
    badge.textContent = `${left} strikes left`;

    top.appendChild(title);
    top.appendChild(badge);

    const meta = document.createElement('div');
    meta.className = 'strike-meta text-secondary mt-1';
    meta.textContent = `Used: ${used}/${t.strikesAllowed} · Missed (recorded): ${t.missedDays} · Recorded days: ${recordedDays}`;

    row.appendChild(top);
    row.appendChild(meta);
    strikesList.appendChild(row);
  }
}

async function loadStrikes(){
  try{
    const j = await apiGet(`/api/progress/strikes?start=${CHALLENGE_START}&days=${CHALLENGE_DAYS}&strikes=${STRIKES_ALLOWED}`);
    strikesMeta.textContent = `Allowed: ${j.strikesAllowed} strikes per rule · Counted over ${j.recordedDays} recorded day(s)`;
    renderStrikes(j.tasks, j.recordedDays);
  }catch(e){
    strikesMeta.textContent = 'Failed to load strikes';
    strikesList.innerHTML = '';
    const err = document.createElement('div');
    err.className = 'text-danger small';
    err.textContent = e.message;
    strikesList.appendChild(err);
  }
}

async function renderCalendar(){
  calendarGrid.innerHTML = '';
  renderWeekdayHeader();

  const mk = monthKey(current);
  setMonthLabel(current);

  const { days } = await apiGet(`/api/days?month=${mk}`);
  const summary = new Map(days.map(d => [d.dateKey, d]));

  const first = new Date(current.getFullYear(), current.getMonth(), 1);
  const startOffset = firstDayMondayIndex(first);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - startOffset);

  // 6 weeks grid (42 days)
  for (let i=0; i<42; i++){
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);

    const isCurrentMonth = d.getMonth() === current.getMonth();
    const dk = dateKey(d);
    const s = summary.get(dk) || { doneCount:0, totalCount: (days[0]?.totalCount ?? 0) };

    const cell = document.createElement('div');
    cell.className = 'day-cell' + (isCurrentMonth ? '' : ' muted');
    cell.dataset.dateKey = dk;

    const top = document.createElement('div');
    top.className = 'day-top';

    const num = document.createElement('div');
    num.className = 'day-num';
    num.textContent = String(d.getDate());

    top.appendChild(num);
    top.appendChild(ringEl(s.doneCount, s.totalCount));
    cell.appendChild(top);

    // Subtitle: "Jan 2 2026 · Day 1/75"
    const dn = dayNumberFromStart(dk);
    const sub = document.createElement('div');
    sub.className = 'day-sub text-secondary';
    sub.textContent = dn
      ? `${prettyDateFromKey(dk)} · Day ${dn}/${CHALLENGE_DAYS}`
      : `${prettyDateFromKey(dk)}`;
    cell.appendChild(sub);

    // subtle today highlight
    const today = new Date(); today.setHours(0,0,0,0);
    if (dk === dateKey(today)){
      cell.style.outline = '2px solid rgba(13,110,253,.35)';
      cell.style.outlineOffset = '2px';
    }

    cell.addEventListener('click', () => openDay(dk));
    calendarGrid.appendChild(cell);
  }
}

function renderTasks(tasks){
  tasksList.innerHTML = '';
  for (const t of tasks){
    const row = document.createElement('label');
    row.className = 'd-flex align-items-center gap-2 p-2 border rounded-3';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'form-check-input m-0';
    cb.checked = !!t.isDone;
    cb.addEventListener('change', () => {
      t.isDone = cb.checked;
      saveStatus.textContent = '';
    });

    const name = document.createElement('div');
    name.textContent = t.name;

    row.appendChild(cb);
    row.appendChild(name);
    tasksList.appendChild(row);
  }
}

async function openDay(dk){
  openDateKey = dk;
  saveStatus.textContent = '';

  dayModalDate.textContent = dk;

  try{
    const { tasks } = await apiGet(`/api/day/${dk}`);
    openTasks = tasks;
    renderTasks(openTasks);
    dayModal.show();
  }catch(e){
    alert(e.message);
  }
}

saveBtn.addEventListener('click', async () => {
  if (!openDateKey) return;
  saveBtn.disabled = true;
  saveStatus.textContent = 'Saving...';

  try{
    await apiPut(`/api/day/${openDateKey}`, {
      tasks: openTasks.map(t => ({ taskId: t.taskId, isDone: !!t.isDone }))
    });
    saveStatus.textContent = 'Saved ✓';
    await renderCalendar();        // refresh completion rings
    await loadOverallProgress();   // refresh overall bar
    await loadStrikes();           // refresh strikes
  }catch(e){
    saveStatus.textContent = '';
    alert(e.message);
  }finally{
    saveBtn.disabled = false;
  }
});

prevMonthBtn.addEventListener('click', async () => {
  current = new Date(current.getFullYear(), current.getMonth()-1, 1);
  await renderCalendar();
});
nextMonthBtn.addEventListener('click', async () => {
  current = new Date(current.getFullYear(), current.getMonth()+1, 1);
  await renderCalendar();
});
todayBtn.addEventListener('click', async () => {
  const t = new Date(); t.setHours(0,0,0,0);
  current = new Date(t.getFullYear(), t.getMonth(), 1);
  await renderCalendar();
  await openDay(dateKey(t));
});

// init
(async () => {
  try{
    await loadOverallProgress();
    await loadStrikes();
    await renderCalendar();
  }catch(err){
    console.error(err);
    alert('Failed to load calendar. Check server logs + DB connection.');
  }
})();
