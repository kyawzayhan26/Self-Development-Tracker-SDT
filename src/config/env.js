require('dotenv').config();


/*
 * ============================================================
 * SDT V2 - ENVIRONMENT CONFIGURATION
 * ============================================================
 */


function must(
  name,
  fallback = undefined
) {

  const value =
    process.env[name] ??
    fallback;


  if (
    value === undefined ||
    value === ''
  ) {

    throw new Error(
      `Missing env var: ${name}`
    );
  }


  return value;
}


module.exports = {

  PORT:
    parseInt(
      process.env.PORT ||
      '4000',
      10
    ),

  NODE_ENV:
    process.env.NODE_ENV ||
    'development',

  SUPABASE: {

    url:
      must(
        'SUPABASE_URL'
      ),

    publishableKey:
      must(
        'SUPABASE_PUBLISHABLE_KEY'
      )

  }

};