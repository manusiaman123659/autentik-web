// Shared pure policy for API apply URLs, CMS input, and stored-setting reads.
// The destination is a fixed verified origin, not visitor/CMS/environment input.
const RECRUITMENT_ORIGIN = "https://recruitment.tekna.id";

export function getSafeRecruitmentUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.origin !== RECRUITMENT_ORIGIN) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
