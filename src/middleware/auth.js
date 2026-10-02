const { createClient } =
  require('@supabase/supabase-js');


/*
 * ============================================================
 * SDT V2 - API Authentication Middleware
 * ============================================================
 *
 * Responsibilities:
 * - Read the Supabase access token from Authorization header
 * - Verify the token with Supabase Auth
 * - Attach the authenticated user to req.user
 * - Create a request-scoped Supabase client
 *
 * IMPORTANT:
 * The request-scoped client uses the user's own access token.
 * This means Supabase Row Level Security (RLS) continues to
 * enforce ownership rules.
 *
 * No service-role / secret key is used.
 * ============================================================
 */


async function requireAuth(
  req,
  res,
  next
) {

  try {

    /*
     * Read:
     *
     * Authorization: Bearer <token>
     */
    const authorization =
      req.headers.authorization || '';


    if (
      !authorization.startsWith(
        'Bearer '
      )
    ) {

      return res.status(401).json({
        ok: false,
        error:
          'Authentication required.'
      });
    }


    const accessToken =
      authorization
        .slice(7)
        .trim();


    if (!accessToken) {

      return res.status(401).json({
        ok: false,
        error:
          'Authentication required.'
      });
    }


    const supabaseUrl =
      process.env.SUPABASE_URL;

    const supabasePublishableKey =
      process.env.SUPABASE_PUBLISHABLE_KEY;


    if (
      !supabaseUrl ||
      !supabasePublishableKey
    ) {

      const error =
        new Error(
          'Supabase server configuration is incomplete.'
        );

      error.statusCode = 500;

      throw error;
    }


    /*
     * Base authentication client.
     *
     * This is used only to verify the supplied access token.
     */
    const authClient =
      createClient(
        supabaseUrl,
        supabasePublishableKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        }
      );


    /*
     * Ask Supabase Auth to verify the JWT and return
     * the authenticated user.
     */
    const {
      data: {
        user
      },
      error: userError
    } =
      await authClient.auth.getUser(
        accessToken
      );


    if (
      userError ||
      !user
    ) {

      return res.status(401).json({
        ok: false,
        error:
          'Invalid or expired session.'
      });
    }


    /*
     * Create a NEW Supabase client for this request.
     *
     * Never mutate one global client's Authorization header
     * because multiple users may make requests concurrently.
     */
    const userSupabase =
      createClient(
        supabaseUrl,
        supabasePublishableKey,
        {
          global: {
            headers: {
              Authorization:
                `Bearer ${accessToken}`
            }
          },

          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        }
      );


    /*
     * Make authenticated information available
     * to downstream routes.
     */
    req.user =
      user;

    req.accessToken =
      accessToken;

    req.supabase =
      userSupabase;


    next();

  }
  catch (error) {

    next(error);
  }
}


module.exports = {
  requireAuth
};