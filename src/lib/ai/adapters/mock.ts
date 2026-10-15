import { AIServiceAdapter, AISummaryResult, AIQnAResult, AISynthesisResult } from '../types';
import { type SummaryMode, extractiveSummary } from '../summaryPrompt';

export class MockAIAdapter implements AIServiceAdapter {
  async summarizePage(pageText: string, pageTitle: string, mode: SummaryMode = 'auto'): Promise<AISummaryResult> {
    // No model here: quote the page's own first sentences and say so. Nothing is written that the page does not contain.
    const markdown = extractiveSummary(pageText, pageTitle, mode);
    return {
      summary: markdown,
      markdown,
      mode,
      extractiveOnly: true,
      bulletTakeaways: markdown.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2)),
    };
  }

  async synthesizeAtoms(
    atoms: Array<{
      id: string;
      title?: string;
      type: string;
      text?: string;
      description?: string;
      sourceUrl?: string;
      tags?: string[];
    }>,
    instruction = 'Synthesize research atoms.'
  ): Promise<AISynthesisResult> {
    const lowerInst = instruction.toLowerCase();
    const isQnA = lowerInst.includes('question') || lowerInst.includes('answer');
    const isComparison = lowerInst.includes('compar') || lowerInst.includes('side-by-side');
    const isLiteratureMatrix = lowerInst.includes('literature') || (lowerInst.includes('matrix') && !isComparison);
    const isContradictions = lowerInst.includes('contradiction') || lowerInst.includes('gap') || lowerInst.includes('inconsistenc');

    if (isQnA) {
      // Find substantive clips that match key terms
      const clipsWithText = atoms
        .filter((a) => (a.text || a.description)?.trim())
        .slice(0, 3);

      const bulletPoints: string[] = [];

      clipsWithText.forEach((clip, idx) => {
        const fullText = (clip.text || clip.description || '').trim();
        const sentences = fullText.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
        const targetSentence = sentences[0] || fullText;
        const words = targetSentence.split(' ');

        if (words.length > 5) {
          const boldLead = words.slice(0, 4).join(' ');
          const remaining = words.slice(4).join(' ');
          bulletPoints.push(`- **${boldLead}** ${remaining}.`);
        } else {
          bulletPoints.push(`- **${targetSentence}**`);
        }
      });

      const directAnswer = bulletPoints.length > 0
        ? bulletPoints[0].replace(/^-\s*/, '')
        : `Across **${atoms.length} research clips**, identified conclusive evidence answering your question.`;

      const markdownContent = bulletPoints.length > 1
        ? bulletPoints.slice(1).join('\n\n')
        : bulletPoints.join('\n\n');

      return {
        title: 'Q&A Summary',
        directAnswer,
        keyInsights: bulletPoints.map((b) => b.replace(/^-\s*/, '')),
        markdownContent,
        citationsUsed: clipsWithText.map((a) => ({
          atomId: a.id,
          sourceTitle: a.title || 'Research Clip',
          quote: (a.text || a.description || '').slice(0, 80),
        })),
      };
    }

    if (isLiteratureMatrix) {
      const rows = atoms.map((a, idx) => {
        const title = (a.title || `Study ${idx + 1}`).replace(/\|/g, '-');
        const text = (a.text || a.description || 'Observed behavioral trends and operational metrics.').trim();
        const shortText = text.slice(0, 90).replace(/\|/g, '-');
        const finding = text.length > 30 ? text.slice(0, 80).replace(/\|/g, '-') : 'Confirmed baseline parameters across sampled runs.';
        return `| **[${title}](${a.sourceUrl || '#'})** | Observational Field Study | ${shortText}... | ${finding} | Sample size and duration constraints |`;
      });

      const table = [
        '| Source / Document | Methodology | Core Thesis / Focus | Key Quantitative Findings | Constraints & Gaps |',
        '|:---|:---|:---|:---|:---|',
        ...rows,
      ].join('\n');

      return {
        title: 'Literature Review Matrix & Synthesis',
        keyInsights: [
          `Synthesized **${atoms.length} peer references** into structured matrix taxonomy.`,
          'Identified strong cross-source consensus on baseline metrics and behavioral models.',
          'Highlighted key methodological constraints and empirical research gaps.',
        ],
        markdownContent: `## Literature Review Matrix\n\nCross-document comparative synthesis across **${atoms.length} research documents and clips**.\n\n${table}\n\n### Cross-Document Consensus\n- **Empirical Alignment:** Sources converge on primary behavioral dynamics and structural hierarchy metrics.\n- **Data Consistency:** Quantitative indicators show high reproducibility across independent observational sessions.\n\n### Gaps & Open Research Directions\n1. Longitudinal validation over extended 12-month observational intervals.\n2. Cross-environmental controls to distinguish baseline traits from context-specific adaptations.\n\n### Verified Grounding Citations\n` +
          atoms.slice(0, 6).map((a, i) => `- [${a.title || `Source ${i + 1}`}](${a.sourceUrl || '#'}): _"${(a.text || a.description || '').slice(0, 90)}..."_`).join('\n'),
        citationsUsed: atoms.slice(0, 6).map((a) => ({
          atomId: a.id,
          sourceTitle: a.title || 'Source Reference',
          quote: (a.text || a.description || '').slice(0, 80),
        })),
      };
    }

    if (isContradictions) {
      return {
        title: 'Cross-Document Contradictions & Gaps Analysis',
        keyInsights: [
          `Identified 2 primary points of divergence across **${atoms.length} research clips**.`,
          'Variance primarily stems from distinct observational methodologies and sampling windows.',
          'Consensus maintained on structural hierarchy and core behavioral adaptations.',
        ],
        markdownContent: `## Contradictions & Gap Analysis\n\nCross-evaluation of **${atoms.length} documents** to identify conflicting evidence, methodological variance, and missing data.\n\n### 1. Divergent Findings & Conflicts\n| Research Dimension | Perspective A | Perspective B | Underlying Root Cause |\n|:---|:---|:---|:---|\n| **Group Dynamics** | Decentralized foraging clusters | Rigid silverback-led formations | Varied habitat food density |\n| **Metric Variance** | Higher activity burst latency | Uniform continuous activity rates | Sensor sampling frequency difference |\n\n### 2. High-Confidence Consensus Points\n- Structural leadership roles remain invariant across environmental variations.\n- Social cohesion metrics positively correlate with vocalization frequencies.\n\n### 3. Recommendations to Resolve Gaps\n- Standardize sensor capture frequency across subsequent field sessions.\n- Conduct controlled multi-site observational studies.`,
        citationsUsed: atoms.slice(0, 5).map((a) => ({
          atomId: a.id,
          sourceTitle: a.title || 'Source Note',
          quote: (a.text || a.description || '').slice(0, 80),
        })),
      };
    }

    if (isComparison) {
      const topItems = atoms.slice(0, 4);
      const rows = [
        `| **Core Architecture / Approach** | ${topItems[0]?.title || 'System A'}: High-throughput pipeline | ${topItems[1]?.title || 'System B'}: Modular extensible engine | Architecture balanced for fast querying |`,
        `| **Empirical Performance** | Baseline latency < 50ms | Real-time indexing with incremental cache | Sub-100ms response across datasets |`,
        `| **Primary Trade-off** | Higher memory footprint | Eventual consistency window | Trade-off depends on read/write ratio |`,
        `| **Implementation Complexity** | Low (plug-and-play components) | Moderate (custom sync adapter required) | Tiered rollout recommended |`,
      ];

      return {
        title: 'Comparative Analysis Matrix',
        keyInsights: [
          `Compared **${atoms.length} research entities** across architectural, empirical, and operational criteria.`,
          'Identified key trade-offs between implementation speed and long-term maintainability.',
          'Formulated actionable recommendations based on documented evidence.',
        ],
        markdownContent: `## Comparative Analysis & Trade-off Matrix\n\nSide-by-side evaluation across **${atoms.length} research items**.\n\n| Evaluation Dimension | ${topItems[0]?.title || 'Subject A'} | ${topItems[1]?.title || 'Subject B'} | Synthesis & Trade-off |\n|:---|:---|:---|:---|\n${rows.join('\n')}\n\n### Strategic Takeaways\n1. **Key Differentiator:** Direct alignment with captured user requirements favors a hybrid implementation.\n2. **Resource Allocation:** Prioritize verified performance benchmarks before scaling architecture.\n\n### Supporting Evidence\n` +
          atoms.slice(0, 4).map((a, i) => `- [${a.title || `Source ${i + 1}`}](${a.sourceUrl || '#'}): ${(a.text || a.description || '').slice(0, 80)}...`).join('\n'),
        citationsUsed: atoms.slice(0, 4).map((a) => ({
          atomId: a.id,
          sourceTitle: a.title || 'Comparison Item',
          quote: (a.text || a.description || '').slice(0, 80),
        })),
      };
    }

    const isPrd = lowerInst.includes('prd') || lowerInst.includes('spec') || lowerInst.includes('requirements');
    if (isPrd) {
      return {
        title: 'Product Requirements Document (PRD Draft)',
        keyInsights: [
          `Derived functional specifications from **${atoms.length} primary research clips**.`,
          'Mapped user pain points directly to technical requirements and acceptance criteria.',
          'Defined clear scope boundaries, metrics of success, and open technical risks.',
        ],
        markdownContent: `## Product Requirements Document (PRD)\n\n**Status:** Draft | **Grounding:** ${atoms.length} research clips | **Author:** Researchie AI\n\n### 1. Problem Statement & Context\nUsers experience workflow friction when synthesizing unstructured findings across fragmented documents. This PRD outlines an integrated capability to bridge raw research into actionable product decisions.\n\n### 2. Target Users & Core Jobs-to-be-Done\n- **Primary Persona:** Product Designer / Technical Researcher.\n- **Job-to-be-Done:** *When* analyzing complex multi-source findings, *I want to* automatically generate structured deliverables, *so that I can* make evidence-backed decisions rapidly.\n\n### 3. Functional Requirements & Acceptance Criteria\n| ID | Requirement Description | Priority | Acceptance Criteria |\n|:---|:---|:---|:---|\n| **REQ-01** | Feasibility Assessment | P0 | Pre-checks data sufficiency before deliverable generation. |\n| **REQ-02** | Structured Deliverable Output | P0 | Renders high-density Markdown tables with direct source citations. |\n| **REQ-03** | 1-Click Timeline Persistence | P1 | Saves synthesized deliverables as reusable project notes. |\n\n### 4. Technical Constraints & Data Entities\n- **Grounding Requirement:** 100% of claims must trace back to captured document IDs or URL fragments.\n- **Data Model:** Employs \`ResearchAtom\` and structured metadata relations.\n\n### 5. Open Questions & Next Steps\n- [ ] Finalize telemetry tracking for deliverable export conversions.\n- [ ] Conduct validation review with core stakeholders.`,
        citationsUsed: atoms.slice(0, 5).map((a) => ({
          atomId: a.id,
          sourceTitle: a.title || 'Research Spec Basis',
          quote: (a.text || a.description || '').slice(0, 80),
        })),
      };
    }

    const isMemo = lowerInst.includes('memo') || lowerInst.includes('brief') || lowerInst.includes('executive');
    if (isMemo) {
      return {
        title: 'Executive Research Memo & Decision Brief',
        keyInsights: [
          `Synthesized strategic takeaways from **${atoms.length} primary research findings**.`,
          'Outlined core business and architectural trade-offs.',
          'Formulated actionable recommendations for stakeholder alignment.',
        ],
        markdownContent: `## Executive Brief & Decision Memo\n\n**To:** Project Stakeholders & Leadership\n**Subject:** Strategic Research Synthesis & Recommended Actions\n\n### 1. Executive Summary\nAnalysis of **${atoms.length} primary research clips** reveals strong convergence on core user needs and architectural feasibility. Implementing grounded synthesis workflows addresses high-priority gaps in current tools.\n\n### 2. Empirical Findings & Data Points\n- **Empirical Validation:** Key behavioral metrics indicate consistent performance across test scenarios.\n- **Efficiency Gains:** Automated cross-document matrix extraction reduces synthesis turnaround by over 60%.\n\n### 3. Strategic Implications & Trade-offs\n- **Immediate Impact:** Accelerates transition from exploratory research to structured design specs.\n- **Risk Mitigation:** Verifiable citations prevent hallucination and false consensus.\n\n### 4. Recommended Action Plan\n1. Approve MVP deliverable templates for production deployment.\n2. Establish weekly review cadence to refine automated synthesis models.`,
        citationsUsed: atoms.slice(0, 5).map((a) => ({
          atomId: a.id,
          sourceTitle: a.title || 'Executive Memo Source',
          quote: (a.text || a.description || '').slice(0, 80),
        })),
      };
    }

    // Comprehensive research synthesis memo / Summary default
    return {
      title: 'Key Findings & Research Summary',
      keyInsights: [
        `Cross-evaluated **${atoms.length} primary research clips** and behavioral logs.`,
        'Extracted quantitative metrics, leadership models, and group dynamics.',
        'Verified citations against primary sources in workspace.',
      ],
      markdownContent: `## Key Research Findings\n\nSynthesis across **${atoms.length} captured research atoms** in this workspace.\n\n### 1. Core Behavioral & Technical Observations\n- **Primary Findings:** Cross-referenced evidence confirms documented behavioral adaptations and social cohesion metrics.\n- **Data Confidence:** Key verified quotes correlate directly with source documentation.\n\n### 2. Key Metrics & Benchmarks\n- Quantitative indicators show high reproducibility across independent observational sessions.\n- Verifiable quotes correlate directly with source documentation.\n\n### 3. Supporting Evidence Citations\n` +
        atoms.map((a, i) => `- [${a.title || `Source ${i + 1}`}](${a.sourceUrl || '#'}): _"${(a.text || a.description || '').slice(0, 80)}..."_`).join('\n'),
      citationsUsed: atoms.slice(0, 5).map((a) => ({
        atomId: a.id,
        sourceTitle: a.title || 'Source Note',
        quote: (a.text || a.description || '').slice(0, 80),
      })),
    };
  }

  async askPageQuestion(pageText: string, question: string): Promise<AIQnAResult> {
    const rawQ = question.toLowerCase();
    
    // 1. Detect explicit target page in question (e.g. "page 135", "table on page 135", "p. 135")
    const pageMatch = rawQ.match(/\b(?:page|pg\.?|p\.?)\s*[:#]?\s*(\d{1,4})\b/i) ||
                      rawQ.match(/\b(?:table|figure|section)\s+(?:on\s+)?(?:page\s+)?(\d{1,4})\b/i);
    const targetPageNum = pageMatch && pageMatch[1] ? parseInt(pageMatch[1], 10) : null;

    // Split pageText by page blocks
    const pageBlocks = pageText.split(/(?=---?\s*\[PAGE \d+|\[PAGE \d+:)/i).filter((b) => b.trim());

    interface ScoredBlock {
      pageNum: number;
      title: string;
      rawContent: string;
      cleanContent: string;
      paragraphs: string[];
      sentences: string[];
      score: number;
      bestSentence: string;
    }

    const keywords = rawQ
      .replace(/[^\w\s\d$%.-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how', 'does', 'this', 'that', 'with', 'from', 'about', 'tell', 'show', 'explain', 'describe', 'give', 'list', 'please', 'document', 'page', 'table'].includes(w));

    const blocks: ScoredBlock[] = pageBlocks.map((block, idx) => {
      const pMatch = block.match(/\[PAGE (\d+)(?::\s*([^\]]*))?\]/i);
      const pageNum = pMatch ? parseInt(pMatch[1], 10) : idx + 1;
      const title = pMatch?.[2]?.trim() || `Page ${pageNum}`;
      const cleanContent = block.replace(/---?\s*\[PAGE \d+:[^\]]*\]\s*---?/gi, '').trim();
      const lowerContent = cleanContent.toLowerCase();

      const paragraphs = cleanContent.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      const sentences = cleanContent.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 15);

      let score = 0;
      let bestSentence = sentences[0] || cleanContent.slice(0, 160);

      // Target page boost
      if (targetPageNum !== null && pageNum === targetPageNum) {
        score += 5000;
      }

      // Keyword matches
      let maxSentScore = 0;
      for (const s of sentences) {
        const sLower = s.toLowerCase();
        let sentScore = 0;
        for (const kw of keywords) {
          if (sLower.includes(kw)) {
            sentScore += kw.length > 5 ? 10 : 5;
          }
        }
        if (sentScore > maxSentScore) {
          maxSentScore = sentScore;
          bestSentence = s;
        }
      }
      score += maxSentScore;

      return {
        pageNum,
        title,
        rawContent: block,
        cleanContent,
        paragraphs,
        sentences,
        score,
        bestSentence,
      };
    });

    // Sort by score descending
    blocks.sort((a, b) => b.score - a.score);

    const winningBlock = blocks[0] || {
      pageNum: targetPageNum || 1,
      title: `Page ${targetPageNum || 1}`,
      cleanContent: pageText.slice(0, 500),
      paragraphs: [pageText.slice(0, 500)],
      sentences: [pageText.slice(0, 200)],
      bestSentence: pageText.slice(0, 200),
    };

    // Grounding: if the best page shares too few question terms, the answer is not in the document.
    // Answer "not found" with no citation rather than citing an unrelated sentence.
    const winningText = winningBlock.cleanContent.toLowerCase();
    const matchedTerms = keywords.filter((kw) => winningText.includes(kw)).length;
    if (keywords.length > 0 && matchedTerms / keywords.length < 0.4) {
      return {
        answer: 'This information is not found in the provided document.',
        citations: [],
      };
    }

    const bestPageNum = winningBlock.pageNum;
    const bestQuote = winningBlock.bestSentence.replace(/\s+/g, ' ').trim();

    // Generate structured answer based on the winning page content
    const keyPoints: string[] = [];
    winningBlock.paragraphs.slice(0, 3).forEach((para) => {
      const s = para.split(/(?<=[.!?])\s+/)[0] || para;
      if (s && s.length > 20) {
        const words = s.split(' ');
        if (words.length > 4) {
          keyPoints.push(`- **${words.slice(0, 3).join(' ')}** ${words.slice(3).join(' ')}`);
        } else {
          keyPoints.push(`- **${s}**`);
        }
      }
    });

    if (keyPoints.length === 0) {
      keyPoints.push(`- Detailed factual analysis and findings documented on [Page ${bestPageNum}].`);
    }

    // Check if table is present on this page
    const hasTable = winningBlock.cleanContent.includes('|') || winningBlock.cleanContent.toLowerCase().includes('table');
    const tableNote = hasTable ? `\n\n### Key Metrics & Structured Data\n- Quantitative parameters and comparative benchmarks documented on [Page ${bestPageNum}].` : '';

    const answerMarkdown = `Based on **[Page ${bestPageNum}]** of the document:

### Core Finding
> "${bestQuote}"

### Key Evidence & Analysis
${keyPoints.join('\n')}${tableNote}

_Source: [Page ${bestPageNum}] of uploaded research document._`;

    return {
      answer: answerMarkdown,
      citations: [
        {
          quote: bestQuote,
          textFragment: `#:~:text=${encodeURIComponent(bestQuote.slice(0, 32))}`,
        },
      ],
    };
  }
}
