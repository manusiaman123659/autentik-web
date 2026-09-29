export type CheckoutIntentScope = "cart" | "direct";

interface StoredCheckoutIntent {
  version: 1;
  userId: string;
  scope: CheckoutIntentScope;
  key: string;
  requestIdentity: string;
  orderCode: string | null;
  completed: boolean;
}

export interface ActiveCheckoutIntent {
  key: string;
  orderCode: string | null;
  requestChanged: boolean;
}

const STORAGE_PREFIX = "autentik-checkout-intent:v1";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CheckoutIntentStorageError extends Error {
  constructor() {
    super("Penyimpanan sesi checkout tidak tersedia.");
    this.name = "CheckoutIntentStorageError";
  }
}

function storageKey(userId: string, scope: CheckoutIntentScope): string {
  return `${STORAGE_PREFIX}:${userId}:${scope}`;
}

function readIntent(userId: string, scope: CheckoutIntentScope): StoredCheckoutIntent | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(userId, scope));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    const intent = value as Partial<StoredCheckoutIntent>;
    if (
      typeof value !== "object"
      || value === null
      || intent.version !== 1
      || intent.userId !== userId
      || intent.scope !== scope
      || typeof intent.key !== "string"
      || !UUID_PATTERN.test(intent.key)
      || typeof intent.requestIdentity !== "string"
      || (intent.orderCode !== null && typeof intent.orderCode !== "string")
      || typeof intent.completed !== "boolean"
    ) {
      return null;
    }
    return value as StoredCheckoutIntent;
  } catch {
    throw new CheckoutIntentStorageError();
  }
}

function writeIntent(intent: StoredCheckoutIntent): void {
  try {
    window.sessionStorage.setItem(
      storageKey(intent.userId, intent.scope),
      JSON.stringify(intent),
    );
  } catch {
    throw new CheckoutIntentStorageError();
  }
}

export function getOrCreateCheckoutIntent(
  userId: string,
  scope: CheckoutIntentScope,
  requestIdentity: string,
): ActiveCheckoutIntent {
  const existing = readIntent(userId, scope);
  if (existing && !existing.completed) {
    return {
      key: existing.key,
      orderCode: existing.orderCode,
      requestChanged: existing.requestIdentity !== requestIdentity,
    };
  }

  const intent: StoredCheckoutIntent = {
    version: 1,
    userId,
    scope,
    key: window.crypto.randomUUID(),
    requestIdentity,
    orderCode: null,
    completed: false,
  };
  writeIntent(intent);
  return { key: intent.key, orderCode: null, requestChanged: false };
}

export function associateCheckoutIntentOrder(
  userId: string,
  scope: CheckoutIntentScope,
  key: string,
  orderCode: string,
  completed: boolean,
): void {
  const intent = readIntent(userId, scope);
  if (!intent || intent.key !== key) throw new CheckoutIntentStorageError();
  writeIntent({ ...intent, orderCode, completed });
}

export function resetCheckoutIntent(userId: string, scope: CheckoutIntentScope): void {
  try {
    window.sessionStorage.removeItem(storageKey(userId, scope));
  } catch {
    throw new CheckoutIntentStorageError();
  }
}
