# EstateWise Architecture

This document describes the comprehensive end-to-end architecture for EstateWise, spanning frontend UI, backend services, API protocols (REST, tRPC, gRPC), data and graph pipelines, AI/ML systems, MCP tooling, agentic orchestration, IDE extensions, and CI/CD infrastructure.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white)
![Nuxt](https://img.shields.io/badge/Nuxt-00C58E?style=for-the-badge&logo=nuxt&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer%20Motion-000000?style=for-the-badge&logo=framer&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-F38B4A?style=for-the-badge&logo=chartdotjs&logoColor=white)
![Shadcn UI](https://img.shields.io/badge/Shadcn%20UI-000000?style=for-the-badge&logo=shadcn/ui&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Pinecone](https://img.shields.io/badge/Pinecone-FF6F61?style=for-the-badge&logo=googledataflow&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Google AI](https://img.shields.io/badge/Google%20AI-4285F4?style=for-the-badge&logo=google&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=json-web-tokens)
![Amazon Web Services](https://img.shields.io/badge/Amazon%20Web%20Services-124568?style=for-the-badge&logo=task&logoColor=white)
![Google Cloud Platform](https://img.shields.io/badge/Google%20Cloud%20Platform-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)
![Microsoft Azure](https://img.shields.io/badge/Microsoft%20Azure-0078D4?style=for-the-badge&logo=micropython&logoColor=white)
![Oracle Cloud Infrastructure](https://img.shields.io/badge/Oracle%20Cloud-red?style=for-the-badge&logo=circle&logoColor=white)
![Terraform](https://img.shields.io/badge/Terraform-623CE4?style=for-the-badge&logo=terraform&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Podman](https://img.shields.io/badge/Podman-000000?style=for-the-badge&logo=podman&logoColor=white)
![Prometheus](https://img.shields.io/badge/Prometheus-E6512D?style=for-the-badge&logo=prometheus&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=white)
![Postman](https://img.shields.io/badge/Postman-FF6C37?style=for-the-badge&logo=postman&logoColor=white)
![Husky](https://img.shields.io/badge/Husky-6C6C6C?style=for-the-badge&logo=apachekylin&logoColor=white)
![Server-Sent Events](https://img.shields.io/badge/Server--Sent%20Events-000000?style=for-the-badge&logo=serverless&logoColor=white)
![WebSockets](https://img.shields.io/badge/WebSockets-000000?style=for-the-badge&logo=socketdotio&logoColor=white)
![Jupyter Notebook](https://img.shields.io/badge/Jupyter%20Notebook-F37626?style=for-the-badge&logo=jupyter&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![Selenium WebDriver](https://img.shields.io/badge/Selenium%20WebDriver-43B02A?style=for-the-badge&logo=selenium&logoColor=white)
![Cypress](https://img.shields.io/badge/Cypress-17202C?style=for-the-badge&logo=cypress&logoColor=white)
![VS Code Extension](https://img.shields.io/badge/VS%20Code%20Extension-007ACC?style=for-the-badge&logo=gitextensions&logoColor=white) 
![Neo4j](https://img.shields.io/badge/Neo4j-008CC1?style=for-the-badge&logo=neo4j&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-6E56CF?style=for-the-badge&logo=modelcontextprotocol&logoColor=white)
![A2A](https://img.shields.io/badge/A2A-Agent--to--Agent_Protocol-0EA5E9?style=for-the-badge)
![LangChain](https://img.shields.io/badge/LangChain-000000?style=for-the-badge&logo=langchain&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-000000?style=for-the-badge&logo=langgraph&logoColor=white)
![LangSmith](https://img.shields.io/badge/LangSmith-000000?style=for-the-badge&logo=langchain&logoColor=white)
![CrewAI](https://img.shields.io/badge/CrewAI-red?style=for-the-badge&logo=crewai&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3068B7?style=for-the-badge&logo=zod&logoColor=white)
![D3.js](https://img.shields.io/badge/D3.js-F9A03C?style=for-the-badge&logo=d3&logoColor=white)
![OpenAPI](https://img.shields.io/badge/OpenAPI-6E6E6E?style=for-the-badge&logo=openapiinitiative&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
![GitHub Packages](https://img.shields.io/badge/GitHub%20Packages-2EA44F?style=for-the-badge&logo=github&logoColor=white)
![Dependabot](https://img.shields.io/badge/Dependabot-blue?style=for-the-badge&logo=dependabot&logoColor=white)
![Trivy](https://img.shields.io/badge/Trivy-5B8FF9?style=for-the-badge&logo=trivy&logoColor=white)
![CodeQL](https://img.shields.io/badge/CodeQL-2B7489?style=for-the-badge&logo=codeblocks&logoColor=white)
![Yelp Detect Secrets](https://img.shields.io/badge/Yelp%20Detect--Secrets-red?style=for-the-badge&logo=yelp&logoColor=white)
![Jenkins](https://img.shields.io/badge/Jenkins-D24939?style=for-the-badge&logo=jenkins&logoColor=white)
![Travis CI](https://img.shields.io/badge/Travis%20CI-3EAAAF?style=for-the-badge&logo=travis&logoColor=white)
![GitLab CI](https://img.shields.io/badge/GitLab%20CI-FCA121?style=for-the-badge&logo=gitlab&logoColor=white)
![Argo CD](https://img.shields.io/badge/Argo%20CD-FFFFFF?style=for-the-badge&logo=argo&logoColor=E6007E)
![Flux CD](https://img.shields.io/badge/Flux%20CD-007ACC?style=for-the-badge&logo=flux&logoColor=white)
![Argo Rollouts](https://img.shields.io/badge/Argo%20Rollouts-FFFFFF?style=for-the-badge&logo=argo&logoColor=E6007E)
![Flagger](https://img.shields.io/badge/Flagger-000000?style=for-the-badge&logo=flux&logoColor=white)
![Helm](https://img.shields.io/badge/Helm-0F1689?style=for-the-badge&logo=helm&logoColor=white)
![Kustomize & K8s](https://img.shields.io/badge/Kustomize_&_Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)
![Consul](https://img.shields.io/badge/Consul-CA2171?style=for-the-badge&logo=consul&logoColor=white)
![Nomad](https://img.shields.io/badge/Nomad-00BC7F?style=for-the-badge&logo=hashicorp&logoColor=white)
![HashiCorp](https://img.shields.io/badge/HashiCorp-4F5D95?style=for-the-badge&logo=hashicorp&logoColor=white)
![tRPC](https://img.shields.io/badge/tRPC-2596BE?style=for-the-badge&logo=trpc&logoColor=white)
![gRPC](https://img.shields.io/badge/gRPC-4285F4?style=for-the-badge&logo=grocy&logoColor=white)
![Protocol Buffers](https://img.shields.io/badge/Protocol%20Buffers-4285F4?style=for-the-badge&logo=proton&logoColor=white)

## Table of Contents

- [System Overview](#system-overview)
- [Repository Structure](#repository-structure)
- [API Protocols](#api-protocols)
  - [REST API (Primary)](#rest-api-primary)
  - [tRPC (TypeScript-first)](#trpc-typescript-first)
  - [gRPC (High-performance)](#grpc-high-performance)
- [Core Services Architecture](#core-services-architecture)
  - [Authentication Service](#authentication-service)
  - [Chat Service (AI Pipeline)](#chat-service-ai-pipeline)
  - [Property Service](#property-service)
  - [Graph Service (Neo4j)](#graph-service-neo4j)
- [Data Flow Architecture](#data-flow-architecture)
  - [Real-time Data Pipeline](#real-time-data-pipeline)
  - [RAG Pipeline](#rag-pipeline)
  - [Hybrid RAG (Vector + Graph)](#hybrid-rag-vector--graph)
- [AI/ML Architecture](#aiml-architecture)
  - [Mixture of Experts (MoE)](#mixture-of-experts-moe)
  - [Chain-of-Thought (CoT) Processing](#chain-of-thought-cot-processing)
- [Model Context Protocol (MCP) Architecture](#model-context-protocol-mcp-architecture)
- [Agentic AI Architecture](#agentic-ai-architecture)
  - [Multi-Runtime + Multi-Surface](#multi-runtime--multi-surface)
  - [Runtime Contracts](#runtime-contracts)
  - [HTTP + A2A Contract Surface](#http--a2a-contract-surface)
  - [Traceability and Observability](#traceability-and-observability)
- [Context Engineering Architecture](#context-engineering-architecture)
  - [System Overview](#context-engineering-system-overview)
  - [Knowledge Graph Engine](#knowledge-graph-engine)
  - [Knowledge Base & Retrieval](#knowledge-base--retrieval)
  - [Context Assembly Pipeline](#context-assembly-pipeline)
  - [Ingestion Pipeline](#ingestion-pipeline)
  - [MCP Tool Integration](#context-mcp-tool-integration)
  - [D3 Visualization Layer](#d3-visualization-layer)
  - [Agent Integration](#agent-integration)
- [Frontend Architecture](#frontend-architecture)
  - [Component Hierarchy](#component-hierarchy)
  - [State Management](#state-management)
- [Infrastructure \& Deployment](#infrastructure--deployment)
  - [Multi-Cloud Architecture](#multi-cloud-architecture)
  - [GitOps Control Plane Architecture](#gitops-control-plane-architecture)
  - [Controller Ownership Boundaries](#controller-ownership-boundaries)
  - [Progressive Delivery Control Loops](#progressive-delivery-control-loops)
  - [Operational Workflow Orchestration](#operational-workflow-orchestration)
  - [Advanced Deployment Strategies](#advanced-deployment-strategies)
  - [Deployment Control UI](#deployment-control-ui)
  - [Infrastructure as Code](#infrastructure-as-code)
  - [Production Kubernetes Architecture](#production-kubernetes-architecture)
- [Security Architecture](#security-architecture)
  - [Defense in Depth](#defense-in-depth)
  - [Secret Management](#secret-management)
- [Monitoring \& Observability](#monitoring--observability)
  - [Metrics Collection](#metrics-collection)
  - [Distributed Tracing](#distributed-tracing)
- [Performance Optimization](#performance-optimization)
  - [Caching Strategy](#caching-strategy)
  - [Load Balancing](#load-balancing)
- [Testing Strategy](#testing-strategy)
  - [Test Pyramid](#test-pyramid)
  - [CI/CD Pipeline](#cicd-pipeline)
- [Data Models](#data-models)
  - [Core Entities](#core-entities)
  - [Graph Schema (Neo4j)](#graph-schema-neo4j)
- [Environment Configuration](#environment-configuration)
  - [Environment Variables Matrix](#environment-variables-matrix)
- [Performance Targets \& SLOs](#performance-targets--slos)
  - [Service Level Objectives](#service-level-objectives)
  - [Scalability Targets](#scalability-targets)
- [Disaster Recovery](#disaster-recovery)
  - [Backup Strategy](#backup-strategy)
  - [Failover Process](#failover-process)
- [Development Workflow](#development-workflow)
  - [Git Flow](#git-flow)
  - [Code Review Process](#code-review-process)
- [Future Roadmap](#future-roadmap)
  - [Planned Enhancements](#planned-enhancements)
  - [Technical Debt](#technical-debt)
- [Appendix](#appendix)
  - [Glossary](#glossary)
  - [References](#references)

## System Overview

EstateWise is a full-stack, monorepo AI/ML chatbot and data analytics platform built for real estate in Chapel Hill, NC and surrounding areas. The architecture employs a microservices-oriented design with multiple API protocols, distributed data stores, sophisticated AI orchestration, and a web-grounding layer for freshness-sensitive AI responses.

```mermaid
flowchart TB
  subgraph "Client Layer"
    Web[Web Browser]
    Mobile[Mobile Apps]
    VSCode[VS Code Extension]
    CLI[CLI Tools]
    Services[External Services]
  end

  subgraph "API Gateway Layer"
    REST[REST API<br/>Express.js]
    TRPC[tRPC Server<br/>Type-safe RPC]
    GRPC[gRPC Server<br/>Binary Protocol]
  end

  subgraph "Business Logic Layer"
    Auth[Authentication Service]
    Chat[Chat Service<br/>MoE + RAG]
    Property[Property Service]
    Analytics[Analytics Service]
    Graph[Graph Service]
    Market[Market Pulse Service]
  end

  subgraph "AI/ML Layer"
    Gemini[Google Gemini API]
    MoE[Mixture of Experts]
    RAG[RAG Pipeline]
    Clustering[k-Means Clustering]
    Embeddings[Vector Embeddings]
  end

  subgraph "Data Layer"
    MongoDB[(MongoDB Atlas<br/>Users & Conversations)]
    Pinecone[(Pinecone<br/>Vector Index)]
    Neo4j[(Neo4j Aura<br/>Graph Database)]
    Redis[(Redis<br/>Cache & Sessions)]
  end

  subgraph "Tooling & Orchestration"
    MCP[MCP Server<br/>stdio tools]
    Agentic[Agentic AI<br/>3 runtimes]
    Monitoring[Prometheus<br/>Grafana]
  end

  Web --> REST
  Web --> TRPC
  Mobile --> REST
  Services --> GRPC
  CLI --> GRPC
  VSCode --> Web

  REST --> Auth
  TRPC --> Auth
  GRPC --> Auth

  Auth --> Chat
  Auth --> Property
  Auth --> Analytics
  Auth --> Graph
  Auth --> Market

  Chat --> MoE
  Chat --> RAG
  Property --> Embeddings
  Analytics --> Clustering

  MoE --> Gemini
  RAG --> Pinecone
  Property --> MongoDB
  Property --> Pinecone
  Graph --> Neo4j
  Auth --> Redis

  Agentic --> MCP
  MCP --> REST

  Monitoring --> REST
  Monitoring --> TRPC
  Monitoring --> GRPC

  style REST fill:#85EA2D,color:#000
  style TRPC fill:#2596BE,color:#fff
  style GRPC fill:#4285F4,color:#fff
```

## Repository Structure

```
EstateWise-Chapel-Hill-Chatbot/
├── backend/                   # Express + TypeScript API server
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── models/            # MongoDB schemas
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── middleware/        # Auth, logging, errors
│   │   ├── trpc/              # tRPC implementation
│   │   │   ├── routers/       # tRPC routers
│   │   │   └── trpc.ts        # Context & procedures
│   │   └── server.ts          # Main entry point
├── frontend/                  # Next.js + React application
│   ├── app/                   # Next.js 13+ app directory
│   ├── components/            # React components
│   ├── lib/                   # Utilities & API clients
│   └── public/                # Static assets
├── grpc/                      # gRPC service implementation
│   ├── proto/                 # Protocol buffer definitions
│   │   └── market_pulse.proto
│   ├── src/
│   │   ├── server.ts          # gRPC server
│   │   └── services/          # Service implementations
├── mcp/                       # Model Context Protocol server
│   ├── src/
│   │   ├── server.ts          # MCP stdio server
│   │   └── tools/             # Tool implementations
├── agentic-ai/                # Multi-agent orchestration
│   ├── src/
│   │   ├── agents/            # Agent implementations
│   │   ├── orchestrator/      # Default runtime
│   │   ├── lang/              # LangGraph runtime
│   │   └── index.ts           # CLI entry
│   └── crewai/                # Python CrewAI runtime
├── context-engineering/          # Context engineering subsystem
│   ├── src/
│   │   ├── graph/                # Knowledge graph engine
│   │   ├── knowledge-base/       # Document store & retrieval
│   │   ├── context/              # Context window & providers
│   │   ├── ingestion/            # Data ingestion parsers
│   │   ├── monitoring/           # Metrics collection
│   │   ├── mcp/                  # MCP tool definitions
│   │   ├── api/                  # Express REST router
│   │   ├── ui/public/            # D3 visualization dashboard
│   │   ├── factory.ts            # System wiring factory
│   │   └── serve.ts              # Standalone server
├── extension/                 # VS Code extension
├── terraform/                 # Infrastructure as Code
├── aws/                       # AWS deployment configs
├── azure/                     # Azure deployment configs
├── gcp/                       # GCP deployment configs
├── kubernetes/                # K8s manifests
└── hashicorp/                 # Consul/Nomad configs
```

## API Protocols

EstateWise implements three complementary API protocols to serve different use cases:

### REST API (Primary)
- **Protocol**: JSON over HTTP/1.1
- **Use Cases**: Public API, mobile apps, third-party integrations
- **Documentation**: OpenAPI/Swagger at `/api-docs`
- **Authentication**: JWT tokens in Authorization header
- **Key Graph Endpoints**:
  - `GET /api/graph/similar/:zpid`
  - `GET /api/graph/explain?from=<zpid>&to=<zpid>`
  - `GET /api/graph/neighborhood/:name`
  - `GET /api/graph/overview?limit=250` (sampled global graph payload for UI visualization)

### tRPC (TypeScript-first)
- **Protocol**: JSON over HTTP with type inference
- **Use Cases**: Web frontend, internal TypeScript services
- **Benefits**: End-to-end type safety, auto-completion, no code generation
- **Endpoint**: `/trpc/*`

### gRPC (High-performance)
- **Protocol**: Protocol Buffers over HTTP/2
- **Use Cases**: Service-to-service, streaming, cross-language clients
- **Port**: 50051
- **Services**: MarketPulseService with unary and streaming RPCs

## Core Services Architecture

EstateWise backend is composed of modular **microservices**, each responsible for a specific domain. Below are the key services and their internal architectures.

### Authentication Service

```mermaid
sequenceDiagram
  participant Client
  participant API
  participant Auth
  participant JWT
  participant MongoDB
  participant Redis

  Client->>API: POST /api/auth/login
  API->>Auth: Validate credentials
  Auth->>MongoDB: Check user
  MongoDB-->>Auth: User data
  Auth->>JWT: Generate token
  JWT-->>Auth: Signed token
  Auth->>Redis: Store session
  Auth-->>API: Token + user
  API-->>Client: Set-Cookie JWT
```

### Chat Service (AI Pipeline)

```mermaid
flowchart LR
  subgraph "Chat Processing"
    Input[User Message]
    Decision[Decision Agent]
    RAG{Use RAG?}
    Pinecone[Query Pinecone]
    MoE[Mixture of Experts]
    Experts[5 Specialized Experts]
    Merger[Response Merger]
    Output[Final Response]
    AutoName[Auto-Name Conversation]
  end

  Input --> Decision
  Decision --> RAG
  RAG -->|Yes| Pinecone
  RAG -->|No| MoE
  Pinecone --> MoE
  MoE --> Experts
  Experts --> Merger
  Merger --> Output
  Output -.->|First message only| AutoName
```

Expert models include:
- **Data Analyst**: Statistical analysis, trends
- **Lifestyle Concierge**: Neighborhood, amenities
- **Financial Advisor**: Mortgage, investment analysis
- **Neighborhood Expert**: Local insights, schools
- **Cluster Analyst**: Property grouping, similarities

**Auto-Generated Titles**: For authenticated users, the first message in a new conversation automatically triggers AI-powered title generation (3-6 words) via Gemini API, replacing "New Conversation" within seconds.

### Property Service

```mermaid
flowchart TD
  subgraph "Property Operations"
    Search[Search Request]
    Vector[Vector Embedding]
    KNN[k-NN Search]
    Filter[Apply Filters]
    Rank[Rank Results]
    Enrich[Enrich Data]
  end

  Search --> Vector
  Vector --> KNN
  KNN --> Filter
  Filter --> Rank
  Rank --> Enrich

  KNN -.-> Pinecone[(Pinecone)]
  Enrich -.-> MongoDB[(MongoDB)]
  Enrich -.-> Neo4j[(Neo4j)]
```

### Graph Service (Neo4j)

- Supports explainability and graph-native UI workflows:
  - Similar-property reasoning and path explanations.
  - Neighborhood aggregate summaries with sampled listings.
  - Sampled global overview payload (`/api/graph/overview`) for browser-safe visualization of large graphs.

```mermaid
graph LR
  subgraph "Graph Operations"
    Property[Property Node]
    Zip[Zip Node]
    Hood[Neighborhood Node]
    Similar[Similar Properties]
  end

  Property -->|IN_ZIP| Zip
  Property -->|IN_NEIGHBORHOOD| Hood
  Property -->|SIMILAR_TO| Similar

  class Property,Similar property
  class Zip,Hood location
```

## Data Flow Architecture

### Real-time Data Pipeline

```mermaid
flowchart LR
  subgraph "Ingestion"
    Source[Property Data]
    Clean[Clean & Validate]
    Transform[Transform]
    Embed[Generate Embeddings]
  end

  subgraph "Storage"
    Primary[(MongoDB)]
    Vector[(Pinecone)]
    Graph[(Neo4j)]
    Cache[(Redis)]
  end

  subgraph "Retrieval"
    Query[User Query]
    VectorSearch[Vector Search]
    GraphTraversal[Graph Traversal]
    Merge[Merge Results]
  end

  Source --> Clean
  Clean --> Transform
  Transform --> Embed

  Transform --> Primary
  Embed --> Vector
  Transform --> Graph

  Query --> VectorSearch
  Query --> GraphTraversal
  VectorSearch --> Merge
  GraphTraversal --> Merge

  Vector -.-> VectorSearch
  Graph -.-> GraphTraversal
  Primary -.-> Merge
  Cache -.-> Merge
```

### RAG Pipeline

```mermaid
flowchart TD
  Query[User Query] --> Embed[Embed Query]
  Embed --> Search[Vector Search]
  Search --> Pinecone[(Pinecone Index)]
  Pinecone --> TopK[Top-K Results]
  TopK --> Context[Build Context]
  TopK --> Graph[Graph Enrichment]
  Graph --> Neo4j[(Neo4j)]
  Neo4j --> Context
  Context --> Prompt[Augmented Prompt]
  Prompt --> LLM[Gemini API]
  LLM --> Response[Generated Response]
  Response --> Charts{Generate Charts?}
  Charts -->|Yes| Viz[Chart.js Visualization]
  Charts -->|No| Final[Final Output]
  Viz --> Final
```

### Hybrid RAG (Vector + Graph)

EstateWise runs a hybrid retrieval pipeline that blends semantic vector search with graph traversal so responses include both similar listings and explainable relationships.

```mermaid
flowchart LR
  Q[User Query] --> V[Pinecone Vector Search]
  V --> K[Top-K Results]
  K --> G[Neo4j Graph Enrichment]
  G --> M[Merge + Dedupe]
  M --> LLM[Augmented Prompt]
```

- Vector search (Pinecone) captures semantic intent from free-form prompts.
- Graph enrichment (Neo4j) adds structure like shared neighborhoods, ZIP codes, and similarity links.
- The merged context improves recall and enables natural-language explanations for why a property is recommended.

For detailed flows, query examples, and evaluation notes, see [RAG_SYSTEM.md](RAG_SYSTEM.md).

## AI/ML Architecture

### Mixture of Experts (MoE)

```mermaid
flowchart TB
  Query[User Query] --> Router[Master Router]
  Router --> Expert1[Data Analyst]
  Router --> Expert2[Lifestyle Concierge]
  Router --> Expert3[Financial Advisor]
  Router --> Expert4[Neighborhood Expert]
  Router --> Expert5[Cluster Analyst]

  Expert1 --> Weights[Weight Adjustment]
  Expert2 --> Weights
  Expert3 --> Weights
  Expert4 --> Weights
  Expert5 --> Weights

  Weights --> Merger[Response Merger]
  Merger --> Output[Synthesized Response]

  Output --> Feedback{User Feedback}
  Feedback -->|Thumbs Up| Store[Store Weights]
  Feedback -->|Thumbs Down| Adjust[Adjust Weights]
  Adjust --> Router
```

### Chain-of-Thought (CoT) Processing

Each expert uses CoT to break down complex queries:

```mermaid
flowchart LR
  Query[Complex Query] --> Parse[Parse Intent]
  Parse --> Steps[Identify Steps]
  Steps --> Execute[Execute Step 1]
  Execute --> Next[Execute Step 2]
  Next --> More[Execute Step N]
  More --> Combine[Combine Results]
  Combine --> Response[Final Response]
```

## Model Context Protocol (MCP) Architecture

The MCP server exposes tools via stdio to any MCP-compatible client:

```mermaid
flowchart TB
  subgraph "MCP Tools"
    Props[Properties Tools<br/>search, lookup, byIds]
    Graph[Graph Tools<br/>similar, explain, neighborhood]
    Analytics[Analytics Tools<br/>histogram, summarize, distributions]
    Web[Web Tools<br/>web.search, web.fetch]
    Finance[Finance Tools<br/>mortgage, affordability, schedule]
    Utils[Utility Tools<br/>extractZpids, parseGoal, summarize]
    Map[Map Tools<br/>linkForZpids, buildLinkByQuery]
    Context[Context Tools<br/>search, assemble, traverse, ingest]
  end

  Client[MCP Client] -->|stdio| Server[MCP Server]
  Server --> Props
  Server --> Graph
  Server --> Analytics
  Server --> Web
  Server --> Finance
  Server --> Utils
  Server --> Map
  Server --> Context

  Props --> API[Backend API]
  Graph --> API
  Analytics --> API
  Web --> API
  Context --> CEng[Context Engine API]
```

The MCP layer now includes internet research tools (`web.search`, `web.fetch`) so agentic runtimes can gather up-to-date external context when required.

The MCP server also exposes 7 **context engineering tools** (`context.search`, `context.graphOverview`, `context.findRelated`, `context.assembleContext`, `context.ingestDocument`, `context.getMetrics`, `context.nodeDetail`) that connect agents to the knowledge graph and knowledge base for structured domain context.

## Agentic AI Architecture

EstateWise agentic execution is delivered through one package (`agentic-ai/`) with three runtime modes and three client surfaces (CLI, HTTP, A2A).

### Multi-Runtime + Multi-Surface

```mermaid
flowchart TB
  subgraph "Client Surfaces"
    CLI[CLI]
    HTTP[HTTP /run + /run/stream]
    A2A[A2A JSON-RPC /a2a]
  end

  subgraph "Agentic Runtime Selector"
    Selector{runtime}
  end

  subgraph "Runtime Modes"
    ORCH[default orchestrator]
    LG[langgraph react agent]
    CREW[crewai python runner]
  end

  subgraph "Execution Backends"
    MCP[MCP stdio tool server]
    Pinecone[Pinecone vector search]
    Neo4j[Neo4j graph queries]
  end

  CLI --> Selector
  HTTP --> Selector
  A2A --> Selector

  Selector --> ORCH
  Selector --> LG
  Selector --> CREW

  ORCH --> MCP
  LG --> MCP
  LG --> Pinecone
  LG --> Neo4j
  CREW --> MCP
```

### Runtime Contracts

| Runtime | Primary execution model | Typical use |
|---------|--------------------------|-------------|
| `default` | round-based planner/coordinator + specialists | deterministic multi-step analysis |
| `langgraph` | tool-calling ReAct agent with checkpointer | adaptive research with deeper tool autonomy |
| `crewai` | Python crew pipeline via Node bridge | CrewAI-native task orchestration |

### HTTP + A2A Contract Surface

- `POST /run` accepts `goal`, `runtime`, `rounds`, `threadId`, and optional `requestId`.
- `GET /run/stream` supports SSE streaming with `runtime`, `rounds`, `threadId`, and optional `requestId`.
- `GET /config` returns runtime support, MCP required-tool mode, and LangSmith tracing status.
- `POST /a2a` supports JSON-RPC methods: `agent.getCard`, `tasks.create/get/list/wait/cancel` (with optional `requestId` on task creation).
- `GET /a2a/tasks/{taskId}/events` streams task lifecycle events via SSE.

### Traceability and Observability

- LangGraph responses include normalized `toolExecutions` with status, duration, and output/error.
- Cost tracking aggregates token/cost usage per run for LangGraph and CrewAI responses.
- Optional LangSmith tracing enriches runs with runtime/surface/component/request metadata and thread correlation.
- HTTP `requestId` (or `x-request-id`) is propagated to LangGraph trace metadata for cross-system correlation.

## Context Engineering Architecture

The context engineering subsystem (`context-engineering/`) provides AI agents with structured domain knowledge through five interconnected pillars.

### Context Engineering System Overview

```mermaid
flowchart TB
  subgraph "Data Sources"
    PROP[Property Data]
    CONV[Conversations]
    DOCS[Documents]
    TOOLS[Tool Results]
  end

  subgraph "Ingestion Layer"
    PP[Property Parser]
    CP[Conversation Parser]
    DP[Document Parser]
  end

  subgraph "Storage Layer"
    KG[Knowledge Graph<br/>In-memory + Neo4j sync<br/>42 seed nodes, 55 edges]
    KB[Knowledge Base<br/>TF-IDF embeddings<br/>10 seed documents]
  end

  subgraph "Context Assembly"
    GP[Graph Provider]
    DOP[Document Provider]
    COP[Conversation Provider]
    TRP[Tool Result Provider]
    RANK[Ranker<br/>recency + relevance + importance]
    WIN[Context Window<br/>priority-based token allocation]
  end

  subgraph "Delivery"
    MCP_T[MCP Tools ×10]
    REST[REST API ×14 endpoints]
    WS_T[WebSocket events]
    D3[D3 Visualization UI]
  end

  PROP --> PP --> KG & KB
  CONV --> CP --> KG & KB
  DOCS --> DP --> KG & KB
  TOOLS --> TRP

  KG --> GP
  KB --> DOP

  GP & DOP & COP & TRP --> RANK --> WIN

  WIN --> MCP_T
  KG & KB --> REST --> D3
  KG --> WS_T --> D3
```

### Knowledge Graph Engine

The knowledge graph is an event-driven, in-memory graph with typed nodes and edges, optional Neo4j persistence, and comprehensive traversal algorithms.

```mermaid
graph TD
  subgraph "12 Node Types"
    Property
    Concept
    Entity
    Topic
    Document
    Conversation
    Agent
    Tool
    Workflow
    Neighborhood
    ZipCode
    MarketSegment
  end

  subgraph "Key Relationships"
    Property -- SIMILAR_TO --> Property
    Property -- IN_NEIGHBORHOOD --> Neighborhood
    Property -- IN_ZIP --> ZipCode
    Agent -- USES --> Tool
    Agent -- HAS_CAPABILITY --> Concept
    Tool -- PRODUCES --> Concept
    Concept -- RELATED_TO --> Topic
    Workflow -- DEPENDS_ON --> Tool
    Document -- MENTIONS --> Entity
  end
```

**Graph Algorithms:**

| Algorithm | Purpose | Complexity |
|-----------|---------|------------|
| BFS | Breadth-first traversal | O(V + E) |
| DFS | Depth-first traversal | O(V + E) |
| Dijkstra | Shortest weighted path | O((V + E) log V) |
| All Paths | Enumerate paths up to depth | O(V!) worst case |
| PageRank | Node importance scoring | O(iterations x E) |
| Community Detection | Label propagation clustering | O(iterations x E) |
| Connected Components | Component discovery | O(V + E) |
| Betweenness Centrality | Bridge node identification | O(V x E) |

**Query Builder:**
The fluent query builder supports filter operators (`$gt`, `$lt`, `$gte`, `$lte`, `$eq`, `$ne`, `$contains`, `$in`), dot-path property access, traversal expansion, ordering, and pagination.

### Knowledge Base & Retrieval

| Strategy | Method | Use Case |
|----------|--------|----------|
| Semantic | Cosine similarity on TF-IDF embeddings | Conceptual matches |
| Keyword | Token frequency scoring | Exact term matches |
| Hybrid | Weighted blend (65% semantic, 35% keyword) | Best general-purpose |

The knowledge base auto-chunks documents (~500 tokens with 50-token overlap), generates 128-dimensional TF-IDF embeddings without external APIs, and supports pluggable external embedding functions (e.g., OpenAI).

### Context Assembly Pipeline

```mermaid
sequenceDiagram
  participant Agent as AI Agent
  participant Engine as Context Engine
  participant GP as Graph Provider
  participant DP as Document Provider
  participant CP as Conversation Provider
  participant TP as Tool Result Provider
  participant Ranker
  participant Window as Token Window

  Agent->>Engine: assembleContext(query, agentRole)
  par Parallel Provider Calls
    Engine->>GP: getContext(request)
    Engine->>DP: getContext(request)
    Engine->>CP: getContext(request)
    Engine->>TP: getContext(request)
  end
  GP-->>Engine: graph items
  DP-->>Engine: document items
  CP-->>Engine: conversation items
  TP-->>Engine: tool result items
  Engine->>Ranker: rank(allItems, query, "combined")
  Ranker-->>Engine: scored & sorted items
  Engine->>Window: allocate(rankedItems)
  Window-->>Engine: fitted items within budget
  Engine-->>Agent: AssembledContext
```

**Per-Agent Token Budgets:**

| Agent Role | Max Tokens | Rationale |
|------------|------------|-----------|
| GraphAnalyst | 6,000 | Focused graph queries |
| PropertyAnalyst | 10,000 | Detailed property context |
| FinanceAnalyst | 8,000 | Financial calculations |
| Orchestrator/Coordinator | 12,000 | Broad overview needed |
| Default | 8,000 | Balanced general use |

### Ingestion Pipeline

```mermaid
flowchart LR
  subgraph "Sources"
    S1[Property JSON]
    S2[Conversation Array]
    S3[Raw Document]
  end

  subgraph "Parsers"
    P1[PropertyParser<br/>→ Property, Neighborhood,<br/>ZipCode nodes + edges]
    P2[ConversationParser<br/>→ Conversation nodes<br/>+ mention edges]
    P3[DocumentParser<br/>→ Document, Concept<br/>nodes + edges]
  end

  subgraph "Targets"
    KG[Knowledge Graph]
    KB[Knowledge Base]
  end

  S1 --> P1
  S2 --> P2
  S3 --> P3
  P1 --> KG & KB
  P2 --> KG & KB
  P3 --> KG & KB
```

### Context MCP Tool Integration

| Tool | Description |
|------|-------------|
| `context.search` | Hybrid search across knowledge base |
| `context.assembleForAgent` | Full context window assembly for an agent |
| `context.graphTraverse` | BFS traversal from a starting node |
| `context.graphQuery` | Filter and query graph nodes |
| `context.ingest` | Ingest new data into the knowledge system |
| `context.getStats` | System metrics and statistics |
| `context.getGraphOverview` | Full graph data for visualization |
| `context.findRelated` | Find nodes related to a concept |
| `context.getNodeDetail` | Detailed node information with neighbors |
| `context.getTimeline` | Recent activity timeline |

### D3 Visualization Layer

The context engineering system includes a standalone D3.js visualization dashboard served on port 4200:

- **Force-directed graph** with D3 v7 simulation, 12 color-coded node types, importance-based sizing
- **Interactive controls**: zoom/pan (0.1x-5x), drag, click-to-select, double-click to center
- **Node detail panel** with properties, tags, and clickable neighbor chips
- **Knowledge base search** with scored result cards
- **Real-time metrics** including context assemblies, cache hit rate, ingestion counts
- **WebSocket** integration for live graph mutation events

### Agent Integration

```mermaid
flowchart TB
  subgraph "Agentic AI Orchestrator"
    PLAN[PlannerAgent]
    COORD[CoordinatorAgent]
    CTX[ContextEngineerAgent<br/>NEW]
    ZPID[ZpidFinderAgent]
    PROP[PropertyAnalystAgent]
    GRAPH_A[GraphAnalystAgent]
    FIN[FinanceAnalystAgent]
    REP[ReporterAgent]
  end

  subgraph "Context Engineering"
    CE[Context Engine]
    KG_A[Knowledge Graph]
    KB_A[Knowledge Base]
  end

  subgraph "Blackboard"
    BB[contextData.latest<br/>contextData.related<br/>contextData.graphOverview]
  end

  CTX -->|context.assembleContext| CE
  CTX -->|context.search| KB_A
  CTX -->|context.graphOverview| KG_A
  CE --> BB
  BB --> ZPID & PROP & GRAPH_A & FIN & REP
```

The `ContextEngineerAgent` runs early in the orchestrator loop (after Planner and Coordinator) to:
1. Analyze the current goal and conversation history
2. Assemble relevant context from the knowledge graph and knowledge base
3. Populate `blackboard.contextData` for downstream specialist agents
4. Skip re-assembly when context is already populated

## Frontend Architecture

### Component Hierarchy

```mermaid
graph TD
  App[App Root]
  App --> Layout[Layout]
  Layout --> Nav[Navigation]
  Layout --> Router[Router]

  Router --> Landing[Landing Page]
  Router --> Chat[Chat Page]
  Router --> Insights[Insights Page]
  Router --> Map[Map Page]
  Router --> Viz[Visualizations]
  Router --> Market[Market Insights]

  Chat --> ChatUI[Chat Interface]
  ChatUI --> Messages[Message List]
  ChatUI --> Input[Input Form]
  ChatUI --> Expert[Expert Views]

  Insights --> Tools[Graph Tools]
  Insights --> Calc[Calculators]
  Insights --> ZPID[ZPID Finder]
  Insights --> GlobalGraph[Global Graph View]

  Map --> Leaflet[Leaflet Map]
  Map --> Markers[Property Markers]
  Map --> Controls[Map Controls]
  Map --> ResultsPanel[Results Panel<br/>Snapshot + Top Matches]
  ResultsPanel --> FocusMap[Focus Marker Actions]
```

### State Management

```mermaid
flowchart LR
  subgraph "Client State"
    Local[Local Storage]
    Session[Session Storage]
    React[React State]
    Query[React Query Cache]
  end

  subgraph "Server State"
    API[API Responses]
    SSR[SSR Props]
    Stream[Streaming Updates]
  end

  API --> Query
  Query --> React
  React --> Local
  SSR --> React
  Stream --> React
```

## Infrastructure & Deployment

> [!NOTE]
> **Production-Ready Infrastructure**: EstateWise features enterprise-grade DevOps with advanced deployment strategies, comprehensive monitoring, and multi-cloud support. See [DEVOPS.md](DEVOPS.md) for complete operational documentation.

### Multi-Cloud Architecture

```mermaid
flowchart TB
  subgraph "Source Control"
    GitHub[GitHub Repository]
  end

  subgraph "CI/CD Pipeline"
    Actions[GitHub Actions]
    Travis[Travis CI]
    Jenkins[Jenkins<br/>Primary CI/CD]

    subgraph "Jenkins Stages"
      Security[Security Scanning<br/>5 layers]
      Coverage[Code Coverage]
      Build[Docker Build]
      BGDeploy[Blue-Green Deploy]
      Canary[Canary Deploy]
    end
  end

  subgraph "Container Registry"
    GHCR[GitHub Container Registry]
    ECR[AWS ECR]
    ACR[Azure ACR]
    GAR[Google Artifact Registry]
    OCIR[OCI Container Registry]
  end

  subgraph "Compute Platforms"
    subgraph "AWS"
      ECS[ECS Fargate]
      ALB[Application Load Balancer]
    end

    subgraph "Azure"
      ACA[Container Apps]
      AGW[App Gateway]
    end

    subgraph "GCP"
      CloudRun[Cloud Run]
      GLB[Global Load Balancer]
    end

    subgraph "OCI"
      OCICompute[Compute Instance]
      OCILB[OCI Load Balancer]
    end

    subgraph "Kubernetes"
      K8s[K8s Cluster<br/>EKS/AKS/GKE]
      HPA[Horizontal Pod<br/>Autoscaler]
      PDB[Pod Disruption<br/>Budget]
    end

    subgraph "Edge"
      Vercel[Vercel Platform]
    end
  end

  subgraph "Service Mesh"
    Consul[Consul Mesh]
    Nomad[Nomad Jobs]
  end

  GitHub --> Jenkins
  Jenkins --> Security
  Security --> Coverage
  Coverage --> Build
  Build --> BGDeploy
  Build --> Canary

  Jenkins --> GHCR
  Jenkins --> ECR
  Jenkins --> ACR
  Jenkins --> GAR
  Jenkins --> OCIR

  GHCR --> ECS
  ECR --> ECS
  ACR --> ACA
  GAR --> CloudRun
  OCIR --> OCICompute
  GHCR --> K8s

  BGDeploy --> K8s
  Canary --> K8s

  K8s --> HPA
  K8s --> PDB
  K8s --> Consul
  K8s --> Nomad

  Jenkins --> Vercel

  style Jenkins fill:#D24939,color:#fff
  style BGDeploy fill:#00D084,color:#000
  style Canary fill:#FF6B6B,color:#fff
```

### GitOps Control Plane Architecture

EstateWise uses a dual-controller GitOps architecture with explicit scope boundaries:

- **Argo CD** reconciles core platform applications and Argo-native controllers.
- **Flux CD** reconciles Flagger controller lifecycle and isolated canary workloads.
- **Canonical GitOps repository**:
  - `https://github.com/hoangsonww/EstateWise-Chapel-Hill-Chatbot.git`

```mermaid
flowchart TB
  Repo[GitHub Repo<br/>EstateWise-Chapel-Hill-Chatbot]

  subgraph ArgoCD["Argo CD (argocd namespace)"]
    Root[estatewise-platform-root]
    CoreApp[estatewise-core app]
    RolloutsCtlApp[argo-rollouts controller app]
    RolloutsGovApp[argo-rollouts governance app]
    WorkflowsCtlApp[argo-workflows controller app]
    WorkflowDefsApp[workflow definitions app]
  end

  subgraph Flux["Flux CD (flux-system namespace)"]
    FluxSrc[GitRepository source]
    FluxControllers[estatewise-flux-controllers]
    FluxFlagger[estatewise-flux-flagger]
    FlaggerHelm[flagger HelmRelease]
  end

  subgraph Namespaces["Managed Runtime Namespaces"]
    EstatewiseNs[estatewise]
    RolloutsNs[argo-rollouts]
    WorkflowsNs[argo-workflows]
    DeliveryNs[estatewise-delivery]
    FlaggerNs[flagger-system]
  end

  Repo --> Root
  Root --> CoreApp --> EstatewiseNs
  Root --> RolloutsCtlApp --> RolloutsNs
  Root --> RolloutsGovApp --> RolloutsNs
  Root --> WorkflowsCtlApp --> WorkflowsNs
  Root --> WorkflowDefsApp --> WorkflowsNs

  Repo --> FluxSrc --> FluxControllers --> FlaggerHelm --> FlaggerNs
  FluxSrc --> FluxFlagger --> DeliveryNs
```

### Controller Ownership Boundaries

The control plane is intentionally split to prevent reconciliation contention:

- **Argo CD ownership**
  - `kubernetes/overlays/prod-gitops`
  - `kubernetes/progressive-delivery/argo-rollouts/platform`
  - `kubernetes/workflows/argo-workflows`
- **Flux ownership**
  - `kubernetes/gitops/flux/controllers`
  - `kubernetes/progressive-delivery/flagger`

This model avoids drift loops between Argo CD and Flux and keeps production vs sandbox delivery concerns separated.

### Progressive Delivery Control Loops

EstateWise runs two complementary progressive delivery loops:

1. **Argo Rollouts** for core `estatewise-backend` and `estatewise-frontend` in `estatewise`.
2. **Flagger** for isolated canary validation in `estatewise-delivery`.

```mermaid
flowchart LR
  subgraph Core["Core Production (estatewise)"]
    BR[Rollout: estatewise-backend]
    FR[Rollout: estatewise-frontend]
    BAT[AnalysisTemplates: backend]
    FAT[AnalysisTemplates: frontend]
    BHPA[HPA -> backend rollout]
    FHPA[HPA -> frontend rollout]
  end

  subgraph Sandbox["Canary Sandbox (estatewise-delivery)"]
    FC[Flagger Canary: estatewise-frontend-preview]
    FD[Deployment: estatewise-frontend-preview]
    FM[MetricTemplate]
    FL[flagger-loadtester]
  end

  BR --> BAT
  FR --> FAT
  BHPA --> BR
  FHPA --> FR

  FC --> FD
  FC --> FM
  FC --> FL
```

### Operational Workflow Orchestration

Argo Workflows provides operational gates and scheduled validation:

- `WorkflowTemplate`: `estatewise-progressive-delivery-pipeline`
- `WorkflowTemplate`: `estatewise-ops-toolkit`
- `CronWorkflow`: `estatewise-nightly-smoke`

```mermaid
sequenceDiagram
  participant Cron as CronWorkflow
  participant Wf as WorkflowTemplate
  participant R as Rollouts API
  participant S as estatewise services

  Cron->>Wf: Start nightly smoke run
  Wf->>S: Execute pre-deploy smoke checks
  Wf->>R: Wait for backend Healthy
  Wf->>R: Wait for frontend Healthy
  Wf->>S: Execute post-deploy smoke checks
  Wf-->>Cron: Report success/failure
```

### Advanced Deployment Strategies

EstateWise supports three zero-downtime deployment strategies:

```mermaid
flowchart LR
  subgraph "Blue-Green Deployment"
    direction TB
    Blue[Blue Environment<br/>v1.0.0 - Active]
    Green[Green Environment<br/>v1.1.0 - Standby]
    Switch[Instant Traffic<br/>Switch]

    Blue --> Switch
    Green --> Switch
  end

  subgraph "Canary Deployment"
    direction TB
    Stable[Stable: 90%<br/>v1.0.0]
    Canary1[Canary: 10%<br/>v1.1.0]
    Canary2[Canary: 25%]
    Canary3[Canary: 50%]
    Final[Promoted: 100%]

    Stable --> Canary1
    Canary1 --> Canary2
    Canary2 --> Canary3
    Canary3 --> Final
  end

  subgraph "Rolling Update"
    direction TB
    Pod1[Pod 1: v1.0.0]
    Pod2[Pod 2: v1.0.0]
    Pod3[Pod 1: v1.1.0]
    Pod4[Pod 2: v1.1.0]

    Pod1 --> Pod3
    Pod2 --> Pod4
  end

  style Blue fill:#4A90E2,color:#fff
  style Green fill:#7ED321,color:#000
  style Canary1 fill:#FF6B6B,color:#fff
  style Canary2 fill:#FF6B6B,color:#fff
  style Canary3 fill:#FF6B6B,color:#fff
```

**Deployment Strategy Comparison:**

| Strategy | Rollback Speed | Resource Usage | Risk Level | Best For |
|----------|---------------|----------------|------------|----------|
| **Blue-Green** | Instant (< 1s) | 2x during switch | Low | Major releases |
| **Canary** | Gradual | 1.1-1.5x | Very Low | New features |
| **Rolling** | Re-deploy | 1x | Moderate | Regular updates |

### Deployment Control UI

The `deployment-control/` directory contains a full-featured dashboard for managing deployments across all supported targets and strategies.

- **Web UI** – Vue 3 + Nuxt 3 frontend with Pinia state management.
- **API Server** – Express + TypeScript backend handling deployment requests and job tracking.
- **Features**:
  - Real-time deployment status and logs
  - Blue-Green and Canary deployment workflows
  - Cluster snapshot and health metrics
  - User notifications and alerts
  - TypeScript type safety and accessibility support
  - Hot Module Replacement for rapid development
  - Extensible architecture for future enhancements

To get started, see [deployment-control/README.md](deployment-control/README.md).

<p align="center">
  <img src="deployment-control/docs/ui.png" alt="Deployment Control Dashboard Screenshot" width="100%"/>
</p>

### Infrastructure as Code

```mermaid
graph LR
  subgraph "IaC Tools"
    TF[Terraform]
    CF[CloudFormation]
    Bicep[Azure Bicep]
    DM[Deployment Manager]
    Helm[Helm Charts]
    Kustomize[Kustomize]
  end

  subgraph "Production Resources"
    VPC[Networks & VPC]
    IAM[RBAC & IAM]
    Compute[Compute Resources]
    Storage[Storage & Backups]
    DNS[DNS & CDN]
    Secrets[Secrets Management]
    Monitor[Monitoring Stack]
    Security[Security Policies]
  end

  TF --> VPC
  TF --> IAM
  CF --> Compute
  Bicep --> Storage
  DM --> DNS
  Helm --> Secrets
  Kustomize --> Monitor
  Kustomize --> Security
```

Helm charts live in `helm/estatewise/` and mirror the Kubernetes base manifests with values tuned for CI/CD pipelines and cloud-specific annotations (EKS/AKS/GKE/OCI). Kustomize overlays remain available in `kubernetes/` for environment-specific patching.

### Production Kubernetes Architecture

```mermaid
flowchart TB
  subgraph "Ingress Layer"
    Ingress[NGINX Ingress<br/>TLS Termination]
  end

  subgraph "Application Layer"
    subgraph "Backend Deployment"
      BBlue[Backend Blue<br/>2 replicas]
      BGreen[Backend Green<br/>2 replicas]
      BCanary[Backend Canary<br/>1 replica]
    end

    subgraph "Frontend Deployment"
      FBlue[Frontend Blue<br/>2 replicas]
      FGreen[Frontend Green<br/>2 replicas]
      FCanary[Frontend Canary<br/>1 replica]
    end
  end

  subgraph "Platform Services"
    HPA[Horizontal Pod<br/>Autoscaler]
    PDB[Pod Disruption<br/>Budget]
    NetPol[Network<br/>Policies]
    RBAC[RBAC]
  end

  subgraph "Monitoring Stack"
    Prometheus[Prometheus<br/>Metrics]
    Grafana[Grafana<br/>Dashboards]
    AlertMgr[AlertManager<br/>16 rules]
  end

  subgraph "Operations"
    Backup[MongoDB Backup<br/>CronJob]
    Migration[DB Migration<br/>Job]
    Chaos[Chaos Tests]
  end

  Ingress --> BBlue
  Ingress --> BGreen
  Ingress --> BCanary
  Ingress --> FBlue
  Ingress --> FGreen
  Ingress --> FCanary

  HPA --> BBlue
  HPA --> FBlue
  PDB --> BBlue
  PDB --> FBlue
  NetPol --> BBlue
  NetPol --> FBlue
  RBAC --> BBlue

  Prometheus --> BBlue
  Prometheus --> FBlue
  Grafana --> Prometheus
  AlertMgr --> Prometheus

  style HPA fill:#326CE5,color:#fff
  style PDB fill:#326CE5,color:#fff
  style Prometheus fill:#E6512D,color:#fff
  style Grafana fill:#F46800,color:#fff
```

## Security Architecture

### Defense in Depth

```mermaid
flowchart TB
  subgraph "Network Layer"
    WAF[Web Application Firewall]
    DDoS[DDoS Protection]
    TLS[TLS 1.3]
  end

  subgraph "Application Layer"
    CORS[CORS Policy]
    CSP[Content Security Policy]
    RateLimit[Rate Limiting]
    InputVal[Input Validation]
  end

  subgraph "Authentication Layer"
    JWT[JWT Tokens]
    MFA[Multi-Factor Auth]
    OAuth[OAuth 2.0]
    Sessions[Session Management]
  end

  subgraph "Data Layer"
    Encryption[Encryption at Rest]
    Transit[Encryption in Transit]
    Backup[Backup & Recovery]
    Audit[Audit Logging]
  end

  WAF --> CORS
  DDoS --> RateLimit
  TLS --> InputVal

  CORS --> JWT
  RateLimit --> MFA
  InputVal --> OAuth

  JWT --> Encryption
  Sessions --> Transit
  OAuth --> Backup
  MFA --> Audit
```

### Secret Management

```mermaid
flowchart LR
  subgraph "Development"
    ENV[.env files]
    Git[.gitignore]
  end

  subgraph "CI/CD"
    GHSecrets[GitHub Secrets]
    EnvVars[Environment Variables]
  end

  subgraph "Production"
    Vault[HashiCorp Vault]
    AWS_SM[AWS Secrets Manager]
    Azure_KV[Azure Key Vault]
    GCP_SM[GCP Secret Manager]
  end

  ENV --> GHSecrets
  GHSecrets --> Vault
  GHSecrets --> AWS_SM
  GHSecrets --> Azure_KV
  GHSecrets --> GCP_SM
```

## Monitoring & Observability

### Metrics Collection

```mermaid
flowchart LR
  subgraph "Application Metrics"
    Express[Express Middleware]
    Custom[Custom Metrics]
    Business[Business KPIs]
  end

  subgraph "System Metrics"
    CPU[CPU Usage]
    Memory[Memory Usage]
    Disk[Disk I/O]
    Network[Network I/O]
  end

  subgraph "Collectors"
    Prometheus[Prometheus]
    CloudWatch[CloudWatch]
    AppInsights[Application Insights]
  end

  subgraph "Visualization"
    Grafana[Grafana]
    Dashboards[Custom Dashboards]
    Alerts[Alert Manager]
  end

  Express --> Prometheus
  Custom --> Prometheus
  Business --> Prometheus

  CPU --> CloudWatch
  Memory --> CloudWatch
  Disk --> AppInsights
  Network --> AppInsights

  Prometheus --> Grafana
  CloudWatch --> Dashboards
  AppInsights --> Alerts
```

### Distributed Tracing

```mermaid
sequenceDiagram
  participant Client
  participant API
  participant Auth
  participant Property
  participant Pinecone
  participant MongoDB

  Client->>API: Request [trace-id: abc123]
  API->>Auth: Validate [parent: abc123]
  Auth->>MongoDB: Query User [parent: abc123]
  MongoDB-->>Auth: User Data
  Auth-->>API: Authorized
  API->>Property: Search [parent: abc123]
  Property->>Pinecone: Vector Query [parent: abc123]
  Pinecone-->>Property: Results
  Property-->>API: Properties
  API-->>Client: Response [trace-id: abc123]
```

## Performance Optimization

### Caching Strategy

```mermaid
flowchart TB
  subgraph "Cache Layers"
    Browser[Browser Cache]
    CDN[CDN Cache]
    Redis[Redis Cache]
    App[Application Cache]
    DB[Database Cache]
  end

  subgraph "Cache Policies"
    TTL[TTL Settings]
    Invalidation[Cache Invalidation]
    Warming[Cache Warming]
  end

  Browser --> CDN
  CDN --> Redis
  Redis --> App
  App --> DB

  TTL --> Browser
  TTL --> CDN
  TTL --> Redis

  Invalidation --> Redis
  Invalidation --> App

  Warming --> Redis
  Warming --> DB
```

### Load Balancing

```mermaid
flowchart LR
  subgraph "Load Distribution"
    Client[Clients]
    LB[Load Balancer]

    subgraph "Backend Instances"
      API1[API Server 1]
      API2[API Server 2]
      API3[API Server 3]
    end

    subgraph "gRPC Services"
      GRPC1[gRPC Server 1]
      GRPC2[gRPC Server 2]
    end
  end

  Client --> LB
  LB -->|Round Robin| API1
  LB -->|Health Check| API2
  LB -->|Least Connections| API3

  API1 --> GRPC1
  API2 --> GRPC2
  API3 --> GRPC1
```

## Testing Strategy

### Test Pyramid

```mermaid
graph TD
  subgraph "Test Types"
    E2E[E2E Tests<br/>Cypress, Selenium]
    Integration[Integration Tests<br/>API, Database]
    Unit[Unit Tests<br/>Jest, Vitest]
    Static[Static Analysis<br/>ESLint, TypeScript]
  end

  subgraph "Coverage"
    UI[UI: 70%]
    API[API: 85%]
    Business[Business Logic: 90%]
    Utils[Utilities: 95%]
  end

  E2E --> UI
  Integration --> API
  Unit --> Business
  Static --> Utils
```

### CI/CD Pipeline

```mermaid
flowchart LR
  subgraph "Pipeline Stages"
    Trigger[Git Push]
    Lint[Lint & Format]
    Types[Type Check]
    Test[Run Tests]
    Build[Build Images]
    Scan[Security Scan]
    Deploy[Deploy]
    Verify[Smoke Tests]
  end

  Trigger --> Lint
  Lint --> Types
  Types --> Test
  Test --> Build
  Build --> Scan
  Scan --> Deploy
  Deploy --> Verify
```

## Data Models

### Core Entities

```mermaid
erDiagram
  USER ||--o{ CONVERSATION : "owns"
  USER ||--o{ SAVED_PROPERTY : "saves"
  CONVERSATION ||--o{ MESSAGE : "contains"
  MESSAGE ||--o{ RATING : "has"
  PROPERTY ||--o{ LISTING : "has"
  PROPERTY }o--|| ZIP : "in"
  PROPERTY }o--|| NEIGHBORHOOD : "in"
  PROPERTY ||--o{ PROPERTY : "similar_to"

  USER {
    string id PK
    string email UK
    string password_hash
    string name
    datetime created_at
    datetime updated_at
  }

  CONVERSATION {
    string id PK
    string user_id FK
    string title
    datetime created_at
    datetime updated_at
  }

  MESSAGE {
    string id PK
    string conversation_id FK
    string role
    string content
    json metadata
    datetime created_at
  }

  PROPERTY {
    string zpid PK
    float price
    int bedrooms
    int bathrooms
    float living_area
    int year_built
    string address
    float latitude
    float longitude
    json features
  }

  ZIP {
    string code PK
    string city
    string state
    json demographics
  }

  NEIGHBORHOOD {
    string id PK
    string name
    json stats
    json amenities
  }
```

### Graph Schema (Neo4j)

```cypher
// Node types
(:Property {zpid, address, city, state, zipcode, price, bedrooms, bathrooms})
(:Zip {code})
(:Neighborhood {name})

// Relationships
(:Property)-[:IN_ZIP]->(:Zip)
(:Property)-[:IN_NEIGHBORHOOD]->(:Neighborhood)
(:Property)-[:SIMILAR_TO {score}]->(:Property)
```

## Environment Configuration

### Environment Variables Matrix

| Service | Required Variables | Optional Variables |
|---------|-------------------|-------------------|
| **Backend** | `MONGO_URI`<br>`JWT_SECRET`<br>`PINECONE_API_KEY`<br>`PINECONE_INDEX`<br>`GOOGLE_AI_API_KEY` | `NEO4J_URI`<br>`NEO4J_USERNAME`<br>`NEO4J_PASSWORD`<br>`REDIS_URL`<br>`SENTRY_DSN` |
| **Frontend** | `NEXT_PUBLIC_API_BASE_URL` | `NEXT_PUBLIC_GOOGLE_ANALYTICS`<br>`NEXT_PUBLIC_SENTRY_DSN` |
| **gRPC** | `GRPC_SERVER_PORT`<br>`GRPC_SERVER_HOST` | `GRPC_USE_TLS`<br>`GRPC_CERT_PATH`<br>`GRPC_KEY_PATH` |
| **MCP** | `API_BASE_URL` | `FRONTEND_BASE_URL`<br>`LOG_LEVEL` |
| **Agentic** | `GOOGLE_AI_API_KEY` or `OPENAI_API_KEY` | `AGENT_RUNTIME`<br>`THREAD_ID`<br>`LANGSMITH_ENABLED`<br>`LANGSMITH_API_KEY`<br>`LANGSMITH_PROJECT`<br>`LANGSMITH_ENDPOINT`<br>`LANGSMITH_RUN_TAGS`<br>`LANGSMITH_STRICT` |

## Performance Targets & SLOs

### Service Level Objectives

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **API Latency (P50)** | < 200ms | < 500ms |
| **API Latency (P95)** | < 800ms | < 2000ms |
| **API Latency (P99)** | < 1500ms | < 5000ms |
| **Availability** | 99.9% | 99.5% |
| **Error Rate** | < 0.1% | < 1% |
| **Chat Response Time** | < 3s | < 10s |
| **Map Load Time** | < 2s | < 5s |
| **Graph Query Time** | < 1.5s | < 3s |
| **Vector Search Time** | < 500ms | < 1500ms |

### Scalability Targets

- **Concurrent Users**: 10,000+
- **Requests per Second**: 1,000+
- **Database Connections**: 100 pooled
- **Message Queue Throughput**: 10,000 msg/s
- **Vector Index Size**: 1M+ embeddings
- **Graph Nodes**: 100K+ properties

## Disaster Recovery

### Backup Strategy

```mermaid
flowchart TB
  subgraph "Backup Types"
    Continuous[Continuous Replication]
    Daily[Daily Snapshots]
    Weekly[Weekly Archives]
    Monthly[Monthly Archives]
  end

  subgraph "Storage Locations"
    Primary[Primary Region]
    Secondary[Secondary Region]
    Cold[Cold Storage]
  end

  subgraph "Recovery"
    RTO[RTO: 4 hours]
    RPO[RPO: 1 hour]
    Test[Monthly DR Tests]
  end

  Continuous --> Primary
  Daily --> Primary
  Weekly --> Secondary
  Monthly --> Cold

  Primary --> RTO
  Secondary --> RPO
  Cold --> Test
```

### Failover Process

1. **Detection**: Health checks detect primary failure
2. **Validation**: Confirm failure isn't transient
3. **DNS Update**: Update DNS to point to secondary
4. **Cache Warm**: Warm caches in secondary region
5. **Verification**: Run smoke tests
6. **Communication**: Notify stakeholders

## Development Workflow

### Git Flow

```mermaid
gitGraph
  commit id: "main"
  branch develop
  checkout develop
  commit id: "feature-start"
  branch feature/new-feature
  checkout feature/new-feature
  commit id: "feature-work"
  commit id: "feature-done"
  checkout develop
  merge feature/new-feature
  branch release/v1.0
  checkout release/v1.0
  commit id: "release-prep"
  checkout main
  merge release/v1.0 tag: "v1.0.0"
  checkout develop
  merge main
```

### Code Review Process

1. **Branch Creation**: Feature branch from develop
2. **Development**: Implement feature with tests
3. **Pre-commit**: Lint, format, type-check
4. **Pull Request**: Open PR with description
5. **CI Checks**: Automated tests and scans
6. **Review**: Code review by 1+ developers
7. **Approval**: Required approvals obtained
8. **Merge**: Squash and merge to develop

## Future Roadmap

### Planned Enhancements

- **GraphQL API**: Add GraphQL endpoint for flexible queries
- **WebSocket Support**: Real-time property updates
- **Mobile Apps**: Native iOS and Android applications
- **AI Improvements**:
  - Fine-tuned property valuation models
  - Computer vision for property images
  - Natural language property search
- **Blockchain Integration**: Property ownership verification
- **AR/VR Features**: Virtual property tours
- **International Expansion**: Multi-region support

### Technical Debt

- Migrate from Express to Fastify for better performance
- Implement event sourcing for audit trail
- Extend LangSmith tracing with OpenTelemetry export bridge
- Improve test coverage to 90%+
- Optimize bundle sizes
- Implement progressive web app (PWA) features

## Appendix

### Glossary

- **RAG**: Retrieval-Augmented Generation
- **MoE**: Mixture of Experts
- **CoT**: Chain-of-Thought
- **MCP**: Model Context Protocol
- **A2A**: Agent-to-Agent Communication Protocol
- **ZPID**: Zillow Property ID
- **kNN**: k-Nearest Neighbors
- **TTL**: Time To Live
- **RTO**: Recovery Time Objective
- **RPO**: Recovery Point Objective
- **SLO**: Service Level Objective
- **Context Engineering**: The discipline of designing systems that supply AI agents with the right information at the right time via knowledge graphs, retrieval pipelines, and token-aware context assembly

### References

- [EstateWise API Documentation](https://estatewise-backend.vercel.app/api-docs)
- [Frontend Repository](https://github.com/hoangsonww/EstateWise-Chapel-Hill-Chatbot)
- [Technical Documentation](TECH_DOCS.md)
- [Deployment Guide](DEPLOYMENTS.md)
- [gRPC & tRPC Documentation](GRPC_TRPC.md)
- [RAG Architecture Overview](RAG_SYSTEM.md)
- [Context Engineering Documentation](context-engineering/README.md)

---

*This architecture document is maintained alongside the codebase. Last updated: March 18, 2026*
