import { COMPANY_SIGNATORY } from "@/lib/print/document-types";

export default function DocumentSignatures({ delivery = false }: { delivery?: boolean }) {
  return (
    <section className="document-signatures">
      <div><p>{delivery ? "Penerima," : "Tanda Terima,"}</p><div className="signature-space" />
        <p>( __________________________ )</p>
        {delivery ? <><p>Nama: ____________________</p><p>Tanggal: __________________</p></> : <p>Customer</p>}
      </div>
      <div><p>Hormat Kami,</p><div className="signature-space" /><p><strong>{COMPANY_SIGNATORY}</strong></p><p>PT Autentik Karya Analitika</p></div>
    </section>
  );
}
