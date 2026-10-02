const express =
  require('express');


const router =
  express.Router();


/*
 * ============================================================
 * DATE HELPERS
 * ============================================================
 */

function dateStringToUtc(
  value
) {

  return new Date(
    `${value}T00:00:00Z`
  );
}


function formatDate(
  date
) {

  return date
    .toISOString()
    .slice(0, 10);
}


function calculateEndDate(
  startDate,
  durationDays
) {

  const end =
    dateStringToUtc(
      startDate
    );


  end.setUTCDate(
    end.getUTCDate() +
    durationDays -
    1
  );


  return formatDate(
    end
  );
}


function inclusiveDays(
  startDate,
  cutoffDate,
  maximumDays
) {

  const start =
    dateStringToUtc(
      startDate
    );


  const cutoff =
    dateStringToUtc(
      cutoffDate
    );


  if (
    cutoff < start
  ) {

    return 0;
  }


  const difference =
    Math.floor(
      (
        cutoff - start
      ) /
      86400000
    ) + 1;


  return Math.min(
    maximumDays,
    Math.max(
      0,
      difference
    )
  );
}


function getTodayDateKey() {

  return new Date()
    .toISOString()
    .slice(0, 10);
}


/*
 * Generate challenge dates from Day 1
 * through the requested number of days.
 */
function generateChallengeDates(
  startDate,
  numberOfDays
) {

  const dates =
    [];


  const current =
    dateStringToUtc(
      startDate
    );


  for (
    let index = 0;
    index < numberOfDays;
    index++
  ) {

    dates.push({
      dayNumber:
        index + 1,

      dateKey:
        formatDate(
          current
        )
    });


    current.setUTCDate(
      current.getUTCDate() + 1
    );
  }


  return dates;
}


/*
 * ============================================================
 * DATA HELPERS
 * ============================================================
 */

async function getTasks(
  supabase,
  challengeId
) {

  const {
    data,
    error
  } =
    await supabase
      .from('tasks')
      .select(`
        task_id,
        name,
        sort_order
      `)
      .eq(
        'challenge_id',
        challengeId
      )
      .eq(
        'is_active',
        true
      )
      .order(
        'sort_order',
        {
          ascending: true
        }
      );


  if (error) {
    throw error;
  }


  return data || [];
}


async function getDailyRecords(
  supabase,
  challengeId
) {

  const {
    data,
    error
  } =
    await supabase
      .from('daily_records')
      .select(`
        daily_record_id,
        date_key,
        note,
        task_status (
          task_id,
          is_done
        )
      `)
      .eq(
        'challenge_id',
        challengeId
      )
      .order(
        'date_key',
        {
          ascending: true
        }
      );


  if (error) {
    throw error;
  }


  return data || [];
}


/*
 * ============================================================
 * CHALLENGE MAPPING
 * ============================================================
 */

function mapChallenge(
  row
) {

  const completedDate =
    row.completed_at
      ? String(
          row.completed_at
        ).slice(0, 10)
      : null;


  return {

    challengeId:
      row.challenge_id,

    name:
      row.name,

    startDate:
      row.start_date,

    endDate:
      calculateEndDate(
        row.start_date,
        row.duration_days
      ),

    durationDays:
      row.duration_days,

    strikesAllowed:
      row.strikes_allowed,

    status:
      String(
        row.status || ''
      ).toUpperCase(),

    completionReason:
      row.completion_reason ||
      null,

    completedAt:
      row.completed_at ||
      null,

    completedDate

  };
}


/*
 * ============================================================
 * REPORT BUILDER
 * ============================================================
 */

async function buildReport(
  supabase,
  challenge,
  reportType
) {

  const tasks =
    await getTasks(
      supabase,
      challenge.challengeId
    );


  const records =
    await getDailyRecords(
      supabase,
      challenge.challengeId
    );


  const totalTasks =
    tasks.length;


  const today =
    getTodayDateKey();


  let cutoffDate;


  /*
   * Determine how far through the challenge
   * the report should analyse.
   */
  if (
    reportType === 'FINAL'
  ) {

    if (
      challenge.completionReason ===
      'NATURAL'
    ) {

      cutoffDate =
        challenge.endDate;

    }
    else if (
      challenge.completedDate
    ) {

      cutoffDate =
        challenge.completedDate;

    }
    else {

      cutoffDate =
        today;
    }

  }
  else {

    cutoffDate =
      today;
  }

/*
 * Calculate the calendar-based elapsed day.
 */
let elapsedDays =
  inclusiveDays(
    challenge.startDate,
    cutoffDate,
    challenge.durationDays
  );


/*
 * During testing, or if records exist ahead of the current
 * system date, make sure explicitly recorded challenge days
 * are still included in the report.
 *
 * This keeps the report consistent with the dashboard:
 * a saved day is a recorded day.
 */
if (
  records.length > 0
) {

  let furthestRecordedDay =
    0;


  for (
    const record of records
  ) {

    const recordDate =
      dateStringToUtc(
        record.date_key
      );


    const challengeStart =
      dateStringToUtc(
        challenge.startDate
      );


    const difference =
      Math.floor(
        (
          recordDate -
          challengeStart
        ) /
        86400000
      ) + 1;


    if (
      difference >= 1 &&
      difference <=
        challenge.durationDays
    ) {

      furthestRecordedDay =
        Math.max(
          furthestRecordedDay,
          difference
        );
    }
  }


  elapsedDays =
    Math.max(
      elapsedDays,
      furthestRecordedDay
    );
}


const currentDayNumber =
  elapsedDays;

  /*
   * Only analyse daily records that fall inside
   * the elapsed/reporting period.
   */
  const elapsedDateEntries =
    generateChallengeDates(
      challenge.startDate,
      elapsedDays
    );


  const elapsedDateSet =
    new Set(
      elapsedDateEntries.map(
        item =>
          item.dateKey
      )
    );


  const relevantRecords =
    records.filter(
      record =>
        elapsedDateSet.has(
          record.date_key
        )
    );


  const recordMap =
    new Map(
      relevantRecords.map(
        record => [
          record.date_key,
          record
        ]
      )
    );


  const activeTaskIds =
    new Set(
      tasks.map(
        task =>
          task.task_id
      )
    );


  /*
   * ==========================================================
   * DAILY PERFORMANCE
   * ==========================================================
   */

  const dailyRows =
    elapsedDateEntries.map(
      day => {

        const record =
          recordMap.get(
            day.dateKey
          );


        const isRecorded =
          Boolean(
            record
          );


        const statuses =
          Array.isArray(
            record?.task_status
          )
            ? record.task_status
            : [];


        const completedTaskIds =
          new Set(

            statuses

              .filter(
                status =>
                  status.is_done === true &&
                  activeTaskIds.has(
                    status.task_id
                  )
              )

              .map(
                status =>
                  status.task_id
              )

          );


        const completedCount =
          completedTaskIds.size;


        const completionPct =

          isRecorded &&
          totalTasks > 0

            ? Math.round(
                (
                  completedCount /
                  totalTasks
                ) *
                100
              )

            : null;


        return {

          dayNumber:
            day.dayNumber,

          dateKey:
            day.dateKey,

          isRecorded,

          completedCount,

          totalTasks,

          completionPct,

          isPerfect:
            Boolean(
              isRecorded &&
              totalTasks > 0 &&
              completedCount ===
                totalTasks
            ),

          /*
           * V2 groundwork for Daily Notes.
           */
          note:
            record?.note ||
            ''

        };
      }
    );


  /*
   * ==========================================================
   * SUMMARY
   * ==========================================================
   */

  const recordedDailyRows =
    dailyRows.filter(
      row =>
        row.isRecorded
    );


  const recordedDays =
    recordedDailyRows.length;


  const unrecordedDays =
    Math.max(
      0,
      elapsedDays -
      recordedDays
    );


  const perfectDays =
    recordedDailyRows.filter(
      row =>
        row.isPerfect
    ).length;


  const totalCompletedInstances =
    recordedDailyRows.reduce(
      (
        total,
        row
      ) =>
        total +
        row.completedCount,
      0
    );


  const totalRecordedInstances =
    recordedDays *
    totalTasks;


  const totalMissedInstances =
    Math.max(
      0,
      totalRecordedInstances -
      totalCompletedInstances
    );


  const averageRecordedCompletionPct =

    totalRecordedInstances > 0

      ? Math.round(
          (
            totalCompletedInstances /
            totalRecordedInstances
          ) *
          100
        )

      : 0;


  /*
   * IMPORTANT:
   *
   * Overall challenge progress represents recorded
   * challenge days, not perfect days.
   *
   * Example:
   *
   * 2 recorded days / 30 days = 6.67% -> 7%
   *
   * A partially completed recorded day still advances
   * challenge progress.
   */
  const overallChallengeProgressPct =

    challenge.durationDays > 0

      ? Math.min(
          100,
          Math.round(
            (
              recordedDays /
              challenge.durationDays
            ) *
            100
          )
        )

      : 0;


  /*
   * ==========================================================
   * RULE PERFORMANCE
   * ==========================================================
   */

  const rulePerformance =
    tasks.map(
      task => {

        let completedDays =
          0;

        let missedDays =
          0;


        for (
          const row of recordedDailyRows
        ) {

          const record =
            recordMap.get(
              row.dateKey
            );


          const statuses =
            Array.isArray(
              record?.task_status
            )
              ? record.task_status
              : [];


          const status =
            statuses.find(
              item =>
                item.task_id ===
                task.task_id
            );


          if (
            status &&
            status.is_done === true
          ) {

            completedDays++;

          } else {

            missedDays++;
          }
        }


        const completionPct =

          recordedDays > 0

            ? Math.round(
                (
                  completedDays /
                  recordedDays
                ) *
                100
              )

            : null;


        return {

          taskId:
            task.task_id,

          name:
            task.name,

          completedDays,

          missedDays,

          recordedDays,

          completionPct,

          strikesAllowed:
            challenge.strikesAllowed,

          strikesUsed:
            missedDays,

          strikesLeft:
            Math.max(
              0,
              challenge.strikesAllowed -
              missedDays
            )

        };
      }
    );


  /*
   * ==========================================================
   * STRONGEST / WEAKEST RULE
   * ==========================================================
   */

  const measurableRules =
    rulePerformance.filter(
      rule =>
        rule.completionPct !==
        null
    );


  let strongestRule =
    null;


  let weakestRule =
    null;


  if (
    measurableRules.length > 0
  ) {

    strongestRule =
      measurableRules.reduce(
        (
          strongest,
          rule
        ) => {

          if (
            strongest === null ||
            rule.completionPct >
              strongest.completionPct
          ) {

            return rule;
          }


          return strongest;

        },
        null
      );


    weakestRule =
      measurableRules.reduce(
        (
          weakest,
          rule
        ) => {

          if (
            weakest === null ||
            rule.completionPct <
              weakest.completionPct
          ) {

            return rule;
          }


          return weakest;

        },
        null
      );
  }


  const totalStrikesUsed =
    rulePerformance.reduce(
      (
        total,
        rule
      ) =>
        total +
        rule.strikesUsed,
      0
    );


  /*
   * ==========================================================
   * RESPONSE
   * ==========================================================
   */

  return {

    ok: true,

    reportType,

    generatedAt:
      new Date()
        .toISOString(),

    challenge: {

      challengeId:
        challenge.challengeId,

      name:
        challenge.name,

      startDate:
        challenge.startDate,

      endDate:
        challenge.endDate,

      durationDays:
        challenge.durationDays,

      strikesAllowed:
        challenge.strikesAllowed,

      status:
        challenge.status,

      completionReason:
        challenge.completionReason ||
        null,

      completedAt:
        challenge.completedAt ||
        null,

      completedDate:
        challenge.completedDate ||
        null,

      totalTasks

    },

    summary: {

      currentDayNumber,

      elapsedDays,

      recordedDays,

      unrecordedDays,

      remainingDays:
        Math.max(
          0,
          challenge.durationDays -
          elapsedDays
        ),

      perfectDays,

      overallChallengeProgressPct,

      averageRecordedCompletionPct,

      totalCompletedInstances,

      totalMissedInstances,

      totalRecordedInstances,

      totalStrikesUsed

    },

    strongestRule,

    weakestRule,

    rules:
      rulePerformance,

    days:
      dailyRows

  };
}


/*
 * ============================================================
 * GET /api/reports/current
 * ============================================================
 */

router.get(
  '/current',

  async (
    req,
    res,
    next
  ) => {

    try {

      const supabase =
        req.supabase;

      const userId =
        req.user.id;


      const {
        data,
        error
      } =
        await supabase
          .from('challenges')
          .select(`
            challenge_id,
            name,
            start_date,
            duration_days,
            strikes_allowed,
            status,
            completed_at,
            completion_reason
          `)
          .eq(
            'user_id',
            userId
          )
          .eq(
            'status',
            'active'
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          )
          .limit(1);


      if (error) {
        throw error;
      }


      if (
        !data ||
        data.length === 0
      ) {

        const error =
          new Error(
            'No active challenge found.'
          );

        error.statusCode =
          404;

        throw error;
      }


      const challenge =
        mapChallenge(
          data[0]
        );


      const report =
        await buildReport(
          supabase,
          challenge,
          'PROGRESS'
        );


      res.json(
        report
      );

    }
    catch (error) {

      next(error);
    }
  }
);


/*
 * ============================================================
 * GET /api/reports/challenge/:challengeId/final
 * ============================================================
 */

router.get(
  '/challenge/:challengeId/final',

  async (
    req,
    res,
    next
  ) => {

    try {

      /*
       * V2 challenge IDs are UUIDs rather than
       * V1 integer IDs.
       */
      const challengeId =
        String(
          req.params.challengeId ||
          ''
        ).trim();


      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


      if (
        !uuidPattern.test(
          challengeId
        )
      ) {

        const error =
          new Error(
            'Invalid challenge ID.'
          );

        error.statusCode =
          400;

        throw error;
      }


      const supabase =
        req.supabase;

      const userId =
        req.user.id;


      /*
       * Explicit user_id filter plus RLS means a user
       * cannot retrieve another user's completed report.
       */
      const {
        data,
        error
      } =
        await supabase
          .from('challenges')
          .select(`
            challenge_id,
            name,
            start_date,
            duration_days,
            strikes_allowed,
            status,
            completed_at,
            completion_reason
          `)
          .eq(
            'challenge_id',
            challengeId
          )
          .eq(
            'user_id',
            userId
          )
          .limit(1);


      if (error) {
        throw error;
      }


      if (
        !data ||
        data.length === 0
      ) {

        const error =
          new Error(
            'Challenge not found.'
          );

        error.statusCode =
          404;

        throw error;
      }


      const challenge =
        mapChallenge(
          data[0]
        );


      if (
        challenge.status !==
        'COMPLETED'
      ) {

        const error =
          new Error(
            'Final report is only available for completed challenges.'
          );

        error.statusCode =
          400;

        throw error;
      }


      const report =
        await buildReport(
          supabase,
          challenge,
          'FINAL'
        );


      res.json(
        report
      );

    }
    catch (error) {

      next(error);
    }
  }
);


module.exports =
  router;