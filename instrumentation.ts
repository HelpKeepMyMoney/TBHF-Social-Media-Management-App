/**
 * Next.js instrumentation hook — runs when the server starts.
 * Validates required environment variables to fail fast.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./src/lib/env');
    validateEnv();
  }
}
