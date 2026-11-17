// Optional External Supabase Client Reference
// Active runtime persistence is powered by Cloud SQL PostgreSQL + Express API (/api/*).
// If deploying to an external Supabase project, configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.

export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  isConfigured: Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      !String(import.meta.env.VITE_SUPABASE_URL).includes('your-project-id')
  ),
};
