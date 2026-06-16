import LegalPageLayout from '@/components/LegalPageLayout';

const AboutPage = () => (
  <LegalPageLayout
    title="About Ripple"
    seoTitle="About Ripple — a social app for real, everyday moments"
    seoDescription="Ripple is a mobile-first community built in India for sharing genuine recommendations, reviews, travel diaries and the little moments of everyday life."
  >
    <p>
      Ripple is a mobile-first community where people share the everyday
      things worth sharing — genuine recommendations, honest reviews, travel
      diaries, food spots, and the little moments from real life.
    </p>

    <h2>What we do</h2>
    <ul>
      <li>Help people discover places, products, and experiences through the voices of real users — not faceless algorithms.</li>
      <li>Give creators tools to post, go live, build communities, and connect with people who share their interests.</li>
      <li>Keep the experience simple, mobile-first, and focused on authentic content.</li>
    </ul>

    <h2>How it works</h2>
    <ul>
      <li><strong>Members</strong> sign in with their phone number, follow people and topics they care about, and join the conversation.</li>
      <li><strong>Creators</strong> share posts, go live, and grow communities around the things they love.</li>
    </ul>

    <h2>Where we are</h2>
    <p>
      We're based in India. Want to chat? Visit our <a href="/contact">Contact Us</a> page.
    </p>
  </LegalPageLayout>
);

export default AboutPage;
