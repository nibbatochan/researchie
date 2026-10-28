// The paper templates a person can start from (Phase B of docs/research/paper-mode-workspace.md, section 1).
// Plain data, no code: a section list with hints, a default citation style and the reporting guideline to
// link. The sources for each structure are in the research note; the app never claims a paper complies with a
// guideline, it only lists the items to check.

export type CitationStyleId = 'apa' | 'harvard' | 'mla' | 'chicago' | 'ieee' | 'vancouver' | 'ama';


export interface TemplateHeading {
  title: string;
  hint: string;
  /** 1 for a main section, 2 for a sub-heading shown inside it. */
  level: 1 | 2;
}

export interface PaperTemplate {
  id: string;
  label: string;
  /** One line shown under the name in the picker. */
  bestFor: string;
  /** Shown in the picker's preview; says where the structure comes from. */
  basis: string;
  citationStyle: CitationStyleId;
  columns: 1 | 2;
  abstract: 'none' | 'unstructured' | 'structured';
  /** Reporting guideline whose items the checklist sidebar lists, if any. */
  guideline?: string;
  /** Left out of the picker; kept so papers made from the old outline templates still open. */
  hidden?: boolean;
  sections: TemplateHeading[];
}

const h = (title: string, hint: string, level: 1 | 2 = 1): TemplateHeading => ({ title, hint, level });

export const PAPER_TEMPLATE_LIST: PaperTemplate[] = [
  {
    id: 'blank',
    label: 'Blank',
    bestFor: 'Start with an empty page and your own headings.',
    basis: 'No structure. Add sections as you go.',
    citationStyle: 'apa',
    columns: 1,
    abstract: 'none',
    sections: [],
  },
  {
    id: 'imrad',
    label: 'Research article (IMRaD)',
    bestFor: 'A study with your own data: Introduction, Methods, Results, Discussion.',
    basis: 'ICMJE recommendations for manuscript preparation.',
    citationStyle: 'apa',
    columns: 1,
    abstract: 'structured',
    guideline: 'CONSORT 2025 (trials) or STROBE (observational studies)',
    sections: [
      h('Abstract', 'Background, Methods, Results, Conclusions. Write it last.'),
      h('Introduction', 'The problem, what is already known, and the gap your work fills.'),
      h('Methods', 'What you did, in enough detail for someone to repeat it.'),
      h('Participants or materials', 'Who or what you studied, and how they were chosen.', 2),
      h('Procedure', 'The steps, in order.', 2),
      h('Ethics', 'Approval, consent, and how data were protected.', 2),
      h('Statistical analysis', 'How you analysed the data.', 2),
      h('Results', 'What you found, without interpretation.'),
      h('Discussion', 'What the results mean, how they fit earlier work, and the limits of your study.'),
      h('Limitations', 'What could weaken the findings.', 2),
      h('Conclusion', 'The answer to your question, in a few sentences.'),
      h('References', 'Every source you cited, in the style you picked.'),
    ],
  },
  {
    id: 'systematic-review',
    label: 'Systematic review (PRISMA 2020)',
    bestFor: 'A synthesis of studies you collected. The best fit for a project full of clips.',
    basis: 'PRISMA 2020 statement (Page et al., BMJ 2021;372:n71), 27 items.',
    citationStyle: 'apa',
    columns: 1,
    abstract: 'structured',
    guideline: 'PRISMA 2020',
    sections: [
      h('Abstract', 'Objectives, eligibility, sources, risk of bias, synthesis, results, limitations, funding, registration.'),
      h('Introduction', 'Rationale and objectives.'),
      h('Methods', 'How the review was done.'),
      h('Eligibility criteria', 'Which studies were in and which were out.', 2),
      h('Information sources', 'Databases and other sources, with the date last searched.', 2),
      h('Search strategy', 'The full search for at least one database.', 2),
      h('Selection process', 'Who screened, and how disagreements were settled.', 2),
      h('Data collection and items', 'What you extracted and how.', 2),
      h('Risk of bias assessment', 'The tool used and who applied it.', 2),
      h('Synthesis methods', 'How results were combined or summarised.', 2),
      h('Results', 'What the included studies show.'),
      h('Study selection', 'The PRISMA flow diagram and why studies were excluded.', 2),
      h('Study characteristics', 'A table of the included studies.', 2),
      h('Results of syntheses', 'The combined findings and the certainty of the evidence.', 2),
      h('Discussion', 'Interpretation, limits of the evidence, limits of the review, implications.'),
      h('Registration and protocol', 'Where the protocol is registered, and any changes to it.'),
      h('Support, competing interests, availability of data', 'Funding, conflicts, and where the extracted data can be found.'),
      h('References', 'Every source you cited.'),
    ],
  },
  {
    id: 'conference',
    label: 'Conference paper',
    bestFor: 'A computing or engineering paper with a page limit.',
    basis: 'ACM acmart sigconf and IEEE conference templates. Section names are convention.',
    citationStyle: 'apa',
    columns: 2,
    abstract: 'unstructured',
    sections: [
      h('Abstract', 'One paragraph: problem, approach, main result.'),
      h('Introduction', 'The problem, why it matters, and your contributions.'),
      h('Related work', 'What others have done and how yours differs.'),
      h('Method', 'The approach or system, in enough detail to reproduce.'),
      h('Evaluation', 'The setup, the results, and how they answer your question.'),
      h('Discussion and limitations', 'What the results mean and where they do not hold.'),
      h('Conclusion', 'What you showed and what comes next.'),
      h('Acknowledgements', 'Funding and thanks. Omit when submitting for anonymous review.'),
      h('References', 'Numbered in order of first citation.'),
    ],
  },
  {
    id: 'case-report',
    label: 'Case report (CARE)',
    bestFor: 'A clinical case: what happened, what was done, and what followed.',
    basis: 'CARE reporting guideline (Riley et al., J Clin Epidemiol 2017), 13 items.',
    citationStyle: 'apa',
    columns: 1,
    abstract: 'structured',
    guideline: 'CARE',
    sections: [
      h('Abstract', 'Introduction, case presentation, and conclusion.'),
      h('Keywords', 'The terms a reader would search for.'),
      h('Introduction', 'Why this case is worth reporting.'),
      h('Patient information', 'Age, background and main concerns. Remove anything that could identify the person.'),
      h('Clinical findings', 'What the examination showed.'),
      h('Timeline', 'The key events in order, as a table or figure.'),
      h('Diagnostic assessment', 'Tests, reasoning and challenges.'),
      h('Therapeutic interventions', 'What was done, and for how long.'),
      h('Follow-up and outcomes', 'What happened afterwards, as the clinician and the patient saw it.'),
      h('Discussion', 'Strengths, limits and what others can learn from the case.'),
      h('Patient perspective', "The patient's own view, if they agree to share it."),
      h('Informed consent', 'State that written consent was given. This is required.'),
      h('References', 'Every source you cited.'),
    ],
  },
  {
    id: 'short-communication',
    label: 'Short communication',
    bestFor: 'A brief, focused result. Check your journal for its word limit.',
    basis: 'Journal guides differ on length; the structure follows a shortened full paper.',
    citationStyle: 'apa',
    columns: 1,
    abstract: 'unstructured',
    sections: [
      h('Abstract', 'A short summary of the question, method and result.'),
      h('Keywords', 'The terms a reader would search for.'),
      h('Introduction', 'The question and why it matters, in a few paragraphs.'),
      h('Methods', 'What you did.'),
      h('Results and discussion', 'What you found and what it means.'),
      h('Conclusion', 'The takeaway.'),
      h('References', 'Every source you cited.'),
    ],
  },
  {
    // The first outline template of the old paper view. Not offered any more; old papers still open with it.
    id: 'review',
    label: 'Narrative review',
    bestFor: 'A review organised by themes rather than a fixed protocol.',
    basis: 'Convention only. No standard fixes the structure.',
    citationStyle: 'apa',
    columns: 1,
    abstract: 'unstructured',
    hidden: true,
    sections: [
      h('Abstract', 'A short summary of the whole review.'),
      h('Introduction', 'The topic, why it matters and what the review covers.'),
      h('Themes', 'One sub-heading per theme, with the evidence under each.'),
      h('Discussion', 'What the evidence adds up to, and where it disagrees.'),
      h('Conclusion', 'The main takeaways and open questions.'),
      h('References', 'Every source you cited.'),
    ],
  },
];

/** The templates offered in the picker, Blank first. */
export const PICKER_TEMPLATES = PAPER_TEMPLATE_LIST.filter((t) => !t.hidden);

export function getTemplate(id: string): PaperTemplate | undefined {
  return PAPER_TEMPLATE_LIST.find((t) => t.id === id);
}

/** The main headings of a template, for the picker's quick preview. */
export function previewHeadings(t: PaperTemplate): TemplateHeading[] {
  return t.sections.filter((s) => s.level === 1);
}
