import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Type scale · Ink",
};

const uiSteps = [
  { token: "text-caption", size: "12px", use: "Counts, timestamps, keyboard hints", sample: "4 of 13 resolved · 34:12" },
  { token: "text-label", size: "13px", use: "Chips, note headers, app bar meta", sample: "Prepositions 4 · Agreement 4" },
  { token: "text-ui", size: "14px", use: "Buttons, note explanations, dense controls", sample: "The verb dépendre always takes de." },
  { token: "text-body", size: "16px", use: "Default interface text, form inputs", sample: "Paste an essay you’ve already written to start." },
  { token: "text-title", size: "18px", use: "Rule titles in notes, card headings", sample: "Il faut que + subjunctive" },
  { token: "text-heading", size: "24px", use: "Page headings", sample: "Your essays" },
  { token: "text-display", size: "32px", use: "Empty states, onboarding", sample: "Write your first essay" },
];

export default function TypeSpecimen() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
      <p className="eyebrow opacity-60">Design system</p>
      <h1 className="text-heading mt-2">Type scale</h1>
      <p className="text-body mt-2 max-w-prose opacity-70">
        Inter for the interface, Literata for the essay. Every size in the app
        comes from one of these steps.
      </p>

      <section className="mt-14">
        <h2 className="eyebrow opacity-60">Interface · Inter</h2>
        <div className="mt-4 divide-y divide-current/10 border-y border-current/10">
          {uiSteps.map((step) => (
            <div
              key={step.token}
              className="grid gap-2 py-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-8"
            >
              <div className="text-caption opacity-60">
                <code className="font-medium opacity-100">{step.token}</code>
                <div className="tabular-nums">{step.size}</div>
                <div>{step.use}</div>
              </div>
              <p className={step.token}>{step.sample}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14" lang="fr">
        <h2 className="eyebrow opacity-60" lang="en">
          Essay · Literata
        </h2>
        <div className="mt-4 grid gap-2 border-y border-current/10 py-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-8">
          <div className="text-caption opacity-60" lang="en">
            <code className="font-medium opacity-100">text-essay-title</code>
            <div className="tabular-nums">28px</div>
            <div>The essay prompt</div>
          </div>
          <h3 className="font-serif text-essay-title">
            Le télétravail devrait-il devenir la norme&#8239;?
          </h3>
        </div>
        <div className="grid gap-2 border-b border-current/10 py-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-8">
          <div className="text-caption opacity-60" lang="en">
            <code className="font-medium opacity-100">text-essay</code>
            <div className="tabular-nums">17px → 19px</div>
            <div>Essay body, capped at 65ch</div>
          </div>
          <div className="font-serif text-essay max-w-prose space-y-[1.7em]">
            <p>
              Selon certains, le télétravail devrait devenir la norme pour tous
              les employés. Je ne suis pas complètement d’accord. Bien sûr,
              travailler <em>à la maison</em> a des avantages, mais tout dépend
              du type de travail.
            </p>
            <p>
              Premièrement, beaucoup de personnes se sentent seules quand elles
              travaillent à distance. Il faut que les employés puissent voir
              leurs collègues en personne pour construire la confiance. Œuvre,
              cœur, «&#8239;guillemets&#8239;», ç, é, è, ê, ë, à, â, î, ï, ô, ù, û.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
