/*
 * ============================================================
 * SDT V2 - Authentication UI
 * ============================================================
 */

const authScreen =
  document.getElementById('authScreen');

const appContainer =
  document.getElementById('appContainer');

const authForm =
  document.getElementById('authForm');

const authEmail =
  document.getElementById('authEmail');

const authPassword =
  document.getElementById('authPassword');

const authSubmitBtn =
  document.getElementById('authSubmitBtn');

const authSwitchBtn =
  document.getElementById('authSwitchBtn');

const authTitle =
  document.getElementById('authTitle');

const authDescription =
  document.getElementById('authDescription');

const authSwitchText =
  document.getElementById('authSwitchText');

const authMessage =
  document.getElementById('authMessage');

const userAccount =
  document.getElementById('userAccount');

const userEmail =
  document.getElementById('userEmail');

const logoutBtn =
  document.getElementById('logoutBtn');


let authMode = 'login';


/* ------------------------------------------------------------
 * Messages
 * ------------------------------------------------------------ */
function showAuthMessage(
  message,
  type = 'danger'
) {

  authMessage.textContent =
    message;

  authMessage.className =
    `alert alert-${type} mt-3`;

  authMessage.classList.remove(
    'd-none'
  );
}


function clearAuthMessage() {

  authMessage.textContent =
    '';

  authMessage.className =
    'alert alert-danger mt-3 d-none';
}


/* ------------------------------------------------------------
 * Login / Signup mode
 * ------------------------------------------------------------ */
function renderAuthMode() {

  clearAuthMessage();

  if (authMode === 'login') {

    authTitle.textContent =
      'Welcome Back';

    authDescription.textContent =
      'Sign in to continue to your challenges.';

    authSubmitBtn.textContent =
      'Sign In';

    authSwitchText.textContent =
      "Don't have an account?";

    authSwitchBtn.textContent =
      'Create Account';

    authPassword.setAttribute(
      'autocomplete',
      'current-password'
    );

  } else {

    authTitle.textContent =
      'Create Your Account';

    authDescription.textContent =
      'Create an account to start tracking your challenges.';

    authSubmitBtn.textContent =
      'Create Account';

    authSwitchText.textContent =
      'Already have an account?';

    authSwitchBtn.textContent =
      'Sign In';

    authPassword.setAttribute(
      'autocomplete',
      'new-password'
    );
  }
}


/* ------------------------------------------------------------
 * Show Auth Screen
 * ------------------------------------------------------------ */
function showAuthScreen() {

  appContainer.classList.add(
    'd-none'
  );

  userAccount.classList.add(
    'd-none'
  );

  authScreen.classList.remove(
    'd-none'
  );

  authPassword.value =
    '';

  clearAuthMessage();
}


/* ------------------------------------------------------------
 * Show Application
 * ------------------------------------------------------------ */
function showApplication(
  session
) {

  authScreen.classList.add(
    'd-none'
  );

  appContainer.classList.remove(
    'd-none'
  );

  userAccount.classList.remove(
    'd-none'
  );

  userEmail.textContent =
    session.user.email ||
    'Signed in';
}


/* ------------------------------------------------------------
 * Friendly Authentication Errors
 * ------------------------------------------------------------ */
function getFriendlyAuthError(
  error
) {

  const message =
    String(
      error?.message || ''
    ).toLowerCase();


  /*
   * Supabase commonly returns
   * "Invalid login credentials"
   * when the email/password combination
   * is incorrect.
   */
  if (
    message.includes(
      'invalid login credentials'
    )
  ) {

    return (
      'Incorrect email or password. ' +
      'Please try again.'
    );
  }


  if (
    message.includes(
      'email not confirmed'
    )
  ) {

    return (
      'Please confirm your email address ' +
      'before signing in.'
    );
  }


  if (
    message.includes(
      'user already registered'
    ) ||
    message.includes(
      'already been registered'
    )
  ) {

    return (
      'An account already exists with this email. ' +
      'Try signing in instead.'
    );
  }


  if (
    message.includes(
      'password'
    ) &&
    message.includes(
      'characters'
    )
  ) {

    return (
      'Password must be at least 8 characters.'
    );
  }


  /*
   * Avoid displaying raw backend/auth errors
   * directly to normal users.
   */
  if (authMode === 'login') {

    return (
      'Unable to sign in. ' +
      'Please check your details and try again.'
    );
  }


  return (
    'Unable to create your account. ' +
    'Please try again.'
  );
}


/* ------------------------------------------------------------
 * Submit Login / Signup
 * ------------------------------------------------------------ */
async function handleAuthSubmit(
  event
) {

  event.preventDefault();

  clearAuthMessage();


  const email =
    authEmail.value.trim();

  const password =
    authPassword.value;


  if (
    !email ||
    !password
  ) {

    showAuthMessage(
      'Enter your email and password.'
    );

    return;
  }


  if (
    password.length < 8
  ) {

    showAuthMessage(
      'Password must be at least 8 characters.'
    );

    return;
  }


  authSubmitBtn.disabled =
    true;

  authSwitchBtn.disabled =
    true;

  authEmail.disabled =
    true;

  authPassword.disabled =
    true;


  authSubmitBtn.textContent =
    authMode === 'login'
      ? 'Signing In...'
      : 'Creating Account...';


  try {

    let result;


    if (
      authMode === 'login'
    ) {

      result =
        await window.sdtAuth.signIn(
          email,
          password
        );

    } else {

      result =
        await window.sdtAuth.signUp(
          email,
          password
        );
    }


    /*
     * Some signup configurations require
     * email confirmation before a session
     * is created.
     */
    if (
      !result.session
    ) {

      showAuthMessage(
        'Account created. Check your email if confirmation is required.',
        'success'
      );

      return;
    }


    showApplication(
      result.session
    );


    /*
     * Start the existing SDT application
     * only after authentication succeeds.
     */
    if (
      typeof window.loadSDTApplication ===
      'function'
    ) {

      await window
        .loadSDTApplication();
    }

  }
  catch (error) {

    console.error(
      'Authentication failed:',
      error
    );


    showAuthMessage(
      getFriendlyAuthError(
        error
      )
    );

  }
  finally {

    /*
     * Restore controls WITHOUT calling
     * renderAuthMode().
     *
     * Previously renderAuthMode() cleared
     * the error message immediately after
     * it was displayed.
     */
    authSubmitBtn.disabled =
      false;

    authSwitchBtn.disabled =
      false;

    authEmail.disabled =
      false;

    authPassword.disabled =
      false;


    authSubmitBtn.textContent =
      authMode === 'login'
        ? 'Sign In'
        : 'Create Account';
  }
}


/* ------------------------------------------------------------
 * Logout
 * ------------------------------------------------------------ */
async function handleLogout() {

  logoutBtn.disabled =
    true;

  logoutBtn.textContent =
    'Logging Out...';


  try {

    await window
      .sdtAuth
      .signOut();


    /*
     * Clear sensitive form state.
     */
    authEmail.value =
      '';

    authPassword.value =
      '';


    showAuthScreen();

  }
  catch (error) {

    console.error(
      'Logout failed:',
      error
    );


    alert(
      'Unable to log out. Please try again.'
    );

  }
  finally {

    logoutBtn.disabled =
      false;

    logoutBtn.textContent =
      'Log Out';
  }
}


/* ------------------------------------------------------------
 * Initialise Authentication UI
 * ------------------------------------------------------------ */
async function initializeAuthUI() {

  try {

    const session =
      await window
        .sdtAuth
        .initializeSupabase();


    if (session) {

      showApplication(
        session
      );


      if (
        typeof window.loadSDTApplication ===
        'function'
      ) {

        await window
          .loadSDTApplication();
      }

    } else {

      showAuthScreen();
    }

  }
  catch (error) {

    console.error(
      'Authentication initialization failed:',
      error
    );


    showAuthScreen();


    showAuthMessage(
      'Unable to initialise authentication. Please refresh the page.'
    );
  }
}


/* ------------------------------------------------------------
 * Events
 * ------------------------------------------------------------ */
authForm.addEventListener(
  'submit',
  handleAuthSubmit
);


authSwitchBtn.addEventListener(
  'click',
  () => {

    authMode =
      authMode === 'login'
        ? 'signup'
        : 'login';


    renderAuthMode();


    authPassword.value =
      '';


    authEmail.focus();
  }
);


logoutBtn.addEventListener(
  'click',
  handleLogout
);


/* ------------------------------------------------------------
 * Start
 * ------------------------------------------------------------ */
renderAuthMode();

initializeAuthUI();