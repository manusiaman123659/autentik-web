"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";

export default function PrintDocumentControls({ backHref }: { backHref: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const print = async () => {
    setBusy(true); setError("");
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      await Promise.all(Array.from(document.querySelectorAll<HTMLImageElement>(".print-document img")).map(async (image) => {
        if (image.decode) await image.decode();
        else if (!image.complete) await new Promise<void>((resolve, reject) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => reject(new Error("Logo unavailable")), { once: true });
          if (image.complete) {
            if (image.naturalWidth) resolve();
            else reject(new Error("Logo unavailable"));
          }
        });
        if (!image.naturalWidth) throw new Error("Logo unavailable");
      }));
      window.print();
    } catch {
      setError("Logo atau font belum dapat dimuat. Muat ulang halaman sebelum mencetak.");
    } finally { setBusy(false); }
  };
  return (
    <div className="print-toolbar">
      <div className="print-toolbar-actions"><Link href={backHref}><ArrowLeft size={16} />Kembali</Link>
        <button type="button" onClick={print} disabled={busy}><Printer size={16} />{busy ? "Menyiapkan dokumen…" : "Cetak / Simpan PDF"}</button>
      </div>
      <p>Jika browser menampilkan URL/tanggal pada hasil cetak, nonaktifkan opsi Header dan footer pada dialog cetak.</p>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
