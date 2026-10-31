import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/app/landing/legal-page";
import { formatPrice, PLANS } from "@/lib/plans";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Terms of Service · ${SITE.name}`,
  description: `The terms on which ${SITE.legalName} provides ${SITE.name}.`,
};

// The terms: plain English, one obligation per paragraph. Prices and quotas
// come from lib/plans.ts so this page never disagrees with checkout.

export default function TermsPage() {
  const free = PLANS.free;
  const month = PLANS.pass_1m;
  const quarter = PLANS.pass_3m;
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms govern your use of {SITE.name}, the French writing service at {SITE.domain} and in the {SITE.name} apps. {SITE.name} is
        provided by {SITE.legalName}, a corporation registered in {SITE.jurisdiction} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an
        account or using the service, you agree to these terms. If you do not agree, do not use the service.
      </p>

      <h2>1. The service</h2>
      <p>
        {SITE.name} is a writing editor for people preparing for the written part of the TEF (Test d&rsquo;évaluation de français). It lets
        you write essays, look words up, check grammar, and receive a review of your writing produced with artificial intelligence, with an
        estimate of your level and suggestions for improving it.
      </p>
      <p>
        {SITE.name} is an independent product. It is not affiliated with, endorsed by, or connected to the organisations that own, run or
        accept the TEF, including Le français des affaires, the CCI Paris Île-de-France, or Immigration, Refugees and Citizenship Canada.
      </p>

      <h2>2. Your account</h2>
      <p>
        You need an account to use {SITE.name}. You sign in with an email address, by a code we send you, or with a Google account. You are
        responsible for keeping access to that email address and for what is done through your account. You must be at least 16 years old
        to use the service.
      </p>

      <h2>3. Your writing</h2>
      <p>
        The essays you write belong to you. You grant us the right to store, process and display them only as needed to provide the
        service: to keep them in your account across your devices, to check them, to review them, and to show you what you have written. We
        do not use your essays to train artificial intelligence models, and we do not sell them.
      </p>
      <p>
        To review an essay, answer a question, or look a word up, we send the relevant text to the service providers named in our{" "}
        <Link href="/privacy">Privacy Policy</Link>. They process it on our behalf and under our instructions.
      </p>

      <h2>4. Reviews and estimates</h2>
      <p>
        Reviews, level estimates, grammar underlines, translations and suggested wordings are produced automatically and can be wrong.
        They are an aid for your practice, not an official assessment, and they do not predict the result of any examination. You remain
        responsible for your own writing and for how you prepare.
      </p>

      <h2>5. Plans, prices and payment</h2>
      <p>
        The free plan includes {free.reviews} reviews and {free.asks} questions per calendar month. An Exam Pass adds {month.reviews}{" "}
        reviews and {month.asks} questions for every 30 days of its term: the 1-month pass ({formatPrice(month.price!)}) lasts{" "}
        {month.days} days and the 3-month pass ({formatPrice(quarter.price!)}) lasts {quarter.days} days from the day it starts. A pass
        bought while another one is running starts when that one ends. Unused reviews and questions do not carry over.
      </p>
      <p>
        Prices are in Canadian dollars. Where tax applies, it is added at checkout and shown before you pay. A pass is paid once; it does
        not renew, and nothing is charged again without a new purchase by you. We may change prices for future purchases; a change never
        affects a pass you have already bought.
      </p>
      <p>
        Payments are processed by Stripe. Your card details are entered on Stripe&rsquo;s pages and never reach our servers. Stripe&rsquo;s
        own terms apply to the processing of your payment.
      </p>
      <p>
        Refunds are described in our <Link href="/refunds">Refund Policy</Link>, which forms part of these terms.
      </p>

      <h2>6. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the service to break the law or to infringe someone else&rsquo;s rights;</li>
        <li>submit text that is unlawful, abusive, or that you have no right to submit;</li>
        <li>attempt to gain access to accounts, data or systems that are not yours, or to interfere with the service;</li>
        <li>use automated means to make requests to the service beyond ordinary personal use, or to resell access to it.</li>
      </ul>
      <p>We may suspend or close an account that breaks these rules.</p>

      <h2>7. Availability and changes</h2>
      <p>
        We work to keep {SITE.name} available, but we do not promise that it will be uninterrupted or free of errors. We may change or
        remove features, and we may discontinue the service. If we discontinue it while you hold an Exam Pass, we will refund the unused
        part of the pass in proportion to the days remaining.
      </p>

      <h2>8. Ending your account</h2>
      <p>
        You may stop using the service at any time and ask us to delete your account by writing to{" "}
        <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>. We may close your account if you break these terms. Closing an
        account does not by itself entitle you to a refund except as the Refund Policy provides.
      </p>

      <h2>9. Liability</h2>
      <p>
        The service is provided as it is. To the extent the law allows, we exclude all warranties not stated in these terms, and we are not
        liable for indirect or consequential loss, or for any loss arising from reliance on a review, an estimate or a suggestion. Our total
        liability to you for any claim connected with the service is limited to the amount you paid us in the twelve months before the
        claim arose. Nothing in these terms limits liability that cannot be limited under the law that applies to you, including consumer
        protection law in your province or country.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These terms are governed by the laws of {SITE.jurisdiction}, and the federal laws of Canada that apply there. Disputes are subject
        to the courts of British Columbia, except where consumer protection law gives you the right to bring a claim where you live.
      </p>

      <h2>11. Changes to these terms</h2>
      <p>
        We may update these terms. The date at the top shows when they last changed. If a change materially affects your rights, we will
        tell you by email or in the service before it takes effect. Using the service after a change takes effect means you accept the
        updated terms.
      </p>

      <h2>12. Contact</h2>
      <p>
        {SITE.legalName}, {SITE.location}. Email <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
      </p>
    </LegalPage>
  );
}
