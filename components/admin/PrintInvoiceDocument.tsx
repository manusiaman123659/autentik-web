import type { DocumentIdentity, InvoiceData } from "@/lib/print/document-types";
import { formatDocumentRupiah as formatRupiah } from "@/lib/print/money";
import PrintDocumentHeader from "@/components/print/PrintDocumentHeader";
import DocumentSignatures from "@/components/print/DocumentSignatures";

export default function PrintInvoiceDocument({ data, identity }: { data: InvoiceData; identity: DocumentIdentity }) {
  const showSku = data.items.some((item) => Boolean(item.sku));
  return (
    <article className="print-document" aria-label="Invoice">
      <PrintDocumentHeader identity={identity} title="INVOICE" code={data.code} />
      <section className="document-info">
        <div><h3>Pembeli</h3><p><strong>{data.customer.name}</strong></p>
          {data.customer.email && <p>Email: {data.customer.email}</p>}{data.customer.phone && <p>Telepon: {data.customer.phone}</p>}
          {data.customer.address && <><h3>Alamat Pengiriman</h3><p>{data.customer.address}</p></>}
        </div>
        <dl><dt>Tanggal Pesanan</dt><dd>{data.orderDate}</dd><dt>Status Pembayaran</dt><dd><strong>{data.paymentStatus}</strong></dd>
          {data.paymentMethod && <><dt>Metode Pembayaran</dt><dd>{data.paymentMethod}</dd></>}
        </dl>
      </section>
      <table className="document-table"><colgroup><col className="col-number" /><col />{showSku && <col className="col-sku" />}<col className="col-quantity" /><col className="col-money" /><col className="col-money" /></colgroup><thead><tr>
        <th scope="col">No.</th><th scope="col">Produk</th>{showSku && <th scope="col">SKU</th>}
        <th scope="col" className="quantity">Qty</th><th scope="col" className="money">Harga Satuan</th><th scope="col" className="money">Jumlah</th>
      </tr></thead><tbody>{data.items.map((item, index) => <tr key={item.id}>
        <td className="number">{index + 1}</td><td>{item.name}{item.variantLabel && <span className="variant">Varian: {item.variantLabel}</span>}</td>
        {showSku && <td>{item.sku ?? ""}</td>}<td className="quantity">{item.quantity}</td>
        <td className="money">{formatRupiah(item.unitPrice)}</td><td className="money">{formatRupiah(item.lineTotal)}</td>
      </tr>)}</tbody></table>
      <div className="document-closing"><section className="document-totals" aria-label="Ringkasan biaya"><dl>
        <dt>Subtotal</dt><dd>{formatRupiah(data.subtotal)}</dd><dt>Ongkos Kirim</dt><dd>{formatRupiah(data.shippingCost)}</dd>
        <dt className="total">TOTAL</dt><dd className="total">{formatRupiah(data.total)}</dd>
      </dl></section>
      {data.notes && <section className="document-notes"><h3>Catatan Pesanan</h3><p>{data.notes}</p></section>}
      {data.bankAccount && <section className="document-notes"><h3>Informasi Transfer Bank (Legacy)</h3>
        <p>{data.bankAccount.bankName} — a/n {data.bankAccount.accountHolder}</p><p>No. Rekening: {data.bankAccount.accountNumber}</p>
      </section>}
      <DocumentSignatures />
      </div>
    </article>
  );
}
