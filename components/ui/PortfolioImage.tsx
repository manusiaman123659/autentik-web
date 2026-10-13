"use client";

import Image from "next/image";
import { useState } from "react";

export default function PortfolioImage({ src, alt, caption, failureLabel = "Gambar tidak tersedia." }: { src: string; alt: string; caption: string | null; failureLabel?: string }) {
  const [failed, setFailed] = useState(false);
  return <figure className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border-subtle)" }}>
    {failed ? <p role="status" className="p-5 text-sm">{failureLabel}</p> :
      <Image src={src} alt={alt} width={2000} height={1125} className="h-auto w-full" onError={() => setFailed(true)} />}
    {caption && <figcaption className="px-5 py-4 text-xs">{caption}</figcaption>}
  </figure>;
}
