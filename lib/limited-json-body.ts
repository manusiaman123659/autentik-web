export class LimitedJsonBodyError extends Error {
  constructor(public readonly reason: "too_large" | "invalid_json") {
    super(reason);
  }
}

export async function readJsonBodyWithLimit(request: Request, maxBytes: number): Promise<unknown> {
  const length = request.headers.get("content-length");
  if (length !== null && /^\d+$/.test(length.trim()) && Number(length) > maxBytes) {
    throw new LimitedJsonBodyError("too_large");
  }

  if (!request.body) throw new LimitedJsonBodyError("invalid_json");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new LimitedJsonBodyError("too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new LimitedJsonBodyError("invalid_json");
  }
}
