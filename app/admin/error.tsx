"use client";

import ErrorContent from "@/components/layout/ErrorContent";

export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorContent error={error} reset={retry} />;
}
