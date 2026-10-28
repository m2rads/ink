# LLM essay feedback and rubric-based evaluation for L2 writing (TEF/TCF, CEFR B1–C1)

Scope note: research done 2026-10-27 with web search and fetches, about 18 tool calls. Several sources (arXiv PDFs, ScienceDirect, MDPI) could not be read in full: the PDFs came back as binary and the publisher pages returned 403. Where a finding comes only from a search-result snippet or an abstract and not the paper body, it is marked **[snippet]**. Study sizes and languages are given wherever the source stated them.

## 1. How well do LLM scores agree with human raters on L2 essays, where do they fail, and what improves agreement?

### Takeaway
Prompted general-purpose LLMs (zero-shot or few-shot, GPT-4 through GPT-5 / Claude Sonnet 4.5) usually agree with human raters less well than fine-tuned models. They are weakest on analytic criteria (coherence, cohesion, richness) and at the high end of the scale (B2–C2). Fine-tuning a model on rated essays from the same exam reliably brings agreement up to or above human–human levels. Among prompting techniques, graded example essays ("calibration" or "anchors") have the most consistent support. Chain-of-thought and rubric text in the prompt help in some studies and not in others. Every LLM scorer needs a first-language (L1) bias audit.

### Cited Findings
**Holistic CEFR scoring with prompted GPT-4 (English, Duolingo):**
- Yancey, LaFlair, Verardi & Burstein (Duolingo), BEA 2023, "Rating Short L2 Essays on the CEFR Scale with GPT-4". They scored short Duolingo English Test essays with GPT-3.5 and GPT-4. With calibration examples, GPT-4 came close to modern AWE (automated writing evaluation) methods, but its agreement with humans varied by the test-taker's first language. — [ACL Anthology 2023.bea-1.49](https://aclanthology.org/2023.bea-1.49) **[abstract]**
- A later paper summarizes the same study this way: GPT-4's few-shot QWK "did not surpass" the XGBoost baseline or the human annotators. — [arXiv 2401.06431 (Human-AI Collaborative Essay Scoring)](https://arxiv.org/pdf/2401.06431) **[snippet]**
- Bannò, Vydana, Knill & Gales (Cambridge), BEA 2024, "Can GPT-4 do L2 analytic assessment?". This was zero-shot GPT-4 on a public dataset that has only holistic CEFR scores. GPT-4's analytic sub-scores correlated significantly with features tied to each proficiency component, but there were no human analytic gold scores to compare against. — [arXiv 2404.18557](https://arxiv.org/abs/2404.18557)

**Prompting vs. fine-tuning:**
- Per a review: GPT-3.5 fine-tuned on a single prompt reached QWK 0.78, "substantially outperforming" zero-shot GPT-3.5 and GPT-4 under the same conditions. Many-shot Gemini 1.5 Flash reached QWK 0.82 on an English argumentative essay set (not L2 data). — [search summary of AES literature](https://arxiv.org/pdf/2506.21603) **[snippet; underlying studies not verified]**
- A common rule of thumb: QWK of about 0.70 is the usual threshold for a reliable operational scorer. — [arXiv 2506.21603](https://arxiv.org/pdf/2506.21603) **[snippet]**
- Azurmendi, Arregi & Lopez de Lacalle (UPV/EHU), arXiv 2512.08713 v2 (March 2026): Basque, 3,200 HABE C1 certification essays (about 334 words on average), 300 in the test split, five analytic criteria (correctness, richness, coherence, cohesion, task alignment), each graded A–E. Results on correctness (QWK ×100):
  - Supervised fine-tuned (SFT) Latxa 70B: 57.23
  - 1-shot Latxa 70B: 21.37
  - 1-shot Claude Sonnet 4.5: 18.93
  - 1-shot GPT-5: 17.59
  - The fine-tuned RoBERTa encoder scored 43.82 on correctness but only 9.27 on coherence, 19.71 on cohesion, 18.31 on richness and 17.85 on task alignment, so the discourse-level criteria were hard even for a fine-tuned encoder.
  - Source: [arXiv 2512.08713](https://arxiv.org/html/2512.08713v2)
- Gayed (Waseda), arXiv 2607.14605 (July 2026): Gemma-3-27B with a LoRA adapter, fine-tuned on only 480 ETS essays, tested on all of TOEFL11 (12,100 essays, 11 L1s, 8 prompts it never saw):
  - QWK 0.702, exact band agreement 77.8%, adjacent 99.98%.
  - Per-prompt QWK ranged 0.677–0.730, and prompt type made no significant difference (p = .290).
  - Source: [arXiv 2607.14605](https://arxiv.org/html/2607.14605v1)

**L1 bias (robust: found independently in 2023 and 2026):**
- Duolingo 2023: GPT-4's agreement with humans varied by L1. — [ACL Anthology](https://aclanthology.org/2023.bea-1.49)
- Gayed 2026: within every proficiency band, essays by European-L1 writers scored higher than essays by East-Asian-L1 writers (+0.21 / +0.33 / +0.30 by band). German writers were offset +0.55; Japanese and Korean −0.34. The author recommends L1-disaggregated fairness audits before operational use. — [arXiv 2607.14605](https://arxiv.org/html/2607.14605v1)

**Prompting techniques (mixed evidence):**
- AIME-Con 2025 work-in-progress paper (Gemini 2.5 Flash and Claude Sonnet 4): "context-enhanced few-shot chain-of-thought" prompting substantially improved agreement, "approaching PEG" (a commercial AES engine) and human–human agreement. — [ACL Anthology 2025.aimecon-wip.9](https://aclanthology.org/2025.aimecon-wip.9.pdf) **[snippet]**
- medRxiv 2026 preprint (medical student reflection essays, not L2), 29 prompt–model conditions:
  - Prompts with exemplars were significantly more accurate than prompts without, and the gain was largest when no rubric was given.
  - Chain-of-thought showed no clear benefit (its confidence interval spanned zero).
  - Source: [medRxiv 2026.03.20.26348918](https://www.medrxiv.org/content/10.64898/2026.03.20.26348918v1.full.pdf) **[snippet]**
- A student-journal write-up reports that adding rubric criteria lowered DeepSeek-R1's accuracy from 37.6% to 29.8%. Low-quality source; it shows only that a rubric in the prompt is not guaranteed to help. — [NHSJS 2026](https://nhsjs.com/2026/prompt-design-for-llm-essay-scoring-from-rubrics-to-calibration/) **[snippet]**
- A 2026 Computers & Education: AI paper is titled "LLMs do not grade essays like humans" and reports weak agreement with human raters that depends on prompt design. The full text could not be read. — [ScienceDirect S2666920X26001281](https://www.sciencedirect.com/science/article/pii/S2666920X26001281) **[title/snippet]**
- Pairwise comparison as an alternative to absolute scoring: LCES, zero-shot AES via pairwise comparisons (EMNLP 2025). — [ACL Anthology 2025.emnlp-main.1523](https://aclanthology.org/2025.emnlp-main.1523.pdf) **[title only]**
- Per a search summary, GPT-4 had the highest agreement among four LLMs (GPT-4, GPT-3.5, PaLM 2, Claude 2) on English-learner writing, but its scores were unstable over time (they drifted across runs and dates). — [search result, Pack et al.-type study](https://www.sciencedirect.com/science/article/abs/pii/S1075293525000698) **[snippet; exact paper not confirmed]**

**Where scorers fail (criteria and levels):**
- French TCF (Wilkens et al. 2026, fine-tuned CamemBERT):
  - Models do best at A1/A2 and get worse from B1 up; about 56% of C2 essays were classed as C1.
  - "Occurrence of errors" was the feature most correlated with the gold level (ρ = −0.79), and model residuals tracked lexical errors, so scorers lean heavily on error counts.
  - Source: [arXiv 2606.02009](https://arxiv.org/html/2606.02009v1)
- Basque C1 (above): coherence, cohesion and task-alignment QWKs stayed under 0.20 even for a fine-tuned encoder. — [arXiv 2512.08713](https://arxiv.org/html/2512.08713v2)

### Inferences
- **Score estimates:** for a TEF/TCF CEFR estimate (an open question in Ink's AGENTS.md), a prompted frontier model should be expected to be roughly reliable only within ±1 level ("adjacent"), not exact. Exact agreement even between two human TCF raters is low (κ ≈ 0.4; see section 3).
- **Graded anchors are the best-supported cheap lever.** Put a few real graded essays per CEFR band in the prompt, ideally with their rationales. Criterion-by-criterion scoring makes sense for feedback structure, but the evidence that it *raises agreement* is thin, and the discourse criteria (cohérence, cohésion, adéquation à la tâche) are where every system is weakest.
- **Fine-tuning is the robust route to human-level agreement**, but only with a few hundred to thousands of rated essays from the target exam. Ink does not have those.
- **Error counts can stand in for the grade.** Scorers that lean on error counts may inflate grades for short, safe essays and undervalue ambitious B2–C1 writing. This matters for TEF Section B (argumentation), where task and argument quality carry weight.
- **Repeat runs:** because scores drift over time, re-scoring the same essay several times (self-consistency) and reporting the median or a range is a sensible guard. No source found measured self-consistency for L2 scoring specifically.

### Gaps
- Exact QWK numbers for Yancey et al. 2023 and for Mizumoto & Eguchi 2023 (GPT-3 on TOEFL11). The PDFs could not be read, so no numbers are reported here.
- No study found that isolates the effect of a *reasoning model* or reasoning effort on L2 essay scoring agreement.
- No head-to-head study on L2 data of multi-pass or self-consistency voting for *scoring* (there is one for GEC; see section 2).
- The 2026 "LLMs do not grade essays like humans" paper and the MDPI scoping review could not be read in full (403).

## 2. Do LLMs over-correct learner text? What makes feedback help learners revise?

### Takeaway
Robust finding, replicated across English, Chinese, Portuguese, Ukrainian and other languages from 2023 to 2026: LLMs over-correct learner text. They have high recall, lower precision, and add extraneous fluency rewrites. They are weakest on lexical and phrasal replacements, and good on spelling, determiners and orthography. Precision can be raised substantially with explicit minimal-edit instructions, a defined error scope, few-shot examples, larger context per request, and edit-level majority voting across samples. On feedback, the evidence is mostly small studies, but it agrees: learners take up concrete local corrections, often ignore meaning-level comments, and reject generic explanations.

### Cited Findings
**Over-correction (robust):**
- Davis, Caines, Andersen, … Bryant, Rei & Buttery (Cambridge), arXiv 2401.07702 (v2, 2025). Ten LLMs were tested on English learner text with minimal-edit benchmarks (CoNLL-14, FCE, W&I+LOCNESS) and a fluency benchmark (JFLEG).
  - GPT models "have a tendency to over-correct and make extraneous fluency edits". They were strong on JFLEG and weaker on minimal-edit benchmarks.
  - Best LLM vs. state of the art (F0.5): FCE test 0.463 vs 0.626; CoNLL-14 0.572 vs 0.696.
  - On FCE dev, GPT-4 had P 0.473 and R 0.477, i.e. more than half of its edits did not match a reference edit.
  - By error type, LLMs did well on spelling (GPT-3.5 0.769) and missing determiners (0.620), and poorly on noun replacement (0.261), verb replacement (0.253) and "other" (0.175).
  - Source: [arXiv 2401.07702](https://arxiv.org/html/2401.07702)
- Chinese learner GEC (PLOS ONE 2024): GPT-4 produces fewer under-corrections but more over-corrections than traditional models. — [PLOS ONE 10.1371/journal.pone.0312881](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0312881) **[snippet]**
- Same pattern in Brazilian Portuguese: GPT-4 had higher recall, lower precision, and over-corrected. — [arXiv 2306.15788](https://arxiv.org/pdf/2306.15788) **[snippet]**

**Fixes that raise precision:**
- Karpo & Chernodub, EMNLP 2026 Findings (arXiv 2609.10810), English (BEA-2019, CoNLL-14):
  - A minimal-edit constraint raised F0.5 for most models but cut recall; few-shot examples recovered some recall.
  - Adding the 25-category ERRANT error taxonomy to the prompt helped only the strongest models (Claude Opus 4.6, Gemini 3.1-Pro) and hurt the others.
  - **Batching** about 15 sentences per request made outputs more conservative, raising precision and lowering recall.
  - Best result: Gemini 3.1-Pro with an optimized prompt at batch 15, P 82.29 / R 65.66 / F0.5 78.32, only 0.38 below the best fine-tuned single model (Gemma 2 27B, 78.70).
  - Prompts optimized for one model transferred poorly to other models.
  - Source: [arXiv 2609.10810](https://arxiv.org/html/2609.10810)
- Ukrainian minimal-edit GEC (2026): a minimal-edit prompt raised precision sharply (+8–21 points across models) with modest change in recall. A long tail of borderline corrections likely needs fine-tuning. — [arXiv 2606.09334](https://arxiv.org/html/2606.09334) **[snippet]**
- BEA 2026, "Instruction-Following LLMs for GEC": a minimal-edit instruction curbs over-editing and usually boosts precision. — [ACL Anthology 2026.bea-1.17](https://aclanthology.org/2026.bea-1.17.pdf) **[snippet]**
- Goto, Sakai & Watanabe, BEA 2026 (arXiv 2605.13624):
  - Over-correction persists "even with carefully designed prompts and few-shot examples".
  - Their training-free fix: sample several corrections from one model and keep only the edits a majority agree on.
  - It beat greedy decoding and MBR decoding on most of 9 benchmarks in 7 languages (English, Czech, German, Ukrainian, Korean, Hindi, Romanian), and gave stable quality whichever instruction prompt was used.
  - Source: [arXiv 2605.13624](https://arxiv.org/abs/2605.13624) (abstract; snippet for the prompt claim from the [PDF](https://arxiv.org/pdf/2605.13624))

**Feedback quality and learner uptake (mostly small studies):**
- Steiss et al. 2024, *Learning and Instruction*: 200 history essays, grades 6–12 (native English, not L2), rated by 16 trained expert evaluators.
  - Human feedback scored 4.0 and ChatGPT 3.6 on a 5-point quality scale.
  - Humans were better at recommending a next step suited to the student's development; ChatGPT was slightly better on feedback about reasoning and evidence.
  - Source: [KQED MindShift](https://www.kqed.org/mindshift/63901/writing-researcher-finds-ai-feedback-better-than-i-thought); [Hechinger Report](https://hechingerreport.org/proof-points-writing-ai-feedback/) (secondary coverage; the paper was not accessed)
- L2 scoping review (MDPI *Education Sciences* 2026, vol. 16 no. 8): about **86% uptake for surface-level ChatGPT feedback vs about 32% for meaning-level feedback** (organization, logic, ideas). Organization feedback led to no revision in over a third of cases. — [MDPI 2227-7102/16/8/1196](https://www.mdpi.com/2227-7102/16/8/1196) **[snippet; the underlying primary study was not identified]**
- Chen, Wei, Zhu & Yao (SAGE, 2026), on why L2 students reject ChatGPT feedback: generic explanations of errors led learners to fail to revise; the feedback was not personalized to proficiency level. — [SAGE 10.1177/20965311241305140](https://journals.sagepub.com/doi/full/10.1177/20965311241305140) **[snippet]**
- Multiple-case study (4 L2 writers, *Humanities & Social Sciences Communications* 2024): higher-proficiency learners engaged more deeply; lower-proficiency learners mostly made surface revisions. — [Nature HSSC s41599-024-03543-y](https://www.nature.com/articles/s41599-024-03543-y) **[snippet]**
- Students rate grammar and vocabulary feedback as easier to understand and apply, and improved more in those areas (Springer *Education and Information Technologies* 2025). — [Springer 10.1007/s10639-025-13775-3](https://link.springer.com/article/10.1007/s10639-025-13775-3) **[snippet]**
- Other studies observed over-revision driven by ChatGPT's rewritten texts, and confusion when students asked follow-up questions with their own prompts. — [ScienceDirect S0346251X25002477 (System, 2025)](https://www.sciencedirect.com/science/article/abs/pii/S0346251X25002477); [Assessing Writing 2026, S1075293526000085](https://www.sciencedirect.com/science/article/abs/pii/S1075293526000085) **[snippets]**

### Inferences
- **Over-correction is the main known risk for Ink's correction loop.** The evidence supports Ink's precision-over-recall stance: in GEC the standard metric is F0.5, which weights precision, for this reason.
- **Cheap precision levers that apply directly to `lib/ai/check.ts`:**
  1. State a closed error scope and minimal edits ("flag only clear errors in these categories; do not rewrite for style").
  2. Send the whole essay at once rather than sentence by sentence (the batching result suggests more context means fewer over-corrections).
  3. Run 2–3 samples and keep only mistakes that a majority flags with the same quoted words (edit-level voting). This costs extra tokens but is training-free and robust to prompt choice.
- **Error types:** LLMs are weakest on lexical and phrasal replacements, and "other" or catch-all errors. Notes in Ink's lexical categories, if any are added, deserve lower trust than Spelling, Agreement or Conjugation.
- **Feedback design:** uptake is highest for concrete, local, rule-based fixes, the kind Ink's in-place loop handles, and low for meaning-level comments. If Ink adds organization or argument feedback for Section B, it should be concrete and anchored to a paragraph, with a specific next step, not a general comment.
- **Proficiency:** generic explanations get rejected. Notes should name the specific rule as it applies to the writer's own words, at the writer's level.
- **Ink's design already points this way:** having the learner rewrite the mistake (rather than reading a corrected text) is the design choice the over-revision and passive-uptake findings argue for. No study found tests that exact loop.

### Gaps
- No study found that measures false-positive rates of LLM feedback specifically on **French** learner text.
- No controlled study found of learners *self-correcting in place, with AI re-checking the fix* vs. receiving corrections. This is the closest analogue to Ink's core loop, and it appears unstudied for LLMs.
- The 86% / 32% uptake figures come from a review snippet; the primary study, its size and its L2 were not confirmed.
- Specificity and actionability rubrics for AI feedback exist (e.g. "Consistently Good vs. Occasionally Great: A Rubric for Open-Ended Feedback Quality", [arXiv 2608.21850](https://arxiv.org/pdf/2608.21850)), but only the title was seen.

## 3. Studies specific to French as a foreign language, or to TEF/TCF/DELF/DALF

### Takeaway
The only substantial French work found is on the **TCF**, from France Éducation International (FEI, which runs the TCF) and UCLouvain. It uses *fine-tuned CamemBERT*, not prompted LLMs. It reports QWK 0.89–0.92 against human ratings, which equals or beats a single human rater on a heavily multi-rated set. Human exact agreement on TCF essays is itself low. No study was found on LLM scoring or feedback for TEF, DELF or DALF.

### Cited Findings
- Wilkens, Cardon, Folny (FEI) & François (UCLouvain), arXiv 2606.02009 (June 2026), "Automated Essay Scoring and Language Certification: Assessing Generalizability, Agreement and Validity for French":
  - Data: 27,683 TCF essays (from 450k raw), 852 prompts, more than 164 languages of use, two raters each (sometimes three). A generalization set of 961 essays had 9–55 raters each.
  - Human inter-rater agreement on the core set: **κ ≈ 0.4, QWK ≈ 0.83**.
  - Best model (soft-labelling CamemBERT):
    - Core set: QWK 0.89, κ 0.50, exact 0.60, adjacent 0.99.
    - Generalization set: QWK 0.92, exact 0.67, adjacent 0.99, vs a single human rater's QWK 0.88 and exact 0.59.
  - No LLM prompting was tested.
  - Accuracy falls from B1 up (about 56% of C2 essays labelled C1), and scores lean on error occurrence (ρ = −0.79 with the gold level).
  - No overall L1, gender or task bias was found.
  - Caveat: the paper's Table 2 rater row does not match its text (κ 0.70 / exact 0.75 in the table).
  - Source: [arXiv 2606.02009](https://arxiv.org/html/2606.02009v1)
- TCFLE-8 (EMNLP 2023): about 6.5k TCF learner essays, each with at least two CEFR ratings; essay-level gold is built from rater agreement because the TCF assigns levels to candidates, not essays. CamemBERT AES followed in Wilkens et al. 2023 and Muñoz Sánchez et al. 2024. — [ACL Anthology 2023.emnlp-main.210](https://aclanthology.org/2023.emnlp-main.210.pdf); [ResearchGate](https://www.researchgate.net/publication/376404133_TCFLE-8_a_Corpus_of_Learner_Written_Productions_for_French_as_a_Foreign_Language_and_its_Application_to_Automated_Essay_Scoring) **[snippet]**
- A 2026 Learner Corpus Research conference abstract, "Assessing CEFR proficiency of learner writing using LLMs: Testing prompts and models", may cover multiple languages; it was not read. — [LCR 2026 abstract PDF](https://lcr2026.ff.cuni.cz/wp-content/uploads/sites/140/2026/07/082_Assessing_CEFR_proficiency_of_learner_writing_using_LLMs_Testing_prompts_and_mod.pdf) **[title only]**
- Closest analogue in another language: Basque C1 certification essays (HABE). Prompted GPT-5 and Claude Sonnet 4.5 reached correctness QWK under 0.20, vs 0.57 for a fine-tuned 70B open model. — [arXiv 2512.08713](https://arxiv.org/html/2512.08713v2)

### Inferences
- **Benchmarks for an Ink score estimate:** TCF human raters agree exactly only around 60% of the time and adjacently about 99%. A realistic target for Ink is "adjacent CEFR level about 95%+, exact about 50–60%". Anything presented to the user should be a band or range, not a precise NCLC/CEFR.
- **The TCF corpora are not public** (the FEI data is proprietary), so Ink cannot fine-tune on real TEF/TCF graded essays without a partnership or collecting its own rated set.
- **The C1/C2 ceiling problem** (models under-rate top essays) is directly relevant to TEF candidates aiming for NCLC 7–9 (about B2–C1).

### Gaps
- Nothing found on TEF (CCIP / Le français des affaires) Expression écrite and AI scoring, or on DELF/DALF.
- No French learner GEC benchmark was found with LLM over-correction numbers. The MultiGEC-2025 languages listed in Goto et al. do not include French.
- No published TEF rubric-to-LLM alignment study.

## 4. How to build a small evaluation set and metrics to compare prompt/model variants

### Takeaway
Compare variants on two separate things:
- **Flagged mistakes:** precision first. Measure the share of flags that are real errors, quote-fidelity, and category accuracy, judged by native or expert annotators. Use F0.5 if reference corrections exist.
- **Scores:** QWK plus exact and adjacent agreement, measured against the human–human ceiling on the same essays, and broken down by CEFR band and by L1.

Use several raters per essay where possible: two raters understate model quality, and single runs hide instability.

### Cited Findings
- **Error-flag evaluation protocol** (Basque C1 study): native-speaker annotators checked each extracted error example for:
  - Fidelity Rate: the quoted sentence exists in the essay.
  - Extraction Accuracy: the sentence really contains an error.
  - Categorization Accuracy: the error type is right.
  - GPT-5 scored FR 100 / EA 81.9 / CA 82.5; Claude Sonnet 4.5 98.8 / 72.5 / 78.6; fine-tuned Latxa 70B 98.1 / 66.2 / 71.6.
  - Annotator agreement fell from 95.7% on the first question to 68.1% on the last, so judging category accuracy is itself hard.
  - Source: [arXiv 2512.08713](https://arxiv.org/html/2512.08713v2)
- **Feedback–score consistency** (same study): a scorer predicts the grade from the feedback text alone, and that prediction is compared to the gold score. Fine-tuned models scored 94–97 QWK; GPT-5 only 44, meaning its feedback did not reflect its grade. — [arXiv 2512.08713](https://arxiv.org/html/2512.08713v2)
- **GEC metrics:** F0.5 (precision-weighted) is standard, with ERRANT error categories. Results vary by model, prompt and batch size, so test on your own dev data. The authors note single runs per configuration as a limitation. — [arXiv 2609.10810](https://arxiv.org/html/2609.10810); [arXiv 2401.07702](https://arxiv.org/html/2401.07702)
- **Multi-rater gold changes conclusions:** with only two raters, models looked worse than humans. On essays with 9–55 raters, models matched or beat individual humans on every measure. — [arXiv 2606.02009](https://arxiv.org/html/2606.02009v1)
- **Report κ, QWK, exact and adjacent together.** On TCF, QWK 0.83 sat alongside κ of only about 0.4 for humans, so QWK alone flatters ordinal agreement. — [arXiv 2606.02009](https://arxiv.org/html/2606.02009v1)
- **Fairness slices:** report agreement per L1 group and per proficiency band; the L1 offsets were directional and consistent. — [arXiv 2607.14605](https://arxiv.org/html/2607.14605v1)
- **Feedback quality by human rating:** Steiss et al. used 16 trained expert raters (3 hours of training) scoring feedback on a 5-point scale across criteria such as criterion alignment and next-step guidance. — [KQED MindShift](https://www.kqed.org/mindshift/63901/writing-researcher-finds-ai-feedback-better-than-i-thought) (secondary)
- **Rubric wording itself shifts human–autorater agreement**, so rubric edits should be evaluated like prompt edits: "Quantifying the Statistical Effect of Rubric Modifications on Human-Autorater Agreement" (2026). — [arXiv 2605.06283](https://arxiv.org/pdf/2605.06283) **[title only]**

### Inferences
A concrete plan for Ink, built from the above:
1. **Collect 30–60 real essays** from TEF candidates, covering Sections A and B and B1–C1, with several L1s. Include some essays that are fully correct or near-correct, to measure false flags on correct French. That is the open question in AGENTS.md.
2. **Gold for mistakes:** two French-native annotators (FLE teachers if possible) mark every error span and category independently; then adjudicate. Measure their agreement to know the ceiling.
3. **Per-variant metrics for `checkEssay`:**
   - Precision (flags that annotators accept as real errors)
   - False-flag rate on correct sentences
   - Recall against the adjudicated gold
   - F0.5
   - Quote-fidelity (Ink already drops unanchored quotes; log the drop rate)
   - Category accuracy (Prepositions / Agreement / Conjugation / Spelling)
   - Correctness of the suggested answer
4. **Stability:** run each variant at least 3 times on the set and report the spread, and the overlap between runs (a proxy for whether majority voting would help).
5. **Fix-judging (`judgeFix`):** a separate small set of learner rewrites (right, wrong, alternative-correct), measuring false accepts vs false rejects. A wrong reject of a correct alternative is the costlier error here, by analogy with over-correction.
6. **If scores are added:** compare against at least 2–3 human CEFR/NCLC ratings per essay; report exact / adjacent / QWK / κ alongside human–human values, broken down by band (watch B2+) and L1.
7. **Human preference:** blind pairwise comparison of two variants' notes on the same mistake, judged on specificity and on whether a learner could fix the mistake from the note alone. This is cheaper and more reliable than absolute 5-point ratings.
8. Ink's existing `ai.check` / `ai.fix` JSON log lines (arm, model, mistakes, dropped quotes) already support step 3 if the gold labels are joined on.

### Gaps
- No published protocol was found specifically for evaluating *in-place self-correction loops* (learner rewrites, then AI re-check).
- No guidance found on the minimum essay count needed to distinguish two prompt variants statistically for flag precision; this would need a power calculation on pilot data.
- No validated LLM-as-judge for French L2 feedback quality was found. Using an LLM to grade another LLM's flags is unvalidated here and should be checked against human labels first.
