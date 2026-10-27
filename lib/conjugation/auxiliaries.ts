import type { Verb } from "./types";

// Être and avoir, written out by hand: compose.ts builds every compound tense
// from them, on the client, so they ship with the page (a few hundred bytes).

export const [ÊTRE, AVOIR]: [Verb, Verb] = [
  {
    inf: "être",
    group: "Irregular",
    aux: "avoir",
    participePresent: "étant",
    participePasse: "été",
    simple: {
      present: ["suis", "es", "est", "sommes", "êtes", "sont"],
      imparfait: ["étais", "étais", "était", "étions", "étiez", "étaient"],
      passeSimple: ["fus", "fus", "fut", "fûmes", "fûtes", "furent"],
      futur: ["serai", "seras", "sera", "serons", "serez", "seront"],
      conditionnel: ["serais", "serais", "serait", "serions", "seriez", "seraient"],
      subjonctif: ["sois", "sois", "soit", "soyons", "soyez", "soient"],
    },
    imperatif: ["sois", "soyons", "soyez"],
  },
  {
    inf: "avoir",
    group: "Irregular",
    aux: "avoir",
    participePresent: "ayant",
    participePasse: "eu",
    simple: {
      present: ["ai", "as", "a", "avons", "avez", "ont"],
      imparfait: ["avais", "avais", "avait", "avions", "aviez", "avaient"],
      passeSimple: ["eus", "eus", "eut", "eûmes", "eûtes", "eurent"],
      futur: ["aurai", "auras", "aura", "aurons", "aurez", "auront"],
      conditionnel: ["aurais", "aurais", "aurait", "aurions", "auriez", "auraient"],
      subjonctif: ["aie", "aies", "ait", "ayons", "ayez", "aient"],
    },
    imperatif: ["aie", "ayons", "ayez"],
  },
];
