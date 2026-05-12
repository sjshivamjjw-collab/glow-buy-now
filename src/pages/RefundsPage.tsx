import LegalPageLayout from '@/components/LegalPageLayout';

const RefundsPage = () => (
  <LegalPageLayout title="Refunds & Cancellations">
    <p>
      We want you to shop with confidence on Ripple. This policy explains when
      you can cancel an order and how refunds are processed.
    </p>

    <h2>1. Order Cancellation</h2>
    <ul>
      <li>You may cancel an order free of charge any time before it has been marked as shipped by the seller.</li>
      <li>Once an order is shipped, cancellation is not possible — you may instead request a return upon delivery, subject to the seller's return terms.</li>
      <li>To cancel, go to <strong>Orders</strong> in the app and choose <em>Cancel</em> on the eligible order, or contact us.</li>
    </ul>

    <h2>2. Refund Eligibility</h2>
    <p>You are eligible for a refund if:</p>
    <ul>
      <li>You cancelled a paid order before it was shipped.</li>
      <li>The item delivered is damaged, defective, or significantly different from its listing — reported within 48 hours of delivery with photo evidence.</li>
      <li>The seller failed to dispatch within the stated timeline and you choose to cancel.</li>
    </ul>

    <h2>3. Non-Refundable Situations</h2>
    <ul>
      <li>Buyer's remorse after the item has been dispatched.</li>
      <li>Items damaged due to misuse after delivery.</li>
      <li>Items returned without prior approval.</li>
      <li>Cash on Delivery orders that were refused at delivery without a valid reason — repeated occurrences may also lead to account restrictions.</li>
    </ul>

    <h2>4. Refund Method & Timeline</h2>
    <ul>
      <li><strong>Online payments (Razorpay):</strong> refunded to the original payment method, typically within <strong>5–7 business days</strong> after approval.</li>
      <li><strong>Cash on Delivery:</strong> refunds are issued via bank transfer or UPI to the account you nominate; please allow up to 7 business days after we receive your bank details.</li>
    </ul>

    <h2>5. How to Request a Refund</h2>
    <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
      <li>Open the order in the <strong>Orders</strong> tab.</li>
      <li>Tap <em>Request refund</em> and describe the issue. Attach photos for damaged or wrong items.</li>
      <li>You will receive a response within 2 business days.</li>
    </ol>

    <h2>6. Contact</h2>
    <p>
      For help with a refund, see our <a href="/contact">Contact Us</a> page.
    </p>
  </LegalPageLayout>
);

export default RefundsPage;
