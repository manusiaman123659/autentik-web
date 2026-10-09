"use client";

import Image from "next/image";
import { useState } from "react";

export default function PortfolioImage({ src, alt, caption }: { src: string; alt: string; caption: string | null }) {
  const [failed, setFailed] = useState(false);
  return <figure className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border-subtle)" }}>
    {failed ? <p className="p-5 text-sm">Gambar tidak tersedia.</p> :
      <Image src={src} alt={alt} width={2000} height={1125} className="h-auto w-full" onError={() => setFailed(true)} />}
    {caption && <figcaption className="px-5 py-4 text-xs">{caption}</figcaption>}
  </figure>;
}
