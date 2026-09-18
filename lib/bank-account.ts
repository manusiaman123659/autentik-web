export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export function parseBankAccount(value: unknown): BankAccount | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const bankName = typeof record.bankName === "string" ? record.bankName.trim() : "";
  const accountNumber = typeof record.accountNumber === "string" ? record.accountNumber.trim() : "";
  const accountHolder = typeof record.accountHolder === "string" ? record.accountHolder.trim() : "";
  if (!bankName && !accountNumber && !accountHolder) return null;
  return { bankName, accountNumber, accountHolder };
}
