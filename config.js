/* BEYOND configuration.
   Leave SUPABASE_URL and SUPABASE_ANON_KEY empty to run in local demo mode (everything stays on this device).
   To go live: paste your Supabase "Project URL" and "anon public" key here (both are safe to publish).
   NEVER paste the "service_role" key here. */
window.BEYOND_CONFIG = {
  SUPABASE_URL: 'https://zyfinpacnbyylwgcpqud.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5ZmlucGFjbmJ5eWx3Z2NwcXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzA1MjAsImV4cCI6MjEwNzMwNjUyMH0.CZz15eBBWN3hB4FJz5vad4Ir35vptew1pAeqjHt_GOE',

  /* Owner details. Nothing is invented: anything starting with TODO shows as a marked placeholder. */
  OWNER: {
    legalName: 'TODO_OWNER_LEGAL_NAME',
    contactEmail: 'TODO_OWNER_CONTACT_EMAIL',
    minAge: 13,            /* a starting default: confirm with a lawyer for the countries you serve */
    updated: '2026-10-11'
  }
};
