const reportLoading =
  document.getElementById(
    'reportLoading'
  );


const reportError =
  document.getElementById(
    'reportError'
  );


const reportErrorMessage =
  document.getElementById(
    'reportErrorMessage'
  );


const reportContent =
  document.getElementById(
    'reportContent'
  );


const reportChallengeName =
  document.getElementById(
    'reportChallengeName'
  );


const reportChallengeDates =
  document.getElementById(
    'reportChallengeDates'
  );


const reportGeneratedAt =
  document.getElementById(
    'reportGeneratedAt'
  );


const metricCurrentDay =
  document.getElementById(
    'metricCurrentDay'
  );


const metricRecordedDays =
  document.getElementById(
    'metricRecordedDays'
  );


const metricPerfectDays =
  document.getElementById(
    'metricPerfectDays'
  );


const metricAverageCompletion =
  document.getElementById(
    'metricAverageCompletion'
  );


const metricCompletedTasks =
  document.getElementById(
    'metricCompletedTasks'
  );


const metricMissedTasks =
  document.getElementById(
    'metricMissedTasks'
  );


const metricUnrecordedDays =
  document.getElementById(
    'metricUnrecordedDays'
  );


const metricStrikesUsed =
  document.getElementById(
    'metricStrikesUsed'
  );


const reportProgressBar =
  document.getElementById(
    'reportProgressBar'
  );


const reportProgressText =
  document.getElementById(
    'reportProgressText'
  );


const strongestRuleName =
  document.getElementById(
    'strongestRuleName'
  );


const strongestRuleMeta =
  document.getElementById(
    'strongestRuleMeta'
  );


const weakestRuleName =
  document.getElementById(
    'weakestRuleName'
  );


const weakestRuleMeta =
  document.getElementById(
    'weakestRuleMeta'
  );


const ruleTableBody =
  document.getElementById(
    'ruleTableBody'
  );


const dailyTableBody =
  document.getElementById(
    'dailyTableBody'
  );


const printBtn =
  document.getElementById(
    'printBtn'
  );


const backBtn =
  document.getElementById(
    'backBtn'
  );


const params =
  new URLSearchParams(
    window.location.search
  );


const reportMode =
  params.get(
    'type'
  ) || 'progress';


const challengeId =
  params.get(
    'challengeId'
  );


const autoPrint =
  params.get(
    'autoPrint'
  ) === '1';


/*
 * ============================================================
 * DATE HELPERS
 * ============================================================
 */

function parseDate(
  value
) {

  return new Date(
    value +
    'T00:00:00'
  );
}


function prettyDate(
  value
) {

  return new Intl
    .DateTimeFormat(
      undefined,
      {
        month:
          'short',

        day:
          'numeric',

        year:
          'numeric'
      }
    )
    .format(
      parseDate(
        value
      )
    );
}


function prettyDateTime(
  value
) {

  return new Intl
    .DateTimeFormat(
      undefined,
      {
        dateStyle:
          'medium',

        timeStyle:
          'short'
      }
    )
    .format(
      new Date(
        value
      )
    );
}


/*
 * ============================================================
 * AUTHENTICATED REPORT API
 * ============================================================
 */

async function getReport() {

  let endpoint =
    '/api/reports/current';


  if (
    reportMode ===
    'final'
  ) {

    if (!challengeId) {

      throw new Error(
        'Missing challenge ID for final report.'
      );
    }


    endpoint =
      `/api/reports/challenge/${challengeId}/final`;
  }


  /*
   * Initialise the same Supabase Auth client used
   * by the main SDT application.
   *
   * Supabase restores the browser session from
   * local storage.
   */
  await window
    .sdtAuth
    .initializeSupabase();


  const token =
    await window
      .sdtAuth
      .getAccessToken();


  if (!token) {

    throw new Error(
      'Your session has expired. Return to SDT and sign in again.'
    );
  }


  const response =
    await fetch(
      endpoint,
      {
        headers: {
          Authorization:
            `Bearer ${token}`
        }
      }
    );


  let data;


  try {

    data =
      await response.json();

  }
  catch {

    throw new Error(
      'The server returned an invalid report response.'
    );
  }


  if (
    response.status === 401
  ) {

    throw new Error(
      'Your session has expired. Return to SDT and sign in again.'
    );
  }


  if (
    !response.ok ||
    !data.ok
  ) {

    throw new Error(
      data.error ||
      'Unable to generate report.'
    );
  }


  return data;
}


/*
 * ============================================================
 * HTML SAFETY
 * ============================================================
 */

function escapeHtml(
  value
) {

  return String(
    value
  )

    .replaceAll(
      '&',
      '&amp;'
    )

    .replaceAll(
      '<',
      '&lt;'
    )

    .replaceAll(
      '>',
      '&gt;'
    )

    .replaceAll(
      '"',
      '&quot;'
    )

    .replaceAll(
      "'",
      '&#039;'
    );
}


/*
 * ============================================================
 * RULE TABLE
 * ============================================================
 */

function renderRuleTable(
  rules
) {

  ruleTableBody.innerHTML =
    '';


  for (
    const rule of rules
  ) {

    const row =
      document.createElement(
        'tr'
      );


    const completion =

      rule.completionPct ===
      null

        ? '—'

        : `${rule.completionPct}%`;


    row.innerHTML = `
      <td>
        <strong>
          ${escapeHtml(rule.name)}
        </strong>
      </td>

      <td class="text-end">
        ${rule.completedDays}/${rule.recordedDays}
      </td>

      <td class="text-end">
        ${rule.missedDays}
      </td>

      <td class="text-end">
        ${completion}
      </td>

      <td class="text-end">
        ${rule.strikesUsed}/${rule.strikesAllowed}
      </td>
    `;


    ruleTableBody.appendChild(
      row
    );
  }
}


/*
 * ============================================================
 * DAILY TABLE
 * ============================================================
 */

function renderDailyTable(
  days,
  isFinal
) {

  dailyTableBody.innerHTML =
    '';


  if (
    days.length === 0
  ) {

    const row =
      document.createElement(
        'tr'
      );


    row.innerHTML = `
      <td
        colspan="5"
        class="text-center report-muted py-4"
      >
        ${
          isFinal
            ? 'No challenge days were reached before this challenge ended.'
            : 'The challenge has not started yet.'
        }
      </td>
    `;


    dailyTableBody.appendChild(
      row
    );


    return;
  }


  for (
    const day of days
  ) {

    const row =
      document.createElement(
        'tr'
      );


    if (
      !day.isRecorded
    ) {

      row.classList.add(
        'unrecorded-row'
      );
    }


    const status =

      day.isRecorded

        ? (
            day.isPerfect
              ? 'Perfect'
              : 'Recorded'
          )

        : 'Unrecorded';


    const completed =

      day.isRecorded

        ? `${day.completedCount}/${day.totalTasks}`

        : '—';


    const completion =

      day.completionPct ===
      null

        ? '—'

        : `${day.completionPct}%`;


    row.innerHTML = `
      <td>
        Day ${day.dayNumber}
      </td>

      <td>
        ${prettyDate(day.dateKey)}
      </td>

      <td>
        ${status}
      </td>

      <td class="text-end">
        ${completed}
      </td>

      <td class="text-end">
        ${completion}
      </td>
    `;


    dailyTableBody.appendChild(
      row
    );
  }
}


/*
 * ============================================================
 * HIGHLIGHTS
 * ============================================================
 */

function renderHighlight(
  elementName,
  elementMeta,
  rule
) {

  if (!rule) {

    elementName.textContent =
      'Not enough data';


    elementMeta.textContent =
      'No recorded performance data is available.';


    return;
  }


  elementName.textContent =
    rule.name;


  elementMeta.textContent =

    `${rule.completionPct}% completion · ` +

    `${rule.completedDays}/${rule.recordedDays} recorded days completed`;
}


/*
 * ============================================================
 * FINAL REPORT TOKEN
 * ============================================================
 */

function finalReportToken(
  challenge
) {

  return (

    `${challenge.challengeId}:` +

    `${challenge.completedAt || ''}`

  );
}


/*
 * ============================================================
 * RENDER REPORT
 * ============================================================
 */

function renderReport(
  data
) {

  const challenge =
    data.challenge;


  const summary =
    data.summary;


  const isFinal =
    data.reportType ===
    'FINAL';


  document.title =

    isFinal

      ? `${challenge.name} - SDT Final Challenge Report`

      : `${challenge.name} - SDT Progress Report`;


  const reportTypeElement =
    document.querySelector(
      '.report-type'
    );


  if (
    reportTypeElement
  ) {

    reportTypeElement.textContent =

      isFinal

        ? 'Final Challenge Report'

        : 'Challenge Progress Report';
  }


  const challengeLabel =
    document.querySelector(
      '.report-label'
    );


  if (
    challengeLabel
  ) {

    challengeLabel.textContent =

      isFinal

        ? 'Completed Challenge'

        : 'Active Challenge';
  }


  reportChallengeName.textContent =
    challenge.name;


  let detailText =

    `${prettyDate(challenge.startDate)} – ` +

    `${prettyDate(challenge.endDate)} · ` +

    `${challenge.durationDays} days · ` +

    `${challenge.totalTasks} rules`;


  if (
    isFinal
  ) {

    if (
      challenge.completionReason ===
      'MANUAL'
    ) {

      detailText +=
        ' · Ended manually';

    } else {

      detailText +=
        ' · Completed naturally';
    }


    if (
      challenge.completedAt
    ) {

      detailText +=
        ` · Closed ${prettyDateTime(challenge.completedAt)}`;
    }
  }


  reportChallengeDates.textContent =
    detailText;


  reportGeneratedAt.textContent =
    `Generated ${prettyDateTime(data.generatedAt)}`;


  metricCurrentDay.textContent =
    `${summary.currentDayNumber}/${challenge.durationDays}`;


  metricRecordedDays.textContent =
    `${summary.recordedDays}/${summary.elapsedDays}`;


  metricPerfectDays.textContent =
    summary.perfectDays;


  metricAverageCompletion.textContent =
    `${summary.averageRecordedCompletionPct}%`;


  metricCompletedTasks.textContent =
    summary.totalCompletedInstances;


  metricMissedTasks.textContent =
    summary.totalMissedInstances;


  metricUnrecordedDays.textContent =
    summary.unrecordedDays;


  metricStrikesUsed.textContent =
    summary.totalStrikesUsed;


  reportProgressBar.style.width =
    `${summary.overallChallengeProgressPct}%`;


  /*
   * Challenge progress now means recorded days,
   * not perfect days.
   */
  if (
    isFinal
  ) {

    reportProgressText.textContent =

      `${summary.overallChallengeProgressPct}% of the planned challenge was recorded ` +

      `(${summary.recordedDays}/${challenge.durationDays} days). ` +

      `${summary.perfectDays} recorded day(s) were perfect.`;

  } else {

    reportProgressText.textContent =

      `${summary.overallChallengeProgressPct}% of the full challenge recorded ` +

      `(${summary.recordedDays}/${challenge.durationDays} days). ` +

      `${summary.perfectDays} perfect day(s). ` +

      `${summary.remainingDays} planned day(s) remain.`;
  }


  renderHighlight(
    strongestRuleName,
    strongestRuleMeta,
    data.strongestRule
  );


  renderHighlight(
    weakestRuleName,
    weakestRuleMeta,
    data.weakestRule
  );


  renderRuleTable(
    data.rules
  );


  renderDailyTable(
    data.days,
    isFinal
  );


  if (
    isFinal
  ) {

    localStorage.setItem(
      'sdtLastFinalReportToken',
      finalReportToken(
        challenge
      )
    );
  }
}


/*
 * ============================================================
 * LOAD REPORT
 * ============================================================
 */

async function loadReport() {

  try {

    const data =
      await getReport();


    renderReport(
      data
    );


    reportLoading
      .classList
      .add(
        'd-none'
      );


    reportContent
      .classList
      .remove(
        'd-none'
      );


    if (
      autoPrint &&
      data.reportType ===
      'FINAL'
    ) {

      setTimeout(
        () => {

          window.print();

        },
        600
      );
    }

  }
  catch (error) {

    console.error(
      'Report loading failed:',
      error
    );


    reportLoading
      .classList
      .add(
        'd-none'
      );


    reportError
      .classList
      .remove(
        'd-none'
      );


    reportErrorMessage.textContent =
      error.message;
  }
}


/*
 * ============================================================
 * EVENTS
 * ============================================================
 */

printBtn
  .addEventListener(
    'click',
    () => {

      window.print();
    }
  );


backBtn
  .addEventListener(
    'click',
    () => {

      window.location.href =
        '/';
    }
  );


/*
 * ============================================================
 * START
 * ============================================================
 */

loadReport();