import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms and conditions for using postN.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" updated="September 26, 2026">
      <p className="text-[15px] leading-relaxed text-muted">
        These Terms &amp; Conditions (&ldquo;Terms&rdquo;) govern your access to and use of
        postN (the &ldquo;Service&rdquo;). By creating an account or using the Service, you
        agree to these Terms. If you do not agree, please do not use the Service.
      </p>

      <LegalSection heading="1. Using postN">
        <p>
          postN lets you compose, schedule, and publish content to third-party
          social platforms such as LinkedIn, X, Telegram, Slack, Discord and
          Dev.to. You are responsible for the content you create and publish, and
          for complying with the terms of each connected platform.
        </p>
      </LegalSection>

      <LegalSection heading="2. Your account">
        <p>
          You must provide accurate information when registering and keep your
          login credentials secure. You are responsible for all activity that
          happens under your account. Notify us immediately of any unauthorized
          use.
        </p>
      </LegalSection>

      <LegalSection heading="3. Connected accounts">
        <p>
          When you connect a social account, you authorize postN to publish on
          your behalf using the permissions you grant. You can disconnect any
          account at any time. postN is not responsible for changes to third-party
          platform APIs or policies that affect publishing.
        </p>
      </LegalSection>

      <LegalSection heading="4. Acceptable use">
        <p>
          You agree not to use the Service to publish content that is unlawful,
          infringing, abusive, or that violates the rules of any connected
          platform. We may suspend accounts that violate these Terms.
        </p>
      </LegalSection>

      <LegalSection heading="5. Content ownership">
        <p>
          You retain all rights to the content you create. You grant postN a
          limited license to store and transmit your content solely to provide the
          Service, including scheduling and publishing.
        </p>
      </LegalSection>

      <LegalSection heading="6. Availability & changes">
        <p>
          We aim to keep the Service running reliably but do not guarantee
          uninterrupted availability. We may modify, suspend, or discontinue
          features, and we may update these Terms from time to time. Continued use
          after changes means you accept the updated Terms.
        </p>
      </LegalSection>

      <LegalSection heading="7. Limitation of liability">
        <p>
          The Service is provided &ldquo;as is&rdquo; without warranties of any kind. To the
          maximum extent permitted by law, postN is not liable for any indirect or
          consequential damages arising from your use of the Service.
        </p>
      </LegalSection>

      <LegalSection heading="8. Contact">
        <p>
          For any questions about these Terms, reach out at{" "}
          <a
            href="mailto:nilamadhab47@gmail.com"
            className="font-semibold text-foreground/80 hover:text-accent"
          >
            nilamadhab47@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
