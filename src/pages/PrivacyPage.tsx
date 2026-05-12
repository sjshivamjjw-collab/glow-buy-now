import LegalPageLayout from '@/components/LegalPageLayout';

const PrivacyPage = () => (
  <LegalPageLayout title="Privacy Policy">
    <p>
      This Privacy Policy explains what information Ripple collects, how we
      use it, and the choices you have. By using Ripple you agree to this
      policy.
    </p>

    <h2>1. Information We Collect</h2>
    <ul>
      <li><strong>Account information:</strong> mobile number, name, profile photo (avatar), and selected role (shopper/seller).</li>
      <li><strong>Seller information:</strong> store name, bio, categories, and seller application details.</li>
      <li><strong>Order information:</strong> items ordered, quantities, prices, shipping address, contact phone, and payment method.</li>
      <li><strong>Usage data:</strong> livestream viewing, chat messages, follows, ratings, and notifications.</li>
      <li><strong>Device data:</strong> basic device and browser information needed to operate the Service.</li>
    </ul>

    <h2>2. How We Use Information</h2>
    <ul>
      <li>To create and manage your account and verify your identity via OTP.</li>
      <li>To process orders, payments, shipping, and refunds.</li>
      <li>To operate livestreams, chat, search, and notifications.</li>
      <li>To prevent fraud, enforce our Terms, and comply with law.</li>
      <li>To improve and secure the Service.</li>
    </ul>

    <h2>3. Third-Party Services</h2>
    <p>We share information only as needed to operate Ripple, including with:</p>
    <ul>
      <li><strong>Twilio</strong> — sending OTPs to your mobile number.</li>
      <li><strong>Razorpay</strong> — processing online payments.</li>
      <li><strong>Sellers</strong> — your name, shipping address, and order details for the orders you place with them.</li>
      <li><strong>Cloud infrastructure providers</strong> — for secure hosting, database, and file storage.</li>
    </ul>
    <p>We do not sell your personal information.</p>

    <h2>4. Data Storage & Security</h2>
    <p>
      Your data is stored on managed cloud infrastructure with encryption in
      transit. Access is restricted using row-level security and role-based
      access controls. No system can be guaranteed 100% secure, but we apply
      reasonable safeguards.
    </p>

    <h2>5. Your Rights</h2>
    <ul>
      <li>Access, correct, or update your profile from the app.</li>
      <li>Request deletion of your account and associated personal data by contacting us.</li>
      <li>Withdraw consent or object to specific processing where applicable.</li>
    </ul>

    <h2>6. Retention</h2>
    <p>
      We retain order and transaction records for as long as required by Indian
      tax and consumer-protection laws. Other data is retained while your
      account is active and for a reasonable period thereafter.
    </p>

    <h2>7. Children</h2>
    <p>Ripple is not directed to anyone under 18.</p>

    <h2>8. Changes</h2>
    <p>
      We may update this policy. Material changes will be notified within the
      app. Continued use after changes means you accept the updated policy.
    </p>

    <h2>9. Contact</h2>
    <p>
      For privacy questions or data requests, see our <a href="/contact">Contact Us</a> page.
    </p>
  </LegalPageLayout>
);

export default PrivacyPage;
