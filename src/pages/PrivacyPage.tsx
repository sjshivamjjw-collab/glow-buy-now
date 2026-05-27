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
      <li><strong>Account information:</strong> mobile number, name, username, profile photo (avatar), and optional details like date of birth and city.</li>
      <li><strong>Content you create:</strong> posts, photos, videos, comments, likes, follows, and live chat messages.</li>
      <li><strong>Usage data:</strong> what you view, search, save, and how you interact with content and creators.</li>
      <li><strong>Device data:</strong> basic device and browser information needed to operate the Service.</li>
    </ul>

    <h2>2. How We Use Information</h2>
    <ul>
      <li>To create and manage your account and verify your identity via OTP.</li>
      <li>To show you relevant posts, livestreams, and communities.</li>
      <li>To operate notifications, search, and messaging features.</li>
      <li>To prevent fraud and abuse, enforce our Terms, and comply with law.</li>
      <li>To improve and secure the Service.</li>
    </ul>

    <h2>3. Third-Party Services</h2>
    <p>We share information only as needed to operate Ripple, including with:</p>
    <ul>
      <li><strong>Twilio</strong> — sending OTPs to your mobile number.</li>
      <li><strong>100ms</strong> — powering live video broadcasts.</li>
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
      <li>Delete your account and associated personal data from Settings, or by contacting us.</li>
      <li>Withdraw consent or object to specific processing where applicable.</li>
    </ul>

    <h2>6. Retention</h2>
    <p>
      We retain your content while your account is active. When you delete
      your account, we remove your personal profile data and may retain
      limited records as required by law.
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
