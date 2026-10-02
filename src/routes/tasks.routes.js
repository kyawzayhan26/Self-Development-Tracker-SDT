const express =
  require('express');


const router =
  express.Router();


/*
 * ============================================================
 * GET /api/tasks
 * ============================================================
 *
 * Returns the active tasks belonging to the authenticated
 * user's current active challenge.
 *
 * RLS provides an additional ownership boundary.
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

      const supabase =
        req.supabase;

      const userId =
        req.user.id;


      /*
       * Find this user's active challenge.
       */
      const {
        data: challenges,
        error: challengeError
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


      if (challengeError) {
        throw challengeError;
      }


      if (
        !challenges ||
        challenges.length === 0
      ) {

        return res.json({
          ok: true,
          tasks: []
        });
      }


      const challengeId =
        challenges[0]
          .challenge_id;


      /*
       * Retrieve active tasks.
       */
      const {
        data: tasks,
        error: taskError
      } =
        await supabase
          .from('tasks')
          .select(`
            task_id,
            name,
            is_active,
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


      if (taskError) {
        throw taskError;
      }


      /*
       * Preserve the V1 camelCase API contract.
       */
      res.json({

        ok: true,

        tasks:
          (tasks || [])
            .map(
              task => ({

                taskId:
                  task.task_id,

                name:
                  task.name,

                isActive:
                  task.is_active,

                sortOrder:
                  task.sort_order

              })
            )

      });

    }
    catch (error) {

      next(error);
    }
  }
);


module.exports =
  router;