import type { CustomerProofData, DocumentIdentity } from "@/lib/print/document-types";
import { formatDocumentRupiah as formatRupiah } from "@/lib/print/money";
import PrintDocumentHeader from "@/components/print/PrintDocumentHeader";

export default function PrintCustomerInvoice({ data, identity }: { data: CustomerProofData; identity: DocumentIdentity }) {
  return (
    <article className="print-document" aria-label="Bukti Pesanan">
      <PrintDocumentHeader identity={identity} title="BUKTI PESANAN" code={data.code} />
      <section className="document-info"><div><h3>Customer</h3><p><strong>{data.customer.name}</strong></p>
        {data.customer.address && <><h3>Alamat Pengiriman</h3><p>{data.customer.address}</p></>}
      </div><dl><dt>Tanggal Pesanan</dt><dd>{data.orderDate}</dd><dt>Status Pesanan</dt><dd>{data.orderStatus}</dd>
        <dt>Status Pembayaran</dt><dd><span className={data.paymentStatus === "Lunas" ? "document-paid" : undefined}>{data.paymentStatus}</span></dd>
      </dl></section>
      <table className="document-table"><colgroup><col className="col-number" /><col /><col className="col-quantity" /><col className="col-money" /><col className="col-money" /></colgroup><thead><tr><th scope="col">No.</th><th scope="col">Produk</th>
        <th scope="col" className="quantity">Qty</th><th scope="col" className="money">Harga Satuan</th><th scope="col" className="money">Jumlah</th>
      </tr></thead><tbody>{data.items.map((item, index) => <tr key={item.id}>
        <td className="number">{index + 1}</td><td>{item.name}{item.variantLabel && <span className="variant">Varian: {item.variantLabel}</span>}</td>
        <td className="quantity">{item.quantity}</td><td className="money">{formatRupiah(item.unitPrice)}</td><td className="money">{formatRupiah(item.lineTotal)}</td>
      </tr>)}</tbody></table>
      <div className="document-closing"><section className="document-totals" aria-label="Ringkasan biaya"><dl>
        <dt>Subtotal</dt><dd>{formatRupiah(data.subtotal)}</dd><dt>Ongkos Kirim</dt><dd>{formatRupiah(data.shippingCost)}</dd>
        <dt className="total">TOTAL</dt><dd className="total">{formatRupiah(data.total)}</dd>
      </dl></section>
      <footer className="document-footer"><p>Dokumen ini merupakan bukti pesanan yang dibuat melalui website PT Autentik Karya Analitika.</p><p>Dicetak: {data.printedAt}</p></footer>
      </div>
    </article>
  );
}
