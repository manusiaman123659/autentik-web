import { z } from "zod";

export const MIKA_DEFAULT_LIMIT = 100;
export const MIKA_MAX_LIMIT = 200;
export const MIKA_MAX_CURSOR_LENGTH = 2048;

const cursorPayloadSchema = z.object({
  v: z.literal(1),
  mode: z.literal("snapshot"),
  resource: z.enum(["products", "brands"]),
  last_id: z.string().min(1).max(512),
}).strict();

export type MikaCursorPayload = z.infer<typeof cursorPayloadSchema>;

export type MikaPagination = {
  limit: number;
  lastId: string | null;
};

export type MikaPaginationResult =
  | { success: true; data: MikaPagination }
  | { success: false; code: "INVALID_CURSOR" | "INVALID_QUERY" };

function decodeCursor(value: string): MikaCursorPayload | null {
  if (
    value.length === 0
    || value.length > MIKA_MAX_CURSOR_LENGTH
    || !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    return null;
  }

  try {
    const decoded = Buffer.from(value, "base64url");
    if (decoded.toString("base64url") !== value) return null;

    const parsed: unknown = JSON.parse(decoded.toString("utf8"));
    const result = cursorPayloadSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function encodeMikaCursor(lastId: string, resource: "products" | "brands"): string {
  const payload: MikaCursorPayload = {
    v: 1,
    mode: "snapshot",
    resource,
    last_id: lastId,
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function parseMikaPagination(
  searchParams: URLSearchParams,
  resource: "products" | "brands",
): MikaPaginationResult {
  const allowedKeys = new Set(["limit", "cursor"]);
  for (const key of searchParams.keys()) {
    if (!allowedKeys.has(key)) return { success: false, code: "INVALID_QUERY" };
  }

  const limitValues = searchParams.getAll("limit");
  if (limitValues.length > 1) return { success: false, code: "INVALID_QUERY" };

  let limit = MIKA_DEFAULT_LIMIT;
  if (limitValues.length === 1) {
    const rawLimit = limitValues[0];
    if (!/^[1-9]\d*$/.test(rawLimit)) {
      return { success: false, code: "INVALID_QUERY" };
    }

    limit = Number(rawLimit);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MIKA_MAX_LIMIT) {
      return { success: false, code: "INVALID_QUERY" };
    }
  }

  const cursorValues = searchParams.getAll("cursor");
  if (cursorValues.length > 1) return { success: false, code: "INVALID_CURSOR" };

  let lastId: string | null = null;
  if (cursorValues.length === 1) {
    const cursor = decodeCursor(cursorValues[0]);
    if (!cursor || cursor.resource !== resource) {
      return { success: false, code: "INVALID_CURSOR" };
    }
    lastId = cursor.last_id;
  }

  return { success: true, data: { limit, lastId } };
}
