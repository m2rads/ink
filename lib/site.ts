// Who sells Ink, and how to reach us: the facts the landing page's footer
// and the legal pages state (Terms, Privacy, Refunds). Card networks and
// Stripe's review look for them on the site: the legal name and country of
// the seller, a working contact, and the policies. One place, so the pages
// never disagree.

export const SITE = {
  /** The product's name, as the pages and the wordmark say it. */
  name: "Ink",
  domain: "tryencre.com",
  url: "https://www.tryencre.com",
  /** The seller: the corporation that takes payment. */
  legalName: "Rad Atelier Inc.",
  /** Where the seller is, for the footer and the policies. */
  location: "Vancouver, British Columbia, Canada",
  jurisdiction: "British Columbia, Canada",
  supportEmail: "support@tryencre.com",
  /** When the legal pages last changed; each page shows it. */
  policiesUpdated: "October 30, 2026",
} as const;
