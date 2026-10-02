const express = require('express');

const router = express.Router();


/*
 * ============================================================
 * DATE HELPERS
 * ============================================================
 */

function assertDateKey(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    const error = new Error(
      'Invalid date format. Use YYYY-MM-DD'
    );

    error.statusCode = 400;
    throw error;
  }
}


function parseDate(value) {
  return new Date(
    `${value}T00:00:00Z`
  );
}


function formatDate(date) {
  return date
    .toISOString()
    .slice(0, 10);
}


function challengeEndDate(challenge) {
  const end = parseDate(
    challenge.startDate
  );

  end.setUTCDate(
    end.getUTCDate() +
    challenge.durationDays -
    1
  );

  return formatDate(end);
}


function assertChallengeDate(
  dateKey,
  challenge
) {
  const target = parseDate(
    dateKey
  );

  const start = parseDate(
    challenge.startDate
  );

  const end = parseDate(
    challengeEndDate(
      challenge
    )
  );

  if (
    target < start ||
    target > end
  ) {
    const error = new Error(
      'Date is outside the challenge period.'
    );

    error.statusCode = 400;
    throw error;
  }
}


/*
 * Generate every date in a month.
 */
function getMonthDates(month) {
  const [
    year,
    monthNumber
  ] = month
    .split('-')
    .map(Number);

  const dates = [];

  const current = new Date(
    Date.UTC(
      year,
      monthNumber - 1,
      1
    )
  );

  while (
    current.getUTCMonth() ===
    monthNumber - 1
  ) {
    dates.push(
      formatDate(current)
    );

    current.setUTCDate(
      current.getUTCDate() + 1
    );
  }

  return dates;
}


/*
 * ============================================================
 * CURRENT CHALLENGE
 * ============================================================
 */

async function getCurrentChallenge(
  supabase,
  userId
) {
  const {
    data,
    error
  } = await supabase
    .from('challenges')
    .select(`
      challenge_id,
      name,
      start_date,
      duration_days,
      strikes_allowed
    `)
    .eq(
      'user_id',
      userId
    )
    .eq(
      'status',
      'active'
    )
    .limit(1);

  if (error) {
    throw error;
  }

  if (
    !data ||
    data.length === 0
  ) {
    return null;
  }

  return {
    challengeId:
      data[0].challenge_id,

    name:
      data[0].name,

    startDate:
      data[0].start_date,

    durationDays:
      data[0].duration_days,

    strikesAllowed:
      data[0].strikes_allowed
  };
}


function requireChallenge(
  challenge
) {
  if (!challenge) {
    const error = new Error(
      'No active challenge.'
    );

    error.statusCode = 404;
    throw error;
  }
}


/*
 * ============================================================
 * ACTIVE TASKS
 * ============================================================
 */

async function getActiveTasks(
  supabase,
  challengeId
) {
  const {
    data,
    error
  } = await supabase
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


/*
 * ============================================================
 * DAILY RECORDS
 * ============================================================
 */

async function getDailyRecords(
  supabase,
  challengeId
) {
  const {
    data,
    error
  } = await supabase
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
    );

  if (error) {
    throw error;
  }

  return data || [];
}


/*
 * ============================================================
 * GET /api/progress/overall-progress
 * ============================================================
 *
 * Overall challenge progress represents how many challenge
 * days have been RECORDED, regardless of whether every task
 * on those days was completed.
 *
 * Example:
 *
 * Day 1 = 2/3 tasks completed
 * Day 2 = 3/3 tasks completed
 *
 * Recorded days = 2
 * Perfect days  = 1
 *
 * For a 30-day challenge:
 *
 * Overall progress = 2 / 30 = 6.67% -> 7%
 *
 * Perfect days remain available as a separate performance
 * metric and do not control the overall progress bar.
 * ============================================================
 */

router.get(
  '/overall-progress',

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

      const challenge =
        await getCurrentChallenge(
          supabase,
          userId
        );

      requireChallenge(
        challenge
      );

      const tasks =
        await getActiveTasks(
          supabase,
          challenge.challengeId
        );

      const records =
        await getDailyRecords(
          supabase,
          challenge.challengeId
        );

      /*
       * Each daily_records row represents a day
       * the user explicitly recorded.
       */
      const recordedDays =
        records.length;

      /*
       * Calculate perfect days separately.
       */
      const activeTaskIds =
        new Set(
          tasks.map(
            task =>
              task.task_id
          )
        );

      let perfectDays = 0;

      for (
        const record of records
      ) {
        const statuses =
          Array.isArray(
            record.task_status
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

        if (
          tasks.length > 0 &&
          completedTaskIds.size ===
            tasks.length
        ) {
          perfectDays++;
        }
      }

      const pct =
        Math.min(
          100,
          Math.round(
            (
              recordedDays /
              challenge.durationDays
            ) *
            100
          )
        );

      res.json({
        ok: true,

        completedDays:
          recordedDays,

        recordedDays,

        perfectDays,

        days:
          challenge.durationDays,

        pct
      });

    }
    catch (error) {
      next(error);
    }
  }
);


/*
 * ============================================================
 * GET /api/progress/strikes
 * ============================================================
 */

router.get(
  '/strikes',

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

      const challenge =
        await getCurrentChallenge(
          supabase,
          userId
        );

      requireChallenge(
        challenge
      );

      const tasks =
        await getActiveTasks(
          supabase,
          challenge.challengeId
        );

      const records =
        await getDailyRecords(
          supabase,
          challenge.challengeId
        );

      const recordedDays =
        records.length;

      const resultTasks =
        tasks.map(
          task => {
            let missedDays = 0;

            for (
              const record of records
            ) {
              const statuses =
                Array.isArray(
                  record.task_status
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
                !status ||
                status.is_done !== true
              ) {
                missedDays++;
              }
            }

            return {
              taskId:
                task.task_id,

              name:
                task.name,

              strikesAllowed:
                challenge.strikesAllowed,

              strikesUsed:
                missedDays,

              strikesLeft:
                Math.max(
                  0,
                  challenge.strikesAllowed -
                  missedDays
                ),

              missedDays
            };
          }
        );

      res.json({
        ok: true,

        strikesAllowed:
          challenge.strikesAllowed,

        recordedDays,

        tasks:
          resultTasks
      });

    }
    catch (error) {
      next(error);
    }
  }
);


/*
 * ============================================================
 * GET /api/days?month=YYYY-MM
 * ============================================================
 */

router.get(
  '/',

  async (
    req,
    res,
    next
  ) => {
    try {
      const month =
        String(
          req.query.month ||
          ''
        );

      if (
        !/^\d{4}-\d{2}$/.test(
          month
        )
      ) {
        const error =
          new Error(
            'Invalid month format. Use YYYY-MM'
          );

        error.statusCode =
          400;

        throw error;
      }

      const supabase =
        req.supabase;

      const userId =
        req.user.id;

      const challenge =
        await getCurrentChallenge(
          supabase,
          userId
        );

      requireChallenge(
        challenge
      );

      const tasks =
        await getActiveTasks(
          supabase,
          challenge.challengeId
        );

      const records =
        await getDailyRecords(
          supabase,
          challenge.challengeId
        );

      const recordMap =
        new Map(
          records.map(
            record => [
              record.date_key,
              record
            ]
          )
        );

      const monthDates =
        getMonthDates(
          month
        );

      const days =
        monthDates.map(
          dateKey => {
            const record =
              recordMap.get(
                dateKey
              );

            const statuses =
              Array.isArray(
                record?.task_status
              )
                ? record.task_status
                : [];

            const doneCount =
              statuses.filter(
                status =>
                  status.is_done ===
                  true
              ).length;

            return {
              dateKey,

              doneCount,

              totalCount:
                tasks.length
            };
          }
        );

      res.json({
        ok: true,
        month,
        days
      });

    }
    catch (error) {
      next(error);
    }
  }
);


/*
 * ============================================================
 * GET /api/day/:dateKey
 * ============================================================
 */

router.get(
  '/:dateKey',

  async (
    req,
    res,
    next
  ) => {
    try {
      const dateKey =
        req.params.dateKey;

      assertDateKey(
        dateKey
      );

      const supabase =
        req.supabase;

      const userId =
        req.user.id;

      const challenge =
        await getCurrentChallenge(
          supabase,
          userId
        );

      requireChallenge(
        challenge
      );

      assertChallengeDate(
        dateKey,
        challenge
      );

      const tasks =
        await getActiveTasks(
          supabase,
          challenge.challengeId
        );

      const {
        data: records,
        error: recordError
      } = await supabase
        .from('daily_records')
        .select(`
          daily_record_id,
          note,
          task_status (
            task_id,
            is_done
          )
        `)
        .eq(
          'challenge_id',
          challenge.challengeId
        )
        .eq(
          'date_key',
          dateKey
        )
        .limit(1);

      if (recordError) {
        throw recordError;
      }

      const record =
        records &&
        records.length > 0
          ? records[0]
          : null;

      const statuses =
        Array.isArray(
          record?.task_status
        )
          ? record.task_status
          : [];

      const statusMap =
        new Map(
          statuses.map(
            status => [
              status.task_id,
              status.is_done
            ]
          )
        );

      const responseTasks =
        tasks.map(
          task => ({
            taskId:
              task.task_id,

            name:
              task.name,

            isDone:
              statusMap.get(
                task.task_id
              ) === true
          })
        );

      res.json({
        ok: true,

        dateKey,

        tasks:
          responseTasks,

        note:
          record?.note ||
          ''
      });

    }
    catch (error) {
      next(error);
    }
  }
);


/*
 * ============================================================
 * PUT /api/day/:dateKey
 * ============================================================
 *
 * Saves:
 *
 * 1. Task completion statuses
 * 2. Optional day-level note
 *
 * A note belongs to the daily_records row rather than an
 * individual task.
 * ============================================================
 */

router.put(
  '/:dateKey',

  async (
    req,
    res,
    next
  ) => {
    try {
      const dateKey =
        req.params.dateKey;

      assertDateKey(
        dateKey
      );

      const items =
        req.body?.tasks;

      /*
       * V2 CR-004:
       * Optional daily note.
       */
      const note =
        String(
          req.body?.note ??
          ''
        ).trim();

      if (
        !Array.isArray(
          items
        )
      ) {
        const error =
          new Error(
            'Body must include tasks.'
          );

        error.statusCode =
          400;

        throw error;
      }

      if (
        note.length > 1000
      ) {
        const error =
          new Error(
            'Daily note must be 1000 characters or fewer.'
          );

        error.statusCode =
          400;

        throw error;
      }

      const supabase =
        req.supabase;

      const userId =
        req.user.id;

      const challenge =
        await getCurrentChallenge(
          supabase,
          userId
        );

      requireChallenge(
        challenge
      );

      assertChallengeDate(
        dateKey,
        challenge
      );

      const validTasks =
        await getActiveTasks(
          supabase,
          challenge.challengeId
        );

      const validTaskIds =
        new Set(
          validTasks.map(
            task =>
              task.task_id
          )
        );

      /*
       * Validate every submitted task before
       * changing any database data.
       */
      for (
        const item of items
      ) {
        const taskId =
          String(
            item.taskId ||
            ''
          );

        if (
          !validTaskIds.has(
            taskId
          )
        ) {
          const error =
            new Error(
              'Invalid task for this challenge.'
            );

          error.statusCode =
            400;

          throw error;
        }
      }

      /*
       * --------------------------------------------------------
       * Find or create the daily record
       * --------------------------------------------------------
       */

      const {
        data: existingRecords,
        error: existingError
      } = await supabase
        .from('daily_records')
        .select(
          'daily_record_id'
        )
        .eq(
          'challenge_id',
          challenge.challengeId
        )
        .eq(
          'date_key',
          dateKey
        )
        .limit(1);

      if (existingError) {
        throw existingError;
      }

      let dailyRecordId;

      if (
        existingRecords &&
        existingRecords.length > 0
      ) {
        dailyRecordId =
          existingRecords[0]
            .daily_record_id;

        /*
         * Update the note on an existing
         * daily record.
         */
        const {
          error: updateNoteError
        } = await supabase
          .from('daily_records')
          .update({
            note:
              note || null
          })
          .eq(
            'daily_record_id',
            dailyRecordId
          )
          .eq(
            'challenge_id',
            challenge.challengeId
          );

        if (updateNoteError) {
          throw updateNoteError;
        }

      }
      else {
        /*
         * Create a new daily record and save
         * the note at the same time.
         */
        const {
          data: newRecord,
          error: createError
        } = await supabase
          .from('daily_records')
          .insert({
            challenge_id:
              challenge.challengeId,

            date_key:
              dateKey,

            note:
              note || null
          })
          .select(
            'daily_record_id'
          )
          .single();

        if (createError) {
          throw createError;
        }

        dailyRecordId =
          newRecord
            .daily_record_id;
      }

      /*
       * --------------------------------------------------------
       * Save task statuses
       * --------------------------------------------------------
       *
       * Composite primary key:
       *
       * (daily_record_id, task_id)
       *
       * Therefore upsert safely inserts new status rows or
       * updates existing ones.
       */

      const statusRows =
        items.map(
          item => ({
            daily_record_id:
              dailyRecordId,

            task_id:
              String(
                item.taskId
              ),

            is_done:
              Boolean(
                item.isDone
              )
          })
        );

      if (
        statusRows.length > 0
      ) {
        const {
          error: statusError
        } = await supabase
          .from('task_status')
          .upsert(
            statusRows,
            {
              onConflict:
                'daily_record_id,task_id'
            }
          );

        if (statusError) {
          throw statusError;
        }
      }

      res.json({
        ok: true,
        dateKey,
        note
      });

    }
    catch (error) {
      next(error);
    }
  }
);


module.exports =
  router;