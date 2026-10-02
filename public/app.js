/*
 * SDT Frontend
 *
 * Modes:
 * 1. Setup
 * 2. Dashboard
 *
 * V2 Features:
 * - Authentication
 * - Daily Notes
 * - Challenge History
 */

let challenge = null;

let current = new Date();
current.setHours(0, 0, 0, 0);

let openDateKey = null;
let openTasks = [];
let setupTasks = [];


/* =========================================
   ELEMENTS
========================================= */

const loadingScreen =
  document.getElementById('loadingScreen');

const setupScreen =
  document.getElementById('setupScreen');

const dashboardScreen =
  document.getElementById('dashboardScreen');

const challengeNameInput =
  document.getElementById('challengeName');

const challengeStartInput =
  document.getElementById('challengeStartDate');

const challengeDurationInput =
  document.getElementById('challengeDuration');

const challengeStrikesInput =
  document.getElementById('challengeStrikes');

const setupTasksList =
  document.getElementById('setupTasksList');

const setupValidation =
  document.getElementById('setupValidation');

const addTaskBtn =
  document.getElementById('addTaskBtn');

const startChallengeBtn =
  document.getElementById('startChallengeBtn');

const activeChallengeName =
  document.getElementById('activeChallengeName');

const activeChallengeDates =
  document.getElementById('activeChallengeDates');

const activeChallengeMeta =
  document.getElementById('activeChallengeMeta');

const progressReportBtn =
  document.getElementById('progressReportBtn');

const confirmEndChallengeBtn =
  document.getElementById('confirmEndChallengeBtn');

const endChallengeStatus =
  document.getElementById('endChallengeStatus');

const endChallengeModalEl =
  document.getElementById('endChallengeModal');

const endChallengeModal =
  new bootstrap.Modal(endChallengeModalEl);

const historyBtn =
  document.getElementById('historyBtn');

const historyModalEl =
  document.getElementById('historyModal');

const historyModal =
  new bootstrap.Modal(historyModalEl);

const historyLoading =
  document.getElementById('historyLoading');

const historyError =
  document.getElementById('historyError');

const historyEmpty =
  document.getElementById('historyEmpty');

const historyList =
  document.getElementById('historyList');

const historyCount =
  document.getElementById('historyCount');

const monthLabel =
  document.getElementById('monthLabel');

const calendarGrid =
  document.getElementById('calendarGrid');

const prevMonthBtn =
  document.getElementById('prevMonth');

const nextMonthBtn =
  document.getElementById('nextMonth');

const todayBtn =
  document.getElementById('todayBtn');

const overallText =
  document.getElementById('overallText');

const overallMeta =
  document.getElementById('overallMeta');

const overallBar =
  document.getElementById('overallBar');

const strikesMeta =
  document.getElementById('strikesMeta');

const strikesList =
  document.getElementById('strikesList');

const dayModalEl =
  document.getElementById('dayModal');

const dayModal =
  new bootstrap.Modal(dayModalEl);

const dayModalDate =
  document.getElementById('dayModalDate');

const tasksList =
  document.getElementById('tasksList');

const dayNote =
  document.getElementById('dayNote');

const dayNoteCount =
  document.getElementById('dayNoteCount');

const saveBtn =
  document.getElementById('saveBtn');

const saveStatus =
  document.getElementById('saveStatus');

const weekdayNames = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun'
];


/* =========================================
   API
========================================= */

async function getApiHeaders(
  includeJson = false
) {
  const token =
    await window.sdtAuth.getAccessToken();

  if (!token) {
    throw new Error(
      'Your session has expired. Please sign in again.'
    );
  }

  const headers = {
    Authorization:
      `Bearer ${token}`
  };

  if (includeJson) {
    headers['Content-Type'] =
      'application/json';
  }

  return headers;
}


async function readApiResponse(
  response
) {
  let data;

  try {
    data =
      await response.json();
  }
  catch {
    throw new Error(
      'The server returned an invalid response.'
    );
  }

  if (response.status === 401) {
    throw new Error(
      data.error ||
      'Your session has expired. Please sign in again.'
    );
  }

  if (
    !response.ok ||
    !data.ok
  ) {
    throw new Error(
      data.error ||
      'Request failed'
    );
  }

  return data;
}


async function apiGet(url) {
  const headers =
    await getApiHeaders();

  const response =
    await fetch(
      url,
      { headers }
    );

  return readApiResponse(
    response
  );
}


async function apiPost(
  url,
  body = {}
) {
  const headers =
    await getApiHeaders(true);

  const response =
    await fetch(
      url,
      {
        method: 'POST',
        headers,
        body:
          JSON.stringify(body)
      }
    );

  return readApiResponse(
    response
  );
}


async function apiPut(
  url,
  body
) {
  const headers =
    await getApiHeaders(true);

  const response =
    await fetch(
      url,
      {
        method: 'PUT',
        headers,
        body:
          JSON.stringify(body)
      }
    );

  return readApiResponse(
    response
  );
}


/* =========================================
   DATE HELPERS
========================================= */

function pad2(value) {
  return String(value)
    .padStart(2, '0');
}


function dateKey(date) {
  return (
    `${date.getFullYear()}-` +
    `${pad2(date.getMonth() + 1)}-` +
    `${pad2(date.getDate())}`
  );
}


function monthKey(date) {
  return (
    `${date.getFullYear()}-` +
    `${pad2(date.getMonth() + 1)}`
  );
}


function parseDate(value) {
  return new Date(
    value + 'T00:00:00'
  );
}


function prettyDate(value) {
  if (!value) {
    return '—';
  }

  return new Intl
    .DateTimeFormat(
      undefined,
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }
    )
    .format(
      parseDate(value)
    );
}


function prettyDateTime(value) {
  if (!value) {
    return '—';
  }

  return new Intl
    .DateTimeFormat(
      undefined,
      {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    )
    .format(
      new Date(value)
    );
}


function firstDayMondayIndex(date) {
  return (
    date.getDay() + 6
  ) % 7;
}


function challengeEndDate() {
  return parseDate(
    challenge.endDate
  );
}


function isChallengeDate(value) {
  if (!challenge) {
    return false;
  }

  const date =
    parseDate(value);

  const start =
    parseDate(
      challenge.startDate
    );

  const end =
    challengeEndDate();

  return (
    date >= start &&
    date <= end
  );
}


function challengeDayNumber(value) {
  if (!isChallengeDate(value)) {
    return null;
  }

  const date =
    parseDate(value);

  const start =
    parseDate(
      challenge.startDate
    );

  return (
    Math.round(
      (date - start) /
      86400000
    ) + 1
  );
}


/* =========================================
   FINAL REPORT HELPERS
========================================= */

function finalReportToken(
  completedChallenge
) {
  return (
    `${completedChallenge.challengeId}:` +
    `${completedChallenge.completedAt || ''}`
  );
}


async function checkNaturalFinalReport() {
  try {
    const data =
      await apiGet(
        '/api/challenges/latest-completed'
      );

    const completedChallenge =
      data.challenge;

    if (!completedChallenge) {
      return false;
    }

    if (
      completedChallenge
        .completionReason !==
      'NATURAL'
    ) {
      return false;
    }

    const token =
      finalReportToken(
        completedChallenge
      );

    const lastShown =
      localStorage.getItem(
        'sdtLastFinalReportToken'
      );

    if (token === lastShown) {
      return false;
    }

    localStorage.setItem(
      'sdtLastFinalReportToken',
      token
    );

    window.location.href =
      `/report.html?` +
      `type=final&` +
      `challengeId=${completedChallenge.challengeId}&` +
      `autoPrint=1`;

    return true;
  }
  catch (error) {
    console.error(
      'Final report check failed:',
      error
    );

    return false;
  }
}


/* =========================================
   CHALLENGE HISTORY
========================================= */

function historyCompletionLabel(
  completionReason
) {
  if (
    completionReason ===
    'NATURAL'
  ) {
    return 'Completed naturally';
  }

  if (
    completionReason ===
    'MANUAL'
  ) {
    return 'Ended manually';
  }

  return 'Completed';
}


function createHistoryCard(
  item
) {
  const card =
    document.createElement('div');

  card.className =
    'history-card';

  const content =
    document.createElement('div');

  content.className =
    'history-card-content';

  const headingRow =
    document.createElement('div');

  headingRow.className =
    'history-card-heading';

  const titleWrap =
    document.createElement('div');

  titleWrap.className =
    'history-card-title-wrap';

  const title =
    document.createElement('h3');

  title.className =
    'history-card-title';

  title.textContent =
    item.name;

  const badge =
    document.createElement('span');

  badge.className =
    item.completionReason ===
    'NATURAL'
      ? 'badge text-bg-success'
      : 'badge text-bg-secondary';

  badge.textContent =
    historyCompletionLabel(
      item.completionReason
    );

  titleWrap.appendChild(title);
  titleWrap.appendChild(badge);

  const dates =
    document.createElement('div');

  dates.className =
    'history-card-dates';

  dates.textContent =
    `${prettyDate(item.startDate)} – ` +
    `${prettyDate(item.endDate)}`;

  headingRow.appendChild(
    titleWrap
  );

  content.appendChild(
    headingRow
  );

  content.appendChild(
    dates
  );

  const meta =
    document.createElement('div');

  meta.className =
    'history-card-meta';

  const duration =
    document.createElement('span');

  duration.textContent =
    `${item.durationDays} day` +
    `${item.durationDays === 1 ? '' : 's'}`;

  const rules =
    document.createElement('span');

  const taskCount =
    Array.isArray(item.tasks)
      ? item.tasks.length
      : 0;

  rules.textContent =
    `${taskCount} rule` +
    `${taskCount === 1 ? '' : 's'}`;

  const strikes =
    document.createElement('span');

  strikes.textContent =
    `${item.strikesAllowed} strike` +
    `${item.strikesAllowed === 1 ? '' : 's'} allowed`;

  meta.appendChild(duration);
  meta.appendChild(rules);
  meta.appendChild(strikes);

  content.appendChild(meta);

  if (item.completedAt) {
    const completed =
      document.createElement('div');

    completed.className =
      'history-card-completed';

    completed.textContent =
      `Closed ${prettyDateTime(item.completedAt)}`;

    content.appendChild(
      completed
    );
  }

  const actions =
    document.createElement('div');

  actions.className =
    'history-card-actions';

  const reportButton =
    document.createElement('button');

  reportButton.type =
    'button';

  reportButton.className =
    'btn btn-outline-primary btn-sm';

  reportButton.textContent =
    'View Final Report';

  reportButton.addEventListener(
    'click',
    () => {
      window.open(
        `/report.html?` +
        `type=final&` +
        `challengeId=${item.challengeId}`,
        '_blank'
      );
    }
  );

  actions.appendChild(
    reportButton
  );

  card.appendChild(content);
  card.appendChild(actions);

  return card;
}


async function loadChallengeHistory() {
  historyLoading
    .classList
    .remove('d-none');

  historyError
    .classList
    .add('d-none');

  historyEmpty
    .classList
    .add('d-none');

  historyList
    .classList
    .add('d-none');

  historyList.innerHTML =
    '';

  historyCount.textContent =
    '';

  try {
    const data =
      await apiGet(
        '/api/challenges/history'
      );

    const challenges =
      Array.isArray(data.challenges)
        ? data.challenges
        : [];

    historyLoading
      .classList
      .add('d-none');

    historyCount.textContent =
      challenges.length === 1
        ? '1 completed challenge'
        : `${challenges.length} completed challenges`;

    if (
      challenges.length === 0
    ) {
      historyEmpty
        .classList
        .remove('d-none');

      return;
    }

    for (
      const item of challenges
    ) {
      historyList.appendChild(
        createHistoryCard(item)
      );
    }

    historyList
      .classList
      .remove('d-none');
  }
  catch (error) {
    console.error(
      'Challenge history failed:',
      error
    );

    historyLoading
      .classList
      .add('d-none');

    historyError.textContent =
      error.message;

    historyError
      .classList
      .remove('d-none');
  }
}


async function openChallengeHistory() {
  historyModal.show();

  await loadChallengeHistory();
}


/* =========================================
   SETUP
========================================= */

function tomorrowDateKey() {
  const date =
    new Date();

  date.setHours(
    0,
    0,
    0,
    0
  );

  date.setDate(
    date.getDate() + 1
  );

  return dateKey(date);
}


function initializeSetup() {
  challengeNameInput.value =
    '';

  challengeStartInput.value =
    tomorrowDateKey();

  challengeDurationInput.value =
    30;

  challengeStrikesInput.value =
    3;

  setupTasks = [''];

  clearSetupError();

  renderSetupTasks();
}


function showSetup() {
  challenge = null;

  loadingScreen
    .classList
    .add('d-none');

  dashboardScreen
    .classList
    .add('d-none');

  setupScreen
    .classList
    .remove('d-none');

  initializeSetup();
}


function addSetupTask() {
  setupTasks.push('');

  renderSetupTasks();

  setTimeout(
    () => {
      const inputs =
        setupTasksList
          .querySelectorAll(
            '.setup-task-input'
          );

      inputs[
        inputs.length - 1
      ]?.focus();
    },
    0
  );
}


function removeSetupTask(index) {
  setupTasks.splice(
    index,
    1
  );

  if (
    setupTasks.length === 0
  ) {
    setupTasks.push('');
  }

  renderSetupTasks();
}


function moveSetupTask(
  index,
  direction
) {
  const target =
    index + direction;

  if (
    target < 0 ||
    target >= setupTasks.length
  ) {
    return;
  }

  const temp =
    setupTasks[index];

  setupTasks[index] =
    setupTasks[target];

  setupTasks[target] =
    temp;

  renderSetupTasks();
}


function renderSetupTasks() {
  setupTasksList.innerHTML =
    '';

  setupTasks.forEach(
    (task, index) => {
      const row =
        document.createElement('div');

      row.className =
        'setup-task-row';

      const number =
        document.createElement('div');

      number.className =
        'setup-task-number';

      number.textContent =
        index + 1;

      const input =
        document.createElement('input');

      input.type =
        'text';

      input.maxLength =
        200;

      input.className =
        'form-control setup-task-input';

      input.placeholder =
        'Example: Walk 10,000 steps';

      input.value =
        task;

      input.addEventListener(
        'input',
        () => {
          setupTasks[index] =
            input.value;
        }
      );

      input.addEventListener(
        'keydown',
        event => {
          if (
            event.key ===
            'Enter'
          ) {
            event.preventDefault();

            addSetupTask();
          }
        }
      );

      const actions =
        document.createElement('div');

      actions.className =
        'setup-task-actions';

      const up =
        document.createElement('button');

      up.type =
        'button';

      up.className =
        'btn btn-outline-secondary btn-sm';

      up.textContent =
        '↑';

      up.disabled =
        index === 0;

      up.addEventListener(
        'click',
        () =>
          moveSetupTask(
            index,
            -1
          )
      );

      const down =
        document.createElement('button');

      down.type =
        'button';

      down.className =
        'btn btn-outline-secondary btn-sm';

      down.textContent =
        '↓';

      down.disabled =
        index ===
        setupTasks.length - 1;

      down.addEventListener(
        'click',
        () =>
          moveSetupTask(
            index,
            1
          )
      );

      const remove =
        document.createElement('button');

      remove.type =
        'button';

      remove.className =
        'btn btn-outline-danger btn-sm';

      remove.textContent =
        'Remove';

      remove.addEventListener(
        'click',
        () =>
          removeSetupTask(index)
      );

      actions.appendChild(up);
      actions.appendChild(down);
      actions.appendChild(remove);

      row.appendChild(number);
      row.appendChild(input);
      row.appendChild(actions);

      setupTasksList.appendChild(row);
    }
  );
}


function showSetupError(message) {
  setupValidation.textContent =
    message;

  setupValidation
    .classList
    .remove('d-none');
}


function clearSetupError() {
  setupValidation
    .classList
    .add('d-none');

  setupValidation.textContent =
    '';
}


async function startChallenge() {
  clearSetupError();

  const tasks =
    setupTasks
      .map(
        task =>
          task.trim()
      )
      .filter(Boolean);

  const payload = {
    name:
      challengeNameInput
        .value
        .trim(),

    startDate:
      challengeStartInput.value,

    durationDays:
      Number(
        challengeDurationInput.value
      ),

    strikesAllowed:
      Number(
        challengeStrikesInput.value
      ),

    tasks
  };

  if (!payload.name) {
    return showSetupError(
      'Enter a challenge name.'
    );
  }

  if (!payload.startDate) {
    return showSetupError(
      'Choose a start date.'
    );
  }

  if (
    tasks.length === 0
  ) {
    return showSetupError(
      'Add at least one rule or task.'
    );
  }

  startChallengeBtn.disabled =
    true;

  startChallengeBtn.textContent =
    'Starting...';

  try {
    await apiPost(
      '/api/challenges/start',
      payload
    );

    await loadApplication();
  }
  catch (error) {
    showSetupError(
      error.message
    );
  }
  finally {
    startChallengeBtn.disabled =
      false;

    startChallengeBtn.textContent =
      'Start Challenge';
  }
}


/* =========================================
   REPORT
========================================= */

function openProgressReport() {
  if (!challenge) {
    return;
  }

  window.open(
    '/report.html',
    '_blank'
  );
}


/* =========================================
   END CHALLENGE
========================================= */

async function endCurrentChallenge() {
  if (!challenge) {
    return;
  }

  confirmEndChallengeBtn.disabled =
    true;

  confirmEndChallengeBtn.textContent =
    'Ending...';

  endChallengeStatus.textContent =
    '';

  try {
    const result =
      await apiPost(
        '/api/challenges/current/end'
      );

    endChallengeModal.hide();

    window.location.href =
      `/report.html?` +
      `type=final&` +
      `challengeId=${result.challengeId}&` +
      `autoPrint=1`;
  }
  catch (error) {
    endChallengeStatus.textContent =
      error.message;

    confirmEndChallengeBtn.disabled =
      false;

    confirmEndChallengeBtn.textContent =
      'End Challenge';
  }
}


/* =========================================
   DASHBOARD
========================================= */

function showDashboard() {
  loadingScreen
    .classList
    .add('d-none');

  setupScreen
    .classList
    .add('d-none');

  dashboardScreen
    .classList
    .remove('d-none');

  activeChallengeName.textContent =
    challenge.name;

  activeChallengeDates.textContent =
    `${prettyDate(challenge.startDate)} – ` +
    `${prettyDate(challenge.endDate)}`;

  activeChallengeMeta.textContent =
    `${challenge.durationDays} days · ` +
    `${challenge.tasks.length} rules · ` +
    `${challenge.strikesAllowed} strikes per rule`;

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const start =
    parseDate(
      challenge.startDate
    );

  const end =
    parseDate(
      challenge.endDate
    );

  let targetMonth;

  if (today < start) {
    targetMonth =
      start;
  }
  else if (today > end) {
    targetMonth =
      end;
  }
  else {
    targetMonth =
      today;
  }

  current =
    new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      1
    );
}


/* =========================================
   PROGRESS
========================================= */

async function loadOverallProgress() {
  const data =
    await apiGet(
      '/api/progress/overall-progress'
    );

  overallText.textContent =
    `${data.pct}% complete`;

  overallMeta.textContent =
    `${data.completedDays}/${data.days} days completed`;

  overallBar.style.width =
    `${data.pct}%`;

  overallBar.textContent =
    `${data.pct}%`;

  overallBar.setAttribute(
    'aria-valuenow',
    String(data.pct)
  );
}


/* =========================================
   STRIKES
========================================= */

async function loadStrikes() {
  const data =
    await apiGet(
      '/api/progress/strikes'
    );

  strikesMeta.textContent =
    `${data.strikesAllowed} strikes per rule · ` +
    `${data.recordedDays} recorded day(s)`;

  strikesList.innerHTML =
    '';

  for (
    const task of data.tasks
  ) {
    const row =
      document.createElement('div');

    row.className =
      'strike-row';

    const top =
      document.createElement('div');

    top.className =
      'd-flex justify-content-between align-items-start gap-3';

    const title =
      document.createElement('div');

    title.className =
      'strike-title';

    title.textContent =
      task.name;

    const badge =
      document.createElement('span');

    if (
      task.strikesLeft === 0
    ) {
      badge.className =
        'badge text-bg-danger';
    }
    else if (
      task.strikesLeft === 1
    ) {
      badge.className =
        'badge text-bg-warning';
    }
    else {
      badge.className =
        'badge text-bg-success';
    }

    badge.textContent =
      `${task.strikesLeft} strikes left`;

    const meta =
      document.createElement('div');

    meta.className =
      'strike-meta text-secondary mt-1';

    meta.textContent =
      `Used: ${task.strikesUsed}/${task.strikesAllowed}` +
      ` · Missed recorded days: ${task.missedDays}`;

    top.appendChild(title);
    top.appendChild(badge);

    row.appendChild(top);
    row.appendChild(meta);

    strikesList.appendChild(row);
  }
}


/* =========================================
   CALENDAR
========================================= */

function setMonthLabel() {
  monthLabel.textContent =
    new Intl
      .DateTimeFormat(
        undefined,
        {
          month: 'long',
          year: 'numeric'
        }
      )
      .format(current);
}


function renderWeekdayHeader() {
  for (
    const name of weekdayNames
  ) {
    const element =
      document.createElement('div');

    element.className =
      'weekday-header';

    element.textContent =
      name;

    calendarGrid.appendChild(
      element
    );
  }
}


function completionRing(
  done,
  total
) {
  const pct =
    total === 0
      ? 0
      : Math.round(
          (done / total) * 100
        );

  const ring =
    document.createElement('div');

  ring.className =
    'ring';

  ring.dataset.pct =
    String(pct);

  ring.textContent =
    `${pct}%`;

  return ring;
}


async function renderCalendar() {
  calendarGrid.innerHTML =
    '';

  renderWeekdayHeader();
  setMonthLabel();

  const data =
    await apiGet(
      `/api/days?month=${monthKey(current)}`
    );

  const summary =
    new Map(
      data.days.map(
        day => [
          day.dateKey,
          day
        ]
      )
    );

  const first =
    new Date(
      current.getFullYear(),
      current.getMonth(),
      1
    );

  const offset =
    firstDayMondayIndex(first);

  const gridStart =
    new Date(first);

  gridStart.setDate(
    first.getDate() -
    offset
  );

  for (
    let i = 0;
    i < 42;
    i++
  ) {
    const date =
      new Date(gridStart);

    date.setDate(
      gridStart.getDate() + i
    );

    const key =
      dateKey(date);

    const currentMonth =
      date.getMonth() ===
      current.getMonth();

    const inside =
      isChallengeDate(key);

    const dayData =
      summary.get(key) || {
        doneCount: 0,
        totalCount:
          challenge.tasks.length
      };

    const cell =
      document.createElement('div');

    cell.className =
      'day-cell';

    if (!currentMonth) {
      cell.classList.add(
        'muted'
      );
    }

    if (!inside) {
      cell.classList.add(
        'outside-challenge'
      );
    }

    const top =
      document.createElement('div');

    top.className =
      'day-top';

    const number =
      document.createElement('div');

    number.className =
      'day-num';

    number.textContent =
      date.getDate();

    top.appendChild(number);

    if (inside) {
      top.appendChild(
        completionRing(
          dayData.doneCount,
          dayData.totalCount
        )
      );
    }

    cell.appendChild(top);

    const subtitle =
      document.createElement('div');

    subtitle.className =
      'day-sub text-secondary';

    const dayNumber =
      challengeDayNumber(key);

    if (dayNumber) {
      subtitle.textContent =
        `${prettyDate(key)} · ` +
        `Day ${dayNumber}/${challenge.durationDays}`;
    }
    else {
      subtitle.textContent =
        prettyDate(key);
    }

    cell.appendChild(
      subtitle
    );

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    if (
      inside &&
      key === dateKey(today)
    ) {
      cell.classList.add(
        'today-challenge'
      );
    }

    if (inside) {
      cell.addEventListener(
        'click',
        () =>
          openDay(key)
      );
    }

    calendarGrid.appendChild(
      cell
    );
  }
}


/* =========================================
   DAY DETAILS
========================================= */

function renderTasks(tasks) {
  tasksList.innerHTML =
    '';

  for (
    const task of tasks
  ) {
    const row =
      document.createElement('label');

    row.className =
      'day-task-row';

    const checkbox =
      document.createElement('input');

    checkbox.type =
      'checkbox';

    checkbox.className =
      'form-check-input m-0';

    checkbox.checked =
      Boolean(task.isDone);

    checkbox.addEventListener(
      'change',
      () => {
        task.isDone =
          checkbox.checked;

        saveStatus.textContent =
          '';
      }
    );

    const name =
      document.createElement('div');

    name.textContent =
      task.name;

    row.appendChild(checkbox);
    row.appendChild(name);

    tasksList.appendChild(row);
  }
}


function updateNoteCounter() {
  if (
    !dayNote ||
    !dayNoteCount
  ) {
    return;
  }

  dayNoteCount.textContent =
    `${dayNote.value.length}/1000`;
}


async function openDay(key) {
  if (!isChallengeDate(key)) {
    return;
  }

  openDateKey =
    key;

  saveStatus.textContent =
    '';

  dayNote.value =
    '';

  updateNoteCounter();

  const dayNumber =
    challengeDayNumber(key);

  dayModalDate.textContent =
    `${prettyDate(key)} · ` +
    `Day ${dayNumber}/${challenge.durationDays}`;

  try {
    const data =
      await apiGet(
        `/api/day/${key}`
      );

    openTasks =
      data.tasks;

    renderTasks(
      openTasks
    );

    dayNote.value =
      data.note || '';

    updateNoteCounter();

    dayModal.show();
  }
  catch (error) {
    alert(
      error.message
    );
  }
}


/* =========================================
   DAILY NOTE
========================================= */

dayNote.addEventListener(
  'input',
  () => {
    updateNoteCounter();

    saveStatus.textContent =
      '';
  }
);


/* =========================================
   SAVE DAY
========================================= */

saveBtn.addEventListener(
  'click',
  async () => {
    if (!openDateKey) {
      return;
    }

    saveBtn.disabled =
      true;

    saveStatus.textContent =
      'Saving...';

    try {
      await apiPut(
        `/api/day/${openDateKey}`,
        {
          tasks:
            openTasks.map(
              task => ({
                taskId:
                  task.taskId,

                isDone:
                  Boolean(
                    task.isDone
                  )
              })
            ),

          note:
            dayNote.value.trim()
        }
      );

      saveStatus.textContent =
        'Saved ✓';

      await Promise.all([
        renderCalendar(),
        loadOverallProgress(),
        loadStrikes()
      ]);

      dayModal.hide();

      openDateKey =
        null;

      openTasks =
        [];

      dayNote.value =
        '';

      updateNoteCounter();
    }
    catch (error) {
      saveStatus.textContent =
        '';

      alert(
        error.message
      );
    }
    finally {
      saveBtn.disabled =
        false;
    }
  }
);


/* =========================================
   CALENDAR NAVIGATION
========================================= */

prevMonthBtn.addEventListener(
  'click',
  async () => {
    current =
      new Date(
        current.getFullYear(),
        current.getMonth() - 1,
        1
      );

    await renderCalendar();
  }
);


nextMonthBtn.addEventListener(
  'click',
  async () => {
    current =
      new Date(
        current.getFullYear(),
        current.getMonth() + 1,
        1
      );

    await renderCalendar();
  }
);


todayBtn.addEventListener(
  'click',
  async () => {
    if (!challenge) {
      return;
    }

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    const key =
      dateKey(today);

    if (!isChallengeDate(key)) {
      alert(
        'Today is outside the current challenge period.'
      );

      return;
    }

    current =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

    await renderCalendar();

    await openDay(key);
  }
);


/* =========================================
   BUTTONS
========================================= */

addTaskBtn.addEventListener(
  'click',
  addSetupTask
);


startChallengeBtn.addEventListener(
  'click',
  startChallenge
);


progressReportBtn.addEventListener(
  'click',
  openProgressReport
);


historyBtn.addEventListener(
  'click',
  openChallengeHistory
);


confirmEndChallengeBtn.addEventListener(
  'click',
  endCurrentChallenge
);


endChallengeModalEl.addEventListener(
  'show.bs.modal',
  () => {
    endChallengeStatus.textContent =
      '';
  }
);


/* =========================================
   APPLICATION BOOT
========================================= */

async function loadApplication() {
  loadingScreen
    .classList
    .remove('d-none');

  setupScreen
    .classList
    .add('d-none');

  dashboardScreen
    .classList
    .add('d-none');

  try {
    const data =
      await apiGet(
        '/api/challenges/current'
      );

    challenge =
      data.challenge;

    if (!challenge) {
      const redirected =
        await checkNaturalFinalReport();

      if (redirected) {
        return;
      }

      showSetup();

      return;
    }

    showDashboard();

    await Promise.all([
      loadOverallProgress(),
      loadStrikes(),
      renderCalendar()
    ]);
  }
  catch (error) {
    console.error(error);

    loadingScreen.innerHTML =
      `<div class="alert alert-danger">` +
      `Failed to load SDT: ` +
      `${error.message}` +
      `</div>`;
  }
}


/*
 * Authentication controls when SDT starts.
 */
window.loadSDTApplication =
  loadApplication;