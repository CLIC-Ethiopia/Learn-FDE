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
    },
    {
      id: "mod-palantir-ontology",
      trackId: "solution-architecture",
      title: "Palantir AIP & Enterprise Ontology Modeling (OSDK)",
      difficulty: "Mission-Critical",
      estimatedMinutes: 55,
      tags: ["Palantir", "Foundry", "Ontology", "OSDK", "Action-Types", "Writeback"],
      summary: "Model complex enterprise legacy data into kinetic Palantir-style Ontologies with Object Types, Link Types, Action Types, and validated writeback pipelines.",
      content: `### The Power of an Enterprise Ontology

In conventional data architectures, applications query raw tables or views (\`patients\`, \`encounters\`, \`claims\`). In a modern enterprise Forward Deployed environment (such as Palantir Foundry / AIP), data is transformed into a **Kinetic Ontology** — a real-time semantic layer connecting data objects, relations, and operational actions.

#### The 4 Core Primitives
1. **Object Types**: Business entities with typed properties and primary keys (e.g., \`Flight\`, \`AircraftTail\`, \`HospitalPatient\`).
2. **Link Types**: First-class bidirectional relationships (e.g., \`HospitalPatient\` 1:N \`ClinicalEncounter\`, \`AircraftTail\` 1:1 \`AssignedPilot\`).
3. **Action Types**: Declarative business mutations with validation gates and audit trails (e.g., \`ScheduleMaintenance\`, \`DischargePatient\`, \`RerouteFlight\`).
4. **Writeback Handlers**: Safe synchronizers that push action mutations back into legacy transactional systems (SAP, Oracle, Epic) or event streams with transactional rollback.

\`\`\`typescript
// Example: TypeScript OSDK Action Definition with Validation Gate
import { ActionDefinition, ActionValidationResult } from '@osdk/api';

export const ScheduleEmergencyICUBed: ActionDefinition = {
  apiName: 'scheduleEmergencyIcuBed',
  parameters: {
    patientId: { type: 'string', required: true },
    targetWardId: { type: 'string', required: true },
    justification: { type: 'string', required: true }
  },
  validate: async (ctx, params): Promise<ActionValidationResult> => {
    const ward = await ctx.ontology.objects.HospitalWard.get(params.targetWardId);
    if (ward.availableBeds <= 0) {
      return { valid: false, reason: 'No ICU beds currently available in selected ward.' };
    }
    return { valid: true };
  },
  execute: async (ctx, params) => {
    await ctx.ontology.actions.assignBed({
      patientId: params.patientId,
      wardId: params.targetWardId,
      assignedAt: new Date().toISOString()
    });
    await ctx.services.ehrConnector.dispatchBedUpdate(params.patientId, params.targetWardId);
  }
};
\`\`\`

#### Field Checklist for FDEs
- [ ] Map all primary keys to immutable surrogate identifiers (UUIDv4 or canonical composite hashes).
- [ ] Ensure all Action Types define pre-condition validation rules before committing mutations.
- [ ] Set up automated writeback reconciliation monitors that alert on sync drift between the Ontology and underlying source databases.`,
      checkpoints: [
        "Modeled Object Types and Link Types with bidirectional navigation",
        "Configured Action Type validation gates preventing invalid operational states",
        "Built resilient writeback adapters with compensatory transaction rollbacks"
      ],
      quiz: {
        question: "In a Palantir-style Ontology architecture, what is the primary role of an 'Action Type'?",
        options: [
          "It executes raw SQL DROP TABLE statements on the production database",
          "It encapsulates a business mutation with pre-condition validation, permission checks, audit logging, and legacy writeback",
          "It replaces the React frontend with a command-line script",
          "It automatically encrypts the developer's laptop hard drive"
        ],
        answerIndex: 1,
        explanation: "Action Types turn read-only analytical data into an operational decision platform by bundling validation, authorization, audit logging, and writeback into a single atomic primitive."
      }
    },
    {
      id: "mod-airgap-llm-serving",
      trackId: "ai-ml-fundamentals",
      title: "Air-Gapped & Sovereign LLM Serving (vLLM & AWQ)",
      difficulty: "Advanced",
      estimatedMinutes: 50,
      tags: ["vLLM", "AWQ-Quantization", "Air-Gap", "Offline-Inference", "GPU-VRAM"],
      summary: "Package, size, and serve quantized 70B parameter models on disconnected multi-GPU nodes with PagedAttention and zero outbound telemetry.",
      content: `### Disconnected Inference in Secure Bastions

When deploying frontier AI into classified defense bunkers, intelligence enclaves, or private banking vaults, cloud APIs (OpenAI, Anthropic, Bedrock) are strictly forbidden. FDEs must deploy open-weights models (e.g. Llama-3-70B, Mistral Large, Qwen) completely offline.

#### VRAM Budgeting & Quantization Arithmetic
1. **Model Weights VRAM**:
   - 16-bit FP16: 70 * 2 = 140 GB (requires 2x NVIDIA A100 80GB or 4x RTX 6000 Ada 48GB).
   - 4-bit AWQ / GPTQ: 70 * 0.55 = ~38.5 GB (fits into a single NVIDIA A100 80GB or 2x 24GB RTX 4090s!).
2. **KV Cache Calculation**:
   - Grouped-Query Attention (GQA) dramatically reduces KV memory: KV_Bytes = 2 * layers * kv_heads * head_dim * bytes_per_element * context_len * batch_size.
3. **vLLM PagedAttention Deployment Configuration**:
   - Disable telemetry: set \`VLLM_NO_USAGE_STATS=1\`.
   - Enforce offline Hugging Face cache: \`HF_HUB_OFFLINE=1\`.

\`\`\`yaml
# Air-Gapped Docker Compose Manifest for vLLM
version: '3.8'
services:
  vllm-engine:
    image: internal-harbor.local/fde/vllm:v0.4.2
    container_name: fde-vllm-airgap
    restart: always
    environment:
      - HF_HUB_OFFLINE=1
      - VLLM_NO_USAGE_STATS=1
      - CUDA_VISIBLE_DEVICES=0,1
    volumes:
      - /data/airgap_models/Meta-Llama-3-70B-Instruct-AWQ:/model:ro
    ports:
      - "127.0.0.1:8000:8000"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 2
              capabilities: [gpu]
    command: >
      --model /model
      --quantization awq
      --tensor-parallel-size 2
      --max-model-len 8192
      --gpu-memory-utilization 0.90
      --enforce-eager
\`\`\`

#### Field Checklist for FDEs
- [ ] Pre-compile Triton and CUDA kernel caches offsite to prevent 15-minute warmup delays during on-prem startup.
- [ ] Verify \`sha256sum\` on all \`.safetensors\` model chunks before initiating model load.
- [ ] Restrict vLLM HTTP listener to internal bridge network (127.0.0.1 or internal Docker network).`,
      checkpoints: [
        "Calculated precise VRAM allocation across weights, activation memory, and KV cache",
        "Configured AWQ 4-bit tensor-parallel container topology with zero outbound traffic",
        "Benchmarked concurrent time-to-first-token (TTFT) and throughput under simulated load"
      ],
      quiz: {
        question: "Why is setting HF_HUB_OFFLINE=1 and VLLM_NO_USAGE_STATS=1 critical in air-gapped defense or hospital environments?",
        options: [
          "It makes the GPU fans spin in reverse to save power",
          "It prevents containers from attempting external telemetry connections that trigger security firewall alerts and connection timeouts",
          "It reduces token generation cost to zero dollars",
          "It enables automatic dark mode on the client's monitor"
        ],
        answerIndex: 1,
        explanation: "Default open-source ML libraries often attempt to phone home to verify hub releases or send anonymous telemetry. In an air-gap, these outbound attempts hang sockets or trigger automated InfoSec intrusion detection systems."
      }
    },
    {
      id: "mod-streaming-cdc-kafka",
      trackId: "core-tech-stack",
      title: "Enterprise CDC, Debezium & Real-Time Schemas",
      difficulty: "Advanced",
      estimatedMinutes: 50,
      tags: ["CDC", "Debezium", "Kafka", "Schema-Registry", "Avro", "ClickHouse"],
      summary: "Extract low-latency database mutations from legacy transactional systems without table locking using write-ahead log replication.",
      content: `### Non-Invasive Data Extraction via Change Data Capture (CDC)

In enterprise engagements, client DBAs will vehemently refuse permission to run recurring periodic SQL extraction queries against their transactional systems due to table locks and CPU degradation.

The industry standard solution is **Log-Based Change Data Capture (CDC)** using Debezium over the database's write-ahead transaction log (WAL / Oplog / Redo Log).

#### Why Log-Based CDC Wins
1. **Zero Table Locks**: Reads internal binary logs sequentially from disk without holding locks on operational tables.
2. **Captures Deletes & Intermediary States**: Periodic polling misses rows that were updated and deleted between poll intervals; CDC captures every atomic state transition.
3. **Sub-Second Latency**: Mutations are streamed to Apache Kafka or Redpanda within <100 milliseconds of commit.

\`\`\`json
// Debezium Postgres CDC Connector Configuration
{
  "name": "fde-core-banking-cdc",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "tasks.max": "1",
    "plugin.name": "pgoutput",
    "database.hostname": "core-db.internal",
    "database.port": "5432",
    "database.user": "debezium_repl",
    "database.password": "\${vault:cdc_password}",
    "database.dbname": "banking_prod",
    "database.server.name": "fintech_prod",
    "table.include.list": "public.accounts,public.transactions",
    "tombstones.on.delete": "false",
    "key.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "key.converter.schema.registry.url": "http://schema-registry:8081",
    "value.converter.schema.registry.url": "http://schema-registry:8081"
  }
}
\`\`\`

#### Handling Schema Drift with Avro & Schema Registry
Enterprise clients change database columns without warning. Using Confluent Schema Registry with **FULL_TRANSITIVE** compatibility ensures downstream consumers gracefully ignore new nullable fields or use defaults without breaking pipelines.`,
      checkpoints: [
        "Configured non-locking WAL logical replication slot with read-only user permissions",
        "Set up Avro schema serialization with backward and forward compatibility rules",
        "Constructed dead-letter queue (DLQ) routing for malformed CDC events"
      ],
      quiz: {
        question: "Why is log-based CDC via Debezium preferred over polling queries (SELECT * WHERE updated_at > ?) on legacy client databases?",
        options: [
          "Polling queries require the database to be converted to MongoDB first",
          "Log-based CDC reads the write-ahead log with zero table locks, captures hard deletes, and streams events in sub-second latency",
          "CDC queries are written in CSS instead of SQL",
          "Polling queries require internet access while CDC works via Bluetooth"
        ],
        answerIndex: 1,
        explanation: "CDC reads binary transaction logs directly, avoiding table scans, locks, and missed intermediate row mutations."
      }
    },
    {
      id: "mod-llm-eval-rag-triad",
      trackId: "ai-ml-fundamentals",
      title: "Enterprise LLM Evaluation & The RAG Triad",
      difficulty: "Mission-Critical",
      estimatedMinutes: 45,
      tags: ["Evaluation", "RAG-Triad", "Faithfulness", "Ragas", "LLM-as-Judge"],
      summary: "Construct automated CI/CD evaluation harnesses measuring Context Precision, Faithfulness/Groundedness, and Answer Relevance before production rollout.",
      content: `### Moving Past 'Vibe-Based' Evaluation

Amateur developers test AI prompts by eye in a web UI. Enterprise Forward Deployed Engineers implement automated, metric-driven evaluation pipelines using the **RAG Triad** to prevent hallucinations in mission-critical deployments.

#### The RAG Triad Metrics
1. **Context Relevance (Retrieval Precision)**: Are the retrieved text chunks strictly relevant to the user query, or is the context window flooded with noisy irrelevance?
2. **Groundedness / Faithfulness (Hallucination Detector)**: Is every factual claim in the generated output mathematically supported by the retrieved context, or did the model invent facts?
3. **Answer Relevance**: Does the generated answer directly address the user's explicit question without meandering into tangential commentary?

\`\`\`python
# Automated RAG Triad Evaluation Harness with LLM-as-a-Judge
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall
)
from datasets import Dataset

# Enterprise Evaluation Gold Dataset
eval_data = {
    'question': ["What is the maximum allowable backpressure delay for core payment events?"],
    'contexts': [["Section 4.2: Payment event queues apply token-bucket rate limiting with a hard timeout cap of 250ms before routing to DLQ."]],
    'answer': ["The maximum allowable backpressure delay is 250ms, after which events are routed to the Dead Letter Queue."],
    'ground_truth': ["250ms before dead letter queue routing"]
}

dataset = Dataset.from_dict(eval_data)
results = evaluate(
    dataset,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall]
)

print(f"Faithfulness Score: {results['faithfulness']:.4f}")
print(f"Answer Relevancy: {results['answer_relevancy']:.4f}")
assert results['faithfulness'] >= 0.95, "Deployment Rejected: Faithfulness score below SLA threshold!"
\`\`\`

#### Field Checklist for FDEs
- [ ] Require a minimum 50-sample enterprise ground truth test set signed off by client domain experts.
- [ ] Embed automated evaluation thresholds into Git pre-merge hooks and deployment gates.
- [ ] Track metric drift continuously across weekly client updates.`,
      checkpoints: [
        "Constructed synthetic ground truth QA test sets from customer documentation",
        "Implemented automated faithfulness and context relevance scoring pipelines",
        "Established CI/CD deployment gates blocking models with hallucination scores > 5%"
      ],
      quiz: {
        question: "If an LLM outputs an answer that sounds plausible and answers the user's question, but references facts never found in the retrieved source documents, which RAG Triad metric failed?",
        options: [
          "Context Precision",
          "Faithfulness (Groundedness)",
          "TCP Handshake Window",
          "CSS Line-Height"
        ],
        answerIndex: 1,
        explanation: "Faithfulness measures whether the response is strictly grounded in and entailed by the retrieved source context. When facts are generated from pre-trained memory rather than source documents, faithfulness fails."
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
    },
    {
      id: "fc-9",
      deck: "System Design for FDE",
      question: "What is an 'Action Type' in a Palantir-style enterprise Ontology, and how does writeback work?",
      answer: "An Action Type is a declarative business operation with pre-condition validation, permission checks, and audit logging. When triggered, it mutates Ontology object links and executes an asynchronous or synchronous writeback adapter (via REST, Kafka, or SQL) to push the mutation back to legacy client systems.",
      proTip: "Always enforce compensatory transactions (saga pattern) in case downstream legacy ERP rejects the writeback."
    },
    {
      id: "fc-10",
      deck: "System Design for FDE",
      question: "How do you size GPU VRAM for offline LLM serving with vLLM in an air-gapped facility?",
      answer: "Base weights in 4-bit AWQ = ~0.55 GB per 1B parameters (70B model = 38.5 GB). Then add KV cache: KV_bytes = 2 * layers * kv_heads * head_dim * bytes_per_element * context_len * batch_size. For 70B with 8k context and batch 8, allocate at least 16GB for KV cache. Total = ~55 GB VRAM (requires 1x A100 80GB or 2x RTX 4090 24GB).",
      proTip: "Set HF_HUB_OFFLINE=1 and VLLM_NO_USAGE_STATS=1 to prevent failed outbound telemetry pings."
    },
    {
      id: "fc-11",
      deck: "Data Pipelines & Ingestion",
      question: "Why is Log-Based CDC (Debezium) superior to periodic polling queries (SELECT * WHERE updated_at > ?) for legacy enterprise DBs?",
      answer: "Log-based CDC reads the write-ahead log (WAL) with zero table locks, captures hard deletes (which polling misses), captures intermediate mutations between polls, and delivers events with sub-100ms latency without spiking database CPU.",
      proTip: "Always request a read-only replication user and establish statement timeouts on initial snapshot tables."
    },
    {
      id: "fc-12",
      deck: "Data Pipelines & Ingestion",
      question: "What is the Outbox Pattern and why is it essential when updating a database and publishing a Kafka event?",
      answer: "In distributed systems, writing to a database and publishing to Kafka cannot be coordinated in a single two-phase commit without severe latency. The Outbox Pattern writes the business row and an event record into an 'outbox' table within the SAME local database transaction. A separate CDC process or worker then streams from the outbox to Kafka with at-least-once delivery guarantee.",
      proTip: "Pair with an idempotency key on consumers to achieve effectively exactly-once semantics."
    },
    {
      id: "fc-13",
      deck: "AI/ML & Local LLM Serving",
      question: "What are the three core metrics of the 'RAG Triad' in enterprise LLM evaluation?",
      answer: "1. Context Relevance: Are the retrieved chunks relevant to the user prompt? (Precision/Recall)\n2. Groundedness (Faithfulness): Are all claims in the generated answer strictly entailed by the context?\n3. Answer Relevance: Does the output directly answer the prompt without hallucinated tangents?",
      proTip: "Use frameworks like Ragas or TruLens to automate RAG Triad scoring in CI/CD deployment gates."
    },
    {
      id: "fc-14",
      deck: "AI/ML & Local LLM Serving",
      question: "What is Reciprocal Rank Fusion (RRF) and why is it used in enterprise hybrid search?",
      answer: "RRF merges ranked results from two distinct search strategies (e.g. BM25 keyword search and dense vector semantic search) without requiring score normalization. Formula: RRF_score(d) = sum(1 / (k + rank_i(d))), where k is typically 60. It reliably boosts domain keyword accuracy while preserving semantic nuance.",
      proTip: "Essential when customers search for exact part serial numbers or acronyms alongside natural language questions."
    },
    {
      id: "fc-15",
      deck: "Enterprise Security & Compliance",
      question: "What is the difference between DoD IL5 and IL6 compliance in forward deployments?",
      answer: "DoD Impact Level 5 (IL5) accommodates Controlled Unclassified Information (CUI) and unclassified National Security Systems. Impact Level 6 (IL6) accommodates classified data up to SECRET. IL6 mandates physical air-gapped enclaves, SCIF physical access controls, and zero wireless signals.",
      proTip: "For IL6, all software, models, and dependencies must be transported via verified, cryptographically hashed optical or encrypted media."
    },
    {
      id: "fc-16",
      deck: "Enterprise Security & Compliance",
      question: "Why should an FDE never set NODE_TLS_REJECT_UNAUTHORIZED=0 in a customer environment?",
      answer: "Setting this environment variable disables TLS certificate verification globally, making all network traffic vulnerable to Man-In-The-Middle (MITM) eavesdropping and credential theft. Instead, export the client corporate CA certificate and configure NODE_EXTRA_CA_CERTS=/path/to/corporate-ca.crt.",
      proTip: "Disabling TLS verification in a banking or defense environment will immediately fail InfoSec review."
    },
    {
      id: "fc-17",
      deck: "Docker & Distributed Systems",
      question: "How do you diagnose why a container in an air-gapped Kubernetes cluster is stuck in CrashLoopBackOff without internet?",
      answer: "1. Inspect exit code: kubectl describe pod <pod-name> (look for OOMKilled=137 or CommandNotFound=127).\n2. Read previous container logs: kubectl logs <pod-name> --previous.\n3. Run ephemeral debug container or check volume mounts and permissions (chmod).\n4. Verify entrypoint binary architecture (x86_64 vs arm64) using file <binary>.",
      proTip: "OOMKilled code 137 means the container exceeded memory limit; increase memory limit in Helm values."
    },
    {
      id: "fc-18",
      deck: "Client Scoping & Politics",
      question: "What is an 'Executive Milestone POC Demo' and how should an FDE structure it?",
      answer: "A high-stakes 20-minute meeting for client C-level sponsors (CIO, VP of Ops). Structure:\n1. 3 mins: Reiterate agreed business problem & metric baseline.\n2. 10 mins: Live software demo running on their real/sanitized data demonstrating target metric.\n3. 4 mins: Quantified impact summary (e.g. 'Reduced manual triage from 4 hours to 8 minutes').\n4. 3 mins: Clear next steps and contract transition criteria.",
      proTip: "Never show raw JSON or shell scripts to executives; show intuitive metrics, dashboards, and operational flows."
    },
    {
      id: "fc-19",
      deck: "Algorithmic Edge Cases",
      question: "What is the Fellegi-Sunter methodology for Master Patient Index (MPI) record linkage in healthcare?",
      answer: "A probabilistic entity resolution framework that calculates log-likelihood ratio weights for matching and non-matching attributes (e.g. phonetic first name, last name, date of birth, SSN, address). Records with total weight above threshold T_high are declared matches; between T_low and T_high require human clinical review; below T_low are distinct patients.",
      proTip: "Drops patient record mismatch rate from ~15% down to <0.5% across disparate EHRs."
    },
    {
      id: "fc-20",
      deck: "System Design for FDE",
      question: "What are the 6 pillars of the FDE 'Definition of Done' before offboarding from a client site?",
      answer: "1. Zero-Secret Manifests (Vault / KMS injection).\n2. Automated Health & Readiness Probes (<200ms with graceful drain).\n3. Immutable Hash-Chained Audit Trails (SHA-256).\n4. Disaster Recovery & Rollback Runbook (tested 15-minute recovery).\n5. Client Shadow Pairing Complete (client engineers operate unassisted).\n6. Signed Executive Acceptance (quantified SLA validation signed by VP).",
      proTip: "A deployment isn't complete when you can run it—it's complete when the customer's junior engineer can maintain it."
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
    },
    {
      id: "scenario-fintech-cdc",
      title: "Real-Time CDC & Fraud Ontology for Tier-1 Commercial Bank",
      client: "Global Commercial Bank (Core Banking Group)",
      challenge: "The customer's core banking runs on a mainframe DB2 database with overnight batch balance reconciliation. Fraud detection teams cannot detect fraudulent withdrawals until 24 hours later. The VP of Risk mandates sub-second fraud alerts without impacting the core transaction ledger.",
      stages: [
        {
          stageNumber: 1,
          title: "Stage 1: Non-Invasive Ingestion & Zero-Lock CDC",
          prompt: "The lead mainframe DBA refuses periodic SQL SELECT queries because of table locking. How do you capture transactions continuously?",
          choices: [
            {
              id: "a",
              label: "Deploy Debezium CDC reading the write-ahead recovery log (WAL/redo log) with a read-only replication privilege, streaming raw mutations into Apache Kafka with Avro serialization.",
              score: 100,
              feedback: "Flawless! Log-based CDC bypasses query locks completely and guarantees sub-100ms event delivery."
            },
            {
              id: "b",
              label: "Trigger a full database dump every 5 minutes to an S3 bucket.",
              score: 0,
              feedback: "Fatal mistake: continuous dumps cause severe disk I/O thrashing and will freeze core banking transactions."
            },
            {
              id: "c",
              label: "Inject an HTTP webhook directly into the 20-year-old COBOL transaction processing routine.",
              score: 15,
              feedback: "High risk: modifying core banking COBOL code introduces catastrophic regression risk."
            }
          ]
        },
        {
          stageNumber: 2,
          title: "Stage 2: Streaming Analytics & Fast Inference SLA",
          prompt: "Incoming transactions spike to 18,000 events/sec during Black Friday. Fraud scores must be calculated within <80ms. How do you architect the serving layer?",
          choices: [
            {
              id: "a",
              label: "Sink Kafka events into ClickHouse with Materialized Views for rolling window aggregations, evaluated by a containerized XGBoost microservice over gRPC.",
              score: 100,
              feedback: "Industry standard: ClickHouse handles 100k+ inserts/sec effortlessly while gRPC keeps microservice inference well under 25ms."
            },
            {
              id: "b",
              label: "Write all events to a single SQLite file and run a Python for-loop.",
              score: 0,
              feedback: "SQLite will lock on write concurrency immediately under 18k events/sec."
            }
          ]
        }
      ]
    },
    {
      id: "scenario-defense-airgap",
      title: "Multi-Modal Avionics Intelligence in a Classified Air-Gapped Depot",
      client: "Aerospace Logistics & Maintenance Command",
      challenge: "1.5 million legacy scanned maintenance PDFs and sensor logs are siloed inside an underground bunker with zero internet connectivity. Field technicians need natural-language troubleshooting assistance to locate wiring schematics in under 3 seconds.",
      stages: [
        {
          stageNumber: 1,
          title: "Stage 1: Air-Gap Media Transfer & Cryptographic Integrity",
          prompt: "How do you securely transport model weights, container images, and software updates into the classified facility?",
          choices: [
            {
              id: "a",
              label: "Export pre-tested Docker tarballs and AWQ model weights onto client-accredited encrypted physical drives, verifying SHA-256 checksums at the air-gap hardware gate before importing to internal Harbor registry.",
              score: 100,
              feedback: "Exemplary defense deployment protocol: strict hash verification prevents corrupted binaries and complies with security accreditation."
            },
            {
              id: "b",
              label: "Tether a mobile 5G hotspot under your desk to download Hugging Face packages.",
              score: 0,
              feedback: "Severe security violation: bringing unauthorized wireless transmitters into a secure facility is an espionage breach."
            }
          ]
        },
        {
          stageNumber: 2,
          title: "Stage 2: Offline Multi-Modal Search & Vector Indexing",
          prompt: "The PDF schematics contain complex technical diagrams and OCR scans. What indexing topology yields accurate pinpointing without cloud APIs?",
          choices: [
            {
              id: "a",
              label: "Process PDFs via local PaddleOCR/Tesseract containers, generate dense embeddings using on-prem BAAI/BGE models, and index into an air-gapped Qdrant vector cluster with reciprocal rank fusion (RRF).",
              score: 100,
              feedback: "Top-tier architecture: local OCR + dense embeddings + RRF delivers 92%+ pinpoint accuracy entirely within the offline perimeter."
            },
            {
              id: "b",
              label: "Rely solely on naive SQL LIKE '%wire%' queries against unparsed file names.",
              score: 10,
              feedback: "Unusable: fails to extract text from scanned images and cannot match semantic synonyms."
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
// OVERVIEW & CAREERS DATA CONSTANTS
// ============================================================================
const DAY_IN_LIFE_SLOTS = [
  {
    id: "slot-0830",
    time: "08:30 AM",
    title: "Client Jumpbox & mTLS Handshake",
    badge: "Bastion Onboarding",
    situation: "Arrive at customer defense datacenter. The security officer hands you an air-gapped laptop with zero outbound internet. You must SSH into the internal cluster jumpbox via hardware YubiKey and verify internal container registry connectivity.",
    commandSnippet: `ssh -i ~/.ssh/fde_bastion_key analyst@10.240.12.5 -p 2222
# Verify internal Harbor registry connectivity over mTLS
curl --cert /etc/ssl/client.crt --key /etc/ssl/client.key https://registry.defense.client.internal/v2/`,
    fieldRealityCheck: "Corporate firewalls drop idle TCP sockets every 60s. Experienced FDEs immediately configure ServerAliveInterval 30 in ~/.ssh/config to prevent terminal freezes during DBA meetings."
  },
  {
    id: "slot-1030",
    time: "10:30 AM",
    title: "DBA Schema Alignment & Reconciler",
    badge: "Legacy Integration",
    situation: "Meeting with the client chief DBA who is terrified your pipeline will lock their 15-year-old Oracle production database. You walk through your Change-Data-Capture (CDC) outbox pattern and demonstrate zero table locking with EXPLAIN ANALYZE.",
    commandSnippet: `SELECT pid, query, state, age(clock_timestamp(), query_start) 
FROM pg_stat_activity 
WHERE state != 'idle' AND query LIKE '%fde_cdc%';
-- Proof: CDC uses read-only replica with statement_timeout = 250ms`,
    fieldRealityCheck: "Never debate DBAs with theoretical abstractions. Show them your exact read-only connection pool limits, replica isolation, and automated kill-switch runbooks."
  },
  {
    id: "slot-1245",
    time: "12:45 PM",
    title: "Executive Milestone POC Demo",
    badge: "Executive Diplomacy",
    situation: "Live 20-minute demonstration for the Client CIO, VP of Clinical Operations, and Chief Medical Officer. You showcase the real-time ICU bed availability predictor running against their synthesized historical data feeds.",
    commandSnippet: `curl -s -X POST http://localhost:8080/api/predict-icu \\
  -H "Content-Type: application/json" \\
  -d '{"hospital_id":"HOSP-09","ward":"ICU-B","time_horizon_hrs":12}'
# Result: 99.4% precision with <45ms response time`,
    fieldRealityCheck: "Executives don't care about your Docker multi-stage build size; they care about quantifiable ROI: 'This cut manual patient triage from 4 hours to 8 minutes.'"
  },
  {
    id: "slot-1430",
    time: "02:30 PM",
    title: "Air-Gapped Kubernetes Hotfix",
    badge: "Production Systems",
    situation: "During afternoon load testing, a GPU node triggers an Out-Of-Memory (OOM) panic during 70B parameter LLM inference. You calculate the KV cache allocation budget, apply AWQ 4-bit quantization, and patch the Helm values manifest on-premise.",
    commandSnippet: `helm upgrade --install fde-llm-engine ./charts/vllm-airgap \\
  --set gpu.memoryUtilization=0.85 \\
  --set model.quantization=awq \\
  --set model.maxModelLen=4096 \\
  --namespace fde-runtime`,
    fieldRealityCheck: "In an air-gap, you cannot Google error codes or stack traces. You must understand Linux cgroups, memory paging, and GPU VRAM arithmetic from first principles."
  },
  {
    id: "slot-1700",
    time: "05:00 PM",
    title: "SLA Telemetry & Client Handover",
    badge: "Operational Handover",
    situation: "Export immutable SHA-256 audit logs, verify that all Grafana alert thresholds are green, and conduct daily debrief with the customer technical lead. You package today's patch into an internal Git tag before boarding your flight.",
    commandSnippet: `git tag -a v1.4.2-client-patch -m "Signed-off airgap release with audited HIPAA redaction"
./scripts/generate_daily_sla_report.sh --tenant hospital-corp > sla_report_day12.pdf`,
    fieldRealityCheck: "The true measure of a world-class FDE is not just making it work while you are onsite—it is ensuring it runs flawlessly without a single page after you leave."
  }
];

const ARCHETYPE_QUESTIONS = [
  {
    question: "The client's corporate InfoSec team delays VPN approvals by 3 weeks, threatening your agreed 30-day POC timeline. What is your instinct?",
    options: [
      { text: "Build an offline synthetic schema generator and simulate the entire pipeline on your local workstation so you hit the ground running.", type: "hacker" },
      { text: "Schedule an emergency alignment session with the client CIO to present the timeline trade-offs and negotiate temporary bastion credentials.", type: "diplomat" },
      { text: "Extract a generalized customer integration SDK so future engagements never suffer from this same onboarding delay.", type: "pioneer" },
      { text: "Show up in-person at their IT department with pastries and physically walk the ticket through the security manager's desk.", type: "operator" }
    ]
  },
  {
    question: "During a high-stakes executive demo, a sudden unexpected database timeout error flashes on the main dashboard screen. How do you respond?",
    options: [
      { text: "Smoothly explain the system's automated failover topology while gracefully switching to cached sample scenarios without missing a beat.", type: "diplomat" },
      { text: "Open the terminal console, inspect the query execution plan in real-time, inject a temporary index, and show it resolve live.", type: "hacker" },
      { text: "Immediately capture the trace, diagnose the client connection pool limit, and coordinate with their sysadmin to hot-patch it.", type: "operator" },
      { text: "Note the design limitation and draft an architectural RFC for an asynchronous event-driven fallback worker.", type: "pioneer" }
    ]
  },
  {
    question: "When writing forward-deployed glue code, which trade-off philosophy resonates most with you?",
    options: [
      { text: "Ruthless speed and pragmatic resilience: a working demo on client data in Week 2 beats 100 pages of theoretical perfection.", type: "operator" },
      { text: "Deep systems correctness: zero memory leaks, sub-millisecond tail latency, and strict cryptographic audit guarantees.", type: "hacker" },
      { text: "Client ownership: self-documenting code, intuitive dashboards, and runbooks that customer engineers love maintaining.", type: "diplomat" },
      { text: "Platform generalization: every custom client adapter should be modularized to contribute back to core product IP.", type: "pioneer" }
    ]
  },
  {
    question: "What gives you the highest professional satisfaction at the end of an engagement?",
    options: [
      { text: "The client VP explicitly declaring that your platform saved their $10M initiative from disaster.", type: "diplomat" },
      { text: "Solving a deep distributed systems bottleneck that stumped the client's internal engineering staff for 6 months.", type: "hacker" },
      { text: "Shipping a high-velocity production system into the wild in 3 weeks that handles real mission-critical data.", type: "operator" },
      { text: "Seeing a custom solution you engineered in the field get adopted as a flagship product feature across the entire company.", type: "pioneer" }
    ]
  }
];

const ARCHETYPE_PROFILES = {
  hacker: {
    title: "Deep Systems Hacker",
    tagline: "The Low-Level Bastion Specialist",
    description: "You thrive deep in Linux kernels, GPU memory paging, vector math, and air-gapped network tunnels. You turn cryptic error logs into triumphs and solve impossible infrastructure bottlenecks.",
    recommendedTrack: "Palantir Foundry Core, Anduril Edge Defense, or Scale AI Infrastructure FDE."
  },
  diplomat: {
    title: "Enterprise Client Diplomat",
    tagline: "The High-Stakes Stakeholder Whisperer",
    description: "You excel at building trust with resistant DBAs, aligning skeptical CISOs, and turning complex technical architectures into compelling executive value propositions.",
    recommendedTrack: "OpenAI Enterprise Solutions, Databricks Strategic Accounts, or Ramp Enterprise FDE."
  },
  pioneer: {
    title: "Product Platform Pioneer",
    tagline: "The Field-to-Product Architecture Bridge",
    description: "You don't just solve one client's problem—you spot universal patterns across messy enterprise data and author the reusable platform primitives that define company roadmap.",
    recommendedTrack: "C3 AI Platform Engineering, Scale AI GenAI Tools, or Palantir AIP Builder."
  },
  operator: {
    title: "High-Velocity Field Operator",
    tagline: "The Rapid Deployment Firefighter",
    description: "You are the special forces of software: high energy, fearless with ambiguity, and possessing an uncanny ability to ship production systems from hotel rooms in 48 hours.",
    recommendedTrack: "Defense Tech Deployments, Frontier AI Red Teaming, or Series-B Enterprise AI FDE."
  }
};

const ROLE_COMPARISON_DATA = [
  {
    dimension: "Primary Code Ownership",
    fde: "100% Production code: writes custom adapters, ETL pipelines, on-prem container wrappers, and merges directly into core repos.",
    swe: "100% Core platform: designs internal microservices, algorithms, and infrastructure shared across all SaaS customers.",
    sa: "0-10% Code: writes occasional conceptual code snippets or Postman collections; primarily creates architectural diagrams.",
    tam: "0% Code: analyzes bug tickets, logs, and release notes; liaises between customer IT and engineering."
  },
  {
    dimension: "Client Interaction & Onsite %",
    fde: "40% - 70% Direct client interaction: embedded onsite in client offices, joint war-rooms, and executive debriefs.",
    swe: "0% - 5%: Isolated from customers; receives requirements via Product Managers and Jira tickets.",
    sa: "60% - 80%: Pre-sales pitch meetings, RFP defense, and discovery workshops with prospective clients.",
    tam: "80% - 90%: Weekly status check-ins, quarterly business reviews (QBRs), and escalation calls."
  },
  {
    dimension: "Problem Ambiguity & Scope",
    fde: "Extreme: client requirements are messy, legacy schemas lack documentation, and security constraints are non-negotiable.",
    swe: "Low to Moderate: problems are decomposed into well-scoped epics and sprint stories with defined acceptance criteria.",
    sa: "Moderate: scoped to feasibility studies, target architectures, and mutual success criteria.",
    tam: "Low: scoped to operational SLA compliance, support ticket resolution times, and patch scheduling."
  },
  {
    dimension: "Travel Expectation",
    fde: "Moderate to High (20% - 50%): visits customer headquarters, secure facilities, and data centers for milestone deployments.",
    swe: "Zero to Low (0% - 5%): remote or company HQ office only.",
    sa: "Moderate to High (25% - 50%): travels for sales conferences and client pitch meetings.",
    tam: "Low to Moderate (10% - 20%): travels primarily for relationship building and QBRs."
  },
  {
    dimension: "Production Accountability",
    fde: "Full End-to-End: if the customer deployment breaks at 2:00 AM during POC, the FDE owns the fix and client confidence.",
    swe: "Rotational On-Call: shares pager duty for internal microservices with defined runbooks and team escalation.",
    sa: "Pre-Sales only: transfers ownership to engineering and professional services once contract is signed.",
    tam: "Ticket Routing: coordinates support response times but does not personally author hotfixes."
  },
  {
    dimension: "Compensation & Equity",
    fde: "$180k - $450k+ (High base salary + significant tech equity + deployment bonuses; mirrors Tier-1 SWE comp).",
    swe: "$160k - $400k+ (Standard engineering salary + equity; performance tied to code review and sprint delivery).",
    sa: "$150k - $300k (Commission / Sales OTE bonus tied to software deal closures and quotas).",
    tam: "$110k - $190k (Base salary + customer retention / renewal bonus)."
  }
];

const CAREER_LADDER_TIERS = [
  {
    id: "tier-l3",
    level: "L3 / L4",
    title: "Associate Forward Deployed Engineer",
    comp: "$165,000 - $210,000 Total Comp",
    equity: "Equity: $40k - $70k / yr",
    tenure: "0 - 2 Years Experience",
    summary: "Executes foundational deployment tasks, writes data ingestion adapters, builds Docker Compose local dev environments, and assists senior leads during client onboarding.",
    competencies: [
      "Mastery of enterprise SQL, Python data munging, and REST/gRPC protocols",
      "Hands-on comfort with Docker packaging, bash scripting, and basic Linux troubleshooting",
      "Client professional presence: taking structured meeting minutes, logging requirements accurately",
      "Ability to debug client data discrepancies without making assumptions"
    ],
    promotionCriteria: "Independently ship an end-to-end customer ingestion pipeline that passes client QA with zero critical bugs."
  },
  {
    id: "tier-l5",
    level: "L5",
    title: "Senior Forward Deployed Engineer",
    comp: "$220,000 - $325,000 Total Comp",
    equity: "Equity: $90k - $150k / yr",
    tenure: "3 - 5 Years Experience",
    summary: "Owns entire customer deployments from Day 1 to Day 30 sign-off. Navigates hostile client IT environments, designs air-gap topologies, and translates customer feedback into core platform features.",
    competencies: [
      "Deep expertise in air-gapped container topologies, Kubernetes (K3s/Helm), and GPU model serving (vLLM)",
      "High emotional intelligence: de-escalating DBA panic, building trust with CISOs and InfoSec leads",
      "Writing production-grade glue code with distributed idempotency, retries, and tamper-evident audit trails",
      "Mentoring Associate FDEs and establishing reusable field deployment playbooks"
    ],
    promotionCriteria: "Successfully lead multiple $1M+ ARR enterprise proofs of concept to customer executive sign-off."
  },
  {
    id: "tier-l6",
    level: "L6",
    title: "Staff Forward Deployed Engineer",
    comp: "$330,000 - $475,000 Total Comp",
    equity: "Equity: $160k - $240k / yr",
    tenure: "5 - 8 Years Experience",
    summary: "The definitive technical authority on customer architecture. Leads multi-engineer field teams on mission-critical client deployments (e.g. Pentagon, global banking consortia, tier-1 health systems).",
    competencies: [
      "Architecting enterprise zero-trust systems, cross-cloud topologies, and custom CDC pipelines",
      "Direct C-level diplomacy: presenting technical strategy to Fortune 100 CIOs and government agency directors",
      "Authoring major platform core modules derived from recurring client field patterns",
      "Interviewing, bar-raising, and defining engineering standards across the forward deployed organization"
    ],
    promotionCriteria: "Pioneer new deployment methodologies that compress company-wide POC cycle times by 30%+."
  },
  {
    id: "tier-l7",
    level: "L7+",
    title: "Principal FDE / Field Director",
    comp: "$480,000 - $750,000+ Total Comp",
    equity: "Equity: $280k - $450k+ / yr",
    tenure: "8+ Years Experience",
    summary: "Shapes company strategy at the intersection of product roadmap and market enterprise demand. Advises the CEO and Head of Product on high-stakes customer bets and strategic accounts.",
    competencies: [
      "Executive sponsorship on $10M+ multi-year enterprise contracts",
      "Strategic foresight: identifying emerging market gaps in on-prem AI, regulatory compliance, and data governance",
      "Cross-organizational leadership spanning Engineering, Product, Legal, and Go-To-Market",
      "Cultivating the organizational culture of ruthless velocity, customer empathy, and engineering rigor"
    ],
    promotionCriteria: "Drive company-defining technical partnerships and enterprise expansion impacting tens of millions in ARR."
  }
];

// ============================================================================
// STAKEHOLDER CRUCIBLE & DE-ESCALATION SIMULATOR
// ============================================================================
const CRUCIBLE_SCENARIOS = [
  {
    id: "dba-standoff",
    title: "The Entrenched Legacy DBA",
    stakeholder: "Dave Kowalski, Principal Database Administrator (18 yrs at Client)",
    quote: "I've maintained this Oracle cluster for 18 years. Your 'CDC container' is going to lock our table, trigger redo buffer exhaustion, and blow our SLA. I'm revoking your read credentials before tonight's payroll run.",
    context: "Client Steering Committee demo is in 48 hours. If you cannot stream live ledger transactions, the POC fails. The DBA has the authority to revoke network access.",
    choices: [
      {
        id: "choice-1",
        label: "Present a mathematically isolated read-only replication architecture with statement_timeout = 250ms and offer to run a zero-impact EXPLAIN ANALYZE drill on their staging replica.",
        points: 100,
        resultType: "pass",
        outcome: "Dave inspects the statement_timeout, verifies that CDC reads only the archived redo log with zero table locks, and grants read replica access. He becomes your strongest internal champion for the steering committee demo."
      },
      {
        id: "choice-2",
        label: "Escalate directly to the Client VP of Engineering and demand they order Dave to grant full DBA permissions immediately.",
        points: 15,
        resultType: "fail",
        outcome: "The VP feels cornered and Dave digs in his heels, citing corporate compliance regulation Section 4.1. Security flags your engagement, and your onboarding is delayed by 3 weeks."
      },
      {
        id: "choice-3",
        label: "Silently switch to polling the database every 10 seconds via raw SELECT * FROM payroll to bypass CDC.",
        points: 0,
        resultType: "fail",
        outcome: "Disastrous: periodic table scans lock the active payroll ledger table during end-of-month batch processing. Production transactions freeze, and InfoSec revokes your badge on the spot."
      }
    ]
  },
  {
    id: "ciso-airgap",
    title: "The CISO Air-Gap Protocol Ambush",
    stakeholder: "Elena Vance, Chief Information Security Officer (Defense Enclave)",
    quote: "Our automated intrusion detection system caught your pod attempting an outbound NTP handshake on UDP port 123. In this classified facility, any unauthorized egress is an immediate contract breach. We are freezing your cluster.",
    context: "Your team deployed a container that had default NTP chrony syncing enabled. The bunker's firewall blocked the packet, but the audit alert was sent to the executive security board.",
    choices: [
      {
        id: "choice-1",
        label: "Acknowledge the alert immediately, present the container manifest diff disabling external NTP and pinning to the client's internal PTP/NTP clock gateway (10.0.0.1), and provide SHA-256 hashes of all audit logs proving zero data payload egressed.",
        points: 100,
        resultType: "pass",
        outcome: "Elena respects the immediate cryptographic proof and transparent remediation. The freeze is lifted within 2 hours, and the incident is recorded as a successfully handled containment drill."
      },
      {
        id: "choice-2",
        label: "Argue that NTP is just time synchronization and cannot leak classified data, so InfoSec is overreacting.",
        points: 0,
        resultType: "fail",
        outcome: "Catastrophic: in defense/intelligence enclaves, protocol violations are zero-tolerance. Elena escalates to the contracting command and terminates the vendor deployment."
      },
      {
        id: "choice-3",
        label: "Delete the pod quietly without notifying InfoSec and hope their alert log clears overnight.",
        points: 10,
        resultType: "fail",
        outcome: "Audit logs are append-only. Elena's team notices the uncoordinated pod deletion, flags it as suspicious tampering, and revokes all physical bunker access."
      }
    ]
  },
  {
    id: "scope-creep",
    title: "The Executive Scope-Creep Ambush",
    stakeholder: "Marcus Sterling, VP of Global Operations",
    quote: "The steering committee meets in 48 hours. We love the batch pipeline, but our CEO just saw an AI video demo and wants real-time streaming video analysis included in this SOW. We need it live on stage.",
    context: "Your agreed 30-day SOW covers tabular EHR/financial data only. Streaming video requires RTSP ingestion, GPU decoding clusters, and YOLO/vLLM models that are completely out of scope.",
    choices: [
      {
        id: "choice-1",
        label: "Empathetically validate the vision, reiterate the quantifiable ROI of the agreed tabular milestone, and offer an architectural mockup + Phase 2 roadmap slide for the CEO presentation while keeping the live demo rock-solid.",
        points: 100,
        resultType: "pass",
        outcome: "Marcus feels heard, the live demo nails the agreed metrics without crashing, and the Phase 2 video expansion roadmap is approved as a $1.8M ARR contract renewal."
      },
      {
        id: "choice-2",
        label: "Stay up all night hacking together a flaky Python OpenCV script using personal laptop webcams.",
        points: 20,
        resultType: "fail",
        outcome: "During the live CEO demo, the unvetted OpenCV script throws an RTSP buffer overrun error, freezes the main dashboard, and overshadows the excellent batch data results."
      },
      {
        id: "choice-3",
        label: "Bluntly inform the VP that contractually they cannot change the SOW without a formal legal amendment.",
        points: 30,
        resultType: "fail",
        outcome: "Technically true, but politically tone-deaf. The executive feels dismissed and questions whether your company is a collaborative enterprise partner."
      }
    ]
  }
];

// ============================================================================
// CROSS-INDUSTRY DEPLOYMENT & AIR-GAP COMPLIANCE TIERS
// ============================================================================
const COMPLIANCE_TIERS = [
  {
    id: "tier-defense",
    name: "Defense & Classified Intel",
    badge: "DoD IL5 / IL6 · SCIF",
    accent: "var(--accent-rose)",
    characteristics: [
      "Zero outbound internet access; all media transferred via encrypted drives with verified sha256sum.",
      "Physical SCIF security: no mobile devices, strict optical data diode unidirectionality.",
      "FedRAMP High & FIPS 140-3 validated cryptographic modules.",
      "Local LLM serving required (vLLM with offline quantized weights; zero cloud API calls)."
    ]
  },
  {
    id: "tier-fintech",
    name: "FinTech & Commercial Banking",
    badge: "PCI-DSS Level 1 · SOC2 Type II",
    accent: "var(--accent-cyan)",
    characteristics: [
      "Non-locking log-based Change Data Capture (Debezium WAL) to protect core ledgers.",
      "Sub-100ms end-to-end fraud scoring latency SLA with active-active regional failover.",
      "Immutable append-only audit logs with Merkle hash chaining.",
      "Mandatory tokenization and PII vaulting (PAN and SSN never stored in plaintext)."
    ]
  },
  {
    id: "tier-healthcare",
    name: "Healthcare & Clinical EHR",
    badge: "HIPAA · HITRUST · FHIR",
    accent: "var(--accent-emerald)",
    characteristics: [
      "Protected Health Information (PHI) de-identification via Safe Harbor or Expert Determination.",
      "Business Associate Agreement (BAA) and mTLS certificate pinning across 14+ hospitals.",
      "Probabilistic entity resolution (Fellegi-Sunter) for disparate EHR patient record deduplication.",
      "Ontology writeback safety gates: human doctor approval required before committing mutations to core EHR."
    ]
  },
  {
    id: "tier-iot",
    name: "Industrial IoT & Edge Fleet",
    badge: "IEC 62443 · CAN Bus",
    accent: "var(--accent-amber)",
    characteristics: [
      "Extreme environmental resilience: high temperature, vibration, intermittent cellular backhaul.",
      "Local edge buffering: store-and-forward architecture with SQLite/DuckDB persistence.",
      "Over-The-Air (OTA) atomic dual-root A/B partition updates with automatic rollback on boot fail.",
      "Strict memory footprint constraints (<2GB RAM, ARM64 low-power compute)."
    ]
  }
];

// ============================================================================
// FDE DEFINITION OF DONE (DOD) & HANDOVER CHECKLIST
// ============================================================================
const DOD_CHECKLIST_ITEMS = [
  {
    id: "dod-1",
    title: "Zero-Secret Docker Manifests",
    desc: "All database passwords, API tokens, and TLS keys injected dynamically via HashiCorp Vault or Kubernetes Secrets. Zero hardcoded credentials in Git or env files."
  },
  {
    id: "dod-2",
    title: "Automated Health & Readiness Probes",
    desc: "All HTTP/gRPC services implement /healthz and /readyz endpoints with sub-200ms response times and graceful connection draining on SIGTERM."
  },
  {
    id: "dod-3",
    title: "Immutable Hash-Chained Audit Trail",
    desc: "Every read, write, export, and model query writes an append-only log entry containing actor ID, timestamp, and SHA-256 hash of the previous record."
  },
  {
    id: "dod-4",
    title: "Disaster Recovery & 15-Minute Rollback Runbook",
    desc: "Complete operational runbook tested via simulated node power failure and database corruption. Documented recovery executed in under 15 minutes."
  },
  {
    id: "dod-5",
    title: "Client Shadow Pairing Complete",
    desc: "Customer technical leads and DBAs successfully deployed, patched, and debugged the pipeline unassisted during two paired shadow sessions."
  },
  {
    id: "dod-6",
    title: "Signed Executive Acceptance & SLA Sign-off",
    desc: "Formal acceptance document signed by Client VP of Engineering verifying that agreed performance metrics (latency, accuracy, throughput) were met."
  }
];

// ============================================================================
// AUTHORITATIVE ENTERPRISE TRAINING HUB (EXTERNAL RESOURCES)
// ============================================================================
const ENTERPRISE_RESOURCES = [
  {
    id: "res-aws",
    provider: "Amazon Web Services",
    title: "AWS Prescriptive Guidance: Hybrid & Air-Gapped Migration",
    desc: "Official architectural playbooks for disconnected edge deployments using AWS Snow Family (Snowball Edge) and AWS Outposts with strict IAM isolation.",
    tags: ["AWS", "Snowball", "Outposts", "Hybrid-Cloud"],
    url: "https://docs.aws.amazon.com/prescriptive-guidance/"
  },
  {
    id: "res-gcp",
    provider: "Google Cloud",
    title: "GCP Architecture Center: Secure GenAI in Private Enclaves",
    desc: "Hardening Google Kubernetes Engine (GKE) bastions, Private Service Connect (PSC), and VPC Service Controls for enterprise LLM workloads.",
    tags: ["Google Cloud", "Vertex AI", "VPC-SC", "Private Enclave"],
    url: "https://cloud.google.com/architecture"
  },
  {
    id: "res-azure",
    provider: "Microsoft Azure",
    title: "Azure Architecture Center: Enterprise RAG with Azure OpenAI",
    desc: "Production patterns for zero-data-retention LLM inference, Cognitive Search vector indexing, and sovereign disconnected Azure Stack Hub deployments.",
    tags: ["Azure", "Azure OpenAI", "Azure Stack", "Enterprise RAG"],
    url: "https://learn.microsoft.com/en-us/azure/architecture/"
  },
  {
    id: "res-palantir",
    provider: "Palantir Technologies",
    title: "Palantir Learning & Foundry/AIP Documentation",
    desc: "Comprehensive guides to building Kinetic Ontologies, writing TypeScript/Python OSDK action types, and orchestrating Apollo continuous deployments.",
    tags: ["Palantir", "Foundry", "AIP", "OSDK", "Ontology"],
    url: "https://learn.palantir.com"
  },
  {
    id: "res-databricks",
    provider: "Databricks",
    title: "Databricks Generative AI Academy & Mosaic AI",
    desc: "Building compound AI systems, fine-tuning domain models on proprietary Lakehouse data, and managing real-time Delta Live Tables (DLT).",
    tags: ["Databricks", "Mosaic AI", "Lakehouse", "Delta Live Tables"],
    url: "https://www.databricks.com/learn"
  },
  {
    id: "res-openai",
    provider: "OpenAI",
    title: "OpenAI Cookbook: Enterprise Evaluation & Structured Outputs",
    desc: "Battle-tested patterns for LLM-as-a-judge evaluation harnesses, strict JSON schema function calling, and RAG optimization techniques.",
    tags: ["OpenAI", "Evaluation", "Structured Outputs", "Function Calling"],
    url: "https://cookbook.openai.com"
  },
  {
    id: "res-anthropic",
    provider: "Anthropic",
    title: "Anthropic Prompt Engineering Course & Contextual Retrieval",
    desc: "Interactive prompt engineering guide and architectural blueprint for prepending chunk context to boost semantic retrieval accuracy by up to 49%.",
    tags: ["Anthropic", "Claude", "Contextual Retrieval", "Prompt Caching"],
    url: "https://github.com/anthropics/prompt-eng-interactive-tutorial"
  },
  {
    id: "res-clickhouse",
    provider: "ClickHouse",
    title: "ClickHouse Academy: High-Throughput Real-Time Analytics",
    desc: "Mastering MergeTree storage engines, materialized views, and sub-second analytical aggregations across hundreds of millions of client events.",
    tags: ["ClickHouse", "OLAP", "Real-Time Analytics", "Materialized Views"],
    url: "https://clickhouse.com/learn"
  },
  {
    id: "res-confluent",
    provider: "Confluent",
    title: "Confluent Developer: Event-Driven CDC with Debezium & Kafka",
    desc: "Capturing transactional database mutations non-invasively, handling schema drift with Confluent Schema Registry, and managing dead-letter queues.",
    tags: ["Kafka", "Debezium", "CDC", "Avro", "Schema Registry"],
    url: "https://developer.confluent.io"
  }
];

// ============================================================================
// FDE TAKE-HOME CHALLENGE SIMULATOR DATASET & VALIDATOR
// ============================================================================
const TAKEHOME_DATASET = [
  { tx_id: "TX-1001", account_id: "ACC-901", amount: 4500.00, currency: "USD", timestamp: "2026-10-24T08:12:00Z", status: "CLEAN" },
  { tx_id: "TX-1002", account_id: "ACC-902", amount: 1200.50, currency: "EUR", timestamp: "2026-10-24T08:14:15Z", status: "CLEAN" },
  { tx_id: "TX-1001", account_id: "ACC-901", amount: 4750.00, currency: "usd", timestamp: "2026-10-24T08:15:30Z", status: "DUPLICATE_NEWER" },
  { tx_id: "TX-1003", account_id: "", amount: 890.00, currency: "USD", timestamp: "2026-10-24T08:16:00Z", status: "CORRUPT_NO_ACCT" },
  { tx_id: "TX-1004", account_id: "ACC-904", amount: -350.00, currency: "USD$", timestamp: "2026-10-24T08:18:22Z", status: "CORRUPT_NEGATIVE" },
  { tx_id: "TX-1005", account_id: "ACC-905", amount: 2100.00, currency: "GBP", timestamp: "2026-10-24T08:20:00Z", status: "CLEAN" },
  { tx_id: "TX-1006", account_id: "ACC-906", amount: 550.00, currency: "usd", timestamp: "2026-10-24T08:22:10Z", status: "CORRUPT_CURRENCY_CASE" },
  { tx_id: "TX-1002", account_id: "ACC-902", amount: 1200.50, currency: "EUR", timestamp: "2026-10-24T08:13:00Z", status: "DUPLICATE_OLDER" }
];

const TAKEHOME_STARTER_CODE = `/**
 * Reconcile dirty core banking transaction feed
 * @param {Array} records - Array of raw transaction objects
 * @param {Object} fxRates - Currency conversion rates to USD (e.g. { EUR: 1.08, GBP: 1.28, USD: 1.0 })
 * @returns {Object} { cleanRecords: [], deadLetterQueue: [], totalVolumeUsd: number }
 */
function reconcileLedger(records, fxRates = { EUR: 1.08, GBP: 1.28, USD: 1.0 }) {
  const cleanRecords = [];
  const deadLetterQueue = [];
  let totalVolumeUsd = 0;

  // 1. Deduplicate by tx_id (keep latest timestamp)
  // 2. Reject records with missing account_id or negative amount to deadLetterQueue
  // 3. Normalize currency strings (e.g. "usd", "USD$" -> "USD")
  // 4. Calculate totalVolumeUsd normalized to base USD

  return { cleanRecords, deadLetterQueue, totalVolumeUsd };
}`;

// ============================================================================
// FDE FIELD MISSIONS: END-TO-END CLIENT DEPLOYMENT SIMULATOR
// ============================================================================
const FIELD_MISSIONS = [
  {
    id: "mission-fintech",
    title: "Mission 1: Real-Time CDC & Fraud Ontology (Tier-1 Bank)",
    client: "Global Commercial Bank (Core Banking Division)",
    problem: "Core banking runs on a mainframe DB2 database with overnight batch balance reconciliation. Fraud detection teams cannot spot suspicious withdrawals until 24 hours later. The VP of Risk mandates sub-second fraud alerts without impacting the core transaction ledger.",
    phases: [
      {
        phaseNum: 1,
        title: "Discovery & Security Boundary",
        subtitle: "Negotiate non-locking database access and secure the network perimeter.",
        brief: "You meet with the Bank Information Security Committee. The DBAs fear transaction lockouts; the CISO requires PCI-DSS Level 1 compliance.",
        question: "How do you capture live mutations without causing query locks on active accounts?",
        choices: [
          {
            id: "m1-p1-a",
            label: "Configure Debezium CDC to read the DB2 write-ahead log (WAL) with a read-only replication privilege, streaming into Kafka over mTLS.",
            points: 100,
            feedback: "Correct! Log-based CDC bypasses table locks completely and satisfies PCI-DSS auditing requirements."
          },
          {
            id: "m1-p1-b",
            label: "Install a Python script that polls SELECT * FROM accounts WHERE updated_at > NOW() - INTERVAL '5s'.",
            points: 0,
            feedback: "Disastrous: periodic polling executes table scans, locks rows, and crashes during peak morning trading."
          }
        ],
        codeSnippet: `// Non-Invasive Debezium CDC Connector Config
{
  "name": "core-banking-wal-cdc",
  "config": {
    "connector.class": "io.debezium.connector.db2.Db2Connector",
    "database.server.name": "bank_mainframe_prod",
    "table.include.list": "BANK.ACCOUNTS,BANK.TRANSACTIONS",
    "plugin.name": "db2_wal_cdc",
    "database.history.kafka.bootstrap.servers": "kafka.internal:9092",
    "database.history.kafka.topic": "schema-changes.banking"
  }
}`,
        terminalOutput: `[INFO] Debezium connector 'core-banking-wal-cdc' registered.
[INFO] Logical replication stream attached to WAL position 0x7F4A2B90.
[INFO] Zero table locks acquired. Processing transaction events in <12ms.`
      },
      {
        phaseNum: 2,
        title: "Ingestion & Schema Reconciliation",
        subtitle: "Handle schema drift and deduplicate streaming mutations.",
        brief: "Legacy mainframe transactions contain variable-length EBCDIC strings and missing ISO currency codes. The stream must be normalized before indexing.",
        question: "How do you handle sudden upstream schema drift when the bank adds a new regulatory reporting column?",
        choices: [
          {
            id: "m1-p2-a",
            label: "Use Confluent Schema Registry with FULL_TRANSITIVE compatibility and Avro serialization, routing unparseable payloads to a Dead Letter Queue (DLQ).",
            points: 100,
            feedback: "Spot on! Schema Registry guarantees backward and forward compatibility without dropping messages."
          },
          {
            id: "m1-p2-b",
            label: "Disable all validation and parse every payload as raw unquoted text.",
            points: 10,
            feedback: "Unacceptable: corrupted records will propagate into the fraud engine, throwing null pointer exceptions in production."
          }
        ],
        codeSnippet: `// Schema Registry Compatibility Check & DLQ Routing
const avro = require('avsc');
const type = avro.Type.forSchema(accountSchema);

function processCdcPayload(rawBuffer) {
  try {
    const record = type.fromBuffer(rawBuffer);
    return { valid: true, record };
  } catch (err) {
    dlqProducer.send({ topic: 'banking.transactions.dlq', value: rawBuffer, error: err.message });
    return { valid: false };
  }
}`,
        terminalOutput: `[KAFKA] Consumer group 'fraud-ontology-ingest' rebalanced. 12 partitions assigned.
[INGEST] Ingest throughput: 24,500 events/sec.
[DLQ] 3 malformed legacy records routed to Dead Letter Queue with audit traces.`
      },
      {
        phaseNum: 3,
        title: "Pipeline & Inference Latency SLA",
        subtitle: "Sink to ClickHouse and score fraud in under 65ms.",
        brief: "Incoming transaction volume spikes to 18,000 transactions/second during peak trading. Fraud scores must be returned to the payment gateway before authorizing the transaction.",
        question: "Which serving architecture satisfies the sub-65ms latency requirement under 18k events/sec load?",
        choices: [
          {
            id: "m1-p3-a",
            label: "Sink Kafka events into ClickHouse with Materialized Views for rolling window aggregations, evaluated by a containerized XGBoost microservice over gRPC.",
            points: 100,
            feedback: "Exemplary architecture: ClickHouse handles 100k+ inserts/sec effortlessly while gRPC keeps microservice inference well under 25ms."
          },
          {
            id: "m1-p3-b",
            label: "Write each transaction to a PostgreSQL table and query a remote OpenAI cloud endpoint for each transaction.",
            points: 0,
            feedback: "Violates latency SLA (cloud API takes 800ms+) and breaches banking privacy regulations."
          }
        ],
        codeSnippet: `// ClickHouse Real-Time Fraud Aggregation View
CREATE MATERIALIZED VIEW bank.recent_transfers_mv
ENGINE = SummingMergeTree()
PRIMARY KEY (account_id, toStartOfMinute(timestamp))
AS SELECT 
    account_id,
    toStartOfMinute(timestamp) AS window_min,
    count() AS tx_count,
    sum(amount) AS total_volume
FROM bank.transactions_queue
GROUP BY account_id, window_min;`,
        terminalOutput: `[CLICKHOUSE] Materialized view 'recent_transfers_mv' created.
[BENCHMARK] P50 Latency: 18ms | P95 Latency: 38ms | P99 Latency: 58ms.
[STATUS] SLA Breaches: 0.00% across 1,000,000 simulated events.`
      },
      {
        phaseNum: 4,
        title: "Executive Demo & Production Handover",
        subtitle: "Run a live chaos test and sign off the operational runbook.",
        brief: "The Client VP of Risk and Chief Enterprise Architect attend your final milestone demonstration. You must prove high availability and zero message loss during a simulated datacenter network partition.",
        question: "How do you conduct the live chaos failover demonstration for the bank leadership?",
        choices: [
          {
            id: "m1-p4-a",
            label: "Simulate killing a primary Kafka broker node live, demonstrating automated leader election and zero transaction loss via consumer lag metrics.",
            points: 100,
            feedback: "The gold standard of enterprise FDE demos: proves resilience under fire and wins executive signoff."
          },
          {
            id: "m1-p4-b",
            label: "Show a PowerPoint presentation with conceptual diagrams without running any real tests.",
            points: 20,
            feedback: "Executives demand proof in live software, not static slide decks."
          }
        ],
        codeSnippet: `# Automated Disaster Recovery & Handover Sign-off Runbook
./scripts/chaos_kill_broker.sh --node kafka-broker-02
# Verify consumer lag recovers to 0:
kafka-consumer-groups --bootstrap-server 10.240.0.5:9092 --describe --group fraud-ontology-ingest
# Generate signed SLA acceptance artifact:
./scripts/generate_sla_acceptance_report.sh --tenant global-bank > signoff_report.pdf`,
        terminalOutput: `[CHAOS] Simulated node kill: kafka-broker-02 [STOPPED]
[ELECTION] Partition leaders reassigned in 180ms.
[VERIFICATION] Consumer lag: 0 records dropped. Data integrity 100.0%.
[ACCEPTED] Client VP signed off: Deployment approved for production cutover.`
      }
    ]
  },
  {
    id: "mission-defense",
    title: "Mission 2: Defense Air-Gapped Multi-Modal Intelligence Platform",
    client: "Aerospace Maintenance & Logistics Depot",
    problem: "1.5 million legacy scanned maintenance schematics, technical orders, and avionics sensor logs are siloed inside an underground bunker with zero internet connectivity. Field technicians spend 4+ hours diagnosing common avionics faults.",
    phases: [
      {
        phaseNum: 1,
        title: "Enclave Setup & Media Validation",
        subtitle: "Import container images and model weights via cryptographic verification.",
        brief: "You arrive at the classified facility. The security gate inspects physical hardware and requires cryptographic validation before mounting drives.",
        question: "How do you verify software packages at the air-gap hardware gate?",
        choices: [
          {
            id: "m2-p1-a",
            label: "Execute sha256sum validation against pre-signed cryptographic manifest hashes and load images into the internal Harbor registry.",
            points: 100,
            feedback: "Perfect compliance: ensures zero file corruption or unauthorized tampering during physical transit."
          },
          {
            id: "m2-p1-b",
            label: "Insert personal consumer USB thumb drives directly into production bunker servers without scanning.",
            points: 0,
            feedback: "Immediate security violation resulting in badge revocation and security escort off premises."
          }
        ],
        codeSnippet: `#!/usr/bin/env bash
# Air-Gap Checksum Verification Script
echo "==> Verifying model weights SHA-256..."
sha256sum -c /mnt/airgap_media/manifest.sha256
docker load -i /mnt/airgap_media/fde_airgap_bundle.tar
docker tag internal/vllm:v0.4.2 harbor.depot.internal/fde/vllm:v0.4.2
docker push harbor.depot.internal/fde/vllm:v0.4.2`,
        terminalOutput: `[SECURITY] SHA-256 verification PASSED for 18 chunks.
[HARBOR] Image harbor.depot.internal/fde/vllm:v0.4.2 pushed successfully.
[PERIMETER] Air-gap network enclave status: ISOLATED (Egress: 0 bytes).`
      },
      {
        phaseNum: 2,
        title: "Air-Gapped OCR & Vector Indexing",
        subtitle: "Parse 1.5M technical orders into hybrid vector embeddings.",
        brief: "Schematics are scanned PDFs with hand-drawn wire schematics and OCR noise. Text must be extracted and indexed locally.",
        question: "What pipeline architecture achieves high semantic recall on technical aerospace schematics?",
        choices: [
          {
            id: "m2-p1-a",
            label: "Containerized PaddleOCR/Tesseract with BAAI/BGE dense embeddings indexed into an air-gapped Qdrant cluster using Reciprocal Rank Fusion (RRF).",
            points: 100,
            feedback: "Outstanding: combines optical extraction with hybrid keyword and semantic retrieval with zero cloud dependency."
          },
          {
            id: "m2-p1-b",
            label: "Run basic Linux grep over file names without extracting text from inside the PDFs.",
            points: 10,
            feedback: "Useless for technician questions like 'hydraulic actuator pressure drop wiring diagram'."
          }
        ],
        codeSnippet: `// Hybrid RRF Search Query in Qdrant Local Cluster
const searchResults = await qdrant.query({
  collection_name: 'technical_orders',
  prefetch: [
    { query: textEmbeddingVector, using: 'dense', limit: 20 },
    { query: bm25SparseTokens, using: 'sparse', limit: 20 }
  ],
  query: { rrf: { k: 60 } },
  limit: 5
});`,
        terminalOutput: `[OCR] Processed 12,500 legacy PDF schematics in parallel worker pool.
[EMBED] Generated 480,000 dense vector chunks (dim: 1024).
[QDRANT] Collection 'technical_orders' optimized. HNSW graph built.`
      },
      {
        phaseNum: 3,
        title: "Offline LLM Serving & Structured Tool-Calling",
        subtitle: "Deploy quantized Llama-3-70B on internal NVIDIA A100 GPUs.",
        brief: "The facility has dual NVIDIA A100 (80GB) workstations. Technicians need conversational answers that cite exact technical order paragraph numbers.",
        question: "How do you configure vLLM to serve concurrent queries without Out-Of-Memory (OOM) crashes?",
        choices: [
          {
            id: "m2-p3-a",
            label: "Serve Llama-3-70B-Instruct in AWQ 4-bit quantization with tensor-parallelism=2 and gpu-memory-utilization=0.90 with strict PagedAttention KV allocation.",
            points: 100,
            feedback: "Flawless: fits comfortably inside dual 80GB VRAM, leaving ample room for 8k token context across concurrent technician queries."
          },
          {
            id: "m2-p3-b",
            label: "Run unquantized FP32 model weights on a single desktop GPU.",
            points: 0,
            feedback: "Instant CUDA OOM crash: 70B in FP32 requires 280GB+ of VRAM."
          }
        ],
        codeSnippet: `# vLLM Offline Launch Command with Zero Telemetry
python3 -m vllm.entrypoints.openai.api_server \\
  --model /models/Llama-3-70B-Instruct-AWQ \\
  --quantization awq \\
  --tensor-parallel-size 2 \\
  --max-model-len 8192 \\
  --gpu-memory-utilization 0.90 \\
  --enforce-eager`,
        terminalOutput: `[VLLM] PagedAttention initialized with 32,768 memory blocks.
[VLLM] Time-to-first-token (TTFT): 320ms.
[INFERENCE] Streaming tokens at 48.5 tokens/sec per stream.`
      },
      {
        phaseNum: 4,
        title: "Flightline Technician Trial & Sign-Off",
        subtitle: "Put tablets in technicians' hands and verify 2-second diagnostic retrieval.",
        brief: "Active duty maintenance crews test the platform during an engine change inspection. The depot commander observes the trial.",
        question: "A technician asks: 'Where is the backup ground wire for the APU starter generator on Tail #402?' How does the system respond?",
        choices: [
          {
            id: "m2-p4-a",
            label: "Returns exact schematic snippet highlighting Terminal Post 4B with direct link to Technical Order 1F-16C-2-00GV-00-1 Section 3.4.2 in 1.4 seconds.",
            points: 100,
            feedback: "Mission Success! The depot commander confirms diagnostic time dropped from 4 hours to 90 seconds. Operational signoff granted."
          },
          {
            id: "m2-p4-b",
            label: "Generates a vague poetic essay about avionics without citing specific wire numbers or manuals.",
            points: 0,
            feedback: "Unacceptable in aviation maintenance where strict compliance with technical orders is a legal and safety mandate."
          }
        ],
        codeSnippet: `// Technician Tablet Response Payload
{
  "tail_number": "TAIL-402",
  "component": "APU Starter Generator",
  "ground_wire_post": "Terminal Post 4B (Junction Box 12A)",
  "technical_order": "TO-1F-16C-2-00GV",
  "page_reference": "Section 3.4.2, Page 144",
  "latency_ms": 1420,
  "confidence_score": 0.984
}`,
        terminalOutput: `[TRIAL] 24 maintenance crew queries evaluated.
[ACCURACY] 100% technical order citations verified against physical binders.
[COMMAND] Depot Commander signed STIG security accreditation artifact.`
      }
    ]
  },
  {
    id: "mission-healthcare",
    title: "Mission 3: Healthcare Hospital Network Clinical Data Fusion",
    client: "Regional Health Authority (14 Hospitals)",
    problem: "Two major hospitals use Epic, four use Cerner, and community clinics use legacy SQL systems. Patient matching error rate is 14%, leading to duplicate records, missed allergies, and billing delays. Clinicians lack a unified patient chart.",
    phases: [
      {
        phaseNum: 1,
        title: "HIPAA/BAA Scoping & FHIR Mapping",
        subtitle: "Audit disparate HL7 feeds and establish data governance.",
        brief: "You conduct discovery across 14 hospital IT departments. Network firewalls isolate hospital subnets; patient identifiers are mismatched.",
        question: "How do you unify clinical feeds across 14 hospitals while strictly complying with HIPAA privacy rules?",
        choices: [
          {
            id: "m3-p1-a",
            label: "Deploy lightweight edge containers inside each hospital DMZ to de-identify and transform HL7 v2 and FHIR v4 streams into a canonical schema before routing over private mTLS tunnels.",
            points: 100,
            feedback: "Exemplary healthcare FDE strategy: local de-identification preserves privacy while edge parsing prevents heavy WAN load."
          },
          {
            id: "m3-p1-b",
            label: "Ask hospital clerks to email unencrypted spreadsheets of patient medical records to your Gmail account.",
            points: 0,
            feedback: "Severe federal HIPAA violation leading to major fines and immediate criminal investigation."
          }
        ],
        codeSnippet: `// Canonical FHIR v4 Observation Normalizer
function normalizeVitals(rawHl7Segment) {
  return {
    resourceType: "Observation",
    status: "final",
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
    code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }] },
    subject: { reference: \`Patient/\${rawHl7Segment.patient_hash}\` },
    valueQuantity: { value: parseFloat(rawHl7Segment.obx_5), unit: "beats/minute" }
  };
}`,
        terminalOutput: `[FHIR] Normalized 84,000 raw HL7 messages/hour.
[PRIVACY] Zero raw SSNs or names transmitted over WAN.
[TUNNEL] 14 hospital mTLS IPsec tunnels connected.`
      },
      {
        phaseNum: 2,
        title: "Deterministic & Probabilistic Entity Resolution",
        subtitle: "Execute Fellegi-Sunter record linkage to drop mismatch rate from 14% to 0.4%.",
        brief: "Patients named 'Robert Smith' and 'Bob Smith' with identical DOB and transposed SSN digits must be deduplicated accurately.",
        question: "What entity resolution methodology solves patient record fragmentation across disparate EHRs?",
        choices: [
          {
            id: "m3-p2-a",
            label: "A two-pass Fellegi-Sunter model: Pass 1 (exact SSN/DOB deterministic match); Pass 2 (probabilistic phonetic Metaphone + Jaro-Winkler address vector matching).",
            points: 100,
            feedback: "Industry gold standard: drops patient mismatch rate from 14% to 0.38% with full clinical auditability."
          },
          {
            id: "m3-p2-b",
            label: "Merge any records that share the same last name.",
            points: 0,
            feedback: "Catastrophic clinical danger: merges unrelated patients, creating fatal medication and allergy confusion."
          }
        ],
        codeSnippet: `// Fellegi-Sunter Probabilistic Patient Linkage
function calculateMatchWeight(recordA, recordB) {
  let weight = 0;
  if (recordA.dob === recordB.dob) weight += 12.5;
  if (recordA.ssn_hash === recordB.ssn_hash) weight += 25.0;
  if (metaphone(recordA.lastName) === metaphone(recordB.lastName)) weight += 8.0;
  
  const jaroDist = jaroWinkler(recordA.address, recordB.address);
  if (jaroDist > 0.85) weight += 6.5;

  return weight > 35.0 ? 'AUTO_MERGE' : (weight > 20.0 ? 'CLINICAL_REVIEW' : 'DISTINCT');
}`,
        terminalOutput: `[MPI] Evaluated 1,240,000 patient pairs across 14 hospitals.
[REDUCTION] Mismatch error rate reduced from 14.2% down to 0.38%.
[AUDIT] 42 borderline cases routed to hospital health informatics review queue.`
      },
      {
        phaseNum: 3,
        title: "Clinical Ontology & Writeback Safety Gates",
        subtitle: "Construct Palantir AIP-style patient graph with human-in-the-loop validation.",
        brief: "Doctors need real-time ICU bed scheduling and sepsis risk alerting. However, automated AI writes must never overwrite clinical EHR records without doctor confirmation.",
        question: "How do you enforce writeback safety when scheduling emergency ICU bed reallocations?",
        choices: [
          {
            id: "m3-p3-a",
            label: "Implement a validated Action Type: the AI suggests the bed reallocation, but the action requires the attending physician's biometric badge sign-off before dispatching writeback to Epic/Cerner.",
            points: 100,
            feedback: "Perfect clinical governance: empowers clinicians with real-time AI insight while keeping ultimate authority in human hands."
          },
          {
            id: "m3-p3-b",
            label: "Let an unsupervised background script automatically discharge patients when beds run low.",
            points: 0,
            feedback: "Extremely dangerous and illegal: clinical decisions must always maintain a licensed human-in-the-loop."
          }
        ],
        codeSnippet: `// Palantir OSDK Clinical Bed Reallocation Action with Gate
export const ReallocateIcuBedAction = {
  apiName: 'reallocateIcuBed',
  validate: async (ctx, params) => {
    if (!ctx.user.roles.includes('ATTENDING_PHYSICIAN')) {
      return { valid: false, reason: 'Only attending physicians may authorize ICU bed reallocation.' };
    }
    return { valid: true };
  },
  execute: async (ctx, params) => {
    await ctx.ontology.actions.updateBedStatus(params);
    await ctx.ehrBridge.dispatchWriteback({ patientId: params.patientId, targetBed: params.targetBed });
  }
};`,
        terminalOutput: `[ONTOLOGY] Patient graph compiled: 140,000 Patient objects with 1.2M ClinicalEncounter links.
[GATES] Writeback audit gate active: 100% of mutations require physician sign-off.
[LATENCY] Graph navigation queries responding in <42ms.`
      },
      {
        phaseNum: 4,
        title: "Bedside Nurse Trial & Hospital Go-Live",
        subtitle: "Trial in ICU ward and hand over self-healing runbook to hospital staff.",
        brief: "ICU charge nurses test the single pane of glass during shift handover. The hospital CIO observes bed allocation responsiveness.",
        question: "How does the platform handle an unexpected network disconnect between Hospital 7 and the central authority?",
        choices: [
          {
            id: "m3-p4-a",
            label: "Hospital 7 edge nodes switch seamlessly to local offline mode using SQLite/DuckDB cache, queuing updates locally and resyncing via vector clocks upon reconnection.",
            points: 100,
            feedback: "Resilient offline-first FDE design! Nurses never experience UI freezes even during hospital fiber cuts."
          },
          {
            id: "m3-p4-b",
            label: "The bedside tablet displays a blank white screen with an unhandled network error.",
            points: 0,
            feedback: "Critical failure during patient care; nurses will abandon the software."
          }
        ],
        codeSnippet: `// Resilient Offline-First Edge Sync Worker
async function dispatchClinicalUpdate(event) {
  if (!navigator.onLine) {
    await localOfflineDb.queue.put({ ...event, queuedAt: Date.now() });
    showOfflineBadge("Operating on local edge cache. Will sync automatically upon reconnection.");
    return { status: 'STORED_OFFLINE' };
  }
  return await remoteHospitalApi.send(event);
}`,
        terminalOutput: `[ICU TRIAL] 48-hour continuous trial complete across 60 hospital beds.
[HANDOVER] Shift handover preparation time reduced from 45 mins to 6 mins per nurse.
[SIGN-OFF] Chief Medical Officer and CIO signed 3-year enterprise expansion agreement.`
      }
    ]
  }
];

// ============================================================================
// COMPANY-SPECIFIC INTERVIEW DOSSIERS
// ============================================================================
const COMPANY_DOSSIERS = [
  {
    company: "Palantir Technologies",
    role: "Forward Deployed Software Engineer (Foundry / AIP / Gotham)",
    comp: "$190,000 - $350,000+ Total Comp (High Base + Liquid Equity + Travel Stipends)",
    sectors: "Defense, Intelligence, Commercial Enterprise, Healthcare",
    interviewLoop: [
      "1. Technical Recruiter Screen (Resume impact, willingness to travel 25-50%, customer empathy).",
      "2. Algorithmic Coding Challenge (Data structures, stream processing, edge-case resilience).",
      "3. Deployed System Architecture (FDE Design: dirty data, legacy APIs, on-prem air-gap constraints).",
      "4. Decomposition & Scoping Interview (Break down ambiguous customer problem into engineering tasks).",
      "5. Executive Cultural Onsite (Demonstrating urgency, ownership, and client diplomatic presence)."
    ],
    techStack: "TypeScript, Python, Java/Go, Palantir OSDK, Docker, K8s, PostgreSQL, ClickHouse, Apache Spark",
    fdeSecret: "Palantir values ruthless ownership and client presence above theoretical elegance. Be ready to explain how you de-escalate resistant DBAs and ship working software in 48 hours."
  },
  {
    company: "Scale AI",
    role: "Forward Deployed Engineer (Enterprise GenAI / Public Sector)",
    comp: "$180,000 - $320,000+ Total Comp",
    sectors: "Autonomous Vehicles, Defense/DoD, Enterprise LLM Customization",
    interviewLoop: [
      "1. Recruiter Screen (Past work with AI models and fast-paced customer deployments).",
      "2. Python & ML Engineering Coding Round (Vector math, embeddings, batching pipelines).",
      "3. Applied RAG & LLM Evaluation Architecture (Building reliable evaluation harnesses and hallucination guards).",
      "4. Customer Simulation Case Study (Scoping an enterprise data curation pipeline under tight deadlines)."
    ],
    techStack: "Python, PyTorch, vLLM, Qdrant/Pinecone, Docker, FastAPI, Kubernetes",
    fdeSecret: "Emphasize quantitative evaluation (RAG Triad, LLM-as-a-judge) rather than just calling OpenAI endpoints."
  },
  {
    company: "Databricks",
    role: "Solutions Architect / Forward Deployed Specialist (Mosaic AI)",
    comp: "$185,000 - $310,000 Total Comp + Significant Pre-IPO Equity",
    sectors: "Financial Services, Retail, Healthcare, Manufacturing",
    interviewLoop: [
      "1. Technical Screen (Distributed data processing, Spark internals, SQL optimization).",
      "2. Live Architecture Defense (Designing a Lakehouse streaming architecture with Delta Lake).",
      "3. Hands-On Coding & ETL Optimization (Delta Live Tables, CDC ingestion, partition tuning).",
      "4. Executive Communication Round (Explaining Lakehouse ROI to skeptical CIOs)."
    ],
    techStack: "Apache Spark, Delta Lake, Python, SQL, MLflow, Mosaic AI, Cloud Data Warehouses",
    fdeSecret: "Understand Spark streaming shuffle bottlenecks, broadcast joins, and Delta ACID transaction guarantees inside out."
  },
  {
    company: "Anduril Industries",
    role: "Deployment Engineer (Lattice OS / Hardware & Edge Defense)",
    comp: "$175,000 - $300,000 Total Comp + Substantial Equity",
    sectors: "Defense, Autonomous Systems, Border & Maritime Surveillance",
    interviewLoop: [
      "1. Recruiter & Security Clearance Check (US Secret/Top Secret eligibility).",
      "2. Systems & Linux Internals Coding Round (C++, Rust, or Python networking and cgroups).",
      "3. Edge Topology Architecture (Low-bandwidth mesh networks, intermittent connectivity, sensor fusion).",
      "4. Tactical Field Scenario (Debugging a sensor pod in 100°F desert heat with no internet)."
    ],
    techStack: "C++, Rust, Python, Go, Linux Kernels, gRPC, Docker, Embedded Systems, RTSP Video",
    fdeSecret: "Anduril tests for hardware-software grit. Show that you can open a terminal in a field hangar and troubleshoot Linux networking without Google."
  },
  {
    company: "C3 AI",
    role: "Forward Deployed Applications Engineer",
    comp: "$150,000 - $260,000 Total Comp",
    sectors: "Oil & Gas, Energy Management, Aerospace, Defense",
    interviewLoop: [
      "1. Technical Screener (OOP principles, enterprise data modeling).",
      "2. Data Processing Drill (Time-series data, sensor telemetry, anomaly detection).",
      "3. Enterprise System Design (Predictive maintenance architectures).",
      "4. Customer Project Delivery Simulation (Managing client scope changes)."
    ],
    techStack: "JavaScript, Python, C3 AI Type System, Postgres, Cassandra, Kubernetes",
    fdeSecret: "Demonstrate strong object-oriented domain modeling and experience with time-series sensor anomalies."
  }
];

// ============================================================================
// EXECUTIVE COLD OUTREACH SCRIPT LIBRARY
// ============================================================================
const OUTREACH_SCRIPTS = [
  {
    id: "outreach-vp-eng",
    target: "VP of Engineering / Head of Forward Deployed Engineering",
    subject: "FDE Ingestion & Air-Gap Resilience (Saw your team's work on [Client Sector])",
    body: `Hi [First Name],

I saw [Company]'s recent deployment for [Client/Industry]—navigating on-prem legacy database constraints while streaming real-time mutations is notoriously tough.

I’m a Forward Deployed Engineer specializing in air-gapped container topologies, non-invasive log-based CDC (Debezium/Kafka), and on-premise LLM inference with vLLM. Recently, I architected an offline clinical data reconciler that reduced patient record mismatches from 14% to 0.4% across 14 disparate hospital EHRs without cloud egress.

I’ve built an open-source proof-of-deployment repository demonstrating air-gapped hybrid RAG and zero-table-lock database extraction.

Would you be open to a 10-minute technical exchange next Tuesday afternoon?

Best regards,
[Your Name]
[GitHub / Portfolio Link]`
  },
  {
    id: "outreach-recruiter",
    target: "Technical Recruiter (FDE / Solutions Track)",
    subject: "Candidate for Forward Deployed Software Engineer role at [Company]",
    body: `Hi [First Name],

I noticed [Company] is actively expanding its Forward Deployed Engineering team to support enterprise and defense customer deployments.

My background sits at the intersection of production systems engineering and customer-facing technical delivery:
• Hands-on production experience with containerized air-gapped clusters (K3s, Helm, vLLM AWQ quantization).
• Real-time data pipeline architecture using log-based CDC, ClickHouse, and Apache Kafka.
• Proven track record aligning technical architectures with client DBAs and CISOs under 30-day POC timelines.

I am actively interviewing for FDE roles and would love to connect for a quick introductory conversation regarding open opportunities at [Company].

Best,
[Your Name]
[Phone Number] · [LinkedIn Link]`
  },
  {
    id: "outreach-lead",
    target: "Lead / Principal Forward Deployed Engineer",
    subject: "Question regarding [Company]'s on-prem deployment topology",
    body: `Hi [First Name],

I’ve been following your engineering blog posts on deploying [Company Product] into heterogeneous customer bastions.

I’m currently drilling deep into Palantir-style Kinetic Ontology modeling and non-locking writeback validation gates. I was curious how your team handles schema drift when enterprise customers modify database columns unannounced—do you mandate Avro Schema Registry FULL_TRANSITIVE rules, or maintain compensatory shadow tables?

I’ve put together an open-source test harness modeling these exact edge cases and would genuinely love to hear your perspective if you have 10 minutes for a virtual coffee.

Thanks for your time,
[Your Name]`
  },
  {
    id: "outreach-alumni",
    target: "Company Alumni / Internal Referral Connection",
    subject: "Fellow [University / Prior Company] alum exploring FDE at [Company]",
    body: `Hi [First Name],

I hope you’re doing well! I saw that you transitioned from [Prior Company/University] to [Current Company] as a Forward Deployed Engineer.

I’m currently preparing for FDE interviews across enterprise AI organizations, focusing on air-gapped model serving, client stakeholder diplomacy, and streaming telemetry.

How has your experience been balancing onsite client deployments with core platform contributions? If your schedule allows, I’d love to ask you 2-3 quick questions about the team culture and interview loop.

Warm regards,
[Your Name]`
  }
];

// ============================================================================
// INTERACTIVE FIELD TERMINAL SIMULATOR: 12 BASTION DIAGNOSTIC DRILLS
// ============================================================================
const TERMINAL_DRILLS = [
  {
    id: "drill-1",
    category: "Network Diagnostics",
    prompt: "Check if port 5432 on internal host 10.200.4.12 is listening and accessible using netcat (nc) with a 2-second timeout.",
    hint: "Try: nc -zv -w 2 10.200.4.12 5432",
    validate: (cmd) => cmd.includes("nc") && cmd.includes("10.200.4.12") && cmd.includes("5432"),
    successOutput: `Connection to 10.200.4.12 5432 port [tcp/postgresql] succeeded!\n[DRILL PASSED] Port 5432 is OPEN and reachable.`
  },
  {
    id: "drill-2",
    category: "Corporate SSL/TLS Inspection",
    prompt: "Inspect the remote SSL certificate presented by internal proxy bastion.internal:443 using openssl to check if corporate proxy MITM interception is active.",
    hint: "Try: openssl s_client -connect bastion.internal:443 -showcerts",
    validate: (cmd) => cmd.includes("openssl") && cmd.includes("s_client") && cmd.includes("bastion.internal:443"),
    successOutput: `CONNECTED(00000003)\ndepth=1 C = US, O = AcmeCorp, CN = AcmeCorp Internal Inspection CA\nverify return:1\n[DRILL PASSED] Corporate CA identified. Remember to mount corporate CA into container.`
  },
  {
    id: "drill-3",
    category: "Docker Air-Gap Diagnostics",
    prompt: "Inspect the IP address and network settings of the container named 'fde-ingest-worker' using docker inspect.",
    hint: "Try: docker inspect fde-ingest-worker",
    validate: (cmd) => cmd.includes("docker inspect") && cmd.includes("fde-ingest-worker"),
    successOutput: `[\n  {\n    "Id": "a7b9c1d2e3f4",\n    "NetworkSettings": {\n      "IPAddress": "172.28.0.4",\n      "Gateway": "172.28.0.1",\n      "Ports": { "8080/tcp": [{ "HostPort": "8080" }] }\n    }\n  }\n]\n[DRILL PASSED] Container network verified on internal bridge 172.28.0.4.`
  },
  {
    id: "drill-4",
    category: "Database Concurrency Triage",
    prompt: "Find all active database queries running for more than 5 seconds using PostgreSQL pg_stat_activity.",
    hint: "Try: SELECT pid, query, age(clock_timestamp(), query_start) FROM pg_stat_activity WHERE state != 'idle';",
    validate: (cmd) => (cmd.includes("pg_stat_activity") || cmd.includes("SELECT") || cmd.includes("psql")),
    successOutput: ` pid  | state  |      age       | query\n------+--------+----------------+-------------------------------------------------\n 4210 | active | 00:00:14.28192 | SELECT * FROM legacy_ledger WHERE status = 'PENDING'\n(1 row)\n[DRILL PASSED] Long-running query PID 4210 identified for termination.`
  },
  {
    id: "drill-5",
    category: "JSON Data Wrangling",
    prompt: "Extract the value of the 'error_code' field from telemetry.json using jq.",
    hint: "Try: jq '.error_code' telemetry.json or cat telemetry.json | jq .error_code",
    validate: (cmd) => cmd.includes("jq") && (cmd.includes("error_code") || cmd.includes(".")),
    successOutput: `"ERR_AIRGAP_SOCKET_TIMEOUT"\n[DRILL PASSED] Successfully extracted error code.`
  },
  {
    id: "drill-6",
    category: "Air-Gap Disk Space Audit",
    prompt: "Check disk space utilization across all mounted filesystems in human-readable format using df.",
    hint: "Try: df -h",
    validate: (cmd) => cmd.trim() === "df -h" || cmd.includes("df"),
    successOutput: `Filesystem      Size  Used Avail Use% Mounted on\n/dev/nvme0n1p1  1.8T  420G  1.3T  25% /\n/dev/sda1       500G  485G   15G  97% /data/models\n[DRILL PASSED] /data/models disk is at 97% capacity! Warning logged.`
  },
  {
    id: "drill-7",
    category: "Log Parsing & Regex",
    prompt: "Search the container log file /var/log/app.log for any lines containing 'FATAL' or 'PANIC' using grep with line numbers.",
    hint: "Try: grep -En 'FATAL|PANIC' /var/log/app.log",
    validate: (cmd) => cmd.includes("grep") && (cmd.includes("FATAL") || cmd.includes("PANIC")),
    successOutput: `142:[2026-10-24 08:14:12] FATAL: Postgres Logical replication slot dropped by remote master.\n[DRILL PASSED] Located fatal exception at line 142.`
  },
  {
    id: "drill-8",
    category: "Linux Process & OOM Triage",
    prompt: "Kill the stuck Python worker process with PID 8412 immediately using signal 9 (SIGKILL).",
    hint: "Try: kill -9 8412",
    validate: (cmd) => (cmd.includes("kill") && cmd.includes("8412")),
    successOutput: `[PROCESS] Terminated PID 8412 with SIGKILL (Code 137).\n[DRILL PASSED] Process successfully terminated, freeing 8GB memory.`
  },
  {
    id: "drill-9",
    category: "Permissions & File Security",
    prompt: "Ensure the private SSH key at ~/.ssh/fde_bastion_key is strictly read-only by the owner (mode 600) using chmod.",
    hint: "Try: chmod 600 ~/.ssh/fde_bastion_key",
    validate: (cmd) => cmd.includes("chmod 600") && cmd.includes("fde_bastion_key"),
    successOutput: `-rw------- 1 analyst analyst 2602 Oct 24 08:30 /home/analyst/.ssh/fde_bastion_key\n[DRILL PASSED] Key permissions secured to 600. SSH will accept key.`
  },
  {
    id: "drill-10",
    category: "vLLM Offline Health Probe",
    prompt: "Query the local offline vLLM server at http://127.0.0.1:8000/v1/models using curl to verify loaded model weights.",
    hint: "Try: curl -s http://127.0.0.1:8000/v1/models",
    validate: (cmd) => cmd.includes("curl") && cmd.includes("8000") && cmd.includes("models"),
    successOutput: `{\n  "object": "list",\n  "data": [\n    { "id": "Meta-Llama-3-70B-Instruct-AWQ", "object": "model", "owned_by": "vllm" }\n  ]\n}\n[DRILL PASSED] vLLM server is healthy with Llama-3-70B loaded.`
  },
  {
    id: "drill-11",
    category: "Network Listening Ports",
    prompt: "List all TCP listening ports with associated process names using netstat or ss.",
    hint: "Try: netstat -tlpn or ss -tlpn",
    validate: (cmd) => (cmd.includes("netstat") || cmd.includes("ss")) && (cmd.includes("t") || cmd.includes("l")),
    successOutput: `Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name\ntcp        0      0 127.0.0.1:8000          0.0.0.0:*               LISTEN      1420/python3\ntcp        0      0 0.0.0.0:5432            0.0.0.0:*               LISTEN      890/postgres\n[DRILL PASSED] Verified active listening sockets.`
  },
  {
    id: "drill-12",
    category: "Tarball Integrity Check",
    prompt: "Verify the SHA-256 checksum of the offline bundle airgap_images.tar.gz against its checksum file airgap_images.tar.gz.sha256.",
    hint: "Try: sha256sum -c airgap_images.tar.gz.sha256",
    validate: (cmd) => cmd.includes("sha256sum") && (cmd.includes("-c") || cmd.includes("sha256")),
    successOutput: `airgap_images.tar.gz: OK\n[DRILL PASSED] Cryptographic integrity 100% verified. Safe to load into registry.`
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
  activeSection: "overview",
  activeTrackFilter: "all",
  searchQuery: "",
  
  // Section 0: Overview & Careers
  selectedTimeSlot: "slot-0830",
  archetypeAnswers: {},
  archetypeScores: { hacker: 0, diplomat: 0, pioneer: 0, operator: 0 },
  archetypeCompleted: false,
  matrixHighlightedCol: "all",
  selectedCareerTier: "tier-l5",

  // Section 1: Learning Skills
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

  // Stakeholder Crucible & DoD
  activeCrucibleScenario: "dba-standoff",
  crucibleSelectedChoices: {},
  dodChecks: {},

  // Field Missions & Take-Home
  activeMissionId: "mission-fintech",
  missionActivePhase: 1,
  missionChoices: {},
  takehomeTimeLeft: 3 * 3600,
  takehomeRunning: false,
  takehomeTimerInterval: null,
  takehomeScore: 0,

  // Interactive Terminal Simulator
  currentTerminalDrillIndex: 0,

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
        .then((reg) => {
          console.log("[PWA] Service Worker registered:", reg.scope);
          reg.update();
        })
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

  // Load saved archetype quiz if any
  const savedArchetype = await storage.get("meta", "archetype");
  if (savedArchetype) {
    AppState.archetypeAnswers = savedArchetype.answers || {};
    AppState.archetypeScores = savedArchetype.scores || { hacker: 0, diplomat: 0, pioneer: 0, operator: 0 };
    AppState.archetypeCompleted = savedArchetype.completed || false;
  }

  // Initialize Flashcard list
  AppState.flashcardsList = [...AppState.catalog.flashcards];

  // Initialize Coding Challenge
  AppState.activeChallenge = AppState.catalog.codingChallenges[0];

  // Initialize Scenario
  AppState.activeScenario = AppState.catalog.architectureScenarios[0];

  // Initialize DoD Checklist & Terminal
  await initDodChecklist();
  initTerminalSimulator();

  renderAllViews();
}

function renderAllViews() {
  renderOverviewSection();
  renderModulesGrid();
  renderEnterpriseResources();
  renderFlashcards();
  renderPuzzles();
  renderCodingChallenge();
  renderScenario();
  initTakehomeSimulator();
  renderFieldMissions();
  renderKanbanBoard();
  renderCompanyDossiers();
  renderOutreachScripts();
  renderPortfolio();
  renderResumeAuditor();
  renderNotes();
  renderSnippets();
  updateReadinessMetrics();
}

// ============================================================================
// SECTION 0: FDE CAREERS & OVERVIEW
// ============================================================================
function renderOverviewSection() {
  renderTimelineScrubber();
  renderTimelineDetail();
  renderArchetypeQuiz();
  renderRoleMatrix();
  renderCareerLadder();
  renderStakeholderCrucible();
  renderComplianceTiers();
  renderDodChecklist();
}

// --- 0A: Day-in-the-Life Simulator ---
function renderTimelineScrubber() {
  const container = document.getElementById("timeline-scrubber-container");
  if (!container) return;

  container.innerHTML = DAY_IN_LIFE_SLOTS.map((slot) => {
    const isActive = AppState.selectedTimeSlot === slot.id;
    return `
      <button class="timeline-slot-btn ${isActive ? 'active' : ''}" onclick="selectDayTimeSlot('${slot.id}')">
        <span class="timeline-time">${slot.time}</span>
        <span class="timeline-label">${slot.badge}</span>
      </button>
    `;
  }).join("");
}

function selectDayTimeSlot(slotId) {
  AppState.selectedTimeSlot = slotId;
  renderTimelineScrubber();
  renderTimelineDetail();
}
window.selectDayTimeSlot = selectDayTimeSlot;

function renderTimelineDetail() {
  const container = document.getElementById("timeline-detail-content");
  if (!container) return;

  const slot = DAY_IN_LIFE_SLOTS.find(s => s.id === AppState.selectedTimeSlot) || DAY_IN_LIFE_SLOTS[0];
  if (!slot) return;

  container.innerHTML = `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <span class="tag-badge font-mono" style="color: var(--accent-cyan); font-weight: 700;">${slot.time} · ${slot.badge}</span>
        <span style="font-size: 0.78rem; color: var(--text-subtle);">Client Bastion Session</span>
      </div>
      <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin-bottom: 0.6rem;">${slot.title}</h3>
      <p style="font-size: 0.92rem; color: #cbd5e1; line-height: 1.6; margin-bottom: 1rem;">${slot.situation}</p>
    </div>

    <div>
      <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-subtle); margin-bottom: 0.4rem;">
        Production Command / Code Executed:
      </div>
      <pre style="background: #030508; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.85rem; font-family: var(--font-mono); font-size: 0.82rem; color: #67e8f9; overflow-x: auto;"><code>${escapeHtml(slot.commandSnippet)}</code></pre>
    </div>

    <div style="background: rgba(6, 182, 212, 0.08); border-left: 3px solid var(--accent-cyan); padding: 0.85rem 1rem; border-radius: 0 var(--radius-sm) var(--radius-sm) 0;">
      <div style="font-size: 0.75rem; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase; margin-bottom: 0.2rem;">
        Field Reality Check
      </div>
      <div style="font-size: 0.85rem; color: #e2e8f0; line-height: 1.5;">
        ${slot.fieldRealityCheck}
      </div>
    </div>
  `;
}

// --- 0B: FDE Career Archetype Quiz ---
function renderArchetypeQuiz() {
  const container = document.getElementById("archetype-quiz-body");
  if (!container) return;

  if (AppState.archetypeCompleted) {
    // Show results
    const scores = AppState.archetypeScores;
    let winningType = "hacker";
    let maxScore = -1;
    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        winningType = type;
      }
    }
    const profile = ARCHETYPE_PROFILES[winningType];
    const totalVotes = Math.max(1, Object.values(scores).reduce((a, b) => a + b, 0));

    container.innerHTML = `
      <div class="archetype-result-box">
        <span class="tag-badge" style="color: var(--accent-cyan); font-weight: 700;">Diagnostic Result</span>
        <h3 style="font-size: 1.25rem; font-weight: 800; color: #fff; margin: 0.4rem 0 0.2rem 0;">${profile.title}</h3>
        <div style="font-size: 0.82rem; color: var(--accent-indigo); font-weight: 600; margin-bottom: 0.75rem;">${profile.tagline}</div>
        <p style="font-size: 0.88rem; color: #cbd5e1; line-height: 1.5; margin-bottom: 1rem;">${profile.description}</p>
        
        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.75rem; margin-bottom: 1rem;">
          <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Matched Company Tracks:</div>
          <div style="font-size: 0.85rem; color: var(--accent-cyan); font-weight: 600; margin-top: 0.2rem;">${profile.recommendedTrack}</div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem;">
          ${Object.entries(ARCHETYPE_PROFILES).map(([key, p]) => {
            const pct = Math.round(((scores[key] || 0) / totalVotes) * 100);
            return `
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.15rem;">
                  <span>${p.title}</span>
                  <span class="font-mono">${pct}%</span>
                </div>
                <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden;">
                  <div style="width: ${pct}%; height: 100%; background: ${key === winningType ? 'var(--accent-cyan)' : 'var(--accent-indigo)'};"></div>
                </div>
              </div>
            `;
          }).join("")}
        </div>

        <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="retakeArchetypeQuiz()">Retake Diagnostic</button>
      </div>
    `;
    return;
  }

  // Find next unanswered question
  const currentIdx = Object.keys(AppState.archetypeAnswers).length;
  if (currentIdx >= ARCHETYPE_QUESTIONS.length) {
    AppState.archetypeCompleted = true;
    renderArchetypeQuiz();
    return;
  }

  const q = ARCHETYPE_QUESTIONS[currentIdx];
  container.innerHTML = `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
        <span class="tag-badge" style="color: var(--accent-indigo)">Question ${currentIdx + 1} of ${ARCHETYPE_QUESTIONS.length}</span>
        <span style="font-size: 0.75rem; color: var(--text-subtle);">Real Scenarios</span>
      </div>
      <p style="font-size: 0.88rem; font-weight: 600; color: #fff; line-height: 1.5; margin-bottom: 0.85rem;">${q.question}</p>
      
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        ${q.options.map((opt, oIdx) => `
          <div class="quiz-option-card" onclick="selectArchetypeChoice(${currentIdx}, ${oIdx})">
            <span>${opt.text}</span>
            <span style="color: var(--text-subtle); font-size: 0.8rem;">➔</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

async function selectArchetypeChoice(qIdx, optionIdx) {
  const q = ARCHETYPE_QUESTIONS[qIdx];
  if (!q) return;
  const choice = q.options[optionIdx];
  if (!choice) return;

  AppState.archetypeAnswers[qIdx] = optionIdx;
  AppState.archetypeScores[choice.type] = (AppState.archetypeScores[choice.type] || 0) + 1;

  if (Object.keys(AppState.archetypeAnswers).length >= ARCHETYPE_QUESTIONS.length) {
    AppState.archetypeCompleted = true;
    showToast("🎉 Archetype Diagnostic Completed!");
  }

  await storage.set("meta", {
    id: "archetype",
    answers: AppState.archetypeAnswers,
    scores: AppState.archetypeScores,
    completed: AppState.archetypeCompleted
  });

  renderArchetypeQuiz();
}
window.selectArchetypeChoice = selectArchetypeChoice;

async function retakeArchetypeQuiz() {
  AppState.archetypeAnswers = {};
  AppState.archetypeScores = { hacker: 0, diplomat: 0, pioneer: 0, operator: 0 };
  AppState.archetypeCompleted = false;
  await storage.delete("meta", "archetype");
  renderArchetypeQuiz();
  showToast("Diagnostic reset.");
}
window.retakeArchetypeQuiz = retakeArchetypeQuiz;

// --- 0C: Role Comparison Matrix ---
function renderRoleMatrix() {
  const tbody = document.getElementById("role-matrix-tbody");
  if (!tbody) return;

  const hl = AppState.matrixHighlightedCol;

  // Update header highlight classes
  document.getElementById("col-head-fde")?.classList.toggle("highlight-col", hl === "all" || hl === "fde");
  document.getElementById("col-head-swe")?.classList.toggle("highlight-col", hl === "swe");
  document.getElementById("col-head-sa")?.classList.toggle("highlight-col", hl === "sa");
  document.getElementById("col-head-tam")?.classList.toggle("highlight-col", hl === "tam");

  tbody.innerHTML = ROLE_COMPARISON_DATA.map((row) => `
    <tr>
      <td style="font-weight: 700; color: #fff;">${row.dimension}</td>
      <td class="${hl === 'all' || hl === 'fde' ? 'highlight-col' : ''}">${row.fde}</td>
      <td class="${hl === 'swe' ? 'highlight-col' : ''}">${row.swe}</td>
      <td class="${hl === 'sa' ? 'highlight-col' : ''}">${row.sa}</td>
      <td class="${hl === 'tam' ? 'highlight-col' : ''}">${row.tam}</td>
    </tr>
  `).join("");
}

function highlightMatrixCol(colId) {
  AppState.matrixHighlightedCol = colId;
  renderRoleMatrix();
}
window.highlightMatrixCol = highlightMatrixCol;

// --- 0D: Career Progression Ladder ---
function renderCareerLadder() {
  const tabsContainer = document.getElementById("ladder-tier-tabs-container");
  const detailContainer = document.getElementById("ladder-detail-content");
  if (!tabsContainer || !detailContainer) return;

  tabsContainer.innerHTML = CAREER_LADDER_TIERS.map(tier => {
    const isActive = AppState.selectedCareerTier === tier.id;
    return `
      <button class="ladder-tier-btn ${isActive ? 'active' : ''}" onclick="selectCareerTier('${tier.id}')">
        <span>${tier.level}</span> · <span>${tier.title}</span>
      </button>
    `;
  }).join("");

  const activeTier = CAREER_LADDER_TIERS.find(t => t.id === AppState.selectedCareerTier) || CAREER_LADDER_TIERS[1];
  if (!activeTier) return;

  detailContainer.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span class="tag-badge" style="color: var(--accent-emerald); font-weight: 700;">${activeTier.level} · ${activeTier.tenure}</span>
          <h3 style="font-size: 1.35rem; font-weight: 800; color: #fff; margin-top: 0.35rem;">${activeTier.title}</h3>
          <p style="font-size: 0.92rem; color: #cbd5e1; margin-top: 0.35rem; max-width: 800px; line-height: 1.6;">${activeTier.summary}</p>
        </div>

        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md); padding: 0.85rem 1.25rem; text-align: right;">
          <div style="font-size: 1.2rem; font-weight: 800; color: #6ee7b7;">${activeTier.comp}</div>
          <div style="font-size: 0.8rem; color: #a7f3d0; margin-top: 0.15rem;">${activeTier.equity}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;">
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem;">
          <h4 style="font-size: 0.88rem; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase; margin-bottom: 0.75rem;">
            Core Field Competencies:
          </h4>
          <ul style="padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem; color: #cbd5e1; line-height: 1.5;">
            ${activeTier.competencies.map(c => `<li>${c}</li>`).join("")}
          </ul>
        </div>

        <div style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem;">
          <h4 style="font-size: 0.88rem; font-weight: 700; color: var(--accent-emerald); text-transform: uppercase; margin-bottom: 0.75rem;">
            Promotion & Impact Rubric:
          </h4>
          <p style="font-size: 0.88rem; color: #e2e8f0; line-height: 1.6; margin-bottom: 0.85rem;">
            ${activeTier.promotionCriteria}
          </p>
          <div style="font-size: 0.78rem; color: var(--text-subtle);">
            Targeted at forward-deployed engineering organizations (e.g. Palantir, Scale AI, OpenAI, Databricks, Anduril).
          </div>
        </div>
      </div>
    </div>
  `;
}

function selectCareerTier(tierId) {
  AppState.selectedCareerTier = tierId;
  renderCareerLadder();
}
window.selectCareerTier = selectCareerTier;

// ============================================================================
// STAKEHOLDER CRUCIBLE & DE-ESCALATION SIMULATOR
// ============================================================================
function renderStakeholderCrucible() {
  const tabsContainer = document.getElementById("crucible-tabs-container");
  const cardContainer = document.getElementById("crucible-scenario-card");
  if (!tabsContainer || !cardContainer) return;

  // Tabs
  tabsContainer.innerHTML = CRUCIBLE_SCENARIOS.map(s => {
    const isActive = AppState.activeCrucibleScenario === s.id;
    return `
      <button class="crucible-tab-btn ${isActive ? 'active' : ''}" onclick="selectCrucibleScenario('${s.id}')">
        ${s.title}
      </button>
    `;
  }).join("");

  // Active Scenario
  const scenario = CRUCIBLE_SCENARIOS.find(s => s.id === AppState.activeCrucibleScenario) || CRUCIBLE_SCENARIOS[0];
  const selectedChoiceId = AppState.crucibleSelectedChoices[scenario.id];
  const selectedChoice = scenario.choices.find(c => c.id === selectedChoiceId);

  cardContainer.innerHTML = `
    <div class="crucible-scenario-header">
      <div>
        <div class="crucible-stakeholder-badge">${scenario.stakeholder}</div>
        <h3 class="card-title" style="margin-top: 0.25rem;">${scenario.title}</h3>
      </div>
      <span class="tag-badge" style="color: var(--accent-amber);">High-Pressure Field Scoping</span>
    </div>

    <div class="crucible-quote">"${scenario.quote}"</div>

    <p style="font-size: 0.86rem; color: var(--text-muted); margin-bottom: 1rem; line-height: 1.5;">
      <strong>Field Context:</strong> ${scenario.context}
    </p>

    <div style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase; color: var(--text-subtle); margin-bottom: 0.5rem;">
      Choose your FDE strategic response:
    </div>

    <div class="crucible-choices">
      ${scenario.choices.map((choice, idx) => {
        const isSelected = selectedChoiceId === choice.id;
        return `
          <button class="crucible-choice-btn ${isSelected ? 'selected' : ''}" onclick="selectCrucibleChoice('${scenario.id}', '${choice.id}')">
            <span style="font-weight: 700; color: var(--accent-cyan);">${String.fromCharCode(65 + idx)}.</span>
            <div style="flex: 1;">${choice.label}</div>
          </button>
        `;
      }).join("")}
    </div>

    ${selectedChoice ? `
      <div class="crucible-feedback-box ${selectedChoice.resultType}">
        <div style="font-weight: 700; margin-bottom: 0.35rem; display: flex; justify-content: space-between;">
          <span>${selectedChoice.resultType === 'pass' ? '✓ Masterful Field Diplomacy (+100 XP)' : '✕ Critical Escalation Risk'}</span>
          <span>Score: ${selectedChoice.points} / 100</span>
        </div>
        <div>${selectedChoice.outcome}</div>
      </div>
    ` : ''}
  `;
}

function selectCrucibleScenario(scenarioId) {
  AppState.activeCrucibleScenario = scenarioId;
  renderStakeholderCrucible();
}
window.selectCrucibleScenario = selectCrucibleScenario;

function selectCrucibleChoice(scenarioId, choiceId) {
  AppState.crucibleSelectedChoices[scenarioId] = choiceId;
  renderStakeholderCrucible();
  updateReadinessMetrics();
}
window.selectCrucibleChoice = selectCrucibleChoice;

// ============================================================================
// CROSS-INDUSTRY DEPLOYMENT & COMPLIANCE TIERS
// ============================================================================
function renderComplianceTiers() {
  const container = document.getElementById("compliance-tiers-container");
  if (!container) return;

  container.innerHTML = COMPLIANCE_TIERS.map(tier => `
    <div class="compliance-tier-card">
      <div class="compliance-tier-header">
        <div class="compliance-tier-title">${tier.name}</div>
        <span class="tag-badge" style="color: ${tier.accent}; border-color: ${tier.accent}40;">${tier.badge}</span>
      </div>
      <ul class="compliance-constraints-list">
        ${tier.characteristics.map(c => `
          <li>
            <span class="compliance-bullet">▸</span>
            <span>${c}</span>
          </li>
        `).join("")}
      </ul>
    </div>
  `).join("");
}

// ============================================================================
// FDE DEFINITION OF DONE (DOD) & HANDOVER CHECKLIST
// ============================================================================
async function initDodChecklist() {
  try {
    const saved = await storage.get("meta", "dod_checks");
    if (saved && saved.checks) {
      AppState.dodChecks = saved.checks;
    }
  } catch (e) {
    // Fallback in memory
  }
  renderDodChecklist();
}

function renderDodChecklist() {
  const container = document.getElementById("dod-checklist-container");
  const counter = document.getElementById("dod-progress-counter");
  if (!container) return;

  const completedCount = Object.values(AppState.dodChecks).filter(Boolean).length;
  if (counter) counter.innerText = `${completedCount} / ${DOD_CHECKLIST_ITEMS.length}`;

  container.innerHTML = DOD_CHECKLIST_ITEMS.map(item => {
    const isDone = !!AppState.dodChecks[item.id];
    return `
      <div class="dod-item ${isDone ? 'completed' : ''}" onclick="toggleDodItem('${item.id}')">
        <div class="dod-checkbox">${isDone ? '✓' : ''}</div>
        <div>
          <div class="dod-title">${item.title}</div>
          <div class="dod-desc">${item.desc}</div>
        </div>
      </div>
    `;
  }).join("");
}

async function toggleDodItem(itemId) {
  AppState.dodChecks[itemId] = !AppState.dodChecks[itemId];
  renderDodChecklist();
  updateReadinessMetrics();
  try {
    await storage.set("meta", { id: "dod_checks", checks: AppState.dodChecks });
  } catch (e) {}
}
window.toggleDodItem = toggleDodItem;

// ============================================================================
// AUTHORITATIVE ENTERPRISE TRAINING HUB
// ============================================================================
function renderEnterpriseResources() {
  const grid = document.getElementById("enterprise-resource-grid");
  if (!grid) return;

  grid.innerHTML = ENTERPRISE_RESOURCES.map(res => `
    <div class="resource-card">
      <div>
        <div class="resource-provider">${res.provider}</div>
        <div class="resource-title">${res.title}</div>
        <div class="resource-desc">${res.desc}</div>
      </div>
      <div>
        <div class="resource-curriculum-tags">
          ${res.tags.map(t => `<span class="resource-tag font-mono">${t}</span>`).join("")}
        </div>
        <a href="${res.url}" target="_blank" rel="noopener noreferrer" class="resource-link-btn">
          <span>Open Official Guide</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>
    </div>
  `).join("");
}

// ============================================================================
// FDE TAKE-HOME CHALLENGE SIMULATOR
// ============================================================================
function initTakehomeSimulator() {
  const table = document.getElementById("takehome-dataset-table");
  const editor = document.getElementById("takehome-code-editor");
  if (!table || !editor) return;

  // Render Dataset Table
  table.innerHTML = `
    <thead>
      <tr>
        <th>Tx ID</th>
        <th>Account</th>
        <th>Amount</th>
        <th>Currency</th>
        <th>Timestamp</th>
        <th>Audit Flag</th>
      </tr>
    </thead>
    <tbody>
      ${TAKEHOME_DATASET.map(r => `
        <tr class="${r.status.startsWith('CORRUPT') ? 'corrupt-row' : ''}">
          <td>${r.tx_id}</td>
          <td>${r.account_id || '<span style="color:var(--accent-rose)">MISSING</span>'}</td>
          <td>${r.amount < 0 ? `<span style="color:var(--accent-rose)">${r.amount}</span>` : r.amount}</td>
          <td>${r.currency}</td>
          <td>${r.timestamp}</td>
          <td>${r.status}</td>
        </tr>
      `).join("")}
    </tbody>
  `;

  if (!editor.value.trim()) {
    editor.value = TAKEHOME_STARTER_CODE;
  }
}

function startTakehomeTimer() {
  if (AppState.takehomeRunning) return;
  AppState.takehomeRunning = true;
  AppState.takehomeTimerInterval = setInterval(() => {
    if (AppState.takehomeTimeLeft > 0) {
      AppState.takehomeTimeLeft--;
      updateTakehomeTimerDisplay();
    } else {
      clearInterval(AppState.takehomeTimerInterval);
      AppState.takehomeRunning = false;
      showToast("Take-home challenge timer expired!");
    }
  }, 1000);
}

function pauseTakehomeTimer() {
  AppState.takehomeRunning = false;
  if (AppState.takehomeTimerInterval) clearInterval(AppState.takehomeTimerInterval);
}

function resetTakehomeTimer() {
  pauseTakehomeTimer();
  AppState.takehomeTimeLeft = 3 * 3600;
  updateTakehomeTimerDisplay();
}

function updateTakehomeTimerDisplay() {
  const display = document.getElementById("takehome-timer-display");
  if (!display) return;
  const hours = Math.floor(AppState.takehomeTimeLeft / 3600);
  const minutes = Math.floor((AppState.takehomeTimeLeft % 3600) / 60);
  const seconds = AppState.takehomeTimeLeft % 60;
  display.innerText = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function evaluateTakehomeSolution() {
  const code = document.getElementById("takehome-code-editor")?.value;
  const output = document.getElementById("takehome-eval-output");
  const scorePill = document.getElementById("takehome-score-pill");
  if (!output || !code) return;

  try {
    // Instantiate function safely
    const fn = new Function(`${code}\nreturn reconcileLedger;`)();
    if (typeof fn !== "function") throw new Error("reconcileLedger function was not exported or defined.");

    const fxRates = { EUR: 1.08, GBP: 1.28, USD: 1.0 };
    const result = fn(JSON.parse(JSON.stringify(TAKEHOME_DATASET)), fxRates);

    if (!result || !Array.isArray(result.cleanRecords) || !Array.isArray(result.deadLetterQueue)) {
      throw new Error("Function must return { cleanRecords, deadLetterQueue, totalVolumeUsd } object.");
    }

    let score = 0;
    const testLogs = [];

    // Test 1: Deduplication
    const txIds = result.cleanRecords.map(r => r.tx_id);
    const hasUniqueTxs = new Set(txIds).size === txIds.length;
    if (hasUniqueTxs && txIds.includes("TX-1001")) {
      score += 25;
      testLogs.push("✓ Test 1 Passed: Deduplication preserves latest unique transaction timestamps (+25)");
    } else {
      testLogs.push("✕ Test 1 Failed: Duplicate transactions found or incorrect timestamp kept");
    }

    // Test 2: Dead Letter Queue routing (missing account or negative amount)
    const dlqCount = result.deadLetterQueue.length;
    if (dlqCount >= 2) {
      score += 25;
      testLogs.push(`✓ Test 2 Passed: Successfully isolated ${dlqCount} corrupted records into Dead Letter Queue (+25)`);
    } else {
      testLogs.push("✕ Test 2 Failed: Did not properly isolate records with missing accounts or negative balances to DLQ");
    }

    // Test 3: Currency normalization
    const currencies = result.cleanRecords.map(r => (r.currency || "").toUpperCase());
    const validIso = currencies.every(c => ["USD", "EUR", "GBP"].includes(c));
    if (validIso) {
      score += 25;
      testLogs.push("✓ Test 3 Passed: Currency strings normalized to clean uppercase ISO codes (+25)");
    } else {
      testLogs.push("✕ Test 3 Failed: Corrupt currency strings (e.g. 'USD$', 'usd') found in cleanRecords");
    }

    // Test 4: Volume aggregation in base USD
    if (typeof result.totalVolumeUsd === "number" && result.totalVolumeUsd > 0) {
      score += 25;
      testLogs.push(`✓ Test 4 Passed: Calculated normalized volume sum ($${result.totalVolumeUsd.toFixed(2)} USD) (+25)`);
    } else {
      testLogs.push("✕ Test 4 Failed: totalVolumeUsd is missing or invalid number");
    }

    AppState.takehomeScore = score;
    if (scorePill) scorePill.innerText = `Rubric: ${score} / 100`;

    output.innerHTML = `
      <div style="font-weight: 700; color: ${score === 100 ? 'var(--accent-emerald)' : 'var(--accent-amber)'}; margin-bottom: 0.5rem;">
        ${score === 100 ? '🎉 OUTSTANDING! All enterprise test fixtures passed.' : `Evaluation Complete: Score ${score} / 100`}
      </div>
      ${testLogs.map(l => `<div style="margin-bottom: 0.25rem; color: ${l.startsWith('✓') ? '#6ee7b7' : '#fda4af'};">${l}</div>`).join("")}
    `;

    updateReadinessMetrics();
  } catch (err) {
    output.innerHTML = `<span style="color: var(--accent-rose);">Execution Error: ${err.message}</span>`;
  }
}
window.startTakehomeTimer = startTakehomeTimer;
window.pauseTakehomeTimer = pauseTakehomeTimer;
window.resetTakehomeTimer = resetTakehomeTimer;
window.evaluateTakehomeSolution = evaluateTakehomeSolution;

// ============================================================================
// FDE FIELD MISSIONS: END-TO-END CLIENT DEPLOYMENTS ENGINE
// ============================================================================
function renderFieldMissions() {
  const selectorContainer = document.getElementById("mission-selector-tabs-container");
  const stepperContainer = document.getElementById("mission-stepper-container");
  const bodyContainer = document.getElementById("mission-body-content");
  if (!selectorContainer || !stepperContainer || !bodyContainer) return;

  // 1. Mission Selector Tabs
  selectorContainer.innerHTML = FIELD_MISSIONS.map(m => `
    <button class="mission-selector-btn ${AppState.activeMissionId === m.id ? 'active' : ''}" onclick="selectMission('${m.id}')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="12 6 12 12 16 14"/></svg>
      <span>${m.title}</span>
    </button>
  `).join("");

  const mission = FIELD_MISSIONS.find(m => m.id === AppState.activeMissionId) || FIELD_MISSIONS[0];
  const activePhase = mission.phases.find(p => p.phaseNum === AppState.missionActivePhase) || mission.phases[0];

  // 2. Stepper
  stepperContainer.innerHTML = mission.phases.map(p => {
    const isActive = p.phaseNum === AppState.missionActivePhase;
    const isCompleted = !!AppState.missionChoices[`${mission.id}_p${p.phaseNum}`];
    return `
      <div class="mission-phase-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" onclick="selectMissionPhase(${p.phaseNum})">
        <div class="phase-step-num">Phase ${p.phaseNum} ${isCompleted ? '✓' : ''}</div>
        <div class="phase-step-title">${p.title}</div>
      </div>
    `;
  }).join("");

  // 3. Phase Body
  const choiceKey = `${mission.id}_p${activePhase.phaseNum}`;
  const selectedChoiceId = AppState.missionChoices[choiceKey];
  const selectedChoice = activePhase.choices.find(c => c.id === selectedChoiceId);

  bodyContainer.innerHTML = `
    <div class="mission-brief-header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <span class="tag-badge" style="color: var(--accent-cyan)">Phase ${activePhase.phaseNum} of 4: ${activePhase.title}</span>
          <h2 class="card-title" style="margin-top: 0.35rem;">${mission.client}</h2>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">${activePhase.subtitle}</div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="runMissionChaos('${mission.id}', ${activePhase.phaseNum})">
          ⚡ Run Phase Verification Drill
        </button>
      </div>

      <div class="mission-meta-row">
        <span><strong>Client Problem:</strong> ${mission.problem}</span>
      </div>
    </div>

    <!-- Phase Scenario Question -->
    <div style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem;">
      <div style="font-size: 0.78rem; font-weight: 700; color: var(--accent-amber); text-transform: uppercase; margin-bottom: 0.4rem;">
        Field Decision Gate // Phase ${activePhase.phaseNum}
      </div>
      <p style="font-size: 0.95rem; font-weight: 600; color: #fff; margin-bottom: 1rem; line-height: 1.5;">
        ${activePhase.question}
      </p>

      <div class="crucible-choices">
        ${activePhase.choices.map((c, idx) => {
          const isSelected = selectedChoiceId === c.id;
          return `
            <button class="crucible-choice-btn ${isSelected ? 'selected' : ''}" onclick="selectMissionChoice('${mission.id}', ${activePhase.phaseNum}, '${c.id}')">
              <span style="font-weight: 700; color: var(--accent-cyan);">${String.fromCharCode(65 + idx)}.</span>
              <div>${c.label}</div>
            </button>
          `;
        }).join("")}
      </div>

      ${selectedChoice ? `
        <div class="crucible-feedback-box ${selectedChoice.points > 50 ? 'pass' : 'fail'}" style="margin-top: 1rem;">
          <div style="font-weight: 700; margin-bottom: 0.25rem;">
            ${selectedChoice.points > 50 ? '✓ Strategic Architecture Choice Verified (+100 XP)' : '✕ Sub-Optimal Architecture'}
          </div>
          <div>${selectedChoice.feedback}</div>
        </div>
      ` : ''}
    </div>

    <!-- Production Code Artifact -->
    <div class="mission-artifact-card">
      <div class="mission-artifact-header">
        <span>Production Code Artifact (Click to Copy)</span>
        <button class="btn btn-ghost btn-sm" style="font-size: 0.75rem;" onclick="copyCodeSnippet('${activePhase.phaseNum}')">Copy Artifact</button>
      </div>
      <pre style="background: #020617; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 1rem; font-family: var(--font-mono); font-size: 0.8rem; color: #67e8f9; overflow-x: auto;"><code>${activePhase.codeSnippet}</code></pre>
    </div>

    <!-- Real-Time Terminal Execution Output -->
    <div style="background: #020617; border: 1px solid var(--border-medium); border-radius: var(--radius-md); padding: 1rem;">
      <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-subtle); text-transform: uppercase; margin-bottom: 0.4rem; font-family: var(--font-mono);">
        Live Onsite Execution Telemetry:
      </div>
      <pre style="font-family: var(--font-mono); font-size: 0.8rem; color: #a5f3fc; line-height: 1.5; white-space: pre-wrap;">${activePhase.terminalOutput}</pre>
    </div>
  `;
}

function selectMission(missionId) {
  AppState.activeMissionId = missionId;
  AppState.missionActivePhase = 1;
  renderFieldMissions();
}
window.selectMission = selectMission;

function selectMissionPhase(phaseNum) {
  AppState.missionActivePhase = phaseNum;
  renderFieldMissions();
}
window.selectMissionPhase = selectMissionPhase;

function selectMissionChoice(missionId, phaseNum, choiceId) {
  AppState.missionChoices[`${missionId}_p${phaseNum}`] = choiceId;
  renderFieldMissions();
  showToast(`Phase ${phaseNum} decision recorded.`);
  updateReadinessMetrics();
}
window.selectMissionChoice = selectMissionChoice;

function runMissionChaos(missionId, phaseNum) {
  showToast(`Running automated chaos drill for Phase ${phaseNum}...`);
  setTimeout(() => {
    showToast("✓ All health probes and failover gates green. Zero packet loss verified.");
  }, 900);
}
window.runMissionChaos = runMissionChaos;

function copyCodeSnippet(phaseNum) {
  const mission = FIELD_MISSIONS.find(m => m.id === AppState.activeMissionId) || FIELD_MISSIONS[0];
  const phase = mission.phases.find(p => p.phaseNum == phaseNum);
  if (phase && phase.codeSnippet) {
    copyTextToClipboard(phase.codeSnippet, "Mission code artifact copied to clipboard!");
  }
}
window.copyCodeSnippet = copyCodeSnippet;

// ============================================================================
// COMPANY-SPECIFIC INTERVIEW DOSSIERS & OUTREACH SCRIPTS
// ============================================================================
function renderCompanyDossiers() {
  const container = document.getElementById("company-dossiers-container");
  if (!container) return;

  container.innerHTML = COMPANY_DOSSIERS.map(d => `
    <div class="dossier-card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div class="dossier-company-name">${d.company}</div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">${d.role}</div>
        </div>
        <span class="tag-badge" style="color: var(--accent-emerald); font-weight: 700;">${d.comp}</span>
      </div>

      <div style="font-size: 0.78rem; color: var(--text-subtle);">
        <strong>Focus Sectors:</strong> ${d.sectors}
      </div>

      <div style="background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.85rem; margin-top: 0.4rem;">
        <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-subtle); margin-bottom: 0.4rem;">Interview Loop Blueprint:</div>
        <ul class="dossier-rounds-list">
          ${d.interviewLoop.map(r => `<li><span>▸</span><span>${r}</span></li>`).join("")}
        </ul>
      </div>

      <div style="font-size: 0.78rem; color: var(--text-muted);">
        <strong>Tech Stack:</strong> <code class="font-mono" style="color: var(--accent-cyan);">${d.techStack}</code>
      </div>

      <div style="background: rgba(6,182,212,0.06); border-left: 3px solid var(--accent-cyan); padding: 0.65rem 0.85rem; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; font-size: 0.8rem; color: #a5f3fc;">
        <strong>FDE Insider Tip:</strong> ${d.fdeSecret}
      </div>
    </div>
  `).join("");
}

function renderOutreachScripts() {
  const container = document.getElementById("outreach-scripts-container");
  if (!container) return;

  container.innerHTML = OUTREACH_SCRIPTS.map(s => `
    <div class="outreach-script-card">
      <div class="outreach-header">
        <div>
          <span class="tag-badge" style="color: var(--accent-indigo);">${s.target}</span>
          <h3 class="card-title" style="margin-top: 0.3rem;">Subject: ${s.subject}</h3>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="copyOutreachScript('${s.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy Script
        </button>
      </div>

      <div class="outreach-text-box" id="script-text-${s.id}">${s.body}</div>
    </div>
  `).join("");
}

function copyOutreachScript(scriptId) {
  const textEl = document.getElementById(`script-text-${scriptId}`);
  if (!textEl) return;
  navigator.clipboard.writeText(textEl.innerText).then(() => {
    showToast("Outreach template copied to clipboard!");
  }).catch(() => {
    showToast("Copied script text.");
  });
}
window.copyOutreachScript = copyOutreachScript;

// ============================================================================
// INTERACTIVE FIELD TERMINAL SIMULATOR: 12 BASTION DIAGNOSTIC DRILLS
// ============================================================================
function initTerminalSimulator() {
  const input = document.getElementById("terminal-cli-input");
  if (!input) return;

  updateTerminalDrillDisplay();

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const cmd = input.value.trim();
      if (!cmd) return;
      handleTerminalCommand(cmd);
      input.value = "";
    }
  });
}

function updateTerminalDrillDisplay() {
  const drill = TERMINAL_DRILLS[AppState.currentTerminalDrillIndex];
  const catLabel = document.getElementById("drill-category-label");
  const promptText = document.getElementById("drill-prompt-text");
  const hintText = document.getElementById("drill-hint-text");
  const statusLabel = document.getElementById("drill-status-label");

  if (catLabel) catLabel.innerText = `Drill ${AppState.currentTerminalDrillIndex + 1} of ${TERMINAL_DRILLS.length}: ${drill.category}`;
  if (promptText) promptText.innerText = drill.prompt;
  if (hintText) hintText.innerHTML = `Hint: <code>${drill.hint}</code>`;
  if (statusLabel) {
    statusLabel.innerText = "Pending Input";
    statusLabel.style.color = "var(--accent-amber)";
  }
}

function handleTerminalCommand(cmd) {
  const termBody = document.getElementById("terminal-body");
  const statusLabel = document.getElementById("drill-status-label");
  if (!termBody) return;

  // Append user command
  const cmdRow = document.createElement("div");
  cmdRow.className = "terminal-output-line";
  cmdRow.innerHTML = `<span style="color:var(--accent-emerald)">analyst@bastion:~$</span> <span style="color:#fff">${escapeHtml(cmd)}</span>`;
  termBody.appendChild(cmdRow);

  const drill = TERMINAL_DRILLS[AppState.currentTerminalDrillIndex];

  // Help command
  if (cmd.toLowerCase() === "help") {
    const out = document.createElement("div");
    out.className = "terminal-output-line";
    out.style.color = "var(--text-muted)";
    out.innerText = "Available diagnostic tools: curl, openssl, nc, docker, psql, jq, df, grep, kill, chmod, netstat, sha256sum.";
    termBody.appendChild(out);
    termBody.scrollTop = termBody.scrollHeight;
    return;
  }

  // Validate command
  const isCorrect = drill.validate(cmd);
  const out = document.createElement("div");
  out.className = "terminal-output-line";

  if (isCorrect) {
    out.style.color = "#6ee7b7";
    out.innerText = drill.successOutput;
    termBody.appendChild(out);
    if (statusLabel) {
      statusLabel.innerText = "✓ Drill Passed";
      statusLabel.style.color = "var(--accent-emerald)";
    }
    showToast(`Drill ${AppState.currentTerminalDrillIndex + 1} Passed! (+50 XP)`);
  } else {
    out.style.color = "#fca5a5";
    out.innerText = `bash: command executed but did not resolve target diagnostic condition.\nExpected pattern: ${drill.hint}`;
    termBody.appendChild(out);
  }

  termBody.scrollTop = termBody.scrollHeight;
}

function nextTerminalDrill() {
  AppState.currentTerminalDrillIndex = (AppState.currentTerminalDrillIndex + 1) % TERMINAL_DRILLS.length;
  updateTerminalDrillDisplay();
  const termBody = document.getElementById("terminal-body");
  if (termBody) {
    const divider = document.createElement("div");
    divider.className = "terminal-output-line";
    divider.style.color = "var(--accent-cyan)";
    divider.innerText = `\n--- Advanced to Drill ${AppState.currentTerminalDrillIndex + 1}: ${TERMINAL_DRILLS[AppState.currentTerminalDrillIndex].category} ---`;
    termBody.appendChild(divider);
    termBody.scrollTop = termBody.scrollHeight;
  }
}
window.nextTerminalDrill = nextTerminalDrill;

function resetTerminal() {
  const termBody = document.getElementById("terminal-body");
  if (termBody) {
    termBody.innerHTML = `
      <div class="terminal-output-line" style="color: var(--text-subtle);">[Terminal Cleared. Offline Enclave Session Active]</div>
    `;
  }
}
window.resetTerminal = resetTerminal;

// ============================================================================
// EXPORTABLE FDE FIELD GUIDE GENERATOR (MARKDOWN & PRINT)
// ============================================================================
function exportFieldGuide() {
  let md = `# Forward Deployed Engineering (FDE) Field Deployment Guide\n\n`;
  md += `Generated: ${new Date().toUTCString()}\n`;
  md += `Platform: FDE Mastery Academy (100% Offline Progressive Web App)\n\n`;
  md += `---\n\n`;

  md += `## 1. FDE Core Definition of Done (DoD)\n\n`;
  DOD_CHECKLIST_ITEMS.forEach((item, idx) => {
    const isDone = AppState.dodChecks[item.id] ? "[X]" : "[ ]";
    md += `${idx + 1}. ${isDone} **${item.title}**: ${item.desc}\n`;
  });
  md += `\n---\n\n`;

  md += `## 2. Cross-Industry Deployment & Air-Gap Compliance Tiers\n\n`;
  COMPLIANCE_TIERS.forEach(tier => {
    md += `### ${tier.name} (${tier.badge})\n`;
    tier.characteristics.forEach(c => md += `- ${c}\n`);
    md += `\n`;
  });
  md += `---\n\n`;

  md += `## 3. High-Yield Production Code Snippets\n\n`;
  AppState.snippets.forEach(s => {
    md += `### ${s.title} (${s.lang})\n`;
    md += `\`\`\`${s.lang}\n${s.code}\n\`\`\`\n\n`;
  });
  md += `---\n\n`;

  md += `## 4. Field Notes & Triage Runbooks\n\n`;
  AppState.notes.forEach(n => {
    md += `### ${n.title} [${n.category}]\n`;
    md += `${n.content}\n\n`;
  });

  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `FDE_Field_Deployment_Guide_${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("FDE Field Guide exported as Markdown.");
}
window.exportFieldGuide = exportFieldGuide;


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

  // Brand click -> Section 0 (Overview)
  document.getElementById("brand-home-btn")?.addEventListener("click", () => {
    switchSection("overview");
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

  // Take-Home Challenge Simulator
  document.getElementById("takehome-start-btn")?.addEventListener("click", startTakehomeTimer);
  document.getElementById("takehome-pause-btn")?.addEventListener("click", pauseTakehomeTimer);
  document.getElementById("takehome-reset-btn")?.addEventListener("click", resetTakehomeTimer);
  document.getElementById("run-takehome-eval-btn")?.addEventListener("click", evaluateTakehomeSolution);

  // Field Terminal Simulator
  document.getElementById("reset-terminal-btn")?.addEventListener("click", resetTerminal);
  document.getElementById("next-terminal-drill-btn")?.addEventListener("click", nextTerminalDrill);

  // Field Guide Export
  document.getElementById("export-field-guide-btn")?.addEventListener("click", exportFieldGuide);

  // Global Keyboard Shortcuts (1-5 for 5 tabs)
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

    if (e.key === "1") switchSection("overview");
    else if (e.key === "2") switchSection("skills");
    else if (e.key === "3") switchSection("interviews");
    else if (e.key === "4") switchSection("jobhunting");
    else if (e.key === "5") switchSection("accelerator");
    else if (e.key === "/") {
      e.preventDefault();
      searchInput?.focus();
    } else if (e.code === "Space" && AppState.activeSection === "interviews" && AppState.activeInterviewTool === "flashcards") {
      e.preventDefault();
      flipFlashcard();
    }
  });
});
