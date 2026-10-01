/*
 * ============================================================
 * SDT V2 - Browser Authentication
 * ============================================================
 *
 * Handles browser-side Supabase authentication.
 *
 * Responsibilities:
 * - Initialise Supabase
 * - Restore existing sessions
 * - Sign in
 * - Sign up
 * - Sign out
 * - Retrieve the current session
 * - Retrieve the current user
 * - Retrieve the current access token
 *
 * The access token will later be sent to the Express API so
 * database requests can run as the authenticated user and
 * remain protected by Supabase Row Level Security (RLS).
 * ============================================================
 */


let supabaseClient = null;


/*
 * ------------------------------------------------------------
 * Initialise Supabase
 * ------------------------------------------------------------
 */
async function initializeSupabase() {

  /*
   * Retrieve browser-safe configuration from Express.
   */
  const response = await fetch('/api/config');


  if (!response.ok) {

    throw new Error(
      'Unable to load Supabase configuration.'
    );

  }


  const config = await response.json();


  /*
   * Validate configuration.
   */
  if (
    !config.supabaseUrl ||
    !config.supabasePublishableKey
  ) {

    throw new Error(
      'Supabase browser configuration is incomplete.'
    );

  }


  /*
   * Make sure the Supabase browser library loaded correctly.
   */
  if (
    !window.supabase ||
    typeof window.supabase.createClient !== 'function'
  ) {

    throw new Error(
      'Supabase browser library is not available.'
    );

  }


  /*
   * Create browser-side Supabase client.
   *
   * Browser sessions are persisted automatically by
   * supabase-js, allowing the user to remain signed in after
   * refreshing the page.
   */
  supabaseClient =
    window.supabase.createClient(
      config.supabaseUrl,
      config.supabasePublishableKey
    );


  /*
   * Check whether a session already exists.
   */
  const {
    data: {
      session
    },
    error
  } =
    await supabaseClient.auth.getSession();


  if (error) {

    throw error;

  }


  if (session) {

    console.log(
      `Supabase Auth ready — signed in as ${session.user.email}`
    );

  } else {

    console.log(
      'Supabase Auth ready — no active session.'
    );

  }


  return session;
}


/*
 * ------------------------------------------------------------
 * Get Supabase Client
 * ------------------------------------------------------------
 */
function getClient() {

  if (!supabaseClient) {

    throw new Error(
      'Supabase has not been initialised.'
    );

  }


  return supabaseClient;
}


/*
 * ------------------------------------------------------------
 * Sign In
 * ------------------------------------------------------------
 */
async function signIn(
  email,
  password
) {

  const client =
    getClient();


  const {
    data,
    error
  } =
    await client.auth.signInWithPassword({
      email,
      password
    });


  if (error) {

    throw error;

  }


  return data;
}


/*
 * ------------------------------------------------------------
 * Sign Up
 * ------------------------------------------------------------
 */
async function signUp(
  email,
  password
) {

  const client =
    getClient();


  const {
    data,
    error
  } =
    await client.auth.signUp({
      email,
      password
    });


  if (error) {

    throw error;

  }


  return data;
}


/*
 * ------------------------------------------------------------
 * Sign Out
 * ------------------------------------------------------------
 */
async function signOut() {

  const client =
    getClient();


  const {
    error
  } =
    await client.auth.signOut();


  if (error) {

    throw error;

  }

}


/*
 * ------------------------------------------------------------
 * Get Current Session
 * ------------------------------------------------------------
 */
async function getSession() {

  const client =
    getClient();


  const {
    data: {
      session
    },
    error
  } =
    await client.auth.getSession();


  if (error) {

    throw error;

  }


  return session;
}


/*
 * ------------------------------------------------------------
 * Get Current User
 * ------------------------------------------------------------
 */
async function getUser() {

  const client =
    getClient();


  const {
    data: {
      user
    },
    error
  } =
    await client.auth.getUser();


  if (error) {

    throw error;

  }


  return user;
}


/*
 * ------------------------------------------------------------
 * Get Access Token
 * ------------------------------------------------------------
 *
 * Later our Express API requests will use:
 *
 * Authorization: Bearer <access_token>
 *
 * This allows the backend to perform Supabase requests as the
 * signed-in user rather than bypassing RLS.
 * ------------------------------------------------------------
 */
async function getAccessToken() {

  const session =
    await getSession();


  if (!session) {

    return null;

  }


  return session.access_token;
}


/*
 * ------------------------------------------------------------
 * Authentication State Listener
 * ------------------------------------------------------------
 *
 * Other V2 frontend code can subscribe to login/logout/session
 * changes without directly accessing the Supabase client.
 * ------------------------------------------------------------
 */
function onAuthStateChange(
  callback
) {

  const client =
    getClient();


  return client.auth.onAuthStateChange(
    (
      event,
      session
    ) => {

      callback(
        event,
        session
      );

    }
  );

}


/*
 * ------------------------------------------------------------
 * Public SDT Authentication API
 * ------------------------------------------------------------
 */
window.sdtAuth = {

  initializeSupabase,

  signIn,

  signUp,

  signOut,

  getSession,

  getUser,

  getAccessToken,

  getClient,

  onAuthStateChange

};