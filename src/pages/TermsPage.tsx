import LegalPageLayout from '@/components/LegalPageLayout';

const TermsPage = () => (
  <LegalPageLayout title="Terms of Service">
    <p>
      Welcome to Ripple ("we", "us", "our"). By creating an account or using
      the Ripple application and website (the "Service"), you agree to these
      Terms of Service. Please read them carefully.
    </p>

    <h2>1. Eligibility & Accounts</h2>
    <p>
      You must be at least 18 years old and capable of entering a binding
      contract under Indian law to use Ripple. You agree to provide accurate
      information when creating your account, including a valid mobile number
      for OTP verification, and to keep that information up to date.
    </p>

    <h2>2. Your Content</h2>
    <ul>
      <li>You retain ownership of the posts, photos, videos, comments, and other content you share on Ripple.</li>
      <li>You grant Ripple a non-exclusive, worldwide licence to host, display, distribute, and promote your content within the Service.</li>
      <li>You are responsible for the content you post and must have all necessary rights to share it.</li>
    </ul>

    <h2>3. Community Guidelines</h2>
    <p>You may not post, share, or promote:</p>
    <ul>
      <li>Hate speech, harassment, threats, or content that targets people based on identity.</li>
      <li>Sexually explicit content, graphic violence, or content that endangers minors.</li>
      <li>Spam, misleading claims, impersonation, or content that infringes intellectual property.</li>
      <li>Content that promotes illegal activity or violates Indian law.</li>
    </ul>

    <h2>4. Livestream & Chat Conduct</h2>
    <p>
      Live broadcasts, comments, and chat messages must be respectful and lawful.
      We reserve the right to end streams, remove content, or suspend accounts
      that violate these standards.
    </p>

    <h2>5. Intellectual Property</h2>
    <p>
      The Ripple name, logo, and platform are owned by us. Content uploaded by
      users remains theirs, subject to the licence in Section 2.
    </p>

    <h2>6. Disclaimers & Liability</h2>
    <p>
      The Service is provided "as is" without warranties of any kind. To the
      maximum extent permitted by law, Ripple is not liable for indirect,
      incidental, or consequential damages arising from your use of the Service.
      Ripple is a platform for sharing content; we do not endorse user-posted
      recommendations, reviews, or opinions.
    </p>

    <h2>7. Termination</h2>
    <p>
      We may suspend or terminate your account at any time for breach of these
      terms or applicable law. You may delete your account from Settings at any
      time.
    </p>

    <h2>8. Governing Law</h2>
    <p>
      These terms are governed by the laws of India. Any disputes are subject
      to the exclusive jurisdiction of the courts at Mumbai, Maharashtra.
    </p>

    <h2>9. Contact</h2>
    <p>
      For questions about these terms, see our <a href="/contact">Contact Us</a> page.
    </p>
  </LegalPageLayout>
);

export default TermsPage;
