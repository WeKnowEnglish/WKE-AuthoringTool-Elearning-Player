import { formatStripeMoney } from "@/lib/billing/money";
import type { PaymentReviewItem } from "@/lib/data/payment-reviews";

export function PaymentReviewPanel(props: { items: PaymentReviewItem[] }) {
  if (props.items.length === 0) return null;
  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
      <h2 className="text-lg font-bold text-amber-950">Payments needing review</h2>
      <p className="mt-1 text-sm text-amber-900">
        Stripe reported a refund or dispute. Check lesson usage before adjusting a child&apos;s
        balance; credits are never removed automatically.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-amber-900">
            <tr>
              <th className="px-2 py-2">Student</th>
              <th className="px-2 py-2">Payment state</th>
              <th className="px-2 py-2">Refund</th>
              <th className="px-2 py-2">Purchased</th>
              <th className="px-2 py-2">Order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-200">
            {props.items.map((item) => (
              <tr key={item.orderId}>
                <td className="px-2 py-2 font-semibold text-amber-950">{item.studentName}</td>
                <td className="px-2 py-2 text-amber-900">
                  {item.disputeStatus ? `Dispute: ${item.disputeStatus}` : item.refundStatus}
                </td>
                <td className="px-2 py-2 text-amber-900">
                  {formatStripeMoney(item.refundedAmount, item.currency)}
                </td>
                <td className="px-2 py-2 text-amber-900">
                  {item.lessonCount} lessons · {formatStripeMoney(item.unitAmount * item.quantity, item.currency)}
                </td>
                <td className="px-2 py-2 font-mono text-xs text-amber-900">
                  {item.orderId.slice(0, 8)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
