# Groq limits, longer answers, and alternatives

Research date: 2026-10-28. Labels follow the other notes in this folder:

- **Verified (fetched):** read from the owning page in this session. Pages were summarised by a small model, so re-check anything load-bearing.
- **Third-party:** an aggregator, blog or search result. A lead, not a fact.
- **UNVERIFIED:** not confirmed from a primary source. The note says where to check.

Model names, prices and context sizes below are as the vendor pages showed them today. They change often; re-fetch before coding against them.

---

## Summary and recommendation

1. **Groq's limit is the tokens-per-minute cap, not the context window.** Every model we use has a 131,072-token context window, but the base limit table shows **8K tokens per minute (TPM) and 200K tokens per day (TPD)** for `openai/gpt-oss-120b`, `openai/gpt-oss-20b` and `qwen/qwen3.8-27b`. One request larger than the TPM cap cannot succeed. That matches the "~7,000 to 8,000 tokens per request" comment in `passages.ts`. The Groq page labels the table as Developer-plan base limits and does not say which numbers are the free tier, so **free-tier figures are UNVERIFIED**. The signed-in page `console.groq.com/settings/limits` shows the real numbers per organisation.
2. **Short answers are a Groq-free-tier symptom, not a model flaw.** `gpt-oss-120b` can output up to 65,536 tokens, but an 8K TPM cap counts input plus requested output, so long answers over big clip sets do not fit in one call. Fix it with sectional generation (outline, then expand each section with only its clips), not by hunting for a bigger model first.
3. **Best next provider for long, detailed answers: Google Gemini (BYOK).** It has a free tier, a 1M-token context window on the flagship, native PDF input (up to 1,000 pages, 258 tokens a page), and a Files API. The catch is privacy: free-tier data may be used to improve Google products, which the app already warns about. **Paid options with strong long-context output:** Claude Sonnet 5.5 ($2 in / $10 out per 1M, 1M context, 128K output) and DeepSeek V4 (1M context, 384K output, very low cache price).
4. **Claude and Perplexity consumer subscriptions cannot power the app.** Anthropic's compliance page says third parties may not "route requests through Free, Pro, or Max plan credentials on behalf of their users". The API is billed separately through the Claude Console. Perplexity Pro and ChatGPT Plus also do not replace an API key (details in section 7). A user who wants Claude in Researchie must create an Anthropic API key and pay per token.
5. **Recommended order:** (a) token budgeting plus `finish_reason` handling plus retry on 429 (small); (b) outline-then-expand drafting and map-reduce synthesis (medium); (c) a Gemini adapter path with PDF/Files input and 1M context for "whole-paper" questions (medium); (d) optional Anthropic adapter for paid users (small, the OpenAI-compatible endpoint is **UNVERIFIED**, see open questions); (e) a PDF parser upgrade (Docling or GROBID) only if pdf.js plus Tesseract proves too weak (large).

---

## 1. Groq limits table

All rows Verified (fetched) from [models](https://console.groq.com/docs/models), [rate limits](https://console.groq.com/docs/rate-limits), [prompt caching](https://console.groq.com/docs/prompt-caching), [batch](https://console.groq.com/docs/batch), [vision](https://console.groq.com/docs/vision), [errors](https://console.groq.com/docs/errors) unless marked.

| Model | Status | Context | Max output | Price per 1M (in / out) | RPM | RPD | TPM | TPD |
|---|---|---|---|---|---|---|---|---|
| `openai/gpt-oss-120b` | Production | 131,072 | 65,536 | $0.15 / $0.60 | 30 | 1K | 8K | 200K |
| `openai/gpt-oss-20b` | Production | 131,072 | 65,536 | $0.075 / $0.30 | 30 | 1K | 8K | 200K |
| `llama-3.3-70b-versatile` | Production | 131,072 | 32,768 | "Contact Sales" | not in table | not in table | not in table | not in table |
| `llama-3.1-8b-instant` | Production | 131,072 | 131,072 | "Contact Sales" | not in table | not in table | not in table | not in table |
| `qwen/qwen3.8-27b` | **Preview** (may be dropped at short notice) | 131,072 | 16,384 | $0.80 / $4.00 | 30 | 1K | 8K | 200K |
| `openai/gpt-oss-safeguard-20b` | Preview | 131,072 | 65,536 | $0.075 / $0.30 | 3 | 1K | 2K | 200K |
| `minimaxai/minimax-m2.7` | Preview | 196,608 | 131,072 | "Contact Sales" | not in table | not in table | not in table | not in table |
| `meta-models/muse-spark-open` | Limited preview, contact Groq | 131,072 | 131,072 | "Contact Sales" | not in table | not in table | not in table | not in table |

- **Free vs Developer:** the rate-limit page shows one table under both the Free and Developer headings and says the numbers are "base limits for the Developer plan". Which numbers are free-tier: **UNVERIFIED**. Check `console.groq.com/settings/limits` while signed in. Some orgs also have separate input and output TPM limits (shown as "X in / Y out" on hover).
- **Scope:** limits apply to the organisation, not the user or key. That is why the app tells each tester to use their own Groq account.
- **Counting:** "Cached tokens do not count towards your rate limits." Any limit can bind first; 50 small requests can hit a 50 RPM cap far below the TPM cap. How the TPM check treats requested `max_tokens` against actual output is **not stated on the page** (UNVERIFIED; test by sending a small prompt with a large `max_completion_tokens` and watching `x-ratelimit-remaining-tokens`).
- **429:** returned when a limit is hit. `retry-after` (seconds) is set only on 429. `x-ratelimit-*` headers (limit, remaining, reset for requests and tokens) come on every response.
- **413:** the errors page says only "The request body is too large" and to trim the payload. The rate-limit page does not describe 413 behaviour. Whether Groq returns 413 or 429 for a prompt above the TPM cap is **UNVERIFIED** (the app's existing handling in `passages.ts` suggests a tester saw it; check `src/lib/ai/adapters/groq.ts` for the status it matches).
- **Prompt caching:** only `openai/gpt-oss-20b`, `openai/gpt-oss-120b`, `openai/gpt-oss-safeguard-20b`. Cached input is 50% cheaper, no extra fee, minimum prompt 128 to 1,024 tokens depending on model, expires after 2 hours unused. It does not stack with the batch discount.
- **Batch API:** 50% off; separate from normal rate limits; `.jsonl` up to 50,000 lines and 200 MB; completion window 24 h to 7 days; results kept up to 30 days. Models: gpt-oss-20b/120b, llama-3.3-70b-versatile, llama-3.1-8b-instant, llama-guard-4-12b, Whisper. Fits "summarise every clip overnight", not interactive Q&A.
- **Files and PDFs:** the vision page covers images only. It does not say PDFs or files are accepted. Treat Groq as **text and image only, no native PDF**. A "Files API" for chat inputs was not found in the pages fetched (UNVERIFIED); the Batch API uses uploaded `.jsonl` files.
- **Images:** `qwen/qwen3.8-27b` takes up to 3 images per request, each counted as 2,048 input tokens, request body limit 20 MB (larger returns 400). `muse-spark-open` takes up to 5 images, up to 1,026 tokens each.
- **Audio:** Whisper `whisper-large-v3` ($0.111/hour) and `whisper-large-v3-turbo` ($0.04/hour), limits 20 RPM, 2K RPD, 7.2K audio seconds per hour. Audio input to chat models: not addressed on the page.
- **Pricing page:** `groq.com/pricing` carried no token prices when fetched (marketing page). Prices above come from the models page.

---

## 2. Comparison of options

"Needs" = what the user must have for BYOK. Prices are USD per 1M tokens (input / output) from vendor pages fetched today unless marked.

| Option | Context | Max output | Price | Free tier | Native PDF/file input | Needs | Fit for Researchie |
|---|---|---|---|---|---|---|---|
| **Groq `gpt-oss-120b`** | 131K | 65,536 | 0.15 / 0.60 | Yes, 8K TPM / 200K TPD (base table) | No (text, images on qwen only) | Groq key | Current default. Fast, cheap, capped by TPM. Keep for short Q&A. |
| **Google Gemini 3.8 Flash** | 1M figure is stated for Gemini 4 Argon; Flash context **UNVERIFIED** | not stated for Flash | 0.75 / 3.75 (cache 0.075; batch 0.375 / 1.875) | Yes | Yes: PDFs up to 50 MB or 1,000 pages, 258 tokens per page, Files API keeps files 48 h | Google AI Studio key (already coded) | Best near-term step up: free, big context, PDFs. Privacy warning applies on free tier. |
| **Google Gemini 4 Argon** | 1M | "long decodes up to 1M" (page wording) | 2.00 / 10.00 (introductory; rises to 4.00 input on 2026-12-01 per page) | No | Yes (same Gemini docs) | Paid Google key | For "read the whole paper set" runs. Implicit caching only. |
| **Gemini 3.1 Flash-Lite / 2.5 Flash-Lite** | **UNVERIFIED** | **UNVERIFIED** | 0.25 / 1.50 and 0.10 / 0.40 | Yes | Yes | Google key | Cheap bulk summarising. |
| **Claude Sonnet 5.5** (`claude-sonnet-5-5`) | 1M | 128K (300K on Batch API with beta header) | 2 / 10; cache reads 5% of input; batch 50% off | No | Yes: up to 600 pages per request (100 if context window under 1M), 32 MB request cap | Anthropic API key, prepaid credit | Best writing quality for long drafts (opinion, not verified). Optional paid provider. |
| **Claude Opus 5.5** (`claude-opus-5-5`) | 1M | 128K | 4 / 20 | No | Yes | Anthropic API key | Overkill for clip Q&A. |
| **Claude Haiku 5.5** (`claude-haiku-5-5`) | 1M | 128K | from 0.10 / 0.50 (higher above 100K input per Perplexity's table; Anthropic's own page says "From") | No | Yes | Anthropic API key | Cheapest Claude for classify/extract/map step. |
| **Claude Fable 5.1** (`claude-fable-5-1`) | 1M | 128K | 10 / 50 | No | Yes | Anthropic API key | For hard reasoning only. Too costly here. |
| **OpenAI `gpt-6-luna`** | not on pricing page | not on pricing page | 0.10 / 0.50 (cached 0.01; batch 0.05 / 0.25) | No free API tier found | PDF input: **UNVERIFIED** | OpenAI key, prepaid | Cheap; context and PDF specifics need the model page. |
| **OpenAI `gpt-6.1-sol` / `gpt-6.1-terra`** | price tiers split at 272K input | not on pricing page | 2 / 10 and 1 / 5 | No | UNVERIFIED | OpenAI key | Mid-range alternative. |
| **DeepSeek `deepseek-flash` (V4.1-Flash)** | 1M | 384K | list price not captured; cache hit 0.003 off-peak / 0.006 peak | UNVERIFIED | UNVERIFIED | DeepSeek key | Very cheap long output. Privacy: China-hosted service; check terms before sensitive clips (UNVERIFIED). |
| **DeepSeek `deepseek-v4-pro`** | 1M | 384K | list price not captured; cache hit 0.022 / 0.044 | UNVERIFIED | UNVERIFIED | DeepSeek key | Higher quality tier. |
| **Mistral Large** | UNVERIFIED | UNVERIFIED | 0.5 / 1.5 (pricing page) | Free plan exists; "Model training: Opt-out" row, so free-plan data may train models unless opted out | UNVERIFIED (Mistral OCR is a separate product) | Mistral key | Repo's `MEDICAL_DATA_NOTICE` already warns about this. |
| **Mistral Medium 3.5 / Small 4** | UNVERIFIED | UNVERIFIED | 1.50 / 7.50 and 0.15 / 0.60 (Third-party: cloudzero.com) | as above | UNVERIFIED | Mistral key | Third-party prices only. |
| **Cerebras** | UNVERIFIED | UNVERIFIED | pricing tables did not load | Developer tier: one-time $5 promo credit for adding a payment method, expires in 30 days, "not intended for production use". The repo note "about 1 million tokens a day, 5 requests a minute" is older and **now UNVERIFIED**. | No | Cerebras key + card | Already coded; keep hidden. |
| **OpenRouter** | per model | per model | passes through provider price | Free models: 20 RPM, 50 RPD (1,000 with 10 credits bought), per the existing repo note, not re-fetched today | per model | OpenRouter key | Single key for many models, good for a "fallback" route. Data handling differs per upstream. |
| **Perplexity Sonar (`perplexity/sonar`)** | not stated | not stated | 0.25 / 2.50 (cache read 0.0625) per the Agent API models page; Sonar Pro $3 / $15 is Third-party | No | No | Perplexity API key, prepaid | Web-grounded answers, not clip-grounded. See section 7. |
| **Perplexity Search API** | n/a | n/a | $5 per 1,000 requests, $1 per 1,000 with Fast Search | No | No | Perplexity API key | Could feed "find sources" to a project; not an answer model. |
| **Qwen / Llama (open weights)** | Qwen 3.8 27B on Groq: 131K | 16,384 | 0.80 / 4.00 | Via Groq free | Image only on Groq | Groq key | Preview on Groq; low output cap makes it poor for long answers. Llama 3.3 70B on Groq: price "Contact Sales", 32,768 output. |

Sources: [Groq models](https://console.groq.com/docs/models); [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing); [Gemini models](https://ai.google.dev/gemini-api/docs/models); [Gemini documents](https://ai.google.dev/gemini-api/docs/document-processing); [Claude models](https://platform.claude.com/docs/en/about-claude/models/overview); [Claude PDF support](https://platform.claude.com/docs/en/build-with-claude/pdf-support); [OpenAI pricing](https://developers.openai.com/api/docs/pricing); [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing); [Mistral pricing](https://mistral.ai/pricing); [Cerebras pricing](https://www.cerebras.ai/pricing); [Perplexity Agent API models](https://docs.perplexity.ai/docs/agent-api/models.md).

Notes on the table:

- **Gemini free-tier rate limits** were not on the rate-limit page ("check AI Studio"). Limits are per project and RPD resets at midnight Pacific time ([rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)). Gemini 3 billing note: text inside PDFs is not charged; pages processed as images are counted as image tokens ([documents](https://ai.google.dev/gemini-api/docs/document-processing)).
- **Claude 1M context** is listed as the standard window for all four current models, not a beta, on the overview page today. Whether a surcharge applies above some prompt length: the overview says "See Pricing for cache writes, long-context" so a surcharge **may exist; check [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)** (not fetched). Perplexity's table shows Haiku 5.5 at a higher rate above 100K, which hints at tiering (Third-party).
- **Claude PDF cost:** the fetched PDF page text gave "about 1,000 tokens for a 3-page PDF" in text-only mode and "about 7,000 tokens for a 3-page PDF" with full visual mode (that wording came from the Bedrock Converse section of the page). The Messages API per-page figure was not captured: **UNVERIFIED**. Use the [token counting endpoint](https://platform.claude.com/docs/en/build-with-claude/token-counting) with a real PDF.
- **OpenAI** context windows were not on the pricing page. Note the 272K split for pricing. GPT-6 family names are as listed on the page; check each model page.
- **DeepSeek** list input/output prices were not captured in the fetch (only the cache-hit column). Peak hours are 01:00 to 04:00 and 06:00 to 10:00 UTC on weekdays; off-peak is half price.

---

## 3. Longer, more specific answers within limits

The goal is a long, specific, cited answer when one call can only carry about 8K tokens in and a limited number out. Each mechanism below is a pattern the Researchie pipeline can implement on top of the OpenAI-compatible adapter without changing provider.

| Mechanism | How it works | Fit here | Reference |
|---|---|---|---|
| **Outline then expand (sectional generation)** | Call 1: given the question and short clip titles, produce an outline (5 to 8 headings, each with the clip ids that belong). Calls 2..n: write one section, sending only that section's clips. Stitch together. Each call stays under the TPM cap; total output can be many thousands of words. | Best fit for AI section drafts and long synthesis. The paper outline already has sections. | Pattern described in LangChain's summarisation guides and "skeleton-of-thought" ([arXiv 2307.15337](https://arxiv.org/abs/2307.15337), not fetched this session) |
| **Map-reduce synthesis** | Map: one short call per clip batch returns claims with clip ids. Reduce: merge the claim lists into the answer. Can run in parallel under RPM, but TPM is shared, so serialise on Groq free. | For "synthesise across 50 clips". | [LangChain map-reduce summarisation](https://python.langchain.com/docs/tutorials/summarization/) (not fetched) |
| **Refine (iterative)** | Draft with batch 1, then "improve this draft using batch 2" and so on. Order-dependent and slower; keeps context small. | Use for narrative sections where earlier text matters. | Same LangChain guide |
| **Continuation loop on `finish_reason: "length"`** | If the response ends with `length`, send the answer so far as an assistant message plus "Continue exactly where you stopped" and append. Cap at N rounds. Detect cut-off mid-citation and trim to the last full sentence. Some providers do not support assistant-prefill; with an OpenAI-compatible API, put the previous text in the prompt instead. | Cheap safety net. Needed because `max_completion_tokens` can be reached before the answer ends. | [OpenAI chat completions `finish_reason`](https://platform.openai.com/docs/api-reference/chat/object) (not fetched) |
| **Structured output** | Ask for JSON (claims, evidence, clip id, quote) and render it. Removes filler and makes citations checkable. JSON mode or schema support differs per model: **UNVERIFIED on Groq gpt-oss**; test. | Good for Q&A with citations. | [Groq structured outputs docs](https://console.groq.com/docs/structured-outputs) (not fetched) |
| **Prompt caching** | Put the stable part (instructions, clips) first, the question last. Groq: 50% off cached input, and cached tokens do not count toward rate limits, on gpt-oss models, minimum 128 to 1,024 tokens, 2-hour expiry. Claude: cache reads are 5% of input price on Sonnet 5.5 / Opus 5.5 (2.5% on Fable 5.1), 10% on others. Gemini: context caching $0.075 per 1M on 3.8 Flash. | Large gain: re-asking questions over the same clip set stops costing TPM on Groq. Requires an identical prefix. | Pages cited in section 1 and 2 |
| **Context compaction / hierarchical summarisation** | Summarise each clip once (store the summary), then summarise groups of summaries. Answer from the top level, drill into the raw clip only when a claim needs a quote. | Stored per clip in Supabase; recompute when a clip changes. | [RAPTOR, arXiv 2401.18059](https://arxiv.org/abs/2401.18059) (not fetched) |
| **RAG with reranking** | Retrieve top 30 by pgvector, rerank to top 8 with a cross-encoder or an LLM scoring call, send only those. | Replaces "send all clips" and cuts tokens. Reranker options (Cohere Rerank, a local BGE reranker) not verified this session. | [pgvector](https://github.com/pgvector/pgvector) |
| **Citation-grounded generation** | Number each clip in the prompt; require `[n]` after every claim; after generation, check each cited quote against the clip text with the existing `checkQuoteAgainstPages` (`src/lib/ai/claimSupport.ts`). Drop or flag unsupported claims. Claude's API also has a native citations feature tied to PDF input (per the PDF page, visual mode "requires citations to be enabled"). | Matches the app's trust model. Verification is token-free. | [Anthropic citations](https://platform.claude.com/docs/en/build-with-claude/citations) (not fetched) |
| **Ask for length and specifics explicitly** | Give a target (e.g. "400 to 600 words, name the sample size and the effect"), forbid summarising what the clips say in general terms, require one concrete detail per claim. Cheap, often the biggest quality lever. | No cost. | Prompting best practice; no single primary source |

Practical Groq budget, assuming 8K TPM: system prompt 300, 6 clips at about 500 tokens each (3,000), question 100, answer reserved 2,000 gives about 5,400 per call, so one section per minute. A 6-section draft takes about 6 minutes on the free tier. Use `retry-after` and show progress per section.

---

## 4. Token management

| Need | Tool or method | Notes |
|---|---|---|
| **Counting before sending** | `tiktoken` ([GitHub](https://github.com/openai/tiktoken), MIT, 19.5K stars, last push 2026-08-17) for OpenAI-style estimates; a JS port is needed for Next.js (e.g. `js-tiktoken`, not checked). For Groq's gpt-oss models the tokenizer is not stated on the pages fetched, so treat tiktoken as an estimate. Fallback: chars / 4 (what the repo uses). | Count in the route, leave 10 to 15% margin. |
| **Provider count endpoints** | Anthropic has a [token counting endpoint](https://platform.claude.com/docs/en/build-with-claude/token-counting) (linked from the models page area; not fetched). Gemini has `countTokens` (not fetched). | Use for PDFs, where estimates fail. |
| **Budgeting** | Per call: `budget = TPM_limit - reserved_output - system_prompt`. Fill clips by relevance rank until the budget is hit. Drop whole clips, not half a clip. | Replace the fixed 14,000-char trim in `passages.ts` with a token budget read from model metadata. |
| **Caching** | See section 3. Keep the clip block first and byte-identical between calls. | Groq gpt-oss only. |
| **Batching** | Groq Batch (50% off, 24 h to 7 days), Gemini Batch (50% off), Claude Batch (50% off, up to 300K output with beta header), OpenAI Batch (50% off). | For background jobs (summarise all clips, rebuild context). Not for chat. |
| **Rate-limit handling** | On 429, wait `retry-after` seconds (Groq sets it only on 429). Read `x-ratelimit-remaining-tokens` and `x-ratelimit-reset-*` on every response to pre-empt the next call. Keep a per-user token bucket sized to the TPM cap and refill per minute. Exponential backoff with jitter if no header. Requests rejected with 429 are not billed on Perplexity (stated on its pricing page). | The BYOK key's limits apply to the user, so keep the bucket in the user's session or database row, not a global variable. |
| **Routing and fallback** | App already has `fallbackModels` in `providers.ts`. Gateways: [LiteLLM](https://github.com/BerriAI/litellm) (Python proxy, 62.2K stars, pushed 2026-10-28, licence field `NOASSERTION`, so read the LICENSE file), [OpenRouter](https://openrouter.ai) (hosted, one key), [Vercel AI SDK](https://github.com/vercel/ai) (TypeScript, 27.6K stars, pushed 2026-10-28, licence `NOASSERTION`, check the file; it is Apache-2.0 to my knowledge, UNVERIFIED). | The AI SDK is the natural fit for a Next.js app; LiteLLM adds a Python service, which the repo does not run in production. |

---

## 5. Tools to understand existing files and generate from them

Stars and last push from the GitHub API on 2026-10-28. Licence is the `spdx_id` the API returned.

| Tool | What it is | GitHub | Stars | Last push | Licence | Fit |
|---|---|---|---|---|---|---|
| **LlamaIndex** | RAG framework; loaders, indexes, query engines, TS version exists | [run-llama/llama_index](https://github.com/run-llama/llama_index) | 52.7K | 2026-10-26 | MIT | Python-first. TS port (`LlamaIndex.TS`) not checked. |
| **LangChain** | Chains, retrievers, summarisation recipes; JS version `langchainjs` | [langchain-ai/langchain](https://github.com/langchain-ai/langchain) | 148.6K | 2026-10-28 | MIT | Heavy. Use for reference patterns, not necessarily as a dependency. |
| **Cognee** | Memory/graph pipeline; already used in `scripts/cognee_graph_builder.py` | [topoteretes/cognee](https://github.com/topoteretes/cognee) | 32.8K | 2026-10-28 | Apache-2.0 | Already in the repo. Python, offline script. |
| **Microsoft GraphRAG** | Graph-based RAG with community summaries; strong at "global" questions over a corpus | [microsoft/graphrag](https://github.com/microsoft/graphrag) | 36.5K | 2026-10-27 | MIT | Indexing is token-heavy; poor fit for a free Groq key. |
| **LightRAG** | Lighter graph RAG, incremental updates | [HKUDS/LightRAG](https://github.com/HKUDS/LightRAG) | 40.4K | 2026-10-27 | MIT | Cheaper than GraphRAG; still Python and LLM-heavy at index time. |
| **Haystack** | Pipeline framework for RAG | [deepset-ai/haystack](https://github.com/deepset-ai/haystack) | 26.9K | 2026-10-27 | Apache-2.0 | Python only. |
| **Vercel AI SDK** | TypeScript model-calling layer, streaming, tools | [vercel/ai](https://github.com/vercel/ai) | 27.6K | 2026-10-28 | NOASSERTION (check) | Best match for Next.js. |

**Long context vs RAG.** Gemini and Claude now take about 1M tokens, so for a single paper set you can skip retrieval and send everything. Costs: Claude Sonnet 5.5 at $2 per 1M input means a 500K-token prompt costs about $1 per call (a 5% cache read on repeat calls cuts it a lot); Gemini 3.8 Flash at $0.75 per 1M means about $0.38. RAG still wins when the library is bigger than the window, when speed matters, and on Groq's 8K TPM. The usual mixed design: RAG to pick clips, long context only for "read these 3 papers fully". A benchmark comparing the two on research clips has not been run here; the quality claim is **UNVERIFIED**.

**Recommendation for Researchie:** keep Supabase + pgvector as the retrieval layer, keep Cognee for the graph experiment, and do not add LlamaIndex or LangChain as dependencies. Write the thin map-reduce and outline-expand code directly; it is a few hundred lines and avoids a heavy dependency in the Next.js bundle.

---

## 6. Long and complex PDFs, many files at once

| Tool | Limits and cost | Self-host / hosted | Fit for a Next.js/Node app |
|---|---|---|---|
| **pdf.js** ([mozilla/pdf.js](https://github.com/mozilla/pdf.js), 54.1K stars, pushed 2026-10-27, Apache-2.0) | Text layer only; no OCR; reading order on two-column papers can be wrong (known weakness; not re-verified today). | Runs in the browser or Node | Already used. Keep as default. |
| **Tesseract.js** | OCR in the browser; slow on long scans. | Browser | Already used for scans. |
| **Docling** ([docling-project/docling](https://github.com/docling-project/docling), 69.7K stars, pushed 2026-10-27, MIT) | Layout-aware PDF to Markdown/JSON; tables; OCR; runs on CPU/GPU. Speed numbers not verified. | Self-host (Python) | Run as a separate small service or offline script. Good first upgrade for two-column papers and tables. |
| **Marker** ([datalab-to/marker](https://github.com/datalab-to/marker), 40.7K stars, pushed 2026-10-22, Apache-2.0 code) | PDF to Markdown with equations and tables. Model weights carry their own licence with revenue limits (stated in its README from memory; **UNVERIFIED**, check before commercial use). | Self-host (Python) | Same pattern as Docling. |
| **MinerU** ([opendatalab/MinerU](https://github.com/opendatalab/MinerU), 82.7K stars, pushed 2026-10-26, licence `NOASSERTION`) | Strong on Chinese and scientific layout (from memory, UNVERIFIED). Read LICENSE before use. | Self-host (Python) | Same. |
| **Unstructured** ([Unstructured-IO/unstructured](https://github.com/Unstructured-IO/unstructured), 15.6K stars, pushed 2026-10-28, Apache-2.0) | Many file types (docx, html, pptx, pdf). Hosted API exists; price not checked. | Self-host or hosted | Good for "many different file types at once". |
| **LlamaParse** ([run-llama/llama_cloud_services](https://github.com/run-llama/llama_cloud_services), 4.3K stars, last push 2026-05-18, MIT) | Hosted parser; pricing not checked. Repo has had no push in five months, so check whether it moved. | Hosted | Sends the PDF to a third party; weak for sensitive clips. |
| **GROBID** (`kermitt2/grobid`) | Scholarly PDF to TEI XML: header, references, sections, citations. The GitHub API returned a "Moved Permanently" redirect today, so the repo has moved (probably to `grobidOrg/grobid`, **UNVERIFIED**). Stars, licence and last commit not captured. | Self-host (Java service) | Best for extracting reference lists and metadata, which Researchie's citation features need. Run via Docker. |
| **Mistral OCR** | Hosted. Price per 1,000 pages not on the Mistral pricing page text I fetched. Third-party reports: OCR 4 at $4 per 1,000 pages ($2 batch), OCR 3 at $2. Treat as **UNVERIFIED**. One third-party page says Mistral's API is "business customers only" since August 2026, also UNVERIFIED. | Hosted | Per-user key needed; privacy trade-off. |
| **Gemini native PDF** | Up to 50 MB or 1,000 pages; 258 tokens per page; Files API free, files kept 48 hours. Gemini 3: native text in PDFs is not charged, image-processed pages are. Source: [documents](https://ai.google.dev/gemini-api/docs/document-processing). | Hosted | Easy via the Google adapter. Sends the whole PDF to Google. |
| **Claude PDF support** | 32 MB request cap, up to 600 pages (100 when the context window is under 1M). Text-only mode vs visual mode (the visual mode needs citations on). Per-page token cost on the Messages API not captured (**UNVERIFIED**). Source: [PDF support](https://platform.claude.com/docs/en/build-with-claude/pdf-support). | Hosted | Optional provider. |
| **NotebookLM** | Already covered in `docs/research/notebooklm-zotero-workflow.md`. Not repeated here. | n/a | n/a |

Fit summary: for "many files at once", the cheap path is to keep pdf.js plus Tesseract in the browser, extract text once, and store the per-page text. Spend effort on Docling or GROBID only if testers report broken reading order or missing references. A Python sidecar is the cost; the repo already has Python scripts but no deployed Python service.

---

## 7. Subscriptions versus API

| Product | Can the subscription act as an API key in a third-party app? | Separate paid API needed? | Policy |
|---|---|---|---|
| **Claude.ai Free / Pro / Max** | **No.** Anthropic's compliance page: OAuth "is intended exclusively for purchasers of Claude Free, Pro, Max, Team, and Enterprise subscription plans and is designed to support ordinary use of Claude Code and other native Anthropic applications". Developers building products, "including those using the Agent SDK, should use API key authentication through Claude Console or a supported cloud provider". "Anthropic does not permit third-party developers to offer Claude.ai login into their own applications, or to route requests through Free, Pro, or Max plan credentials on behalf of their users", and developers may not "collect, store, or intermediate Claude.ai credentials or session tokens". Using the subscription in Researchie would break these terms and risks account action ("without prior notice"). | **Yes.** API key from the Claude Console, billed per token. | [Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance) (Verified). Consumer Terms section 3 item 7 restricts automated or non-human access except via an Anthropic API key ([consumer terms](https://www.anthropic.com/legal/consumer-terms), Verified). Press coverage dates the tightening to February 2026 ([The Register](https://www.theregister.com/software/2026/02/20/anthropic-clarifies-ban-on-third-party-tool-access-to-claude/5014546), Third-party). |
| **Claude Code on the owner's own machine** | The owner can sign in to the unmodified Claude Code binary with their subscription ("ordinary, individual usage"). That does not extend to serving other users through Researchie. | n/a for personal use in Claude Code itself | Same compliance page. |
| **Perplexity Pro** | **No.** Perplexity's docs say the API is a separate product. Third-party and search-result reporting says Pro includes a **$5 monthly API credit**, but the Perplexity pages found were undated and one third-party guide says the perk **ended in February 2026**. Treat the credit as **UNVERIFIED**; check `docs.perplexity.ai` and your account's API billing page. | **Yes** (prepaid credits; API keys block when the balance is empty, per search-result summary) | [Perplexity pricing docs](https://docs.perplexity.ai/guides/pricing) (Verified: no mention of Pro credit); getting-started page (Third-party summary) |
| **ChatGPT Plus** | **No.** OpenAI's help and staff forum answers say a ChatGPT subscription does not include API access; API needs its own billing with prepaid credits. | **Yes** | [OpenAI help article](https://help.openai.com/en/articles/6950777) (search result, page returned 403 to fetch); [community answer](https://community.openai.com/t/api-chatgpt-subscription-cannot-use-api-with-chatgpt-subscription/875542) (Third-party/staff) |
| **Google AI Pro / Gemini app** | **No link needed.** The Gemini API has its own free tier in AI Studio, with no subscription. A Google AI Pro plan is not required and does not appear to change API limits (**UNVERIFIED**). Limits are per project. | **No** for the free tier; paid tier for higher limits | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing); [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) |

**Perplexity API models:** the Agent API model list shows `perplexity/sonar` at $0.25 in / $2.50 out per 1M (cache read $0.0625) and many third-party models routed through Perplexity. Context window for Sonar is **not stated** there. Sonar Pro at $3 / $15 with about 200K context is reported by third parties only (UNVERIFIED). The Search API costs $5 per 1,000 requests ($1 with Fast Search) ([pricing docs](https://docs.perplexity.ai/guides/pricing)).

**Does Perplexity suit web-grounded research?** For "find new papers and web pages on this topic" yes, as a source finder (Search API returns results; Sonar returns a cited answer). It does not answer from the user's saved clips, so it complements Q&A rather than replacing it. Citations from a web-grounded model still need the same verification the app applies to clips. Not recommended for the clip pipeline.

**Anthropic API pricing** (Verified, models page): Fable 5.1 $10 / $50; Opus 5.5 $4 / $20; Sonnet 5.5 $2 / $10; Haiku 5.5 from $0.10 / $0.50. Batch is 50% off. Full cache write and long-context figures are on [pricing](https://platform.claude.com/docs/en/about-claude/pricing) (not fetched).

---

## Privacy and data retention for a BYOK research tool

Clips can hold unpublished results or patient data. The provider choice decides who sees them.

| Provider | What we can say | Source / status |
|---|---|---|
| **Groq** | Existing app note: Groq says it does not keep prompts or answers except briefly for troubleshooting or abuse checks (up to 30 days), with a Data Controls switch. Batch inputs and results are kept up to 30 days and can be deleted. | Repo `providers.ts` note (checked 2026-10-15); [batch docs](https://console.groq.com/docs/batch) (Verified for batch) |
| **Google Gemini free tier** | Per repo note: free-tier content may be used to improve products and read by people; EU/UK/Switzerland get paid-tier terms. Files API files live 48 hours. | Repo `providers.ts` note; [documents](https://ai.google.dev/gemini-api/docs/document-processing) |
| **Anthropic API** | Commercial Terms apply to API keys, not the Consumer Terms. Zero data retention is "eligible" for PDF support except on Covered Models, per the PDF page metadata. Default retention period not captured. | [Consumer terms](https://www.anthropic.com/legal/consumer-terms), [PDF support](https://platform.claude.com/docs/en/build-with-claude/pdf-support); retention days **UNVERIFIED** |
| **Mistral free plan** | Pricing table shows "Model training: Opt-out" on three plans; which plan is unclear. Repo already warns it trains unless opted out. | [Mistral pricing](https://mistral.ai/pricing) |
| **OpenRouter** | Passes text to the model host; policies differ per host. | Repo note |
| **DeepSeek, Cerebras, OpenAI, Perplexity** | Not verified in this pass. | UNVERIFIED |

Rule for the UI: keep the current warning for patient or identifiable data, add a per-provider line, and never default to a provider with an UNVERIFIED retention policy.

---

## 8. Recommended architecture and staged adoption

Today: one OpenAI-compatible adapter (`src/lib/ai/adapters/groq.ts`) serves four providers listed in `src/lib/ai/providers.ts`, and only Groq is offered (`PROVIDER_ORDER`). Passages are trimmed by characters in `src/lib/ai/passages.ts`.

Target:

```
question / outline item
  -> retrieve (pgvector top 30) -> rerank -> top N clips
  -> budget by tokens for the chosen model (model metadata: context, TPM, max output)
  -> generate sectionally (outline -> expand), cache-friendly prompt order
  -> verify citations against clip text (claimSupport.ts)
  -> continue on finish_reason=length, retry on 429 with retry-after
```

| Stage | Change | Files | Effort |
|---|---|---|---|
| 1 | Add model metadata (`contextWindow`, `maxOutput`, `tpm`, `supportsCaching`, `supportsPdf`) next to `fallbackModels`. Replace the 14,000-char trim with a token budget. Read `x-ratelimit-*` and `retry-after`; add backoff and a per-user token bucket. Handle `finish_reason: "length"` with a bounded continuation loop. | `providers.ts`, `passages.ts`, `adapters/groq.ts`, `service.ts` | **Small** |
| 2 | Order prompts for caching (clips first, question last) so Groq's gpt-oss cache applies (50% off, not counted in rate limits). | `service.ts`, `passages.ts` | **Small** |
| 3 | Outline-then-expand for AI section drafts and map-reduce for multi-clip synthesis; show per-section progress. Store a short summary per clip (hierarchical). | `service.ts`, `src/app/api/ai/synthesize`, `qna`, paper draft code | **Medium** |
| 4 | Citation check after generation using `checkQuoteAgainstPages`; flag unsupported claims in the UI. | `claimSupport.ts`, UI | **Small to medium** |
| 5 | Re-enable Google as a second provider with a "read whole PDF" path (Files API, 258 tokens a page, 1M context). Add the privacy line per provider. Test the OpenAI-compatible endpoint with PDFs; if it does not accept files, call the native API for this path only. | `providers.ts`, new `adapters/gemini.ts` | **Medium** |
| 6 | Optional Anthropic provider for paying users (API key, not subscription). Check whether Anthropic exposes an OpenAI-compatible endpoint (**UNVERIFIED**); otherwise use its native Messages API through the Vercel AI SDK or a small adapter. Show clear text: "This needs a Claude API key from console.anthropic.com. Your Claude.ai subscription cannot be used." | `providers.ts`, new adapter | **Small to medium** |
| 7 | Background jobs on Batch APIs (Groq, Gemini, Claude all 50% off) for "summarise every clip". | scripts or a job route | **Medium** |
| 8 | PDF quality: try Docling or GROBID as an offline sidecar on a sample of two-column papers before committing. | `scripts/`, new service | **Large** |

---

## Open questions / UNVERIFIED

- Groq free-tier limits: the page shows one table under both headings. Read `console.groq.com/settings/limits` signed in.
- Whether Groq returns 413 or 429 when one prompt exceeds the TPM cap, and how `max_tokens` counts toward TPM.
- Groq gpt-oss structured-output / JSON mode support; any Groq file input beyond images and Batch `.jsonl`.
- Groq prices for `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `minimax-m2.7`: the models page says "Contact Sales".
- Gemini Flash context window and max output; Gemini free-tier RPM/TPM/RPD (shown only in AI Studio); whether the OpenAI-compatible endpoint accepts PDFs.
- Claude: long-context price tiers, per-page PDF token cost on the Messages API, API data-retention days, whether an OpenAI-compatible endpoint exists.
- OpenAI context windows and PDF input for the GPT-6 family; any free API tier.
- DeepSeek list prices, free tier, PDF input, data-handling terms. Cerebras current models and limits. Mistral context windows, OCR price (third-party only), and which plan trains on data.
- Perplexity: whether Pro still includes any monthly API credit; Sonar and Sonar Pro context windows; data-retention terms.
- OpenAI help article was not fetchable (HTTP 403); the "Plus has no API access" claim rests on a search result summary and staff forum posts.
- Anthropic's compliance wording: one third-party blog says the Agent SDK sentence was removed in October 2026. The compliance page fetched today still contains "including those using the Agent SDK". Conclusion unchanged either way, but re-read the page before shipping any wording.
- GROBID repo location, stars, licence; MinerU, LiteLLM and Vercel AI SDK licence files (API returned `NOASSERTION`); Marker model-weight licence; JS tokenizer package choice.
- Academic claims in section 3 (skeleton-of-thought, RAPTOR) and the LangChain, LlamaIndex, Groq structured-output and Anthropic citations URLs were not fetched this session.
- No benchmark was run for long-context versus RAG quality on real clips.

---

## Sources

Groq
- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/models
- https://console.groq.com/docs/prompt-caching
- https://console.groq.com/docs/batch
- https://console.groq.com/docs/vision
- https://console.groq.com/docs/errors
- https://groq.com/pricing (no token prices on page)

Google
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/gemini-api/docs/document-processing
- https://ai.google.dev/gemini-api/docs/rate-limits

Anthropic
- https://platform.claude.com/docs/en/about-claude/models/overview
- https://platform.claude.com/docs/en/build-with-claude/pdf-support
- https://code.claude.com/docs/en/legal-and-compliance
- https://www.anthropic.com/legal/consumer-terms
- https://www.theregister.com/software/2026/02/20/anthropic-clarifies-ban-on-third-party-tool-access-to-claude/5014546 (third-party)

Other providers
- https://developers.openai.com/api/docs/pricing
- https://help.openai.com/en/articles/6950777 (search result only)
- https://community.openai.com/t/api-chatgpt-subscription-cannot-use-api-with-chatgpt-subscription/875542 (third-party)
- https://api-docs.deepseek.com/quick_start/pricing
- https://mistral.ai/pricing
- https://www.cerebras.ai/pricing
- https://docs.perplexity.ai/guides/pricing
- https://docs.perplexity.ai/docs/getting-started/pricing
- https://docs.perplexity.ai/docs/agent-api/models.md
- Third-party search results for Mistral OCR/Medium/Small prices (cloudzero.com/blog/mistral-api-pricing, tech-insider.org) and Perplexity Pro credit (getaiperks.com, docs.perplexity.ai/getting-started via search summary)

GitHub (API, 2026-10-28)
- https://github.com/run-llama/llama_index
- https://github.com/langchain-ai/langchain
- https://github.com/topoteretes/cognee
- https://github.com/microsoft/graphrag
- https://github.com/HKUDS/LightRAG
- https://github.com/deepset-ai/haystack
- https://github.com/docling-project/docling
- https://github.com/datalab-to/marker
- https://github.com/opendatalab/MinerU
- https://github.com/Unstructured-IO/unstructured
- https://github.com/run-llama/llama_cloud_services
- https://github.com/kermitt2/grobid (moved)
- https://github.com/BerriAI/litellm
- https://github.com/vercel/ai
- https://github.com/mozilla/pdf.js
- https://github.com/openai/tiktoken

Repo (read 2026-10-28)
- `src/lib/ai/providers.ts`, `docs/research/notebooklm-zotero-workflow.md`
