# AI Knowledge Retrieval Plan

> Future implementation plan for adding fast, source-grounded FAQ and public-document retrieval to InfraWatch AI using PostgreSQL, pgvector, and a locally hosted multilingual embedding model.

---

## 1. Status and purpose

**Status:** Proposed for future implementation. This document is architectural guidance only; it does not indicate that vector retrieval is currently enabled.

InfraWatch AI currently answers structured project questions through bounded backend tools that query the local InfraWatch PostgreSQL read model. The public FAQ is currently static content in `app/(public)/faq/page.tsx`. There is no vector extension, embedding service, knowledge-document schema, ingestion pipeline, or semantic-retrieval tool in the current implementation.

This plan adds retrieval-augmented generation (RAG) for approved unstructured information such as FAQs, public guidance, definitions, and policies. It must not replace deterministic SQL queries for project counts, budgets, statuses, identifiers, or exact project details.

## 2. Decision

Use the following initial stack:

| Concern | Decision |
| --- | --- |
| Vector storage | Existing PostgreSQL with the open-source `pgvector` extension |
| Embedding model | Locally hosted `intfloat/multilingual-e5-small` |
| Embedding dimension | 384 |
| Retrieval | Hybrid PostgreSQL full-text search and pgvector cosine similarity |
| LLM integration | A bounded `searchKnowledge` backend tool |
| Source of truth | Versioned, publishable knowledge documents stored in PostgreSQL |
| Hosting | Self-hosted; embedding service available only on the private application network |

### Why pgvector

pgvector is preferred over a separate vector database for the expected InfraWatch knowledge volume because it:

- reuses the existing PostgreSQL security, backup, monitoring, and recovery procedures;
- avoids another production database and storage volume;
- supports exact and approximate nearest-neighbor search;
- allows SQL joins and authorization filters to be applied before similarity ranking;
- integrates with the existing TypeScript, Bun, Drizzle, and PostgreSQL stack; and
- is sufficient for thousands to hundreds of thousands of document chunks.

A dedicated vector service such as Qdrant may be reconsidered if the collection grows to millions of chunks, independent horizontal scaling becomes necessary, or vector workloads materially interfere with transactional PostgreSQL performance.

### Why multilingual E5 small

`intfloat/multilingual-e5-small` is the initial embedding model because it is open source, produces compact 384-dimensional embeddings, supports multilingual retrieval, and is practical on the current self-hosted infrastructure. English and Filipino retrieval quality must still be validated with an InfraWatch-specific evaluation set before production release.

Changing the embedding model or vector dimension later requires versioning and re-embedding the indexed corpus. The model identifier and embedding version must therefore be stored with every chunk.

## 3. Scope

### Content suitable for knowledge retrieval

- Frequently asked questions
- About InfraWatch content
- Public user guides
- Map and source-backed coordinate explanations
- Project-field and data-completeness definitions
- Approved budget and supplier actual bid explanations
- Citizen feedback and evidence-submission guidance
- Public privacy and moderation guidance
- Approved public BAFE infrastructure policies and reference documents

### Content that must not enter the public index

- Raw chat histories
- Private or unmoderated citizen submissions
- User profiles, sessions, or contact details
- Audit logs
- Internal administrative notes
- Draft or unpublished policies
- Credentials, environment values, or infrastructure secrets
- Raw source payloads containing fields that are unnecessary for the public answer
- Documents whose publication or access scope cannot be verified

### Data that should remain in deterministic SQL tools

- Project counts and aggregate budgets
- Project status and program breakdowns
- ABEMIS IDs and project codes
- Exact project details
- Geographic fields
- Sync results and freshness
- Administrative analytics and region-scoped managerial data

Vector retrieval is for explanatory text. It must not become the authoritative calculation engine for structured project facts.

## 4. Proposed architecture

```text
Authorized author or administrator
              |
              v
Knowledge document draft -> review -> publish
              |
              v
Chunking and content hashing
              |
              v
Private local embedding service
              |
              v
PostgreSQL knowledge chunks + pgvector index
              |
              v
Hybrid keyword and semantic retrieval
              |
              v
Bounded searchKnowledge tool
              |
              v
LLM answer with source title and canonical URL
```

Runtime request flow:

1. The browser sends the user's message to the existing chat backend.
2. The backend policy layer determines whether knowledge retrieval is permitted and relevant.
3. The LLM requests `searchKnowledge` with a bounded query.
4. The backend embeds the query using the private local embedding service.
5. PostgreSQL runs authorized full-text and vector searches.
6. The backend combines and ranks the results, applies a relevance threshold, and returns at most four to six chunks.
7. The LLM answers only from the approved retrieved context and includes canonical source links.
8. If no result meets the threshold, the assistant states that no approved source was found instead of guessing.

No browser, public user, or LLM provider receives database credentials. The external text-generation provider receives only the minimum approved chunks required for the answer.

## 5. Proposed data model

Exact names may change during implementation, but the model should preserve the following boundaries.

### `knowledge_documents`

| Column | Purpose |
| --- | --- |
| `id` | Internal UUID |
| `title` | Human-readable source title |
| `slug` | Stable public identifier |
| `content` | Canonical approved Markdown or text |
| `category` | FAQ, guide, policy, definition, or other approved category |
| `source_type` | Internal page, uploaded document, or approved external source |
| `source_url` | Canonical user-verifiable URL |
| `language` | Source language |
| `visibility` | Public, authenticated, or administrative |
| `status` | Draft, published, or archived |
| `version` | Source-content version |
| `published_at` | Publication timestamp |
| `created_by` / `updated_by` | Authorized editor IDs |
| `created_at` / `updated_at` | Audit timestamps |

### `knowledge_chunks`

| Column | Purpose |
| --- | --- |
| `id` | Internal UUID |
| `document_id` | Parent document foreign key |
| `chunk_index` | Stable order within the source |
| `heading` | Nearest source heading |
| `content` | Searchable approved chunk text |
| `content_hash` | Detects unchanged chunks and prevents unnecessary re-embedding |
| `embedding` | `vector(384)` for the selected model |
| `embedding_model` | Exact model identifier |
| `embedding_version` | Application-controlled embedding schema version |
| `metadata` | Bounded JSON metadata needed for filtering and citations |
| `created_at` / `updated_at` | Audit timestamps |

Recommended constraints include a unique key on `(document_id, chunk_index, embedding_version)` and a foreign key that removes obsolete chunks when the owning document is permanently removed through an approved administrative process.

## 6. Content lifecycle and ingestion

1. An authorized editor creates or updates a knowledge document.
2. Draft content remains unavailable to public retrieval.
3. Publication validates the title, canonical URL, visibility, and content.
4. The backend chunks the approved content by semantic sections and headings.
5. Each chunk receives a content hash.
6. Only new or changed chunks are sent to the embedding service.
7. The document and all replacement chunks are committed transactionally when possible.
8. Old published embeddings are replaced or marked inactive only after the new version is ready.
9. Archiving a document immediately excludes it from retrieval.
10. Failed embedding jobs leave the previous published version available and report the new version as pending or failed.

For short FAQs, one question-and-answer pair should normally be one chunk. Long documents should be divided along heading and paragraph boundaries; chunks must not be cut blindly in the middle of a sentence or rule.

## 7. Retrieval design

### Hybrid search

Use both:

- PostgreSQL full-text ranking for exact terms, acronyms, project programs, and official phrases; and
- pgvector cosine similarity for semantic matches and differently worded English or Filipino questions.

The backend should normalize both scores and combine them using weights validated by retrieval tests. Initial weights are implementation details and must not be treated as final without evaluation.

### Required filters

Before ranking or returning a result, enforce:

- `status = published`;
- visibility permitted for the current chat surface and user;
- active embedding version;
- allowed source category; and
- any role, region, or agency scope required by a non-public knowledge collection.

Authorization must be applied in the retrieval query or trusted service layer, not delegated to the LLM prompt.

### Bounded result contract

`searchKnowledge` should return no more than four to six results. Each result should contain only:

```json
{
  "documentId": "uuid",
  "title": "Why are some projects missing from the map?",
  "heading": "Map coverage",
  "content": "The map shows only projects with usable, source-backed coordinates...",
  "sourceUrl": "/faq#missing-map-projects",
  "language": "en",
  "score": 0.89,
  "updatedAt": "2026-08-21T00:00:00.000Z",
  "untrustedText": true
}
```

Retrieved content is untrusted data even when it comes from an approved source. It must never be interpreted as a system instruction or tool command.

### Citations and failure behavior

- Answers must link to the canonical source URL.
- The assistant must distinguish retrieved policy text from structured project facts.
- No answer should cite a chunk that was not returned by the tool.
- Low-confidence retrieval must produce an honest no-source-found response or a clarifying question.
- Missing information must remain unavailable; retrieval must not infer or manufacture values.

## 8. Embedding service

Run the embedding model in a dedicated container or process on the private Docker network. The service should:

- accept only bounded batches and bounded text length;
- expose no public port through the reverse proxy or firewall;
- return normalized 384-dimensional vectors;
- provide health and model-version information;
- enforce request timeouts and concurrency limits;
- avoid logging full private document content;
- load the model once at startup; and
- fail closed when the configured model does not match the database embedding version.

The production LLM provider and embedding provider are independent. InfraWatch may continue using the configured text-generation provider while producing retrieval embeddings locally.

## 9. Indexing and performance

Begin with exact cosine search if the corpus is small. Add an HNSW index only after measuring corpus size and query latency. Approximate indexing adds build time, memory use, and tuning requirements that may be unnecessary for an initial FAQ collection.

Performance targets for the first production release should include:

- bounded query-embedding latency on the production VM;
- retrieval latency measured separately from LLM generation latency;
- no full knowledge-table scan once the corpus reaches the agreed threshold;
- no unbounded result sets;
- content-hash-based incremental re-indexing; and
- database query plans recorded for representative searches.

A separate Qdrant deployment should be considered only after evidence shows that PostgreSQL vector search is a bottleneck.

## 10. Security and privacy requirements

- Public retrieval must be deny-by-default and restricted to published public content.
- Administrative content must use a separate authorized collection or strict database filters.
- Raw IP addresses and user-agent strings must not be added to the knowledge index.
- Prompts, retrieved chunks, and model responses must follow the existing chat-history retention and access policy.
- Uploaded documents require file-type validation, malware scanning where available, text-extraction limits, and an explicit publication workflow.
- Retrieved documents must be treated as potential prompt-injection content.
- The LLM must not receive SQL access, database credentials, or unrestricted retrieval parameters.
- All ingestion and publication actions should be attributable through the existing audit system.
- Embedding and index rebuild jobs must not expose document text in routine logs.

## 11. Evaluation before release

Create a version-controlled retrieval evaluation set containing representative English and Filipino questions. It should include:

- direct FAQ wording;
- paraphrased questions;
- mixed English and Filipino queries;
- acronym-heavy questions;
- near-duplicate topics;
- questions with no approved answer;
- attempts to retrieve private or draft content; and
- prompt-injection text inside an indexed document.

Measure at minimum:

- Recall@K for the expected source document;
- top-result accuracy;
- citation correctness;
- no-result precision;
- public/private authorization isolation;
- query-embedding and retrieval latency; and
- end-to-end grounded-answer accuracy.

Production enablement requires passing retrieval, authorization, prompt-injection, migration, rollback, and backup-restore tests.

## 12. Proposed implementation phases

### Phase 1 — Knowledge source of truth

- Move FAQ content from hardcoded JSX into a versioned source that can render the same public page.
- Add draft, publication, archive, visibility, and canonical-link rules.
- Preserve the existing FAQ user experience during migration.

### Phase 2 — pgvector and local embeddings

- Confirm the production PostgreSQL version supports the selected pgvector package.
- Add the extension through a reversible migration.
- Add document and chunk schemas.
- Deploy the private local embedding service.
- Implement deterministic chunking, hashing, and idempotent re-indexing.

### Phase 3 — Retrieval service

- Implement authorized hybrid retrieval as a backend service function.
- Add bounded result and relevance-threshold behavior.
- Add English/Filipino retrieval evaluation tests.
- Measure exact search before deciding whether HNSW is needed.

### Phase 4 — LLM integration

- Add the bounded `searchKnowledge` tool to the appropriate chat surfaces.
- Require citations and honest no-source-found behavior.
- Keep project and analytics questions on their existing deterministic tools.
- Record only minimal retrieval metadata needed for observability and audits.

### Phase 5 — Administration and operations

- Add an approved knowledge-authoring and publication workflow only after its permissions and audit requirements are agreed.
- Add embedding-job status, retry, and failure visibility.
- Add backup-restore verification for vector data.
- Add monitoring for model health, indexing failures, latency, and retrieval quality regressions.

## 13. Rollback strategy

The feature must be controlled by a server-side feature flag. If retrieval fails or quality is unacceptable:

1. disable the `searchKnowledge` tool;
2. keep the existing structured project tools and static information pages operational;
3. retain source documents in normal PostgreSQL columns;
4. stop the private embedding service;
5. preserve vector tables for diagnosis or remove them later through a separately approved migration; and
6. restore the previous FAQ rendering path if source-of-truth migration introduced a problem.

Vector retrieval must not become a prerequisite for viewing public FAQ pages.

## 14. Acceptance criteria

The future implementation is complete only when:

- the public FAQ remains accessible without the LLM;
- published FAQ changes reliably update their embeddings;
- draft, archived, private, and unauthorized content cannot be retrieved;
- English and Filipino evaluation queries retrieve the approved sources at the agreed accuracy;
- answers cite canonical InfraWatch pages;
- low-confidence queries do not produce fabricated policy answers;
- structured project questions continue to use deterministic SQL tools;
- retrieval and embedding latency are measured on the production-class VM;
- database and vector backups are restored successfully in a test environment; and
- disabling the feature flag returns the chatbot to its previous behavior without affecting the rest of InfraWatch.

## 15. Decisions required before implementation

- Who may create, review, publish, archive, and restore knowledge documents?
- Which initial documents are approved for the public collection?
- Should Filipino translations be authored separately or retrieved cross-lingually from English sources?
- What relevance threshold and hybrid ranking weights pass the evaluation set?
- What retention and audit metadata are required for retrieval events?
- Should publication embed synchronously for small FAQ edits or through a retryable background job?
- At what measured corpus size or latency should HNSW or a dedicated vector service be introduced?

These decisions should be approved before implementation begins.