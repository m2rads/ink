import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/app/landing/legal-page";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Refund Policy · ${SITE.name}`,
  description: `When and how ${SITE.name} refunds an Exam Pass.`,
};

// The refund policy. The rule matches what the code does (lib/billing.ts):
// a full refund revokes the pass at once, which is why refunds are whole,
// not partial, and why a refunded pass ends immediately. The 14-day window
// and the review count are the policy's own terms; change them here and in
// AGENTS.md together.

const DAYS = 14;
const REVIEWS = 5;

export default function RefundsPage() {
  return (
    <LegalPage title="Refund Policy">
      <p>
        This policy applies to Exam Passes sold by {SITE.legalName} on {SITE.domain}, and forms part of our{" "}
        <Link href="/terms">Terms of Service</Link>.
      </p>

      <h2>What you buy</h2>
      <p>
        An Exam Pass is a one-time purchase. It is paid once, it does not renew, and it ends on its own at the end of its term. There is
        nothing to cancel: no further payment is ever taken without a new purchase by you. Your pass starts as soon as the payment is
        confirmed, or, if you already hold a pass, when that pass ends.
      </p>

      <h2>When we refund</h2>
      <p>
        If you ask within {DAYS} days of the purchase and have used {REVIEWS} reviews or fewer on the pass, we refund the purchase in full.
        That covers a pass bought by mistake, bought twice, or that turns out not to be what you needed.
      </p>
      <p>
        After {DAYS} days, or once more than {REVIEWS} reviews have been used, the pass is considered used and is not refundable, except
        where the law that applies to you gives you a right to a refund, or where the service was unavailable for a material part of the
        pass&rsquo;s term, in which case we refund in proportion to the days affected.
      </p>
      <p>Refunds are whole: we do not refund part of a pass. A refunded pass ends immediately.</p>

      <h2>How to ask</h2>
      <p>
        Email <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a> from the address of your account, and tell us which pass
        you mean. We answer within 3 business days. You do not need to give a reason.
      </p>

      <h2>How you are repaid</h2>
      <p>
        Refunds are returned to the card or payment method used for the purchase, through Stripe, our payment processor. The money usually
        appears within 5 to 10 business days of our confirmation, depending on your bank. Any tax charged is refunded with the purchase.
      </p>

      <h2>Problems with a payment</h2>
      <p>
        If a charge looks wrong to you, write to us first: most problems are resolved the same day. If you dispute a charge with your bank
        instead, the pass is withdrawn while the dispute is open.
      </p>

      <h2>Contact</h2>
      <p>
        {SITE.legalName}, {SITE.location}. Email <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>.
      </p>
    </LegalPage>
  );
}
