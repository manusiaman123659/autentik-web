/**
 * Structured logging utility for exceptions and audit events.
 * Uses console.error with consistent formatting for production log aggregation.
 */

function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Log an error with context, message, and optional metadata.
 * Normalizes Error, string, and unknown types.
 */
export function logError(
  context: string,
  error: unknown,
  meta?: Record<string, unknown>
): void {
  let message: string;
  let stack: string | undefined;

  if (error instanceof Error) {
    message = error.message;
    stack = error.stack;
  } else if (typeof error === "string") {
    message = error;
  } else {
    message = String(error);
  }

  const entry: Record<string, unknown> = {
    ts: timestamp(),
    ctx: context,
    msg: message,
  };
  if (stack) entry.stack = stack;
  if (meta && Object.keys(meta).length > 0) entry.meta = meta;

  console.error(JSON.stringify(entry));
}

/**
 * Log an audit event with structured formatting.
 * Wraps recordAudit with additional console output.
 */
export function logAudit(
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, unknown>
): void {
  console.error(
    JSON.stringify({
      ts: timestamp(),
      ctx: "audit",
      action,
      entity: entityType,
      id: entityId ?? null,
      details: details ?? null,
    })
  );
}
