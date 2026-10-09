import type { DeliveryNoteData, DocumentIdentity } from "@/lib/print/document-types";
import PrintDocumentHeader from "@/components/print/PrintDocumentHeader";
import DocumentSignatures from "@/components/print/DocumentSignatures";

export default function PrintPackingSlip({ data, identity }: { data: DeliveryNoteData; identity: DocumentIdentity }) {
  const showSku = data.items.some((item) => Boolean(item.sku));
  return (
    <article className="print-document" aria-label="Surat Jalan">
      <PrintDocumentHeader identity={identity} title="SURAT JALAN" code={data.code} />
      <section className="document-info"><div><h3>Penerima</h3><p><strong>{data.recipient.name}</strong></p>
        {data.recipient.phone && <p>Telepon: {data.recipient.phone}</p>}{data.recipient.address && <p>{data.recipient.address}</p>}
      </div><dl><dt>Tanggal Pesanan</dt><dd>{data.orderDate}</dd>
        {data.courier && <><dt>Kurir</dt><dd>{data.courier}</dd></>}
        {data.trackingNumber && <><dt>Nomor Resi</dt><dd>{data.trackingNumber}</dd></>}
      </dl></section>
      <table className="document-table"><colgroup><col className="col-number" /><col />{showSku && <col className="col-sku" />}<col className="col-quantity" /><col className="col-description" /></colgroup><thead><tr>
        <th scope="col">No.</th><th scope="col">Produk</th>{showSku && <th scope="col">SKU</th>}
        <th scope="col" className="quantity">Qty</th><th scope="col">Keterangan</th>
      </tr></thead><tbody>{data.items.map((item, index) => <tr key={item.id}>
        <td className="number">{index + 1}</td><td>{item.name}</td>{showSku && <td>{item.sku ?? ""}</td>}
        <td className="quantity">{item.quantity}</td><td>{item.variantLabel ? `Varian: ${item.variantLabel}` : ""}</td>
      </tr>)}</tbody></table>
      {data.notes && <section className="document-notes"><h3>Catatan Pesanan</h3><p>{data.notes}</p></section>}
      <div className="document-closing"><section className="document-receipt"><p>Barang diterima dalam kondisi:</p><p><span className="receipt-box" aria-label="Kotak belum dicentang" />Baik</p>
        <p>Catatan:</p><div className="receipt-line" /><div className="receipt-line" />
      </section>
      <DocumentSignatures delivery />
      </div>
    </article>
  );
}
