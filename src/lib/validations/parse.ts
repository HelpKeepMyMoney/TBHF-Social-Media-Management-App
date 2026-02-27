import { NextResponse } from 'next/server';
import type { z } from 'zod';

/**
 * Parses and validates request body against a Zod schema.
 * Returns parsed data on success, or a NextResponse with 400 on validation failure.
 */
export async function parseBody<T>(
  body: unknown,
  schema: z.ZodType<T>,
): Promise<{ data: T } | NextResponse> {
  const result = await schema.safeParseAsync(body);
  if (result.success) {
    return { data: result.data };
  }
  const firstError = result.error.errors[0];
  const message = firstError?.message ?? 'Validation failed';
  return NextResponse.json(
    { success: false, error: message },
    { status: 400 },
  );
}

/**
 * Parses query params from URL.
 */
export function parseQuery<T>(searchParams: URLSearchParams, schema: z.ZodType<T>): { data: T } | NextResponse {
  const params = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(params);
  if (result.success) {
    return { data: result.data };
  }
  return NextResponse.json(
    { success: false, error: 'Invalid query parameters' },
    { status: 400 },
  );
}
