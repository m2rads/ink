import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/app/landing/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Privacy Policy · ${SITE.name}`,
  description: `What ${SITE.name} collects, why, and who processes it.`,
};

// The privacy policy: what is collected, what it is used for, and who
// processes it on our behalf. The processors listed are the ones the code
// calls (AGENTS.md: AI, Dictionary, Accounts and sync, Payments); add one
// here when one is added there.

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what information {SITE.legalName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects when you use {SITE.name},
        what we use it for, and who processes it on our behalf. We follow Canada&rsquo;s Personal Information Protection and Electronic
        Documents Act and the Personal Information Protection Act of British Columbia.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account.</strong> Your email address, and, if you sign in with Google, the name and profile picture Google shares
          with us. We use them to sign you in and to send you sign-in codes and messages about your account.
        </li>
        <li>
          <strong>Your writing.</strong> The essays you write, the reviews of them, and the categories of mistakes {SITE.name} remembers
          across your essays. They are stored so that your work is kept and available on each device you sign in on.
        </li>
        <li>
          <strong>Your use of the service.</strong> How many reviews and questions you have used, so that plan limits can be applied, and
          server logs of requests, kept for a short time to run and secure the service.
        </li>
        <li>
          <strong>Purchases.</strong> Which Exam Pass you bought, when, and a reference to the payment at Stripe. We never receive or
          store your card number.
        </li>
      </ul>
      <p>We do not collect your location, your contacts, or anything from other apps on your device.</p>

      <h2>What we use it for</h2>
      <p>
        To provide {SITE.name}: keeping your account and your essays, checking and reviewing your writing, answering your questions, looking
        words up, applying your plan&rsquo;s limits, and taking payment for passes. We also use it to answer your messages, to keep the
        service secure, and to meet legal obligations such as tax records. We do not sell personal information, and we do not use your
        essays to train artificial intelligence models.
      </p>

      <h2>Who processes it for us</h2>
      <p>
        We rely on service providers that process data on our behalf and under our instructions. Some of them are located outside Canada,
        including in the United States, where the laws that apply to your data may differ.
      </p>
      <ul>
        <li>
          <strong>Vercel</strong> hosts the service, and <strong>Neon</strong> hosts the database your account and essays are kept in.
        </li>
        <li>
          <strong>OpenAI</strong>, reached through Vercel&rsquo;s AI Gateway, produces reviews, checks your corrections, and answers the
          questions you ask while writing. The essay or the sentence concerned is sent for that purpose.
        </li>
        <li>
          <strong>Google Cloud Translation</strong> translates the words you look up and the text you select. Only those words are sent.
        </li>
        <li>
          <strong>Stripe</strong> processes payments and keeps the card details you enter on its pages.
        </li>
        <li>
          <strong>Resend</strong> delivers the emails we send you, such as sign-in codes.
        </li>
        <li>
          <strong>Google</strong>, if you choose to sign in with a Google account.
        </li>
      </ul>

      <h2>Cookies and storage on your device</h2>
      <p>
        We set one cookie, which keeps you signed in for up to 60 days. Your browser also keeps a local copy of your essays, your reviews
        and your settings, so that {SITE.name} works without waiting for the network. We do not use advertising cookies or trackers.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account and your writing for as long as you have an account. When you delete an essay, it is removed from your account
        and your devices. When you ask us to delete your account, we delete your data within 30 days, except records of purchases, which we
        keep for as long as tax and accounting law requires.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask us what personal information we hold about you, ask us to correct it, or ask us to delete it, by writing to{" "}
        <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>. We answer within 30 days. If you are not satisfied with our
        answer, you may complain to the Office of the Privacy Commissioner of Canada or to the Office of the Information and Privacy
        Commissioner for British Columbia.
      </p>

      <h2>Children</h2>
      <p>
        {SITE.name} is made for people preparing for a language examination and is not directed at children. You must be at least 16
        years old to use it, as the <Link href="/terms">Terms of Service</Link> state.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy. The date at the top shows when it last changed. If a change materially affects how we handle your
        information, we will tell you by email or in the service before it takes effect.
      </p>

      <h2>Contact</h2>
      <p>
        {SITE.legalName}, {SITE.location}. Email <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
      </p>
    </LegalPage>
  );
}
