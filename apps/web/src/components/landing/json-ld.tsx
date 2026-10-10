import { CONTACT_EMAIL, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL, WAITLIST_MODE } from "@/lib/site";
import { FAQS } from "@/lib/faqs";
import { STUDIO_MONTHLY_INR } from "@/lib/pricing";

export function JsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: SITE_DESCRIPTION,
        slogan: SITE_TAGLINE,
        inLanguage: "en-IN",
        offers: {
          "@type": "AggregateOffer",
          lowPrice: "0",
          highPrice: String(STUDIO_MONTHLY_INR),
          priceCurrency: "INR",
          offerCount: "4",
          availability: WAITLIST_MODE
            ? "https://schema.org/PreOrder"
            : "https://schema.org/InStock",
        },
        featureList: [
          "Schedule posts in your timezone",
          "Publish to LinkedIn, X, Telegram, Slack, Discord, Dev.to, Newsletter and more",
          "LinkedIn first comment",
          "Newsletter via your Resend audience",
          "AI drafts with Claude",
          "Per-channel live preview",
          "Reliable queue with retries",
        ],
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#org`,
        name: SITE_NAME,
        url: SITE_URL,
        email: CONTACT_EMAIL,
        logo: `${SITE_URL}/icon.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#org` },
        inLanguage: "en-IN",
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: FAQS.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
