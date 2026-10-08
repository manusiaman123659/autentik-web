import Image from "next/image";
import type { DocumentIdentity } from "@/lib/print/document-types";

export default function PrintDocumentHeader({ identity, title, code }: { identity: DocumentIdentity; title: string; code: string }) {
  return (
    <>
      <header className="document-letterhead">
        <Image src={identity.logoPath} alt="Logo PT Autentik Karya Analitika" width={120} height={120}
          unoptimized loading="eager" className="document-logo" />
        <div className="document-company">
          <h1>{identity.companyName}</h1>
          <p>{identity.address}</p><p>{identity.email}</p>
          {identity.phone && <p>{identity.phone}</p>}
        </div>
      </header>
      <section className="document-title"><h2>{title}</h2><p>Kode Pesanan: <strong>{code}</strong></p></section>
    </>
  );
}
