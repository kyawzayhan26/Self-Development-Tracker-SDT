/*
 * ============================================================
 * SDT V2 - Browser Authentication
 * ============================================================
 */

let supabaseClient = null;


/* ------------------------------------------------------------
 * Initialise Supabase
 * ------------------------------------------------------------ */
async function initializeSupabase() {

  const response = await fetch('/api/config');

  if (!response.ok) {
    throw new Error('Unable to load Supabase configuration.');
  }

  const config = await response.json();

  if (
    !config.supabaseUrl ||
    !config.supabasePublishableKey
  ) {
    throw new Error(
      'Supabase browser configuration is incomplete.'
    );
  }

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== 'function'
  ) {
    throw new Error(
      'Supabase browser library is not available.'
    );
  }

  supabaseClient =
    window.supabase.createClient(
      config.supabaseUrl,
      config.supabasePublishableKey
    );

  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}


/* ------------------------------------------------------------
 * Client
 * ------------------------------------------------------------ */
function getClient() {

  if (!supabaseClient) {
    throw new Error(
      'Supabase has not been initialised.'
    );
  }

  return supabaseClient;
}


/* ------------------------------------------------------------
 * Sign In
 * ------------------------------------------------------------ */
async function signIn(email, password) {

  const client = getClient();

  const { data, error } =
    await client.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    throw error;
  }

  return data;
}


/* ------------------------------------------------------------
 * Sign Up
 * ------------------------------------------------------------ */
async function signUp(email, password) {

  const client = getClient();

  const { data, error } =
    await client.auth.signUp({
      email,
      password
    });

  if (error) {
    throw error;
  }

  return data;
}


/* ------------------------------------------------------------
 * Sign Out
 * ------------------------------------------------------------ */
async function signOut() {

  const client = getClient();

  const { error } =
    await client.auth.signOut();

  if (error) {
    throw error;
  }
}


/* ------------------------------------------------------------
 * Session
 * ------------------------------------------------------------ */
async function getSession() {

  const client = getClient();

  const {
    data: { session },
    error
  } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}


/* ------------------------------------------------------------
 * User
 * ------------------------------------------------------------ */
async function getUser() {

  const client = getClient();

  const {
    data: { user },
    error
  } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}


/* ------------------------------------------------------------
 * Access Token
 * ------------------------------------------------------------ */
async function getAccessToken() {

  const session = await getSession();

  return session
    ? session.access_token
    : null;
}


/* ------------------------------------------------------------
 * Auth State Listener
 * ------------------------------------------------------------ */
function onAuthStateChange(callback) {

  const client = getClient();

  return client.auth.onAuthStateChange(
    (event, session) => {
      callback(event, session);
    }
  );
}


/* ------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------ */
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