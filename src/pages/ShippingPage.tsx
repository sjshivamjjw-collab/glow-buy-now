import LegalPageLayout from '@/components/LegalPageLayout';

const ShippingPage = () => (
  <LegalPageLayout title="Shipping Policy">
    <p>
      Ripple connects buyers with independent sellers across India. Shipping
      is fulfilled by the seller of each order. This policy sets the general
      expectations.
    </p>

    <h2>1. Serviceable Areas</h2>
    <p>
      Ripple currently ships within India. Some pin codes may be unavailable
      depending on the seller's logistics partner.
    </p>

    <h2>2. Dispatch Timeline</h2>
    <ul>
      <li>Sellers are expected to dispatch paid orders within <strong>1–3 business days</strong> of order confirmation, unless a different timeline is specified on the listing.</li>
      <li>Made-to-order or pre-order items will display a longer dispatch window on the listing.</li>
    </ul>

    <h2>3. Delivery Timeline</h2>
    <ul>
      <li>Standard delivery typically takes <strong>3–10 business days</strong> from dispatch, depending on your location and the courier partner.</li>
      <li>Remote and north-east India destinations may take longer.</li>
    </ul>

    <h2>4. Shipping Charges</h2>
    <p>
      Any applicable shipping charge is shown at checkout before you place the
      order. Some sellers may offer free shipping above a minimum order value.
    </p>

    <h2>5. Tracking</h2>
    <p>
      Once your order is dispatched, the seller will share tracking details via
      the app's order page and notifications.
    </p>

    <h2>6. Failed or Undelivered Packages</h2>
    <ul>
      <li>If a package is returned to the seller because the address was incorrect or the buyer was unreachable, re-shipping may incur an additional charge.</li>
      <li>Cash on Delivery refusals at the doorstep without a valid reason may lead to account restrictions.</li>
    </ul>

    <h2>7. Damaged Packages</h2>
    <p>
      If your package arrives visibly damaged, please refuse delivery if
      possible and contact us within 48 hours with photos. See our
      <a href="/refunds"> Refunds & Cancellations</a> policy for next steps.
    </p>

    <h2>8. Contact</h2>
    <p>
      For shipping questions, see our <a href="/contact">Contact Us</a> page.
    </p>
  </LegalPageLayout>
);

export default ShippingPage;
