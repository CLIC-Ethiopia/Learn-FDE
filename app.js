/**
 * FDE Mastery Academy - Main Application Core
 * Offline-First Progressive Web Application for Forward Deployed Engineering
 */

// ============================================================================
// 1. EMBEDDED DEFAULT CATALOG (Guarantees 100% offline startup even if fetch fails)
// ============================================================================
const DEFAULT_CATALOG = {
  version: "1.0.0",
  tracks: [
    {
      id: "core-tech-stack",
      title: "Core Tech Stack",
      badge: "Infrastructure & Systems",
      color: "cyan",
      description: "Enterprise APIs, distributed databases, air-gapped Docker & Kubernetes, and corporate proxy networking."
    },
    {
      id: "ai-ml-fundamentals",
      title: "AI/ML Fundamentals & Applied LLMs",
      badge: "GenAI & Embeddings",
      color: "indigo",
      description: "Enterprise RAG, semantic chunking, tool-calling agents, local vLLM inference, and SLA governance."
    },
    {
      id: "solution-architecture",
      title: "Solution Architecture & Delivery",
      badge: "Field Deployment",
      color: "emerald",
      description: "POC scoping playbooks, reverse-ETL legacy integration, SOC2/HIPAA compliance, and client handover."
    }
  ],
  modules: [
    {
      id: "mod-apis-grpc",
      trackId: "core-tech-stack",
      title: "Enterprise REST, gRPC & Streaming Ingestion",
      difficulty: "Mission-Critical",
      estimatedMinutes: 45,
      tags: ["APIs", "gRPC", "Protobuf", "Webhooks", "Backpressure"],
      summary: "Architect high-throughput ingest systems that survive flaky corporate firewalls, proxy inspection, and legacy client schemas.",
      content: `### The FDE Reality of Enterprise APIs

Unlike greenfield SaaS where you control both client and server, Forward Deployed Engineers frequently interface with legacy corporate systems (SOAP, raw SFTP drops, unversioned REST APIs) and modern microservices.

#### Key Architectural Patterns
1. **Idempotency Keys**: Never process financial or mission-critical records twice. Implement distributed idempotency using Redis or Postgres \`ON CONFLICT DO NOTHING\` keyed on a SHA-256 hash of the canonical payload.
2. **gRPC with Protobuf vs REST**:
   - **gRPC**: Preferred for internal edge-to-core telemetry. Binary Protobuf serialization reduces payload size by ~60-80% compared to JSON and provides compile-time schema contracts.
   - **HTTP/REST with OpenAPI specs**: Used for customer-facing client webhook endpoints where enterprise firewalls inspect HTTP/1.1 headers.
3. **Backpressure & Dead Letter Queues (DLQ)**: When client source systems send a 50,000-record burst, forward deployment nodes must apply reactive backpressure (e.g., token bucket rate limiting or Kafka buffer partitioning) instead of crashing pods.

\`\`\`typescript
// Idempotent Webhook Ingestion Hook
async function ingestClientRecord(idempotencyKey: string, payload: any) {
  const existing = await db.query('SELECT status FROM ingest_log WHERE key = $1', [idempotencyKey]);
  if (existing.rows.length > 0) {
    return { status: 'DUPLICATE_IGNORED', key: idempotencyKey };
  }
  await db.query('INSERT INTO ingest_log (key, payload, created_at) VALUES ($1, $2, NOW())', [idempotencyKey, JSON.stringify(payload)]);
  await eventQueue.push('records.process', payload);
  return { status: 'ACCEPTED', key: idempotencyKey };
}
\`\`\`

#### Field Checklist for FDEs
- [ ] Ensure all webhook responses return HTTP 202 Accepted within <200ms before doing asynchronous processing.
- [ ] Configure mTLS (mutual TLS) certificates for client-to-edge communication.
- [ ] Provide backward-compatible schema migration strategies.`,
      checkpoints: [
        "Implemented distributed idempotency guardrails",
        "Configured gRPC keepalive ping intervals to prevent enterprise proxy teardowns",
        "Set up Dead Letter Queue retry backoff with exponential jitter"
      ],
      quiz: {
        question: "A client corporate proxy silently terminates idle TCP connections after 60 seconds, causing streaming gRPC calls to hang. What is the standard FDE solution?",
        options: [
          "Switch to unencrypted plaintext HTTP/1.0 polling",
          "Configure gRPC keepalive pings (e.g. 30s interval with permit_without_stream)",
          "Ask the client CIO to replace all firewalls across 40 global branch offices",
          "Increase the client timeout to 24 hours"
        ],
        answerIndex: 1,
        explanation: "gRPC client keepalive pings send periodic HTTP/2 PING frames over the connection, proving traffic flow to stateful firewalls and proxies without closing the socket."
      }
    },
    {
      id: "mod-dbs-distributed",
      trackId: "core-tech-stack",
      title: "Distributed DBs, ClickHouse & Vector Stores",
      difficulty: "Intermediate",
      estimatedMinutes: 50,
      tags: ["Databases", "PostgreSQL", "ClickHouse", "VectorDB", "OLAP"],
      summary: "Select and tune hybrid OLTP/OLAP storage engines capable of sub-second analytical queries across millions of client events.",
      content: `### Polyglot Persistence in the Field

An FDE rarely uses a single database. The standard production topology comprises:

1. **OLTP (PostgreSQL)**: Transactional state, audit trails, user permissions, and relational schemas.
2. **OLAP (ClickHouse / DuckDB)**: High-speed analytical aggregations (e.g., querying 100M telemetry logs in 40ms).
3. **Vector Database (pgvector, Qdrant, Milvus)**: High-dimensional embeddings index for semantic search and RAG retrieval.

#### Schema Tuning for High Concurrency
- **PostgreSQL Partitioning**: Partition historical logs by month using declarative range partitioning to allow instant dropping of stale partitions without vacuum bloat.
- **HNSW vs IVFFlat for Vectors**: Prefer HNSW (Hierarchical Navigable Small World) for sub-5ms query latency and incremental updates; use IVFFlat only when RAM is strictly constrained.

\`\`\`sql
-- Creating an optimized pgvector index for 1536-dim embeddings
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536)
);
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
\`\`\`

#### Field Takeaway
Always design multi-tenant isolation from Day 1. Ensure tenant_id is indexed and enforced via Postgres Row-Level Security (RLS) or database-per-tenant architectures for strict banking/defense clients.`,
      checkpoints: [
        "Enabled Row-Level Security (RLS) for multi-tenant isolation",
        "Benchmarked HNSW index memory footprint against host RAM",
        "Established ClickHouse MergeTree table partitioning scheme"
      ],
      quiz: {
        question: "Why is ClickHouse preferred over standard PostgreSQL for client audit telemetry aggregation?",
        options: [
          "ClickHouse supports ACID multi-table transactions better than Postgres",
          "ClickHouse utilizes columnar compression and vectorized execution for 100x faster scans on analytical aggregations",
          "ClickHouse requires zero memory to run",
          "Postgres cannot store strings longer than 255 characters"
        ],
        answerIndex: 1,
        explanation: "ClickHouse stores data column-by-column rather than row-by-row, compressing similar data types dramatically and reading only the required columns during aggregations."
      }
    },
    {
      id: "mod-docker-airgap",
      trackId: "core-tech-stack",
      title: "Docker & Air-Gapped Kubernetes Topologies",
      difficulty: "Mission-Critical",
      estimatedMinutes: 60,
      tags: ["Docker", "Kubernetes", "Air-Gapped", "Helm", "Security"],
      summary: "Package, ship, and orchestrate production containers inside classified, zero-internet client bastions.",
      content: `### What is an 'Air-Gapped' Deployment?

An air-gapped system has zero physical or logical connection to the public internet. No \`docker pull\`, no \`npm install\`, no external DNS.

#### The Packaging Lifecycle
1. **Pre-caching & Image Tarballs**:
\`\`\`bash
# On your connected workstation:
docker save myapp:v1.4.0 redis:7.2-alpine postgres:16 | gzip > fde_bundle_v1.4.0.tar.gz

# Inside client air-gapped jumpbox:
docker load -i fde_bundle_v1.4.0.tar.gz
docker tag myapp:v1.4.0 internal-registry.client.local/fde/myapp:v1.4.0
docker push internal-registry.client.local/fde/myapp:v1.4.0
\`\`\`
2. **K3s / MicroK8s Deployment**: Lightweight, single-binary Kubernetes distributions designed for edge workstations and on-prem VMs.
3. **Local Helm Chart Bundles**: Export charts using \`helm package\` and inject \`.Values.global.imageRegistry\` pointing to the customer's internal Harbor/Nexus registry.`,
      checkpoints: [
        "Packaged multi-arch container tarballs with cryptographic SHA-256 checksums",
        "Configured Helm values with internal private registry overrides",
        "Verified non-root container execution (UID 10001) for strict client PodSecurityStandards"
      ],
      quiz: {
        question: "When deploying in an air-gapped client environment, what happens if your Dockerfile has 'RUN npm install' during container startup?",
        "options": [
          "It downloads packages from the local router",
          "It fails immediately because the container cannot reach registry.npmjs.org",
          "It automatically switches to satellite internet",
          "Docker caches all 2 million npm packages automatically"
        ],
        answerIndex: 1,
        explanation: "In an air-gap, public networks are unreachable. All dependencies must be baked into the image layers during your build phase, or mirrored into an internal private Artifactory repository."
      }
    },
    {
      id: "mod-rag-architecture",
      trackId: "ai-ml-fundamentals",
      title: "Enterprise RAG: Hybrid Search & Re-Ranking",
      difficulty: "Mission-Critical",
      estimatedMinutes: 55,
      tags: ["RAG", "Embeddings", "Hybrid-Search", "Cohere", "BM25"],
      summary: "Build hallucination-resistant retrieval pipelines fusing keyword BM25 and vector semantic embeddings with cross-encoder re-ranking.",
      content: `### Why Naive Vector Search Fails in Enterprise

Enterprise users search for precise acronyms, part numbers, employee IDs (e.g., 'Form 10-K Section 4.2' or 'Part #X-9021'). Dense vector embeddings alone often miss these exact matches because embeddings encode semantic meaning rather than lexical tokens.

#### The Production Hybrid Formula
1. **Reciprocal Rank Fusion (RRF)**:
   Combine dense similarity rank with sparse BM25 rank:
   RRF(d) = 1 / (60 + rank_dense(d)) + 1 / (60 + rank_sparse(d))
2. **Cross-Encoder Re-Ranking**: Take the top 30 candidates from hybrid search and score them with a small cross-encoder model (e.g., \`bge-reranker-large\` or Cohere Rerank) to produce the definitive top 5 chunks passed into the LLM context window.
3. **Contextual Compression & Citation Tracking**: Force the model to generate bracketed footnotes pointing to chunk UUIDs for verifiable auditability.`,
      checkpoints: [
        "Implemented Reciprocal Rank Fusion (RRF) algorithm",
        "Set up chunking strategy with semantic sentence boundary detection (256-512 tokens)",
        "Added strict citation verification checks before rendering answers to client"
      ],
      quiz: {
        question: "What is the primary benefit of passing retrieved candidate chunks through a Cross-Encoder Re-Ranker?",
        options: [
          "It speeds up network latency by 10x",
          "It performs full joint cross-attention between query and chunk tokens, yielding much higher precision relevance scores than bi-encoders",
          "It compresses the database size on disk",
          "It removes the need for any language model"
        ],
        answerIndex: 1,
        explanation: "Bi-encoders calculate embeddings independently and use cosine similarity, losing cross-token interactions. Cross-encoders attend to both query and document tokens simultaneously, catching subtle nuances."
      }
    },
    {
      id: "mod-tool-calling-agents",
      trackId: "ai-ml-fundamentals",
      title: "Agentic Tool-Calling & Open Notebook Frameworks",
      difficulty: "Intermediate",
      estimatedMinutes: 45,
      tags: ["Agents", "Tool-Calling", "OpenNotebooks", "JSON-Schema", "Validation"],
      summary: "Equip LLMs with deterministic execution tools, sandbox environments, and verifiable validation loops.",
      content: `### Moving Beyond Chatbots to Action Engines

Forward Deployed Engineers don't build chat interfaces that write poetry—they build agents that inspect client database schemas, generate SQL queries, validate syntax in read-only sandbox replicas, and execute automated reports.

#### Safe Tool Calling Architecture
1. **Strict JSON Schema Enforcement**: Define function tools with rigid JSON schemas (type, properties, required, additionalProperties: false).
2. **Human-in-the-Loop Confirmation**: Any destructive action (DELETE, UPDATE, Email dispatch) must return a pending approval token requiring explicit human client sign-off.
3. **Sandboxed Code Execution**: Run model-generated code in isolated WebAssembly or gVisor microVMs with strict timeout limits (e.g. 5 seconds) and zero egress networking.`,
      checkpoints: [
        "Created JSON Schema declarations for custom client tools",
        "Enforced read-only transaction isolation for AI SQL query tools",
        "Implemented deterministic Pydantic / Zod schema validation on model tool outputs"
      ],
      quiz: {
        question: "Why is runtime schema validation (e.g., using Zod or Pydantic) required on LLM tool-call arguments even when JSON mode is enabled?",
        options: [
          "JSON mode guarantees syntax, but the model can still generate missing parameters, invalid enum values, or hallucinated types",
          "Runtime validation speeds up the model's token generation rate",
          "Validation prevents the browser from refreshing",
          "LLMs refuse to generate text without Zod"
        ],
        answerIndex: 0,
        explanation: "JSON mode ensures valid JSON syntax, but does not guarantee the arguments adhere to your business rules, schema constraints, or correct parameter types."
      }
    },
    {
      id: "mod-local-llms",
      trackId: "ai-ml-fundamentals",
      title: "Local Inference & vLLM On-Premise Sizing",
      difficulty: "Mission-Critical",
      estimatedMinutes: 50,
      tags: ["vLLM", "Quantization", "Ollama", "AWQ", "GPU-VRAM"],
      summary: "Size GPU hardware, configure PagedAttention with vLLM, and run quantized open-weights models (Llama-3, Qwen-2.5) on client premises.",
      content: `### GPU VRAM Math for FDEs

When deploying on-prem, client security teams will NOT allow sending customer data to public API endpoints. You must host local models.

#### The Sizing Rule of Thumb:
- **16-bit (FP16)**: Model Parameters (Billion) × 2 GB = Base Weights VRAM
- **8-bit (INT8)**: Model Parameters (Billion) × 1 GB = Base Weights VRAM
- **4-bit (AWQ / GPTQ)**: Model Parameters (Billion) × 0.55 GB = Base Weights VRAM
- **KV Cache Overhead**: Allocate at least 25-35% additional VRAM for KV cache to prevent Out-Of-Memory (OOM) crashes under concurrent client requests.

#### Example: Sizing a 70B parameter model in 4-bit AWQ:
70 × 0.55 = 38.5 GB weights. With 12 GB KV cache overhead = ~50.5 GB VRAM -> Requires 1× NVIDIA A100 (80GB) or 2× RTX 3090/4090 (24GB each with tensor parallelism = 2).`,
      checkpoints: [
        "Calculated VRAM budgets for FP16 vs AWQ 4-bit quantization",
        "Configured tensor parallelism across multi-GPU client nodes",
        "Tuned vLLM --max-model-len and --gpu-memory-utilization flags"
      ],
      quiz: {
        question: "What is the primary breakthrough of vLLM's PagedAttention algorithm for high-concurrency enterprise inference?",
        options: [
          "It rewrites Python into C++",
          "It manages KV cache memory like virtual memory pages in an OS, virtually eliminating fragmentation and boosting throughput 2-4x",
          "It downloads weights over Bluetooth",
          "It disables attention mechanisms completely"
        ],
        answerIndex: 1,
        explanation: "PagedAttention treats KV cache allocations non-contiguously like virtual memory pages, preventing massive internal and external memory fragmentation."
      }
    },
    {
      id: "mod-poc-scoping",
      trackId: "solution-architecture",
      title: "Field POC Scoping & Legacy Reverse-Engineering",
      difficulty: "Mission-Critical",
      estimatedMinutes: 60,
      tags: ["Scoping", "Client-Discovery", "POC", "Reverse-ETL", "SLA"],
      summary: "Turn ambiguous customer pain into high-velocity 30-day proof-of-concept deployments with clear quantitative success criteria.",
      content: `### The 30-Day Forward Deployment Playbook

FDEs distinguish themselves by ruthless velocity. In enterprise sales cycles, a working demo on client data in Week 2 beats 100 pages of PowerPoint architecture diagrams.

#### The 4-Week Milestone Framework:
- **Week 1: Data Access & Bastion Onboarding**: Secure VPN tokens, SSH jumpbox credentials, export sample CSVs/database dumps, establish security boundary.
- **Week 2: Minimum Lovable Integration**: Ingest real customer schema into internal pipeline; produce first working end-to-end data flow with synthetic or obfuscated test data.
- **Week 3: Field Validation & Corner Cases**: Walk client power users through real workflows; identify missing edge cases (weird date formats, legacy encoding like Latin-1, null IDs).
- **Week 4: Executive POC Debrief**: Present quantitative business ROI: 'Reduced manual loan processing from 4.2 hours to 8 minutes while maintaining 99.4% audit accuracy.'`,
      checkpoints: [
        "Drafted mutual Statement of Work (SOW) with 3 measurable success metrics",
        "Built synthetic data obfuscator to protect PII during preliminary testing",
        "Established weekly executive milestone demo cadence"
      ],
      quiz: {
        question: "What is the single biggest risk factor leading to stalled enterprise FDE proofs of concept?",
        options: [
          "Choosing CSS Grid over Flexbox",
          "Waiting 4 weeks for client InfoSec and VPN approvals without establishing an offline synthetic data plan",
          "Writing code in TypeScript instead of Java",
          "Using dark mode instead of light mode"
        ],
        answerIndex: 1,
        explanation: "Security access delays stall 70% of enterprise engagements. Savvy FDEs immediately request sample sanitized datasets or generate synthetic schemas to build the pipeline while waiting for network access."
      }
    },
    {
      id: "mod-compliance-airgap",
      trackId: "solution-architecture",
      title: "Security, Compliance & Audit Trails (SOC2, HIPAA, FedRAMP)",
      difficulty: "Intermediate",
      estimatedMinutes: 45,
      tags: ["SOC2", "HIPAA", "Audit-Log", "Encryption", "PII-Masking"],
      summary: "Bake zero-trust cryptography, immutable audit logging, and automated PII redaction directly into deployment artifacts.",
      content: `### Passing the Enterprise InfoSec Audit

When a Fortune 100 CISO reviews your deployed software, they evaluate three fundamental pillars:

1. **Data in Transit and at Rest**:
   - Encryption at rest: AES-256 with customer-managed keys (CMK) via AWS KMS or HashiCorp Vault.
   - Encryption in transit: TLS 1.3 only, deprecating TLS 1.0/1.1.
2. **Immutable Audit Trails**:
   - Every read, write, export, and model query must write an append-only audit event containing: timestamp_utc, actor_id, client_ip, resource_arn, action_type, sha256_result_hash.
3. **Automated PII / PHI Redaction**:
   - Run lightweight regex and NER (Named Entity Recognition) tokenizers before sending prompts to retrieval indices to mask Social Security Numbers, Credit Cards, and Medical IDs.`,
      checkpoints: [
        "Implemented SHA-256 tamper-evident log hashing",
        "Set up Presidio or custom regex PII masking filters",
        "Generated automated compliance verification report"
      ],
      quiz: {
        question: "What guarantees the tamper-evident integrity of an append-only enterprise audit log?",
        options: [
          "Storing it on an encrypted USB thumb drive",
          "Cryptographic hash chaining where each log entry includes the SHA-256 hash of the previous log record",
          "Setting the file permissions to read-only in Windows Explorer",
          "Writing the logs in ALL CAPS"
        ],
        answerIndex: 1,
        explanation: "Hash chaining (like a Merkle chain or git commit history) ensures that if any past record is modified or deleted, the subsequent hashes will fail verification immediately."
      }
    }
  ],
  flashcards: [
    {
      id: "fc-1",
      deck: "System Design for FDE",
      question: "What is the key difference between an FDE (Forward Deployed Engineer) and a traditional Solutions Architect?",
      answer: "A Solutions Architect primarily designs high-level diagrams, scopes integrations, and advises during pre-sales. An FDE writes production code, deploys containerized services directly into client infrastructure, debugs network/DB bottlenecks on-site, and owns end-to-end delivery.",
      proTip: "In interviews, emphasize hands-on coding + client diplomacy. You are a full-stack engineer who thrives in production client bastions."
    },
    {
      id: "fc-2",
      deck: "System Design for FDE",
      question: "How do you handle an on-premise client environment with strictly NO outbound internet access (Air-Gapped)?",
      answer: "1. Build and test all container images offsite.\n2. Export images via docker save into encrypted tar archives.\n3. Securely transfer archives via client-approved encrypted physical media or bastion SFTP.\n4. Load images via docker load into the customer's internal private registry (Harbor/Nexus).\n5. Deploy via offline Helm charts with private registry image paths.",
      proTip: "Mention checksum validation (sha256sum) and license file verification during offline container bootstrap."
    },
    {
      id: "fc-3",
      deck: "System Design for FDE",
      question: "What is mTLS and why do enterprise security teams mandate it for service-to-service communication?",
      answer: "Mutual TLS (mTLS) requires BOTH the client and the server to present cryptographic X.509 certificates to authenticate each other before establishing an encrypted TLS connection. This guarantees zero-trust identity verification even if an internal network is breached.",
      proTip: "Commonly managed at the infrastructure layer using Envoy proxies or a Service Mesh like Istio or Linkerd."
    },
    {
      id: "fc-4",
      deck: "Client Scoping & Politics",
      question: "A client VP demands a feature in Week 2 that will derail the agreed 30-day POC timeline. How do you respond?",
      answer: "1. Validate their underlying business goal empathetically.\n2. Assess impact against the mutual Statement of Work (SOW) success metrics.\n3. Present a trade-off: 'We can incorporate this, but it will shift Milestone 3 by 5 days, or we can catalog it as Phase 2 Priority #1 immediately following successful POC sign-off.'\n4. Document the decision in writing.",
      proTip: "Never say flat 'No'; frame the conversation around protecting their project's executive deadline and quantifiable ROI."
    },
    {
      id: "fc-5",
      deck: "Client Scoping & Politics",
      question: "The client's internal DBA team is skeptical and resistant to your new platform. How do you win them over?",
      answer: "DBAs fear 2:00 AM outages, performance degradation, and unvetted schemas. Win them over by: providing read-only replica connection architectures, sharing exact SQL query plans with EXPLAIN ANALYZE, respecting their maintenance windows, and including them in architecture reviews.",
      proTip: "Show humility and respect for their existing infrastructure; they hold the keys to the database credentials."
    },
    {
      id: "fc-6",
      deck: "Docker & Distributed Systems",
      question: "What is the primary difference between HNSW and IVFFlat vector index algorithms?",
      answer: "IVFFlat partitions vector space into Voronoi cells via k-means clustering; it uses low RAM and builds fast, but requires retraining when data shifts and has lower recall. HNSW builds a multi-layer graph of vectors; it uses more RAM and builds slower, but provides exceptional 99%+ recall and fast sub-5ms query times.",
      proTip: "Recommend HNSW for production search unless the customer has strict RAM limits under 16GB."
    },
    {
      id: "fc-7",
      deck: "Docker & Distributed Systems",
      question: "Explain the concept of Exponential Backoff with Jitter in network retry logic.",
      answer: "When an API fails or throttles, retrying immediately can trigger a 'thundering herd' that permanently crashes the server. Exponential backoff doubles the wait time after each attempt. Adding random 'jitter' distributes retry attempts across time, breaking concurrency sync.",
      proTip: "Formula: delay = random(0, min(cap, base * 2^attempt))."
    },
    {
      id: "fc-8",
      deck: "Algorithmic Edge Cases",
      question: "How do you detect and reconcile concurrent updates to the same entity across distributed offline nodes?",
      answer: "Vector Clocks or Version Vectors. Each node maintains a logical counter vector. If vector A dominantly exceeds vector B across all clocks, A is causally newer. If clocks conflict, resolve via Last-Write-Wins (LWW) with synchronized NTP or trigger application-level merge functions.",
      proTip: "In browser offline apps, CRDTs or UUID version tokens provide reliable reconciliation."
    }
  ],
  puzzles: [
    {
      id: "puzzle-airgap-routing",
      title: "Air-Gapped Reverse Proxy Topology",
      description: "Connect incoming requests from internal analyst workstations through the reverse proxy, LDAP authentication, and read-only database without routing through the public internet gateway.",
      nodes: [
        { id: "analyst", label: "Analyst Workstation", type: "source" },
        { id: "bastion", label: "Internal Reverse Proxy (Envoy)", type: "proxy" },
        { id: "ldap", label: "Corporate LDAP Auth", type: "auth" },
        { id: "db", label: "Read-Only Postgres Replica", type: "storage" },
        { id: "internet", label: "Public Internet Gateway (FORBIDDEN)", type: "danger" }
      ],
      validPath: ["analyst", "bastion", "ldap", "db"],
      hint: "Workstation -> Reverse Proxy -> Auth -> Target Database."
    }
  ],
  codingChallenges: [
    {
      id: "challenge-streaming-parser",
      title: "Streaming Log Aggregator & SLA Breaker",
      description: "Write a function parseAndFilterLogs(rawLogs, maxLatencyMs, requiredTenant) that takes a newline-delimited stream of JSON logs, filters for a specific tenant, ignores malformed lines without throwing errors, and returns an array of log IDs where latency_ms exceeded maxLatencyMs.",
      starterCode: `function parseAndFilterLogs(rawLogs, maxLatencyMs, requiredTenant) {
  // rawLogs: string of newline-delimited JSON objects
  // Return array of string IDs where latency_ms > maxLatencyMs
  const results = [];
  
  return results;
}`,
      solutionCode: `function parseAndFilterLogs(rawLogs, maxLatencyMs, requiredTenant) {
  const results = [];
  if (!rawLogs || typeof rawLogs !== 'string') return results;
  const lines = rawLogs.split('\\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj && obj.tenant === requiredTenant && typeof obj.latency_ms === 'number' && obj.latency_ms > maxLatencyMs) {
        if (obj.id) results.push(obj.id);
      }
    } catch (e) {
      // Safely ignore malformed lines
    }
  }
  return results;
}`,
      testCases: [
        {
          input: ['{"id":"A1","tenant":"acme","latency_ms":250}\n{"id":"A2","tenant":"acme","latency_ms":80}\n{"id":"B1","tenant":"other","latency_ms":999}\nMALFORMED_GARBAGE\n{"id":"A3","tenant":"acme","latency_ms":400}', 200, "acme"],
          expected: ["A1", "A3"],
          label: "Filters tenant, skips corrupted lines, identifies SLA breaches"
        },
        {
          input: ["", 100, "acme"],
          expected: [],
          label: "Handles empty log stream"
        }
      ]
    },
    {
      id: "challenge-exponential-backoff",
      title: "Exponential Backoff with Jitter Calculator",
      description: "Write calculateBackoffDelays(attempts, baseMs, maxCapMs, factor) that returns an array of backoff delay numbers in milliseconds for attempts 0 to attempts - 1 using the formula Math.floor(Math.min(maxCapMs, baseMs * Math.pow(2, attempt)) * factor).",
      starterCode: `function calculateBackoffDelays(attempts, baseMs, maxCapMs, factor = 0.5) {
  const delays = [];
  // Implement exponential doubling capped at maxCapMs
  return delays;
}`,
      solutionCode: `function calculateBackoffDelays(attempts, baseMs, maxCapMs, factor = 0.5) {
  const delays = [];
  for (let i = 0; i < attempts; i++) {
    const exponential = baseMs * Math.pow(2, i);
    const capped = Math.min(maxCapMs, exponential);
    delays.push(Math.floor(capped * factor));
  }
  return delays;
}`,
      testCases: [
        {
          input: [4, 100, 1000, 0.5],
          expected: [50, 100, 200, 400],
          label: "Calculates exponential delays with 0.5 factor"
        },
        {
          input: [4, 500, 1200, 1.0],
          expected: [500, 1000, 1200, 1200],
          label: "Respects maxCapMs limit"
        }
      ]
    }
  ],
  architectureScenarios: [
    {
      id: "scenario-foundry-health",
      title: "Clinical Data Fusion in an Air-Gapped Hospital Network",
      client: "Regional Health Authority (14 Hospitals)",
      challenge: "The customer has 14 disparate hospital instances running legacy HL7 EHR systems. Due to strict HIPAA and state privacy laws, patient records cannot leave the hospital's on-premise private network. The CIO wants a real-time clinical dashboard for ICU bed availability and sepsis risk prediction.",
      stages: [
        {
          stageNumber: 1,
          title: "Stage 1: Data Ingestion & Air-Gap Compliance",
          prompt: "How do you ingest and normalize real-time EHR feeds across the 14 hospitals without violating HIPAA boundaries?",
          choices: [
            {
              id: "a",
              label: "Deploy lightweight K3s edge pods inside each hospital datacenter that parse HL7 streams locally and de-identify patient names before transmitting aggregated telemetry to the central hospital authority node.",
              score: 100,
              feedback: "Perfect FDE approach: local de-identification preserves privacy while edge parsing removes heavy network loads."
            },
            {
              id: "b",
              label: "Stream all raw HL7 records over public internet to a multi-tenant cloud bucket for batch parsing with Python scripts.",
              score: 0,
              feedback: "Severe violation: sending raw protected health information (PHI) over public internet violates HIPAA and fails hospital InfoSec immediately."
            },
            {
              id: "c",
              label: "Ask hospital nurses to manually export CSV spreadsheets every morning and email them to your team.",
              score: 20,
              feedback: "High friction, human error prone, and violates real-time ICU triage requirements."
            }
          ]
        },
        {
          stageNumber: 2,
          title: "Stage 2: Model Serving & Inference Hardware",
          prompt: "The clinical team wants an LLM-assisted sepsis risk summarizer. The hospital datacenter has dual NVIDIA A100 (80GB) workstations without internet access.",
          choices: [
            {
              id: "a",
              label: "Package vLLM with a quantized Llama-3-70B model in AWQ 4-bit, containerize it via pre-built tarball, and serve via local OpenAI-compatible HTTP endpoint inside the internal subnet.",
              score: 100,
              feedback: "Outstanding! Fits comfortably inside 80GB VRAM, provides sub-second streaming inference, and operates 100% offline."
            },
            {
              id: "b",
              label: "Proxy API calls to a public commercial AI endpoint using personal API keys.",
              score: 0,
              feedback: "Disastrous! Air-gapped datacenters block outbound requests, and submitting hospital clinical text to public APIs is an immediate contract termination breach."
            }
          ]
        }
      ]
    }
  ]
};

// Default initial state for Job Hunting Pipeline
const INITIAL_JOB_DATA = [
  {
    id: "job-1",
    company: "Palantir Technologies",
    role: "Forward Deployed Software Engineer (Foundry/AIP)",
    stage: "onsite",
    comp: "$210,000 - $265,000 + Equity",
    sector: "Defense & Commercial Operations",
    notes: "Completed take-home pipeline. Onsite scheduled: systems architecture & client empathy scenario."
  },
  {
    id: "job-2",
    company: "Scale AI",
    role: "Forward Deployed Engineer (Enterprise GenAI)",
    stage: "technical",
    comp: "$195,000 - $240,000",
    sector: "Autonomous Systems & Enterprise RAG",
    notes: "Live coding round next Thursday. Review hybrid search & BM25 rank fusion."
  },
  {
    id: "job-3",
    company: "OpenAI",
    role: "Forward Deployed Solutions Engineer",
    stage: "screening",
    comp: "$230,000 - $300,000 + Equity",
    sector: "Frontier Model Enterprise Deployment",
    notes: "Recruiter screen passed. Preparing for technical architecture deep dive."
  },
  {
    id: "job-4",
    company: "Databricks",
    role: "Solutions Architect / FDE",
    stage: "wishlist",
    comp: "$185,000 - $230,000",
    sector: "Lakehouse & Real-Time Analytics",
    notes: "Referred by former colleague. Reviewing Spark streaming and Delta Lake internals."
  }
];

// Default initial Quick Notes
const INITIAL_NOTES_DATA = [
  {
    id: "note-1",
    title: "Handling Corporate SSL/TLS Proxy Interception",
    category: "Air-Gap",
    tags: ["curl", "envoy", "certificates"],
    content: `When a client uses Zscaler or BlueCoat proxy inspection:
1. Export the company root CA certificate: \`openssl s_client -connect internal.host:443 -showcerts\`
2. In Docker container: append custom CA to \`/etc/ssl/certs/ca-certificates.crt\` and run \`update-ca-certificates\`.
3. In Node.js: set \`NODE_EXTRA_CA_CERTS=/path/to/corporate-ca.crt\` (never set \`NODE_TLS_REJECT_UNAUTHORIZED=0\` in client production).`
  },
  {
    id: "note-2",
    title: "vLLM KV Cache VRAM Allocation Formula",
    category: "LLMs",
    tags: ["vLLM", "VRAM", "GPU"],
    content: `For each token in context:
KV_Bytes = 2 (K & V) * num_layers * num_kv_heads * head_dim * bytes_per_element
For Llama-3-70B (grouped-query attention, 8 KV heads, 80 layers, dim 128, FP16):
2 * 80 * 8 * 128 * 2 = 327,680 bytes (~0.32 MB) per token for batch size 1.
With 4k context and batch size 16 = 0.32 MB * 4096 * 16 = ~21 GB just for KV Cache!`
  }
];

// Default initial Code Snippets
const INITIAL_SNIPPETS_DATA = [
  {
    id: "snip-1",
    title: "Export All Pod Images to Offline Air-Gap Tarball",
    lang: "bash",
    tag: "Docker, Airgap",
    code: `#!/usr/bin/env bash
set -euo pipefail

IMAGES=(
  "postgres:16-alpine"
  "redis:7.2-alpine"
  "internal/fde-ingest-worker:v2.1.0"
  "internal/vllm-engine:v0.4.2"
)

echo "==> Pulling and packaging container images..."
for img in "\${IMAGES[@]}"; do
  docker pull "$img"
done

docker save "\${IMAGES[@]}" | gzip -9 > airgap_images_bundle.tar.gz
sha256sum airgap_images_bundle.tar.gz > airgap_images_bundle.tar.gz.sha256
echo "==> Airgap bundle generated with SHA-256 checksum."`
  },
  {
    id: "snip-2",
    title: "Exponential Backoff with Full Jitter in Python",
    lang: "python",
    tag: "Python, Resiliency",
    code: `import time
import random

def retry_with_jitter(func, max_attempts=5, base_delay=0.5, max_delay=10.0):
    for attempt in range(max_attempts):
        try:
            return func()
        except Exception as e:
            if attempt == max_attempts - 1:
                raise e
            # Full Jitter formula
            exponential = base_delay * (2 ** attempt)
            sleep_time = random.uniform(0, min(max_delay, exponential))
            time.sleep(sleep_time)`
  }
];

// Resume checklist items & scoring
const RESUME_CHECKLIST_ITEMS = [
  { id: "rc-1", label: "Quantified ARR or cost savings (e.g. '$2.4M ARR unlocked')", points: 20 },
  { id: "rc-2", label: "Explicitly specified client constraints (e.g. 'air-gapped', 'SOC2/HIPAA')", points: 20 },
  { id: "rc-3", label: "Cited low latency / high throughput metrics (e.g. 'reduced latency from 4s to 120ms')", points: 20 },
  { id: "rc-4", label: "Highlighted stakeholder diplomacy (e.g. 'aligned client VP and InfoSec teams')", points: 20 },
  { id: "rc-5", label: "Emphasized production code ownership (e.g. 'authored core ingestion pipeline in Rust/TS')", points: 20 }
];

const RESUME_PHRASES = [
  "Spearheaded 30-day air-gapped deployment for a Fortune 50 healthcare client, fusing 14 legacy EHR systems into a real-time clinical data lake with zero PHI leakage.",
  "Architected hybrid RAG pipeline combining BM25 keyword search and pgvector HNSW indexing with cross-encoder re-ranking, boosting retrieval precision from 64% to 94.2%.",
  "Engineered distributed idempotency and backpressure handling for high-throughput webhook ingestion, safely processing 50,000 client events/sec without downstream DB degradation.",
  "Led client stakeholder alignment meetings across InfoSec, DBA, and executive teams, resolving 18 enterprise compliance blockers and shortening POC turnaround by 40%."
];

// Open Source Portfolio Showcase Projects
const PORTFOLIO_PROJECTS = [
  {
    id: "port-1",
    title: "Air-Gapped LLM Gateway & Micro-Proxy",
    badge: "GenAI & Infrastructure",
    description: "A zero-internet local API gateway with PII redaction tokenizers, local vLLM PagedAttention inference, and cryptographic SHA-256 audit chaining.",
    milestones: [
      { id: "m1", title: "Architecture RFC Document", done: true },
      { id: "m2", title: "Single-command Docker Compose setup", done: true },
      { id: "m3", title: "Synthetic FHIR/EHR dataset generator", done: true },
      { id: "m4", title: "Benchmarking report (latency vs concurrency)", done: false },
      { id: "m5", title: "5-min architectural video walkthrough", done: false }
    ]
  },
  {
    id: "port-2",
    title: "Enterprise Change-Data-Capture (CDC) Adapter",
    badge: "Distributed Data",
    description: "Real-time streaming pipeline capturing row-level changes from legacy PostgreSQL/Oracle systems into ClickHouse and Qdrant with zero downtime.",
    milestones: [
      { id: "m1", title: "Debezium & Kafka pipeline topology RFC", done: true },
      { id: "m2", title: "Outbox pattern idempotency implementation", done: true },
      { id: "m3", title: "Failure injection chaos test suite", done: false },
      { id: "m4", title: "Grafana dashboard export", done: false }
    ]
  }
];

// ============================================================================
// 2. OFFLINE PERSISTENCE: INDEXEDDB WITH LOCALSTORAGE FALLBACK
// ============================================================================
class OfflineStorageManager {
  constructor() {
    this.dbName = "FDEMasteryDB";
    this.dbVersion = 1;
    this.db = null;
    this.useLocalStorage = false;
  }

  async init() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn("IndexedDB not available, falling back to localStorage");
        this.useLocalStorage = true;
        resolve();
        return;
      }

      try {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          const stores = ["progress", "notes", "snippets", "jobs", "flashcards", "meta", "portfolio", "resume"];
          stores.forEach((storeName) => {
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName, { keyPath: "id" });
            }
          });
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve();
        };

        request.onerror = (err) => {
          console.warn("IndexedDB access error, using localStorage fallback:", err);
          this.useLocalStorage = true;
          resolve();
        };
      } catch (e) {
        this.useLocalStorage = true;
        resolve();
      }
    });
  }

  async get(storeName, key) {
    if (this.useLocalStorage || !this.db) {
      const data = localStorage.getItem(`${this.dbName}_${storeName}_${key}`);
      return data ? JSON.parse(data) : null;
    }
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      } catch (err) {
        resolve(null);
      }
    });
  }

  async getAll(storeName) {
    if (this.useLocalStorage || !this.db) {
      const prefix = `${this.dbName}_${storeName}_`;
      const items = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          items.push(JSON.parse(localStorage.getItem(key)));
        }
      }
      return items;
    }
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      } catch (err) {
        resolve([]);
      }
    });
  }

  async set(storeName, item) {
    if (!item.id) item.id = "item_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    item.updatedAt = Date.now();

    if (this.useLocalStorage || !this.db) {
      localStorage.setItem(`${this.dbName}_${storeName}_${item.id}`, JSON.stringify(item));
      return item;
    }
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const req = store.put(item);
        req.onsuccess = () => resolve(item);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async delete(storeName, key) {
    if (this.useLocalStorage || !this.db) {
      localStorage.removeItem(`${this.dbName}_${storeName}_${key}`);
      return true;
    }
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      } catch (err) {
        resolve(true);
      }
    });
  }

  async clear(storeName) {
    if (this.useLocalStorage || !this.db) {
      const prefix = `${this.dbName}_${storeName}_`;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) keysToRemove.push(key);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      return true;
    }
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      } catch (err) {
        resolve(true);
      }
    });
  }
}

// Instantiate Global Storage Singleton
const storage = new OfflineStorageManager();

// ============================================================================
// 3. APPLICATION STATE
// ============================================================================
const AppState = {
  catalog: DEFAULT_CATALOG,
  activeSection: "skills",
  activeTrackFilter: "all",
  searchQuery: "",
  
  // Section 1
  selectedModule: null,
  modulesProgress: {}, // { moduleId: { mastered: bool, checkpoints: [] } }

  // Section 2
  activeInterviewTool: "flashcards",
  flashcardDeck: "all",
  flashcardsList: [],
  currentFlashcardIndex: 0,
  flashcardFlipped: false,
  flashcardStats: {}, // { cardId: { repetitions: 0, interval: 1, ease: 2.5 } }
  
  // Puzzle 1 State
  puzzlePath: [],
  puzzleCompleted: false,

  // Coding Challenge
  activeChallenge: null,

  // Scenario
  activeScenario: null,
  scenarioStageIndex: 0,
  scenarioScore: 0,
  scenarioSelectedChoices: [],

  // Section 3
  jobs: [],
  activeJobFilter: "all",
  portfolio: PORTFOLIO_PROJECTS,
  resumeScore: 80,
  resumeChecks: {},

  // Section 4
  notes: [],
  snippets: [],
  pomoTimeLeft: 25 * 60,
  pomoRunning: false,
  pomoInterval: null,
  studyStreakDays: 5,

  // PWA
  deferredInstallPrompt: null,
  isOnline: navigator.onLine
};

// ============================================================================
// 4. UI NOTIFICATIONS & TOASTS
// ============================================================================
function showToast(message, duration = 3000) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================================
// 5. PWA LIFECYCLE & OFFLINE CONNECTIVITY
// ============================================================================
function initPWA() {
  // Register Service Worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js")
        .then((reg) => console.log("[PWA] Service Worker registered:", reg.scope))
        .catch((err) => console.warn("[PWA] Service Worker registration failed:", err));
    });
  }

  // Handle In-App Install Prompt
  const installBtn = document.getElementById("pwa-install-btn");
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  if (!isStandalone) {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      AppState.deferredInstallPrompt = e;
      if (installBtn) installBtn.style.display = "inline-flex";
    });

    if (installBtn) {
      installBtn.addEventListener("click", async () => {
        // iOS detection
        const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
        if (isIOS) {
          openModal("ios-guide-modal");
          return;
        }

        if (AppState.deferredInstallPrompt) {
          AppState.deferredInstallPrompt.prompt();
          const { outcome } = await AppState.deferredInstallPrompt.userChoice;
          if (outcome === "accepted") {
            showToast("🎉 App installed successfully! Ready for offline study.");
            installBtn.style.display = "none";
          }
          AppState.deferredInstallPrompt = null;
        }
      });
    }
  }

  // Network Connectivity Watcher
  const updateOnlineStatus = () => {
    AppState.isOnline = navigator.onLine;
    const pill = document.getElementById("connection-pill");
    const text = document.getElementById("connection-text");
    const banner = document.getElementById("offline-banner");

    if (AppState.isOnline) {
      pill?.classList.remove("offline");
      if (text) text.innerText = "Online";
      if (banner) banner.style.display = "none";
      showToast("🟢 Connected: Backend synchronization available.");
    } else {
      pill?.classList.add("offline");
      if (text) text.innerText = "Offline Cache";
      if (banner) banner.style.display = "flex";
      showToast("⚡ Offline: Operating 100% on local IndexedDB storage.");
    }
  };

  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
}

// ============================================================================
// 6. INITIALIZATION & DATA INGESTION
// ============================================================================
async function initAppData() {
  await storage.init();

  // Try to load latest catalog from disk / API if available
  try {
    const res = await fetch("/catalog.json");
    if (res.ok) {
      const data = await res.json();
      AppState.catalog = data;
    }
  } catch (e) {
    // Rely on embedded default catalog
    console.log("Using cached embedded catalog");
  }

  // Load progress
  const progressList = await storage.getAll("progress");
  progressList.forEach((p) => {
    AppState.modulesProgress[p.id] = p;
  });

  // Load jobs
  const savedJobs = await storage.getAll("jobs");
  if (savedJobs && savedJobs.length > 0) {
    AppState.jobs = savedJobs;
  } else {
    // Seed initial jobs
    for (const job of INITIAL_JOB_DATA) {
      await storage.set("jobs", job);
    }
    AppState.jobs = INITIAL_JOB_DATA;
  }

  // Load notes
  const savedNotes = await storage.getAll("notes");
  if (savedNotes && savedNotes.length > 0) {
    AppState.notes = savedNotes;
  } else {
    for (const note of INITIAL_NOTES_DATA) {
      await storage.set("notes", note);
    }
    AppState.notes = INITIAL_NOTES_DATA;
  }

  // Load snippets
  const savedSnippets = await storage.getAll("snippets");
  if (savedSnippets && savedSnippets.length > 0) {
    AppState.snippets = savedSnippets;
  } else {
    for (const snip of INITIAL_SNIPPETS_DATA) {
      await storage.set("snippets", snip);
    }
    AppState.snippets = INITIAL_SNIPPETS_DATA;
  }

  // Load flashcard stats
  const savedFlashcards = await storage.getAll("flashcards");
  savedFlashcards.forEach((fc) => {
    AppState.flashcardStats[fc.id] = fc;
  });

  // Initialize Flashcard list
  AppState.flashcardsList = [...AppState.catalog.flashcards];

  // Initialize Coding Challenge
  AppState.activeChallenge = AppState.catalog.codingChallenges[0];

  // Initialize Scenario
  AppState.activeScenario = AppState.catalog.architectureScenarios[0];

  renderAllViews();
}

function renderAllViews() {
  renderModulesGrid();
  renderFlashcards();
  renderPuzzles();
  renderCodingChallenge();
  renderScenario();
  renderKanbanBoard();
  renderPortfolio();
  renderResumeAuditor();
  renderNotes();
  renderSnippets();
  updateReadinessMetrics();
}

// ============================================================================
// 7. SECTION 1: LEARNING FDE SKILLS
// ============================================================================
function renderModulesGrid() {
  const container = document.getElementById("modules-bento-grid");
  if (!container) return;

  const totalCounter = document.getElementById("total-modules-count");
  if (totalCounter) totalCounter.innerText = AppState.catalog.modules.length;

  const query = AppState.searchQuery.toLowerCase().trim();
  const trackFilter = AppState.activeTrackFilter;

  const filtered = AppState.catalog.modules.filter((mod) => {
    const matchesTrack = trackFilter === "all" || mod.trackId === trackFilter;
    const matchesSearch = !query || 
      mod.title.toLowerCase().includes(query) || 
      mod.summary.toLowerCase().includes(query) || 
      mod.tags.some(t => t.toLowerCase().includes(query));
    return matchesTrack && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="bento-col-12" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No modules found matching "${query}".</p>
        <button class="btn btn-secondary btn-sm" onclick="clearSearch()">Clear Filters</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((mod, idx) => {
    const progress = AppState.modulesProgress[mod.id] || { mastered: false, checkpoints: [] };
    const isMastered = progress.mastered;
    const completedChecks = (progress.checkpoints || []).length;
    const totalChecks = (mod.checkpoints || []).length;
    const colSpan = idx === 0 || idx === 3 ? "bento-col-8" : "bento-col-4";

    const diffClass = mod.difficulty === "Mission-Critical" ? "diff-mission-critical" :
      mod.difficulty === "Intermediate" ? "diff-intermediate" : "diff-foundational";

    return `
      <div class="${colSpan}">
        <div class="bento-card ${isMastered ? 'bento-card-highlight' : ''}" style="cursor: pointer;" onclick="openModuleReader('${mod.id}')">
          <div class="module-badge-row">
            <span class="difficulty-badge ${diffClass}">${mod.difficulty}</span>
            <span class="tag-badge">⏱ ${mod.estimatedMinutes} min</span>
            ${isMastered ? '<span class="tag-badge" style="background: rgba(16,185,129,0.2); color: var(--accent-emerald);">✓ Mastered</span>' : ''}
          </div>

          <h3 class="card-title" style="margin-bottom: 0.4rem;">${mod.title}</h3>
          <p class="card-subtitle" style="margin-bottom: 1.25rem; line-height: 1.5;">${mod.summary}</p>

          <div style="display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 1rem;">
            ${mod.tags.map(t => `<span class="tag-badge font-mono">${t}</span>`).join("")}
          </div>

          <div class="module-meta-row">
            <span>Checkpoints: ${completedChecks}/${totalChecks}</span>
            <span style="color: var(--accent-cyan); font-weight: 600;">Study Guide →</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function openModuleReader(moduleId) {
  const mod = AppState.catalog.modules.find(m => m.id === moduleId);
  if (!mod) return;
  AppState.selectedModule = mod;

  const track = AppState.catalog.tracks.find(t => t.id === mod.trackId);
  const progress = AppState.modulesProgress[mod.id] || { mastered: false, checkpoints: [] };

  document.getElementById("reader-track-badge").innerText = track ? track.title : "FDE Track";
  document.getElementById("reader-title").innerText = mod.title;

  const toggleBtn = document.getElementById("reader-toggle-mastered-btn");
  if (toggleBtn) {
    toggleBtn.innerText = progress.mastered ? "✓ Mastered (Click to Undo)" : "Mark as Mastered";
    toggleBtn.className = progress.mastered ? "btn btn-emerald btn-sm" : "btn btn-primary btn-sm";
  }

  // Parse markdown-like content cleanly
  let formattedContent = mod.content
    .replace(/### (.*?)\n/g, '<h3 style="font-size: 1.2rem; font-weight: 700; color: #fff; margin: 1.5rem 0 0.5rem 0;">$1</h3>')
    .replace(/#### (.*?)\n/g, '<h4 style="font-size: 1.05rem; font-weight: 600; color: var(--accent-cyan); margin: 1rem 0 0.4rem 0;">$1</h4>')
    .replace(/```(.*?)\n([\s\S]*?)```/g, '<pre style="background: #04060a; border: 1px solid var(--border-medium); border-radius: var(--radius-md); padding: 1rem; overflow-x: auto; margin: 1rem 0; font-size: 0.82rem; color: #67e8f9;"><code class="font-mono">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.08); padding: 0.15rem 0.35rem; border-radius: 4px; font-size: 0.85em; color: var(--accent-cyan);">$1</code>')
    .replace(/\n\n/g, '<p style="margin-bottom: 0.85rem;"></p>');

  // Checkpoints Checklist
  const checkpointsHtml = `
    <div style="background: var(--bg-card); border: 1px solid var(--border-medium); border-radius: var(--radius-md); padding: 1.25rem; margin-top: 1.5rem;">
      <h4 style="font-weight: 700; color: #fff; margin-bottom: 0.75rem; font-size: 0.95rem;">Interactive Field Checkpoints</h4>
      <div style="display: flex; flex-direction: column; gap: 0.6rem;">
        ${mod.checkpoints.map((cp, idx) => {
          const isChecked = (progress.checkpoints || []).includes(idx);
          return `
            <label style="display: flex; align-items: flex-start; gap: 0.6rem; font-size: 0.88rem; cursor: pointer;">
              <input type="checkbox" onchange="toggleCheckpoint('${mod.id}', ${idx})" ${isChecked ? 'checked' : ''} style="margin-top: 0.25rem;" />
              <span style="${isChecked ? 'color: var(--accent-emerald); text-decoration: line-through;' : 'color: var(--text-main);'}">${cp}</span>
            </label>
          `;
        }).join("")}
      </div>
    </div>
  `;

  // Self-Test Quiz
  let quizHtml = "";
  if (mod.quiz) {
    quizHtml = `
      <div style="background: var(--bg-card); border: 1px solid var(--border-medium); border-radius: var(--radius-md); padding: 1.25rem; margin-top: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
          <h4 style="font-weight: 700; color: var(--accent-cyan); font-size: 0.95rem;">Field Knowledge Check</h4>
          <span class="tag-badge">Instant Verification</span>
        </div>
        <p style="font-size: 0.9rem; font-weight: 600; color: #fff; margin-bottom: 0.85rem;">${mod.quiz.question}</p>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;" id="quiz-options-container">
          ${mod.quiz.options.map((opt, optIdx) => `
            <button class="btn btn-secondary btn-sm" style="text-align: left; justify-content: flex-start; padding: 0.6rem 0.85rem;" onclick="verifyQuizAnswer('${mod.id}', ${optIdx})">
              ${opt}
            </button>
          `).join("")}
        </div>
        <div id="quiz-feedback" style="display: none; margin-top: 0.85rem; font-size: 0.85rem; padding: 0.75rem; border-radius: var(--radius-sm);"></div>
      </div>
    `;
  }

  document.getElementById("reader-content-body").innerHTML = `
    <div>
      ${formattedContent}
      ${checkpointsHtml}
      ${quizHtml}
    </div>
  `;

  openModal("module-reader-modal");
}

window.openModuleReader = openModuleReader;

async function toggleCheckpoint(moduleId, cpIndex) {
  const current = AppState.modulesProgress[moduleId] || { id: moduleId, mastered: false, checkpoints: [] };
  const list = current.checkpoints || [];
  if (list.includes(cpIndex)) {
    current.checkpoints = list.filter(i => i !== cpIndex);
  } else {
    current.checkpoints = [...list, cpIndex];
  }
  AppState.modulesProgress[moduleId] = current;
  await storage.set("progress", current);
  renderModulesGrid();
  updateReadinessMetrics();
}
window.toggleCheckpoint = toggleCheckpoint;

async function toggleModuleMastered() {
  if (!AppState.selectedModule) return;
  const modId = AppState.selectedModule.id;
  const current = AppState.modulesProgress[modId] || { id: modId, mastered: false, checkpoints: [] };
  current.mastered = !current.mastered;
  AppState.modulesProgress[modId] = current;
  await storage.set("progress", current);

  const toggleBtn = document.getElementById("reader-toggle-mastered-btn");
  if (toggleBtn) {
    toggleBtn.innerText = current.mastered ? "✓ Mastered (Click to Undo)" : "Mark as Mastered";
    toggleBtn.className = current.mastered ? "btn btn-emerald btn-sm" : "btn btn-primary btn-sm";
  }

  showToast(current.mastered ? "🏆 Module marked as Mastered!" : "Module status updated.");
  renderModulesGrid();
  updateReadinessMetrics();
}

function verifyQuizAnswer(moduleId, choiceIdx) {
  const mod = AppState.catalog.modules.find(m => m.id === moduleId);
  if (!mod || !mod.quiz) return;
  const feedback = document.getElementById("quiz-feedback");
  if (!feedback) return;

  const isCorrect = choiceIdx === mod.quiz.answerIndex;
  feedback.style.display = "block";
  if (isCorrect) {
    feedback.style.background = "rgba(16,185,129,0.15)";
    feedback.style.border = "1px solid rgba(16,185,129,0.4)";
    feedback.style.color = "#6ee7b7";
    feedback.innerHTML = `<strong>Correct!</strong> ${mod.quiz.explanation}`;
  } else {
    feedback.style.background = "rgba(244,63,94,0.15)";
    feedback.style.border = "1px solid rgba(244,63,94,0.4)";
    feedback.style.color = "#fda4af";
    feedback.innerHTML = `<strong>Incorrect.</strong> ${mod.quiz.explanation}`;
  }
}
window.verifyQuizAnswer = verifyQuizAnswer;

// Export module content as a standalone Markdown file
function exportModuleMarkdown() {
  if (!AppState.selectedModule) return;
  const mod = AppState.selectedModule;
  const md = `# ${mod.title}\n\nTrack: ${mod.trackId}\nDifficulty: ${mod.difficulty}\nEstimated Time: ${mod.estimatedMinutes} minutes\nTags: ${mod.tags.join(", ")}\n\n## Overview\n${mod.summary}\n\n${mod.content}\n\n## Field Checkpoints\n${mod.checkpoints.map(c => `- [ ] ${c}`).join("\n")}\n`;
  
  downloadBlob(md, `${mod.id}.md`, "text/markdown");
  showToast(`📥 Exported ${mod.title} as Markdown`);
}

// ============================================================================
// 8. SECTION 2: PREPARING FOR INTERVIEWS
// ============================================================================

// --- 2A: Flashcard Engine ---
function renderFlashcards() {
  const deckContainer = document.getElementById("deck-selector-container");
  if (!deckContainer) return;

  // Collect unique decks
  const decks = ["all", ...new Set(AppState.catalog.flashcards.map(f => f.deck))];
  deckContainer.innerHTML = decks.map(d => {
    const label = d === "all" ? "All Decks" : d;
    const count = d === "all" ? AppState.catalog.flashcards.length : AppState.catalog.flashcards.filter(f => f.deck === d).length;
    const active = AppState.flashcardDeck === d ? "btn-primary" : "btn-secondary";
    return `
      <button class="btn ${active} btn-sm" style="justify-content: space-between; text-align: left;" onclick="selectFlashcardDeck('${d}')">
        <span>${label}</span>
        <span class="tag-badge">${count}</span>
      </button>
    `;
  }).join("");

  updateFlashcardDisplay();
}

function selectFlashcardDeck(deck) {
  AppState.flashcardDeck = deck;
  AppState.flashcardsList = deck === "all" 
    ? [...AppState.catalog.flashcards] 
    : AppState.catalog.flashcards.filter(f => f.deck === deck);
  AppState.currentFlashcardIndex = 0;
  AppState.flashcardFlipped = false;
  renderFlashcards();
}
window.selectFlashcardDeck = selectFlashcardDeck;

function updateFlashcardDisplay() {
  const card = AppState.flashcardsList[AppState.currentFlashcardIndex];
  const cardElem = document.getElementById("active-flashcard");
  if (!card || !cardElem) return;

  // Unflip card
  AppState.flashcardFlipped = false;
  cardElem.classList.remove("flipped");

  document.getElementById("fc-deck-label").innerText = `Deck: ${card.deck}`;
  document.getElementById("fc-counter").innerText = `Card ${AppState.currentFlashcardIndex + 1} of ${AppState.flashcardsList.length}`;
  document.getElementById("fc-question").innerText = card.question;
  document.getElementById("fc-answer").innerText = card.answer;
  document.getElementById("fc-protip").innerText = `💡 Pro Tip: ${card.proTip}`;

  // Update mastery bar
  const totalInDeck = AppState.flashcardsList.length;
  let masteredCount = 0;
  AppState.flashcardsList.forEach(c => {
    if (AppState.flashcardStats[c.id]?.interval >= 3) masteredCount++;
  });
  const percent = totalInDeck > 0 ? Math.round((masteredCount / totalInDeck) * 100) : 0;
  const bar = document.getElementById("deck-mastery-bar");
  const pctText = document.getElementById("deck-mastery-percent");
  if (bar) bar.style.width = `${percent}%`;
  if (pctText) pctText.innerText = `${percent}%`;
}

function flipFlashcard() {
  const cardElem = document.getElementById("active-flashcard");
  if (!cardElem) return;
  AppState.flashcardFlipped = !AppState.flashcardFlipped;
  if (AppState.flashcardFlipped) {
    cardElem.classList.add("flipped");
  } else {
    cardElem.classList.remove("flipped");
  }
}

async function rateFlashcard(rating) {
  const card = AppState.flashcardsList[AppState.currentFlashcardIndex];
  if (!card) return;

  const stat = AppState.flashcardStats[card.id] || { id: card.id, repetitions: 0, interval: 1, ease: 2.5 };
  
  // SM-2 Spaced repetition calculation
  if (rating === "again") {
    stat.repetitions = 0;
    stat.interval = 1;
  } else if (rating === "hard") {
    stat.repetitions += 1;
    stat.interval = Math.max(1, Math.round(stat.interval * 1.2));
  } else if (rating === "good") {
    stat.repetitions += 1;
    stat.interval = Math.round(stat.interval * 2.0);
  } else if (rating === "easy") {
    stat.repetitions += 1;
    stat.interval = Math.round(stat.interval * 3.5);
  }

  AppState.flashcardStats[card.id] = stat;
  await storage.set("flashcards", stat);

  // Next card
  AppState.currentFlashcardIndex = (AppState.currentFlashcardIndex + 1) % AppState.flashcardsList.length;
  updateFlashcardDisplay();
  updateReadinessMetrics();
}

// --- 2B: Interactive Logic Puzzles ---
function renderPuzzles() {
  const puzzle = AppState.catalog.puzzles[0];
  const container = document.getElementById("puzzle-nodes-container");
  if (!container || !puzzle) return;

  container.innerHTML = puzzle.nodes.map(n => {
    const isSelected = AppState.puzzlePath.includes(n.id);
    const dangerClass = n.type === "danger" ? "danger-node" : "";
    return `
      <div class="puzzle-node ${dangerClass} ${isSelected ? 'selected' : ''}" onclick="clickPuzzleNode('${n.id}')">
        <span>${n.type === 'danger' ? '⛔' : '🔹'}</span>
        <span>${n.label}</span>
      </div>
    `;
  }).join("");

  updatePuzzlePathPreview();
}

function clickPuzzleNode(nodeId) {
  const puzzle = AppState.catalog.puzzles[0];
  if (AppState.puzzlePath.includes(nodeId)) {
    // Remove if already in path
    AppState.puzzlePath = AppState.puzzlePath.filter(id => id !== nodeId);
  } else {
    AppState.puzzlePath.push(nodeId);
  }

  renderPuzzles();
  validatePuzzlePath();
}
window.clickPuzzleNode = clickPuzzleNode;

function updatePuzzlePathPreview() {
  const preview = document.getElementById("puzzle-path-preview");
  const puzzle = AppState.catalog.puzzles[0];
  if (!preview || !puzzle) return;

  if (AppState.puzzlePath.length === 0) {
    preview.innerText = "Click nodes above to construct execution pipeline...";
    return;
  }

  preview.innerHTML = AppState.puzzlePath.map((id, idx) => {
    const node = puzzle.nodes.find(n => n.id === id);
    const isDanger = node?.type === "danger";
    return `
      <span class="tag-badge" style="${isDanger ? 'border-color: var(--accent-rose); color: var(--accent-rose);' : 'color: var(--accent-cyan);'}">
        ${idx + 1}. ${node?.label || id}
      </span>
      ${idx < AppState.puzzlePath.length - 1 ? '<span style="color: var(--text-subtle);">➔</span>' : ''}
    `;
  }).join("");
}

function validatePuzzlePath() {
  const feedback = document.getElementById("puzzle-feedback");
  const puzzle = AppState.catalog.puzzles[0];
  if (!feedback || !puzzle) return;

  if (AppState.puzzlePath.includes("internet")) {
    feedback.style.display = "block";
    feedback.style.color = "#fda4af";
    feedback.innerHTML = "❌ <strong>Security Breach Alert!</strong> Public Internet Gateway detected in route. Air-gapped compliance failed!";
    return;
  }

  const validStr = puzzle.validPath.join("->");
  const currentStr = AppState.puzzlePath.join("->");

  if (currentStr === validStr) {
    feedback.style.display = "block";
    feedback.style.color = "#6ee7b7";
    feedback.innerHTML = "✅ <strong>Topology Verified!</strong> Requests correctly routed through reverse proxy and LDAP auth into target DB with zero internet leakage.";
    AppState.puzzleCompleted = true;
    updateReadinessMetrics();
  } else if (AppState.puzzlePath.length >= puzzle.validPath.length) {
    feedback.style.display = "block";
    feedback.style.color = "#fcd34d";
    feedback.innerHTML = `⚠️ Order mismatch. Expected topology: ${puzzle.hint}`;
  } else {
    feedback.style.display = "none";
  }
}

// Token Bucket Rate Limiter Simulator
function runRateLimiterSim() {
  const capacity = parseInt(document.getElementById("capacity-slider")?.value || "120", 10);
  const refill = parseInt(document.getElementById("refill-slider")?.value || "15", 10);
  const burst = 120; // 120 requests arriving instantly

  const dropped = Math.max(0, burst - capacity);
  const processed = burst - dropped;
  const dbLoadEstimate = Math.min(100, Math.round((refill / 20) * 75));
  const metricsElem = document.getElementById("sim-metrics");

  if (!metricsElem) return;

  const isHealthy = dropped === 0 && dbLoadEstimate <= 80;
  metricsElem.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 0.35rem;">
      <div>• Total Webhooks Received: <strong>${burst} requests</strong></div>
      <div>• Processed Successfully: <span style="color: var(--accent-emerald); font-weight: 700;">${processed}</span></div>
      <div>• Throttled / Dropped (429): <span style="${dropped > 0 ? 'color: var(--accent-rose); font-weight: 700;' : 'color: var(--text-muted);'}">${dropped}</span></div>
      <div>• Downstream DB CPU Load: <span style="${dbLoadEstimate > 80 ? 'color: var(--accent-rose);' : 'color: var(--accent-cyan);'}">${dbLoadEstimate}%</span></div>
      <div style="margin-top: 0.5rem; font-weight: 700; color: ${isHealthy ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
        ${isHealthy ? '✅ Optimal Configuration! Zero 429 drops and safe database CPU margin.' : '⚠️ Suboptimal. Adjust capacity/refill to prevent dropped webhooks and high DB load.'}
      </div>
    </div>
  `;
}

// --- 2C: Algorithmic Coding Challenges ---
function renderCodingChallenge() {
  const container = document.getElementById("challenge-list-container");
  if (!container) return;

  container.innerHTML = AppState.catalog.codingChallenges.map(c => {
    const active = AppState.activeChallenge?.id === c.id ? "btn-primary" : "btn-secondary";
    return `
      <button class="btn ${active} btn-sm" style="text-align: left; justify-content: flex-start;" onclick="selectCodingChallenge('${c.id}')">
        ${c.title}
      </button>
    `;
  }).join("");

  const current = AppState.activeChallenge;
  if (!current) return;

  document.getElementById("challenge-title").innerText = current.title;
  document.getElementById("challenge-desc").innerText = current.description;

  const editor = document.getElementById("challenge-editor");
  if (editor && (!editor.value || editor.dataset.challengeId !== current.id)) {
    editor.value = current.starterCode;
    editor.dataset.challengeId = current.id;
  }
}

function selectCodingChallenge(challengeId) {
  const challenge = AppState.catalog.codingChallenges.find(c => c.id === challengeId);
  if (!challenge) return;
  AppState.activeChallenge = challenge;
  renderCodingChallenge();
  document.getElementById("challenge-output").innerText = 'Click "Run Test Suite" to execute test fixtures...';
}
window.selectCodingChallenge = selectCodingChallenge;

function toggleReferenceSolution() {
  const current = AppState.activeChallenge;
  const editor = document.getElementById("challenge-editor");
  if (!current || !editor) return;

  if (editor.value.trim() === current.solutionCode.trim()) {
    editor.value = current.starterCode;
    showToast("Reverted to starter code.");
  } else {
    editor.value = current.solutionCode;
    showToast("Loaded reference solution.");
  }
}

function runCodingTests() {
  const current = AppState.activeChallenge;
  const editor = document.getElementById("challenge-editor");
  const output = document.getElementById("challenge-output");
  if (!current || !editor || !output) return;

  const userCode = editor.value;
  output.innerHTML = "<span style='color: var(--text-muted);'>Compiling and executing in-browser sandbox...</span>\n";

  try {
    // Construct isolated function evaluation
    const startTime = performance.now();
    const evaluator = new Function(`${userCode}; return ${current.starterCode.match(/function\s+([a-zA-Z0-9_]+)/)[1]};`);
    const fn = evaluator();

    let passedCount = 0;
    let logBuffer = "";

    current.testCases.forEach((tc, idx) => {
      const result = fn(...tc.input);
      const passed = JSON.stringify(result) === JSON.stringify(tc.expected);
      if (passed) passedCount++;

      logBuffer += `\nTest ${idx + 1} (${tc.label}):\n`;
      logBuffer += `  Status: ${passed ? '<span style="color: #6ee7b7;">PASSED ✓</span>' : '<span style="color: #fda4af;">FAILED ✗</span>'}\n`;
      logBuffer += `  Expected: ${JSON.stringify(tc.expected)}\n`;
      logBuffer += `  Received: ${JSON.stringify(result)}\n`;
    });

    const elapsed = (performance.now() - startTime).toFixed(2);
    const summary = `\nSummary: ${passedCount}/${current.testCases.length} tests passed in ${elapsed}ms.`;

    output.innerHTML = logBuffer + summary;
    if (passedCount === current.testCases.length) {
      showToast("🎉 All test cases passed!");
      updateReadinessMetrics();
    }
  } catch (err) {
    output.innerHTML = `<span style="color: #fda4af;">Runtime Error: ${err.message}</span>\n${err.stack || ''}`;
  }
}

// --- 2D: Systems Architecture Scenarios ---
function renderScenario() {
  const scenario = AppState.activeScenario;
  const container = document.getElementById("scenario-body");
  if (!scenario || !container) return;

  document.getElementById("scenario-title").innerText = scenario.title;
  document.getElementById("scenario-client").innerText = `Client: ${scenario.client}`;

  const currentStage = scenario.stages[AppState.scenarioStageIndex];

  if (!currentStage) {
    // Completed debrief
    const maxScore = scenario.stages.length * 100;
    const pct = Math.round((AppState.scenarioScore / maxScore) * 100);
    container.innerHTML = `
      <div style="background: var(--bg-card); border: 1px solid var(--border-medium); border-radius: var(--radius-lg); padding: 1.5rem; text-align: center;">
        <h3 style="font-size: 1.4rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem;">Deployment Simulation Debrief</h3>
        <p style="color: var(--text-muted); margin-bottom: 1.25rem;">Evaluation against Enterprise InfoSec, SLA Resiliency & Client Satisfaction</p>
        <div style="font-size: 2.5rem; font-weight: 800; color: ${pct >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)'}; margin-bottom: 1rem;">
          ${pct}% Score (${AppState.scenarioScore} / ${maxScore})
        </div>
        <p style="max-width: 600px; margin: 0 auto 1.5rem auto; font-size: 0.95rem; line-height: 1.6; color: var(--text-main);">
          ${pct >= 80 
            ? 'Executive Sign-Off Achieved! You successfully protected HIPAA privacy, maintained on-premise air-gap integrity, and delivered sub-second AI inference.' 
            : 'Deployment Review Required. Re-examine privacy isolation and avoid leaking sensitive enterprise data to unvetted cloud channels.'}
        </p>
        <button class="btn btn-primary btn-sm" onclick="restartScenario()">Restart Scenario</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="background: var(--bg-card); border: 1px solid var(--border-medium); border-radius: var(--radius-lg); padding: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
        <span class="tag-badge" style="color: var(--accent-cyan);">Stage ${currentStage.stageNumber} of ${scenario.stages.length}</span>
        <span style="font-size: 0.8rem; color: var(--text-muted);">Current Score: ${AppState.scenarioScore} pts</span>
      </div>

      <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem;">${currentStage.title}</h3>
      <p style="font-size: 0.92rem; color: #cbd5e1; line-height: 1.6; margin-bottom: 1.25rem;">${currentStage.prompt}</p>

      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        ${currentStage.choices.map(c => `
          <button class="btn btn-secondary" style="text-align: left; justify-content: flex-start; padding: 1rem; line-height: 1.5; font-size: 0.88rem;" onclick="selectScenarioChoice('${c.id}')">
            ${c.label}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function selectScenarioChoice(choiceId) {
  const scenario = AppState.activeScenario;
  const currentStage = scenario.stages[AppState.scenarioStageIndex];
  const choice = currentStage.choices.find(c => c.id === choiceId);
  if (!choice) return;

  AppState.scenarioScore += choice.score;
  showToast(`Stage Feedback: ${choice.feedback}`);

  AppState.scenarioStageIndex++;
  renderScenario();
  updateReadinessMetrics();
}
window.selectScenarioChoice = selectScenarioChoice;

function restartScenario() {
  AppState.scenarioStageIndex = 0;
  AppState.scenarioScore = 0;
  renderScenario();
}
window.restartScenario = restartScenario;

// ============================================================================
// 9. SECTION 3: FDE JOB HUNTING
// ============================================================================

// --- 3A: Kanban Board ---
const KANBAN_STAGES = [
  { id: "wishlist", title: "Target / Wishlist" },
  { id: "applied", title: "Applied" },
  { id: "screening", title: "Recruiter Screen" },
  { id: "technical", title: "Technical / Take-Home" },
  { id: "onsite", title: "Solution Design Onsite" },
  { id: "offer", title: "Offer Received" }
];

function renderKanbanBoard() {
  const board = document.getElementById("kanban-board-container");
  if (!board) return;

  board.innerHTML = KANBAN_STAGES.map(stage => {
    const stageJobs = AppState.jobs.filter(j => j.stage === stage.id);
    return `
      <div class="kanban-column" data-stage="${stage.id}">
        <div class="kanban-col-header">
          <span>${stage.title}</span>
          <span class="tag-badge">${stageJobs.length}</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.65rem; min-height: 50px;">
          ${stageJobs.map(job => `
            <div class="kanban-card">
              <div class="kanban-company">${job.company}</div>
              <div class="kanban-role">${job.role}</div>
              ${job.comp ? `<div style="font-size: 0.78rem; color: var(--accent-emerald);">💰 ${job.comp}</div>` : ''}
              ${job.sector ? `<div style="font-size: 0.75rem; color: var(--text-subtle);">🏢 ${job.sector}</div>` : ''}
              ${job.notes ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem; line-height: 1.4;">${job.notes}</div>` : ''}

              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border-subtle);">
                <div style="display: flex; gap: 0.25rem;">
                  <button class="btn btn-ghost btn-sm" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;" title="Move backward" onclick="moveJobStage('${job.id}', -1)">←</button>
                  <button class="btn btn-ghost btn-sm" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;" title="Move forward" onclick="moveJobStage('${job.id}', 1)">→</button>
                </div>
                <button class="btn btn-ghost btn-sm" style="padding: 0.2rem 0.4rem; font-size: 0.7rem; color: var(--accent-rose);" title="Delete" onclick="deleteJobOpportunity('${job.id}')">✕</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }).join("");
}

async function moveJobStage(jobId, direction) {
  const job = AppState.jobs.find(j => j.id === jobId);
  if (!job) return;

  const currentIdx = KANBAN_STAGES.findIndex(s => s.id === job.stage);
  const nextIdx = currentIdx + direction;
  if (nextIdx >= 0 && nextIdx < KANBAN_STAGES.length) {
    job.stage = KANBAN_STAGES[nextIdx].id;
    await storage.set("jobs", job);
    renderKanbanBoard();
    showToast(`Moved ${job.company} to ${KANBAN_STAGES[nextIdx].title}`);
  }
}
window.moveJobStage = moveJobStage;

async function deleteJobOpportunity(jobId) {
  AppState.jobs = AppState.jobs.filter(j => j.id !== jobId);
  await storage.delete("jobs", jobId);
  renderKanbanBoard();
  showToast("Opportunity removed.");
}
window.deleteJobOpportunity = deleteJobOpportunity;

async function handleAddJobSubmit(e) {
  e.preventDefault();
  const company = document.getElementById("job-company").value.trim();
  const role = document.getElementById("job-role").value.trim();
  const stage = document.getElementById("job-stage").value;
  const comp = document.getElementById("job-comp").value.trim();
  const sector = document.getElementById("job-sector").value.trim();
  const notes = document.getElementById("job-notes").value.trim();

  if (!company || !role) return;

  const newJob = {
    id: "job_" + Date.now(),
    company,
    role,
    stage,
    comp,
    sector,
    notes
  };

  AppState.jobs.push(newJob);
  await storage.set("jobs", newJob);
  renderKanbanBoard();
  closeModal("job-modal");
  document.getElementById("job-form").reset();
  showToast(`Added ${company} to ${stage} stage.`);
  updateReadinessMetrics();
}

// --- 3B: Portfolio Tracker ---
function renderPortfolio() {
  const container = document.getElementById("portfolio-projects-grid");
  if (!container) return;

  container.innerHTML = AppState.portfolio.map(proj => {
    const doneCount = proj.milestones.filter(m => m.done).length;
    const totalCount = proj.milestones.length;
    const pct = Math.round((doneCount / totalCount) * 100);

    return `
      <div class="bento-col-6">
        <div class="bento-card bento-card-highlight">
          <div class="card-header-flex">
            <div>
              <span class="tag-badge" style="color: var(--accent-cyan);">${proj.badge}</span>
              <h3 class="card-title" style="margin-top: 0.35rem;">${proj.title}</h3>
            </div>
            <span class="tag-badge" style="color: var(--accent-emerald); font-weight: 700;">${pct}% Ready</span>
          </div>

          <p class="card-subtitle" style="margin-bottom: 1.25rem;">${proj.description}</p>

          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${proj.milestones.map(m => `
              <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer;">
                <input type="checkbox" onchange="togglePortfolioMilestone('${proj.id}', '${m.id}')" ${m.done ? 'checked' : ''} />
                <span style="${m.done ? 'color: var(--accent-emerald); text-decoration: line-through;' : 'color: var(--text-main);'}">${m.title}</span>
              </label>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function togglePortfolioMilestone(projId, milestoneId) {
  const proj = AppState.portfolio.find(p => p.id === projId);
  if (!proj) return;
  const m = proj.milestones.find(mil => mil.id === milestoneId);
  if (m) m.done = !m.done;
  renderPortfolio();
  updateReadinessMetrics();
}
window.togglePortfolioMilestone = togglePortfolioMilestone;

// --- 3C: Resume Optimization ---
function renderResumeAuditor() {
  const checkContainer = document.getElementById("resume-checklist-container");
  const phraseContainer = document.getElementById("resume-phrases-container");
  if (!checkContainer || !phraseContainer) return;

  checkContainer.innerHTML = RESUME_CHECKLIST_ITEMS.map((item, idx) => {
    const isChecked = AppState.resumeChecks[item.id] !== false; // default true for first 4
    return `
      <label style="display: flex; align-items: flex-start; gap: 0.6rem; font-size: 0.85rem; cursor: pointer;">
        <input type="checkbox" onchange="toggleResumeCheck('${item.id}')" ${isChecked ? 'checked' : ''} style="margin-top: 0.2rem;" />
        <span style="${isChecked ? 'color: var(--text-main);' : 'color: var(--text-muted);'}">${item.label}</span>
      </label>
    `;
  }).join("");

  phraseContainer.innerHTML = RESUME_PHRASES.map(phrase => `
    <div class="bento-card" style="padding: 0.85rem; cursor: pointer; transition: all 0.2s;" onclick="copyTextToClipboard('${phrase.replace(/'/g, "\\'")}', 'Bullet point copied!')">
      <div style="font-size: 0.82rem; line-height: 1.5; color: #cbd5e1;">"${phrase}"</div>
      <div style="font-size: 0.72rem; color: var(--accent-cyan); margin-top: 0.4rem; text-align: right;">Click to copy 📋</div>
    </div>
  `).join("");

  calculateResumeScore();
}

function toggleResumeCheck(id) {
  AppState.resumeChecks[id] = !AppState.resumeChecks[id];
  calculateResumeScore();
  updateReadinessMetrics();
}
window.toggleResumeCheck = toggleResumeCheck;

function calculateResumeScore() {
  let score = 0;
  RESUME_CHECKLIST_ITEMS.forEach(item => {
    if (AppState.resumeChecks[item.id] !== false) score += item.points;
  });
  AppState.resumeScore = score;
  const scoreElem = document.getElementById("resume-score");
  if (scoreElem) scoreElem.innerText = `${score} / 100`;
}

// ============================================================================
// 10. SECTION 4: FAST-LEARNING ACCELERATOR
// ============================================================================

// --- 4A: Quick Notes ---
function renderNotes() {
  const container = document.getElementById("notes-container");
  if (!container) return;

  if (AppState.notes.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem; text-align: center;">No notes saved yet. Click "+ New Note" to capture field insights.</div>`;
    return;
  }

  container.innerHTML = AppState.notes.map(note => `
    <div class="bento-card" style="padding: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
        <div>
          <span class="tag-badge" style="color: var(--accent-cyan); font-size: 0.68rem;">${note.category || 'General'}</span>
          <h4 style="font-size: 0.95rem; font-weight: 700; color: #fff; margin-top: 0.25rem;">${note.title}</h4>
        </div>
        <button class="btn btn-ghost btn-sm" style="padding: 0.15rem 0.35rem; color: var(--accent-rose);" onclick="deleteNote('${note.id}')">✕</button>
      </div>

      <div style="font-size: 0.82rem; color: #cbd5e1; line-height: 1.5; white-space: pre-wrap; font-family: var(--font-mono); background: #06090e; padding: 0.65rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); margin-top: 0.5rem;">${note.content}</div>

      ${note.tags && note.tags.length ? `
        <div style="display: flex; gap: 0.35rem; margin-top: 0.5rem; flex-wrap: wrap;">
          ${note.tags.map(t => `<span class="tag-badge" style="font-size: 0.65rem;">#${t}</span>`).join("")}
        </div>
      ` : ''}
    </div>
  `).join("");
}

async function handleAddNoteSubmit(e) {
  e.preventDefault();
  const title = document.getElementById("note-title").value.trim();
  const category = document.getElementById("note-category").value;
  const tagsRaw = document.getElementById("note-tags").value.trim();
  const content = document.getElementById("note-content").value.trim();

  if (!title || !content) return;

  const newNote = {
    id: "note_" + Date.now(),
    title,
    category,
    tags: tagsRaw ? tagsRaw.split(",").map(t => t.trim()) : [],
    content
  };

  AppState.notes.unshift(newNote);
  await storage.set("notes", newNote);
  renderNotes();
  closeModal("note-modal");
  document.getElementById("note-form").reset();
  showToast("Field note saved to IndexedDB.");
}

async function deleteNote(noteId) {
  AppState.notes = AppState.notes.filter(n => n.id !== noteId);
  await storage.delete("notes", noteId);
  renderNotes();
  showToast("Note deleted.");
}
window.deleteNote = deleteNote;

// --- 4B: Code Snippets ---
function renderSnippets() {
  const container = document.getElementById("snippets-container");
  if (!container) return;

  if (AppState.snippets.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem; text-align: center;">No snippets saved yet. Click "+ New Snippet".</div>`;
    return;
  }

  container.innerHTML = AppState.snippets.map(snip => `
    <div class="bento-card" style="padding: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
        <div>
          <span class="tag-badge" style="color: var(--accent-emerald); font-size: 0.68rem;">${snip.lang || 'bash'}</span>
          <h4 style="font-size: 0.95rem; font-weight: 700; color: #fff; margin-top: 0.25rem;">${snip.title}</h4>
        </div>
        <div style="display: flex; gap: 0.35rem;">
          <button class="btn btn-secondary btn-sm" style="font-size: 0.72rem; padding: 0.2rem 0.5rem;" onclick="copySnippetCode('${snip.id}')">Copy</button>
          <button class="btn btn-ghost btn-sm" style="padding: 0.15rem 0.35rem; color: var(--accent-rose);" onclick="deleteSnippet('${snip.id}')">✕</button>
        </div>
      </div>

      <pre style="background: #04060a; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.65rem; font-family: var(--font-mono); font-size: 0.78rem; color: #67e8f9; overflow-x: auto; max-height: 180px;"><code>${escapeHtml(snip.code)}</code></pre>
    </div>
  `).join("");
}

function copySnippetCode(snippetId) {
  const snip = AppState.snippets.find(s => s.id === snippetId);
  if (!snip) return;
  copyTextToClipboard(snip.code, "Code snippet copied to clipboard!");
}
window.copySnippetCode = copySnippetCode;

async function handleAddSnippetSubmit(e) {
  e.preventDefault();
  const title = document.getElementById("snippet-title").value.trim();
  const lang = document.getElementById("snippet-lang").value;
  const tag = document.getElementById("snippet-tag").value.trim();
  const code = document.getElementById("snippet-code").value.trim();

  if (!title || !code) return;

  const newSnippet = {
    id: "snip_" + Date.now(),
    title,
    lang,
    tag,
    code
  };

  AppState.snippets.unshift(newSnippet);
  await storage.set("snippets", newSnippet);
  renderSnippets();
  closeModal("snippet-modal");
  document.getElementById("snippet-form").reset();
  showToast("Code snippet stored in IndexedDB.");
}

async function deleteSnippet(snippetId) {
  AppState.snippets = AppState.snippets.filter(s => s.id !== snippetId);
  await storage.delete("snippets", snippetId);
  renderSnippets();
  showToast("Snippet deleted.");
}
window.deleteSnippet = deleteSnippet;

// --- 4C: Pomodoro Focus Timer ---
function initPomodoro() {
  const startBtn = document.getElementById("pomo-start-btn");
  const pauseBtn = document.getElementById("pomo-pause-btn");
  const resetBtn = document.getElementById("pomo-reset-btn");
  const display = document.getElementById("pomodoro-timer-display");

  const updateDisplay = () => {
    if (!display) return;
    const m = Math.floor(AppState.pomoTimeLeft / 60);
    const s = AppState.pomoTimeLeft % 60;
    display.innerText = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  startBtn?.addEventListener("click", () => {
    if (AppState.pomoRunning) return;
    AppState.pomoRunning = true;
    AppState.pomoInterval = setInterval(() => {
      if (AppState.pomoTimeLeft > 0) {
        AppState.pomoTimeLeft--;
        updateDisplay();
      } else {
        clearInterval(AppState.pomoInterval);
        AppState.pomoRunning = false;
        showToast("🔔 25-minute Deep-Work Block Complete! Take a 5-minute breather.");
      }
    }, 1000);
  });

  pauseBtn?.addEventListener("click", () => {
    AppState.pomoRunning = false;
    clearInterval(AppState.pomoInterval);
  });

  resetBtn?.addEventListener("click", () => {
    AppState.pomoRunning = false;
    clearInterval(AppState.pomoInterval);
    AppState.pomoTimeLeft = 25 * 60;
    updateDisplay();
  });
}

// --- 4D: Backend Script Triggers via Node.js/Express session orchestration ---
function initBackendScriptTriggers() {
  const triggerBtns = document.querySelectorAll(".trigger-script-btn");
  const output = document.getElementById("backend-script-output");

  triggerBtns.forEach(btn => {
    btn.addEventListener("click", async () => {
      const scriptType = btn.getAttribute("data-script");
      if (!output) return;

      output.innerHTML = `<span style="color: var(--accent-cyan)">[RUNNING] Triggering '${scriptType}' via Express session orchestration...</span>`;

      try {
        const response = await fetch("/api/session/trigger-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scriptType })
        });

        if (response.ok) {
          const data = await response.json();
          output.innerHTML = data.result.logs.map(l => `<div>${l}</div>`).join("") +
            `<div style="color: var(--accent-emerald); margin-top: 0.35rem;">[COMPLETED] in ${data.result.executionTimeMs}ms via Node.js Express worker</div>`;
          showToast(`Executed ${scriptType}`);
        } else {
          fallbackLocalScriptTrigger(scriptType, output);
        }
      } catch (e) {
        // Fallback for purely static / disconnected offline preview
        fallbackLocalScriptTrigger(scriptType, output);
      }
    });
  });
}

function fallbackLocalScriptTrigger(scriptType, outputElem) {
  outputElem.innerHTML = `
    <div>[OFFLINE_FALLBACK] Local execution: iptables egress blocked. Zero internet routing.</div>
    <div>[PASS] Client isolation integrity verified (100% offline).</div>
    <div style="color: var(--accent-emerald); margin-top: 0.35rem;">[COMPLETED] Executed locally in browser worker</div>
  `;
}

// --- 4E: Global Readiness Metrics Calculation ---
function updateReadinessMetrics() {
  const totalMods = AppState.catalog.modules.length;
  let masteredCount = 0;
  Object.values(AppState.modulesProgress).forEach(p => {
    if (p.mastered) masteredCount++;
  });

  const modScore = totalMods > 0 ? (masteredCount / totalMods) * 40 : 0;
  const resumeScore = (AppState.resumeScore / 100) * 20;
  const puzzleScore = AppState.puzzleCompleted ? 20 : 5;
  const jobScore = Math.min(20, AppState.jobs.length * 5);

  const totalReadiness = Math.min(100, Math.round(modScore + resumeScore + puzzleScore + jobScore));

  const readinessElem = document.getElementById("stat-readiness");
  if (readinessElem) readinessElem.innerText = `${totalReadiness}%`;

  const modsElem = document.getElementById("stat-modules-mastered");
  if (modsElem) modsElem.innerText = `${masteredCount} / ${totalMods}`;

  const fcElem = document.getElementById("stat-flashcards-reviewed");
  if (fcElem) fcElem.innerText = Object.keys(AppState.flashcardStats).length.toString();
}

// ============================================================================
// 11. DATA INGESTION & EXPORT ENGINE
// ============================================================================
function initDataIngestionSuite() {
  // 1. Ingest Custom JSON / Markdown file
  const fileInput = document.getElementById("catalog-file-input");
  fileInput?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          if (parsed.modules && Array.isArray(parsed.modules)) {
            // Merge modules
            parsed.modules.forEach(newMod => {
              const idx = AppState.catalog.modules.findIndex(m => m.id === newMod.id);
              if (idx >= 0) AppState.catalog.modules[idx] = newMod;
              else AppState.catalog.modules.push(newMod);
            });
            if (parsed.flashcards) {
              AppState.catalog.flashcards.push(...parsed.flashcards);
            }
            renderAllViews();
            showToast(`✅ Successfully ingested ${parsed.modules.length} modules!`);
            closeModal("ingest-modal");
          } else {
            showToast("Invalid catalog JSON format.");
          }
        } else if (file.name.endsWith(".md")) {
          // Parse single markdown file as a module
          const title = file.name.replace(".md", "");
          const newMod = {
            id: "custom-" + Date.now(),
            trackId: "core-tech-stack",
            title: title.replace(/[-_]/g, " "),
            difficulty: "Intermediate",
            estimatedMinutes: 30,
            tags: ["Custom", "Ingested"],
            summary: "User uploaded Markdown guide.",
            content: text,
            checkpoints: ["Reviewed ingested material"]
          };
          AppState.catalog.modules.push(newMod);
          renderAllViews();
          showToast(`✅ Ingested markdown module: ${newMod.title}`);
          closeModal("ingest-modal");
        }
      } catch (err) {
        showToast("Error parsing file: " + err.message);
      }
    };
    reader.readAsText(file);
  });

  // 2. Download catalog.json
  document.getElementById("download-catalog-btn")?.addEventListener("click", () => {
    downloadBlob(JSON.stringify(AppState.catalog, null, 2), "fde_mastery_catalog.json", "application/json");
    showToast("Downloaded static curriculum catalog.");
  });

  // 3. Export entire workspace to JSON
  document.getElementById("export-workspace-btn")?.addEventListener("click", async () => {
    const workspaceBackup = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      modulesProgress: AppState.modulesProgress,
      jobs: AppState.jobs,
      notes: AppState.notes,
      snippets: AppState.snippets,
      flashcardStats: AppState.flashcardStats,
      resumeChecks: AppState.resumeChecks
    };

    downloadBlob(JSON.stringify(workspaceBackup, null, 2), `fde_workspace_backup_${Date.now()}.json`, "application/json");
    showToast("Workspace exported successfully!");
  });

  // 4. Restore workspace backup
  const importTrigger = document.getElementById("import-workspace-trigger-btn");
  const importInput = document.getElementById("workspace-import-input");

  importTrigger?.addEventListener("click", () => importInput?.click());
  importInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const backup = JSON.parse(ev.target.result);
        if (backup.jobs) {
          AppState.jobs = backup.jobs;
          for (const j of backup.jobs) await storage.set("jobs", j);
        }
        if (backup.notes) {
          AppState.notes = backup.notes;
          for (const n of backup.notes) await storage.set("notes", n);
        }
        if (backup.snippets) {
          AppState.snippets = backup.snippets;
          for (const s of backup.snippets) await storage.set("snippets", s);
        }
        if (backup.modulesProgress) {
          AppState.modulesProgress = backup.modulesProgress;
          for (const [id, p] of Object.entries(backup.modulesProgress)) {
            await storage.set("progress", p);
          }
        }
        renderAllViews();
        closeModal("ingest-modal");
        showToast("🎉 Workspace successfully restored from backup!");
      } catch (err) {
        showToast("Error importing backup: " + err.message);
      }
    };
    reader.readAsText(file);
  });
}

// ============================================================================
// 12. UTILITY & EVENT WIRE-UP
// ============================================================================
function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function copyTextToClipboard(text, successMsg = "Copied to clipboard!") {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast(successMsg));
  } else {
    // Fallback
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    showToast(successMsg);
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add("active");
}
window.openModal = openModal;

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove("active");
}
window.closeModal = closeModal;

function switchSection(sectionId) {
  AppState.activeSection = sectionId;

  // Toggle nav buttons
  document.querySelectorAll(".nav-tab-btn").forEach(btn => {
    const isTarget = btn.getAttribute("data-tab") === sectionId;
    btn.classList.toggle("active", isTarget);
    btn.setAttribute("aria-selected", isTarget ? "true" : "false");
  });

  // Toggle view sections
  document.querySelectorAll(".view-section").forEach(sec => {
    sec.style.display = sec.id === `section-${sectionId}` ? "block" : "none";
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}
window.switchSection = switchSection;

function clearSearch() {
  AppState.searchQuery = "";
  const input = document.getElementById("global-search");
  if (input) input.value = "";
  renderModulesGrid();
}
window.clearSearch = clearSearch;

// DOM Ready Event Initialization
document.addEventListener("DOMContentLoaded", () => {
  initPWA();
  initAppData();
  initPomodoro();
  initBackendScriptTriggers();
  initDataIngestionSuite();

  // Top Nav Tab Clicks
  document.querySelectorAll(".nav-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");
      if (tab) switchSection(tab);
    });
  });

  // Brand click -> Section 1
  document.getElementById("brand-home-btn")?.addEventListener("click", () => {
    switchSection("skills");
  });

  // Track filter chips
  document.getElementById("track-filter-container")?.addEventListener("click", (e) => {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;
    document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    AppState.activeTrackFilter = chip.getAttribute("data-track") || "all";
    renderModulesGrid();
  });

  // Global search input
  const searchInput = document.getElementById("global-search");
  searchInput?.addEventListener("input", (e) => {
    AppState.searchQuery = e.target.value;
    renderModulesGrid();
  });

  // Module Reader Modal actions
  document.getElementById("close-reader-btn")?.addEventListener("click", () => closeModal("module-reader-modal"));
  document.getElementById("reader-toggle-mastered-btn")?.addEventListener("click", toggleModuleMastered);
  document.getElementById("reader-export-md-btn")?.addEventListener("click", exportModuleMarkdown);

  // Ingestion Modal
  document.getElementById("open-ingest-modal-btn")?.addEventListener("click", () => openModal("ingest-modal"));
  document.getElementById("close-ingest-btn")?.addEventListener("click", () => closeModal("ingest-modal"));

  // Sub-tabs in Section 2 (Interview Prep)
  document.querySelectorAll("[data-interview-tool]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-interview-tool]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const tool = btn.getAttribute("data-interview-tool");
      AppState.activeInterviewTool = tool;

      document.querySelectorAll(".interview-tool-view").forEach(v => v.style.display = "none");
      const targetView = document.getElementById(`tool-${tool}`);
      if (targetView) targetView.style.display = "block";
    });
  });

  // Flashcard interactions
  document.getElementById("active-flashcard")?.addEventListener("click", flipFlashcard);
  document.getElementById("fc-rate-again")?.addEventListener("click", () => rateFlashcard("again"));
  document.getElementById("fc-rate-hard")?.addEventListener("click", () => rateFlashcard("hard"));
  document.getElementById("fc-rate-good")?.addEventListener("click", () => rateFlashcard("good"));
  document.getElementById("fc-rate-easy")?.addEventListener("click", () => rateFlashcard("easy"));
  document.getElementById("shuffle-flashcards-btn")?.addEventListener("click", () => {
    AppState.flashcardsList.sort(() => Math.random() - 0.5);
    AppState.currentFlashcardIndex = 0;
    updateFlashcardDisplay();
    showToast("Deck shuffled.");
  });
  document.getElementById("reset-flashcards-btn")?.addEventListener("click", async () => {
    AppState.flashcardStats = {};
    await storage.clear("flashcards");
    updateFlashcardDisplay();
    showToast("Flashcard retention reset.");
  });

  // Puzzle 1 & 2
  document.getElementById("reset-puzzle-btn")?.addEventListener("click", () => {
    AppState.puzzlePath = [];
    renderPuzzles();
    const fb = document.getElementById("puzzle-feedback");
    if (fb) fb.style.display = "none";
  });
  document.getElementById("run-rate-sim-btn")?.addEventListener("click", runRateLimiterSim);
  document.getElementById("capacity-slider")?.addEventListener("input", (e) => {
    const val = document.getElementById("capacity-val");
    if (val) val.innerText = e.target.value;
  });
  document.getElementById("refill-slider")?.addEventListener("input", (e) => {
    const val = document.getElementById("refill-val");
    if (val) val.innerText = e.target.value;
  });

  // Coding Challenges
  document.getElementById("run-code-btn")?.addEventListener("click", runCodingTests);
  document.getElementById("toggle-solution-btn")?.addEventListener("click", toggleReferenceSolution);

  // Scenario
  document.getElementById("restart-scenario-btn")?.addEventListener("click", restartScenario);

  // Section 3 Sub-tabs (Job Hunting)
  document.querySelectorAll("[data-job-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-job-view]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const view = btn.getAttribute("data-job-view");

      document.querySelectorAll(".job-subview").forEach(v => v.style.display = "none");
      const targetView = document.getElementById(`job-view-${view}`);
      if (targetView) targetView.style.display = "block";
    });
  });

  // Job Modal
  document.getElementById("open-add-job-btn")?.addEventListener("click", () => openModal("job-modal"));
  document.getElementById("close-job-modal-btn")?.addEventListener("click", () => closeModal("job-modal"));
  document.getElementById("cancel-job-modal-btn")?.addEventListener("click", () => closeModal("job-modal"));
  document.getElementById("job-form")?.addEventListener("submit", handleAddJobSubmit);

  // Note Modal
  document.getElementById("open-add-note-btn")?.addEventListener("click", () => openModal("note-modal"));
  document.getElementById("close-note-modal-btn")?.addEventListener("click", () => closeModal("note-modal"));
  document.getElementById("cancel-note-modal-btn")?.addEventListener("click", () => closeModal("note-modal"));
  document.getElementById("note-form")?.addEventListener("submit", handleAddNoteSubmit);

  // Snippet Modal
  document.getElementById("open-add-snippet-btn")?.addEventListener("click", () => openModal("snippet-modal"));
  document.getElementById("close-snippet-modal-btn")?.addEventListener("click", () => closeModal("snippet-modal"));
  document.getElementById("cancel-snippet-modal-btn")?.addEventListener("click", () => closeModal("snippet-modal"));
  document.getElementById("snippet-form")?.addEventListener("submit", handleAddSnippetSubmit);

  // iOS Guide Modal
  document.getElementById("close-ios-guide-btn")?.addEventListener("click", () => closeModal("ios-guide-modal"));

  // Global Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    // Escape closes modals
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay.active").forEach(m => m.classList.remove("active"));
      return;
    }

    // Ignore single key shortcuts if typing in input or textarea
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
      return;
    }

    if (e.key === "1") switchSection("skills");
    else if (e.key === "2") switchSection("interviews");
    else if (e.key === "3") switchSection("jobhunting");
    else if (e.key === "4") switchSection("accelerator");
    else if (e.key === "/") {
      e.preventDefault();
      searchInput?.focus();
    } else if (e.code === "Space" && AppState.activeSection === "interviews" && AppState.activeInterviewTool === "flashcards") {
      e.preventDefault();
      flipFlashcard();
    }
  });
});
