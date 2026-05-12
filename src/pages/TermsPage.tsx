import LegalPageLayout from '@/components/LegalPageLayout';

const TermsPage = () => (
  <LegalPageLayout title="Terms of Service">
    <p>
      Welcome to Ripple ("we", "us", "our"). By creating an account or using the
      Ripple application and website (the "Service"), you agree to these Terms
      of Service. Please read them carefully.
    </p>

    <h2>1. Eligibility & Accounts</h2>
    <p>
      You must be at least 18 years old and capable of entering a binding
      contract under Indian law to use Ripple. You agree to provide accurate
      information when creating your account, including a valid mobile number
      for OTP verification, and to keep that information up to date.
    </p>

    <h2>2. Buyers</h2>
    <ul>
      <li>You agree to pay the full listed price (including any applicable taxes and shipping) for items you order.</li>
      <li>You agree to provide accurate shipping information.</li>
      <li>Cash on Delivery (COD) orders must be accepted at delivery; repeated refusal may result in account suspension.</li>
    </ul>

    <h2>3. Sellers</h2>
    <ul>
      <li>Sellers must be approved through our seller application process before listing products or going live.</li>
      <li>Sellers are solely responsible for their listings, product quality, descriptions, pricing, inventory, dispatch, and after-sales service.</li>
      <li>Sellers must comply with all applicable Indian laws, including GST, consumer protection, and labelling requirements.</li>
      <li>Sellers must dispatch paid orders within the timelines stated on their listings.</li>
    </ul>

    <h2>4. Prohibited Items & Conduct</h2>
    <p>You may not list, sell, promote, or transact in:</p>
    <ul>
      <li>Items prohibited or restricted under Indian law (including weapons, narcotics, counterfeit goods, hazardous materials, and regulated medical products).</li>
      <li>Adult content, hate speech, harassment, or content that infringes intellectual property rights.</li>
      <li>Misleading claims, fake reviews, or manipulated stock/price information.</li>
    </ul>

    <h2>5. Livestream Conduct</h2>
    <p>
      Live broadcasts and chat messages must be respectful and lawful. We reserve
      the right to terminate streams, remove messages, or suspend accounts that
      violate these standards.
    </p>

    <h2>6. Payments</h2>
    <p>
      Online payments are processed by Razorpay. By making an online payment you
      also agree to Razorpay's terms. COD is available on eligible orders subject
      to a per-order limit set by Ripple.
    </p>

    <h2>7. Intellectual Property</h2>
    <p>
      The Ripple name, logo, and platform are owned by us. Content uploaded by
      sellers remains theirs, but they grant Ripple a non-exclusive licence to
      display, distribute, and promote that content within the Service.
    </p>

    <h2>8. Disclaimers & Liability</h2>
    <p>
      The Service is provided "as is" without warranties of any kind. To the
      maximum extent permitted by law, Ripple is not liable for indirect,
      incidental, or consequential damages arising from your use of the Service.
      We are an intermediary between buyers and sellers and are not the seller
      of record.
    </p>

    <h2>9. Termination</h2>
    <p>
      We may suspend or terminate your account at any time for breach of these
      terms or applicable law.
    </p>

    <h2>10. Governing Law</h2>
    <p>
      These terms are governed by the laws of India. Any disputes are subject to
      the exclusive jurisdiction of the courts at Mumbai, Maharashtra.
    </p>

    <h2>11. Contact</h2>
    <p>
      For questions about these terms, see our <a href="/contact">Contact Us</a> page.
    </p>
  </LegalPageLayout>
);

export default TermsPage;
