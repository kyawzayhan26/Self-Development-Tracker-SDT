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


function parseDate(value){

  return new Date(
    value +
    'T00:00:00'
  );
}


function prettyDate(value){

  return new Intl
    .DateTimeFormat(
      undefined,
      {
        month:'short',
        day:'numeric',
        year:'numeric'
      }
    )
    .format(
      parseDate(value)
    );
}


function prettyDateTime(value){

  return new Intl
    .DateTimeFormat(
      undefined,
      {
        dateStyle:'medium',
        timeStyle:'short'
      }
    )
    .format(
      new Date(value)
    );
}


async function getReport(){

  const response =
    await fetch(
      '/api/reports/current'
    );

  const data =
    await response.json();

  if (!data.ok){

    throw new Error(
      data.error ||
      'Unable to generate report.'
    );
  }

  return data;
}


function renderRuleTable(
  rules
){

  ruleTableBody.innerHTML =
    '';


  for (
    const rule of rules
  ){

    const row =
      document.createElement(
        'tr'
      );


    const completion =
      rule.completionPct === null

        ? '—'

        : `${rule.completionPct}%`;


    row.innerHTML = `
      <td>
        <strong>${escapeHtml(rule.name)}</strong>
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


function renderDailyTable(
  days
){

  dailyTableBody.innerHTML =
    '';


  if (
    days.length === 0
  ){

    const row =
      document.createElement(
        'tr'
      );

    row.innerHTML = `
      <td colspan="5" class="text-center report-muted py-4">
        The challenge has not started yet.
      </td>
    `;

    dailyTableBody.appendChild(
      row
    );

    return;
  }


  for (
    const day of days
  ){

    const row =
      document.createElement(
        'tr'
      );


    if (!day.isRecorded){

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
      day.completionPct === null

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


function renderHighlight(
  elementName,
  elementMeta,
  rule
){

  if (!rule){

    elementName.textContent =
      'Not enough data yet';

    elementMeta.textContent =
      'Record at least one day to calculate this.';

    return;
  }


  elementName.textContent =
    rule.name;


  elementMeta.textContent =
    `${rule.completionPct}% completion · ` +
    `${rule.completedDays}/${rule.recordedDays} recorded days completed`;
}


function renderReport(
  data
){

  const challenge =
    data.challenge;

  const summary =
    data.summary;


  document.title =
    `${challenge.name} - SDT Progress Report`;


  reportChallengeName.textContent =
    challenge.name;


  reportChallengeDates.textContent =
    `${prettyDate(challenge.startDate)} – ` +
    `${prettyDate(challenge.endDate)} · ` +
    `${challenge.durationDays} days · ` +
    `${challenge.totalTasks} rules`;


  reportGeneratedAt.textContent =
    `Generated ${prettyDateTime(data.generatedAt)}`;


  metricCurrentDay.textContent =
    summary.currentDayNumber > 0

      ? `${summary.currentDayNumber}/${challenge.durationDays}`

      : `0/${challenge.durationDays}`;


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


  reportProgressText.textContent =
    `${summary.overallChallengeProgressPct}% of the full challenge completed as perfect days ` +
    `(${summary.perfectDays}/${challenge.durationDays}). ` +
    `${summary.remainingDays} planned day(s) remain.`;


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
    data.days
  );
}


function escapeHtml(value){

  return String(value)
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


async function loadReport(){

  try {

    const data =
      await getReport();


    renderReport(
      data
    );


    reportLoading
      .classList
      .add('d-none');


    reportContent
      .classList
      .remove('d-none');

  }
  catch (error) {

    reportLoading
      .classList
      .add('d-none');


    reportError
      .classList
      .remove('d-none');


    reportErrorMessage.textContent =
      error.message;
  }
}


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

      if (
        window.opener
      ){

        window.close();

        return;
      }

      window.location.href =
        '/';
    }
  );


loadReport();