# Citation test data: five real sources

Use this file to test the citation features by hand. Every quote is copied word for word from the PubMed abstract of the paper it names. The Q&A under each quote uses only that quote.

Put each block into Researchie as one clip in one project. There are no sub-projects.

---

## Clip 1: vaccine safety and efficacy (journal article, DOI)

**Clip text:**

> BNT162b2 is a lipid nanoparticle-formulated, nucleoside-modified RNA vaccine that encodes a prefusion stabilized, membrane-anchored SARS-CoV-2 full-length spike protein.

**Source:** Safety and Efficacy of the BNT162b2 mRNA Covid-19 Vaccine. N Engl J Med. 2021;383(27):2603-2615.
**URL:** https://doi.org/10.1056/NEJMoa2034577
**DOI:** 10.1056/NEJMoa2034577
**PMID:** 33301246

**Q:** What is BNT162b2?
**A:** A lipid nanoparticle-formulated, nucleoside-modified RNA vaccine. It encodes the SARS-CoV-2 full-length spike protein.

**What to check:** "Get citation" with the DOI should return a verified DOI record. The Vancouver line should show the journal and the volume, issue and pages.

---

## Clip 2: gut microbiome and depression (review, DOI)

**Clip text:**

> Dysbiosis is involved in the pathogenesis of depression while, at the same time, offering a novel therapeutic target.

**Source:** Gut microbiota and its metabolites in depression: from pathogenesis to treatment. EBioMedicine. 2023;90:104527.
**URL:** https://doi.org/10.1016/j.ebiom.2023.104527
**DOI:** 10.1016/j.ebiom.2023.104527
**PMID:** 36963238

**Q:** According to this clip, what role does dysbiosis play in depression?
**A:** It is involved in how depression develops. It also points to a new treatment target.

**What to check:** the source is a review article. The record should say journal article, and the issue field is empty in PubMed, so the output should show it as incomplete rather than guessing.

---

## Clip 3: heat and heart disease (systematic review, DOI)

**Clip text:**

> Heat exposure is an important but underappreciated risk factor contributing to cardiovascular disease.

**Source:** Heat exposure and cardiovascular health outcomes: a systematic review and meta-analysis. Lancet Planet Health. 2022;6(6):e484-e495.
**URL:** https://doi.org/10.1016/S2542-5196(22)00117-6
**DOI:** 10.1016/S2542-5196(22)00117-6
**PMID:** 35709806

**Q:** What does this clip say about heat and cardiovascular disease?
**A:** Heat exposure is a risk factor for cardiovascular disease. The clip says it is underappreciated.

**What to check:** the DOI has upper-case letters. The lookup should still work. The page range "e484-e495" should appear as written.

---

## Clip 4: CRISPR gene therapy (review, DOI, no page numbers in PubMed)

**Clip text:**

> The ability of CRISPR/Cas9 technologies to modify hematopoietic stem cells ex vivo has greatly accelerated the development of genetic therapies for blood disorders.

**Source:** CRISPR-Based Gene Therapies: From Preclinical to Clinical Treatments. Cells. 2024;13(10).
**URL:** https://doi.org/10.3390/cells13100800
**DOI:** 10.3390/cells13100800
**PMID:** 38786024

**Q:** What has CRISPR/Cas9 accelerated, according to this clip?
**A:** The development of genetic therapies for blood disorders. It does this by modifying hematopoietic stem cells outside the body (ex vivo).

**What to check:** PubMed gives no page numbers for this paper. The record should mark "pages" as incomplete. It should not invent page numbers.

---

## Clip 5: sleep and memory (no DOI in PubMed)

**Clip text:**

> A large number of studies offer a substantive body of evidence supporting this role of sleep in what is becoming known as sleep-dependent memory processing.

**Source:** Sleep-dependent learning and memory consolidation. Neuron. 2004;44(1):121-133.
**URL:** https://pubmed.ncbi.nlm.nih.gov/15450165/
**DOI:** (none in PubMed)
**PMID:** 15450165

**Q:** What evidence does this clip describe?
**A:** A large body of studies supporting sleep's role in sleep-dependent memory processing.

**What to check:** PubMed lists no DOI for this paper. "Get citation" should use the PMID. The record should be checked for retraction through PubMed, and the DOI field should stay empty.

---

## Quick test checklist

1. Add each clip to one project. Check that the text, source link and date display.
2. On each clip, press "Get citation". Clips 1 to 4 use the DOI. Clip 5 has no DOI, so the app should ask for a DOI or PMID. Enter `15450165`.
3. For each clip, check the Vancouver line against the source above. Check that missing fields are marked "incomplete".
4. Ask the Q&A panel each question above. Check that the answer cites the matching clip and shows its quote.
