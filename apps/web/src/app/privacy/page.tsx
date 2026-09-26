import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How postN collects, uses, and protects your data.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="September 26, 2026">
      <p className="text-[15px] leading-relaxed text-muted">
        This Privacy Policy explains how postN (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses,
        and protects your information when you use the Service. We keep it simple:
        we only collect what we need to run postN for you.
      </p>

      <LegalSection heading="1. Information we collect">
        <p>
          <strong className="text-foreground/80">Account data:</strong> your name,
          email address, and password (stored securely, hashed).
        </p>
        <p>
          <strong className="text-foreground/80">Connected accounts:</strong> access
          tokens for the social platforms you connect, used only to publish on your
          behalf.
        </p>
        <p>
          <strong className="text-foreground/80">Content:</strong> the posts, media,
          and schedules you create in postN.
        </p>
        <p>
          <strong className="text-foreground/80">Usage data:</strong> basic
          analytics to understand how the product is used and to improve it.
        </p>
      </LegalSection>

      <LegalSection heading="2. How we use your information">
        <p>
          We use your information to provide and improve the Service — composing,
          scheduling, and publishing your content, sending you notifications about
          publishes and failures, and keeping your account secure.
        </p>
      </LegalSection>

      <LegalSection heading="3. Social platform tokens">
        <p>
          Tokens for connected accounts are stored securely and used only to
          perform actions you request, such as publishing scheduled posts. You can
          revoke access at any time by disconnecting the account.
        </p>
      </LegalSection>

      <LegalSection heading="4. Data sharing">
        <p>
          We do not sell your personal data. We share data only with the
          third-party platforms you choose to connect (to publish your content) and
          with infrastructure providers that help us operate the Service.
        </p>
      </LegalSection>

      <LegalSection heading="5. Data retention">
        <p>
          We keep your data for as long as your account is active. You can delete
          your content or request account deletion, after which we remove your
          personal data except where retention is required by law.
        </p>
      </LegalSection>

      <LegalSection heading="6. Security">
        <p>
          We use reasonable technical and organizational measures to protect your
          data. No method of transmission or storage is completely secure, but we
          work to safeguard your information.
        </p>
      </LegalSection>

      <LegalSection heading="7. Your rights">
        <p>
          You can access, update, or delete your account information at any time.
          For any privacy request, contact us and we&rsquo;ll help.
        </p>
      </LegalSection>

      <LegalSection heading="8. Contact">
        <p>
          Questions about privacy? Email{" "}
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
