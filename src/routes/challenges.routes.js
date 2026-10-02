const express =
  require('express');


const router =
  express.Router();


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */


/*
 * Convert a YYYY-MM-DD string into a UTC Date.
 */
function parseDate(
  value
) {

  return new Date(
    `${value}T00:00:00Z`
  );
}


/*
 * Convert a Date into YYYY-MM-DD.
 */
function formatDate(
  date
) {

  return date
    .toISOString()
    .slice(
      0,
      10
    );
}


/*
 * Calculate the final date of a challenge.
 *
 * Day 1 = start date.
 *
 * Example:
 * Start: 2026-10-01
 * Duration: 30
 * End: 2026-10-30
 */
function calculateEndDate(
  startDate,
  durationDays
) {

  const date =
    parseDate(
      startDate
    );


  date.setUTCDate(
    date.getUTCDate() +
    durationDays -
    1
  );


  return formatDate(
    date
  );
}


/*
 * Today's UTC date as YYYY-MM-DD.
 */
function todayDateKey() {

  return new Date()
    .toISOString()
    .slice(
      0,
      10
    );
}


/*
 * ============================================================
 * NATURAL COMPLETION
 * ============================================================
 *
 * Complete the authenticated user's active challenge when its
 * final day has already passed.
 *
 * RLS additionally ensures the user cannot update another
 * user's challenge.
 * ============================================================
 */

async function completeExpiredChallenge(
  supabase,
  userId
) {

  const {
    data: activeChallenges,
    error
  } =
    await supabase
      .from('challenges')
      .select(`
        challenge_id,
        start_date,
        duration_days
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
    !activeChallenges ||
    activeChallenges.length === 0
  ) {

    return;
  }


  const challenge =
    activeChallenges[0];


  const endDate =
    calculateEndDate(
      challenge.start_date,
      challenge.duration_days
    );


  const today =
    todayDateKey();


  /*
   * Challenge remains active throughout its final day.
   * It becomes completed the following day.
   */
  if (
    endDate >= today
  ) {

    return;
  }


  const {
    error: updateError
  } =
    await supabase
      .from('challenges')
      .update({
        status:
          'completed',

        completed_at:
          new Date().toISOString(),

        completion_reason:
          'NATURAL'
      })
      .eq(
        'challenge_id',
        challenge.challenge_id
      )
      .eq(
        'user_id',
        userId
      )
      .eq(
        'status',
        'active'
      );


  if (updateError) {
    throw updateError;
  }
}


/*
 * ============================================================
 * RESPONSE MAPPING
 * ============================================================
 *
 * The existing frontend uses camelCase.
 *
 * Supabase/PostgreSQL uses snake_case.
 *
 * Keeping the old response shape means we can migrate the
 * backend without unnecessarily rewriting the frontend.
 * ============================================================
 */

function mapTask(
  task
) {

  return {

    taskId:
      task.task_id,

    name:
      task.name,

    sortOrder:
      task.sort_order

  };
}


function mapChallenge(
  challenge
) {

  if (!challenge) {
    return null;
  }


  return {

    challengeId:
      challenge.challenge_id,

    name:
      challenge.name,

    startDate:
      challenge.start_date,

    endDate:
      calculateEndDate(
        challenge.start_date,
        challenge.duration_days
      ),

    durationDays:
      challenge.duration_days,

    strikesAllowed:
      challenge.strikes_allowed,

    status:
      String(
        challenge.status || ''
      ).toUpperCase(),

    completedAt:
      challenge.completed_at,

    completionReason:
      challenge.completion_reason,

    createdAt:
      challenge.created_at,

    tasks:
      Array.isArray(
        challenge.tasks
      )
        ? challenge.tasks.map(
            mapTask
          )
        : []

  };
}


/*
 * ============================================================
 * GET /api/challenges/current
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


      await completeExpiredChallenge(
        supabase,
        userId
      );


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
            completion_reason,
            created_at,
            tasks (
              task_id,
              name,
              sort_order,
              is_active
            )
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

        return res.json({

          ok: true,

          challenge:
            null

        });
      }


      const challenge =
        data[0];


      /*
       * Only expose active tasks.
       */
      challenge.tasks =
        Array.isArray(
          challenge.tasks
        )
          ? challenge.tasks
              .filter(
                task =>
                  task.is_active
              )
              .sort(
                (a, b) =>

                  (
                    a.sort_order || 0
                  ) -
                  (
                    b.sort_order || 0
                  )
              )
          : [];


      res.json({

        ok: true,

        challenge:
          mapChallenge(
            challenge
          )

      });

    }
    catch (error) {

      next(error);
    }
  }
);


/*
 * ============================================================
 * GET /api/challenges/latest-completed
 * ============================================================
 */

router.get(
  '/latest-completed',

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


      await completeExpiredChallenge(
        supabase,
        userId
      );


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
            completion_reason,
            created_at
          `)
          .eq(
            'user_id',
            userId
          )
          .eq(
            'status',
            'completed'
          )
          .order(
            'completed_at',
            {
              ascending: false
            }
          )
          .limit(1);


      if (error) {
        throw error;
      }


      res.json({

        ok: true,

        challenge:
          data &&
          data.length > 0

            ? mapChallenge(
                data[0]
              )

            : null

      });

    }
    catch (error) {

      next(error);
    }
  }
);


/*
 * ============================================================
 * POST /api/challenges/start
 * ============================================================
 */

router.post(
  '/start',

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


      /*
       * --------------------------------------------------------
       * Validate challenge name
       * --------------------------------------------------------
       */

      const name =
        String(
          req.body?.name ||
          ''
        ).trim();


      if (!name) {

        const error =
          new Error(
            'Challenge name is required.'
          );

        error.statusCode =
          400;

        throw error;
      }


      if (
        name.length > 150
      ) {

        const error =
          new Error(
            'Challenge name is too long.'
          );

        error.statusCode =
          400;

        throw error;
      }


      /*
       * --------------------------------------------------------
       * Validate start date
       * --------------------------------------------------------
       */

      const startDate =
        String(
          req.body?.startDate ||
          ''
        ).trim();


      if (
        !/^\d{4}-\d{2}-\d{2}$/
          .test(
            startDate
          )
      ) {

        const error =
          new Error(
            'Start date must use YYYY-MM-DD.'
          );

        error.statusCode =
          400;

        throw error;
      }


      /*
       * --------------------------------------------------------
       * Validate duration
       * --------------------------------------------------------
       */

      const durationDays =
        Number(
          req.body?.durationDays
        );


      if (
        !Number.isInteger(
          durationDays
        ) ||
        durationDays < 1 ||
        durationDays > 365
      ) {

        const error =
          new Error(
            'Challenge duration must be between 1 and 365 days.'
          );

        error.statusCode =
          400;

        throw error;
      }


      /*
       * --------------------------------------------------------
       * Validate strikes
       * --------------------------------------------------------
       */

      const strikesAllowed =
        Number(
          req.body?.strikesAllowed
        );


      if (
        !Number.isInteger(
          strikesAllowed
        ) ||
        strikesAllowed < 0 ||
        strikesAllowed > 99
      ) {

        const error =
          new Error(
            'Strikes allowed must be between 0 and 99.'
          );

        error.statusCode =
          400;

        throw error;
      }


      /*
       * --------------------------------------------------------
       * Validate tasks
       * --------------------------------------------------------
       */

      const incomingTasks =
        req.body?.tasks;


      if (
        !Array.isArray(
          incomingTasks
        ) ||
        incomingTasks.length === 0
      ) {

        const error =
          new Error(
            'Add at least one rule or task.'
          );

        error.statusCode =
          400;

        throw error;
      }


      if (
        incomingTasks.length > 100
      ) {

        const error =
          new Error(
            'Maximum 100 tasks allowed.'
          );

        error.statusCode =
          400;

        throw error;
      }


      const tasks =
        incomingTasks

          .map(
            task => {

              if (
                typeof task ===
                'string'
              ) {

                return task.trim();
              }


              return String(
                task?.name ||
                ''
              ).trim();
            }
          )

          .filter(
            Boolean
          );


      if (
        tasks.length === 0
      ) {

        const error =
          new Error(
            'Add at least one valid task.'
          );

        error.statusCode =
          400;

        throw error;
      }


      for (
        const task of tasks
      ) {

        if (
          task.length > 200
        ) {

          const error =
            new Error(
              'Each task must be 200 characters or fewer.'
            );

          error.statusCode =
            400;

          throw error;
        }
      }


      const normalizedTasks =
        tasks.map(
          task =>
            task.toLowerCase()
        );


      if (
        new Set(
          normalizedTasks
        ).size !==
        normalizedTasks.length
      ) {

        const error =
          new Error(
            'Duplicate tasks are not allowed.'
          );

        error.statusCode =
          400;

        throw error;
      }


      /*
       * Complete an expired active challenge first.
       */
      await completeExpiredChallenge(
        supabase,
        userId
      );


      /*
       * Check whether THIS USER already has an active
       * challenge.
       *
       * The database unique partial index also enforces this.
       */
      const {
        data: existing,
        error: existingError
      } =
        await supabase
          .from('challenges')
          .select(
            'challenge_id'
          )
          .eq(
            'user_id',
            userId
          )
          .eq(
            'status',
            'active'
          )
          .limit(1);


      if (existingError) {
        throw existingError;
      }


      if (
        existing &&
        existing.length > 0
      ) {

        const error =
          new Error(
            'An active challenge already exists.'
          );

        error.statusCode =
          409;

        throw error;
      }


      /*
       * --------------------------------------------------------
       * Create challenge
       * --------------------------------------------------------
       */

      const {
        data: challenge,
        error: challengeError
      } =
        await supabase
          .from('challenges')
          .insert({
            user_id:
              userId,

            name,

            start_date:
              startDate,

            duration_days:
              durationDays,

            strikes_allowed:
              strikesAllowed,

            status:
              'active',

            completed_at:
              null,

            completion_reason:
              null
          })
          .select(
            'challenge_id'
          )
          .single();


      if (challengeError) {

        /*
         * PostgreSQL unique violation.
         *
         * This may happen if two requests attempt to create
         * an active challenge at almost the same time.
         */
        if (
          challengeError.code ===
          '23505'
        ) {

          const error =
            new Error(
              'An active challenge already exists.'
            );

          error.statusCode =
            409;

          throw error;
        }


        throw challengeError;
      }


      /*
       * --------------------------------------------------------
       * Create challenge tasks
       * --------------------------------------------------------
       */

      const taskRows =
        tasks.map(
          (
            task,
            index
          ) => ({

            challenge_id:
              challenge.challenge_id,

            name:
              task,

            is_active:
              true,

            sort_order:
              index + 1

          })
        );


      const {
        error: taskError
      } =
        await supabase
          .from('tasks')
          .insert(
            taskRows
          );


      if (taskError) {

        /*
         * If task creation fails, remove the newly-created
         * challenge so the user is not left with an incomplete
         * challenge.
         *
         * RLS still applies to this delete.
         */
        await supabase
          .from('challenges')
          .delete()
          .eq(
            'challenge_id',
            challenge.challenge_id
          )
          .eq(
            'user_id',
            userId
          );


        throw taskError;
      }


      res
        .status(201)
        .json({

          ok: true,

          challengeId:
            challenge.challenge_id

        });

    }
    catch (error) {

      next(error);
    }
  }
);


/*
 * ============================================================
 * POST /api/challenges/current/end
 * ============================================================
 */

router.post(
  '/current/end',

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
            name
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

        const error =
          new Error(
            'There is no active challenge to end.'
          );

        error.statusCode =
          404;

        throw error;
      }


      const challenge =
        data[0];


      const completedAt =
        new Date()
          .toISOString();


      const {
        data: updated,
        error: updateError
      } =
        await supabase
          .from('challenges')
          .update({

            status:
              'completed',

            completed_at:
              completedAt,

            completion_reason:
              'MANUAL'

          })
          .eq(
            'challenge_id',
            challenge.challenge_id
          )
          .eq(
            'user_id',
            userId
          )
          .eq(
            'status',
            'active'
          )
          .select(`
            challenge_id,
            name,
            status,
            completion_reason,
            completed_at
          `)
          .single();


      if (updateError) {
        throw updateError;
      }


      res.json({

        ok: true,

        challengeId:
          updated.challenge_id,

        name:
          updated.name,

        status:
          String(
            updated.status
          ).toUpperCase(),

        completionReason:
          updated.completion_reason,

        completedAt:
          updated.completed_at

      });

    }
    catch (error) {

      next(error);
    }
  }
);


module.exports =
  router;