import LegalPageLayout from '@/components/LegalPageLayout';

const AboutPage = () => (
  <LegalPageLayout title="About Ripple">
    <p>
      Ripple is a mobile-first live commerce marketplace built for India.
      Sellers go live, show their products in real time, answer buyer questions
      in chat, and accept orders on the spot — with secure online payments via
      Razorpay or Cash on Delivery.
    </p>

    <h2>What we do</h2>
    <ul>
      <li>Help independent sellers reach buyers through livestream-driven shopping.</li>
      <li>Give shoppers a fun, interactive way to discover products from real people, not faceless catalogues.</li>
      <li>Handle the logistics of authentication, ordering, payments, and notifications so sellers can focus on selling.</li>
    </ul>

    <h2>How it works</h2>
    <ul>
      <li><strong>Shoppers</strong> sign in with their phone number, browse live and upcoming streams, and buy in one tap.</li>
      <li><strong>Sellers</strong> apply to become a seller, list products with sizes and stock, and go live whenever they're ready.</li>
      <li><strong>Payments</strong> are processed securely via Razorpay, with Cash on Delivery available on eligible orders.</li>
    </ul>

    <h2>Where we are</h2>
    <p>
      We're based in India and currently ship across India. Want to chat?
      Visit our <a href="/contact">Contact Us</a> page.
    </p>
  </LegalPageLayout>
);

export default AboutPage;
