# EstateWise Architecture

This document describes the comprehensive end-to-end architecture for EstateWise, spanning frontend UI, backend services, API protocols (REST, tRPC, gRPC), data and graph pipelines, AI/ML systems, MCP tooling, agentic orchestration, IDE extensions, and CI/CD infrastructure.

## System Overview

EstateWise is a full-stack, monorepo AI/ML chatbot and data analytics platform built for real estate in Chapel Hill, NC and surrounding areas. The architecture employs a microservices-oriented design with multiple API protocols, distributed data stores, and sophisticated AI orchestration.

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
├── backend/                    # Express + TypeScript API server
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── models/           # MongoDB schemas
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Auth, logging, errors
│   │   ├── trpc/            # tRPC implementation
│   │   │   ├── routers/     # tRPC routers
│   │   │   └── trpc.ts      # Context & procedures
│   │   └── server.ts         # Main entry point
├── frontend/                  # Next.js + React application
│   ├── app/                  # Next.js 13+ app directory
│   ├── components/           # React components
│   ├── lib/                  # Utilities & API clients
│   └── public/               # Static assets
├── grpc/                      # gRPC service implementation
│   ├── proto/                # Protocol buffer definitions
│   │   └── market_pulse.proto
│   ├── src/
│   │   ├── server.ts         # gRPC server
│   │   └── services/         # Service implementations
├── mcp/                       # Model Context Protocol server
│   ├── src/
│   │   ├── server.ts         # MCP stdio server
│   │   └── tools/            # Tool implementations
├── agentic-ai/                # Multi-agent orchestration
│   ├── src/
│   │   ├── agents/           # Agent implementations
│   │   ├── orchestrator/     # Default runtime
│   │   ├── lang/             # LangGraph runtime
│   │   └── index.ts          # CLI entry
│   └── crewai/               # Python CrewAI runtime
├── extension/                 # VS Code extension
├── terraform/                 # Infrastructure as Code
├── aws/                      # AWS deployment configs
├── azure/                    # Azure deployment configs
├── gcp/                      # GCP deployment configs
├── kubernetes/               # K8s manifests
└── hashicorp/                # Consul/Nomad configs
```

## API Protocols

EstateWise implements three complementary API protocols to serve different use cases:

### REST API (Primary)
- **Protocol**: JSON over HTTP/1.1
- **Use Cases**: Public API, mobile apps, third-party integrations
- **Documentation**: OpenAPI/Swagger at `/api-docs`
- **Authentication**: JWT tokens in Authorization header

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
  Context --> Prompt[Augmented Prompt]
  Prompt --> LLM[Gemini API]
  LLM --> Response[Generated Response]
  Response --> Charts{Generate Charts?}
  Charts -->|Yes| Viz[Chart.js Visualization]
  Charts -->|No| Final[Final Output]
  Viz --> Final
```

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
    Finance[Finance Tools<br/>mortgage, affordability, schedule]
    Utils[Utility Tools<br/>extractZpids, parseGoal, summarize]
    Map[Map Tools<br/>linkForZpids, buildLinkByQuery]
  end

  Client[MCP Client] -->|stdio| Server[MCP Server]
  Server --> Props
  Server --> Graph
  Server --> Analytics
  Server --> Finance
  Server --> Utils
  Server --> Map

  Props --> API[Backend API]
  Graph --> API
  Analytics --> API
```

## Agentic AI Architecture

### Multi-Runtime Support

```mermaid
flowchart TB
  subgraph "Runtime Selection"
    Goal[User Goal]
    Selector{Select Runtime}
  end

  subgraph "Orchestrator Runtime"
    O_Plan[Planner]
    O_Coord[Coordinator]
    O_Agents[Specialized Agents]
    O_Black[Blackboard]
  end

  subgraph "LangGraph Runtime"
    L_React[ReAct Agent]
    L_Tools[MCP + Direct Tools]
    L_Memory[Conversation Memory]
  end

  subgraph "CrewAI Runtime"
    C_Crew[Agent Crew]
    C_Plan[Planning Agent]
    C_Exec[Execution Agents]
    C_Report[Reporter Agent]
  end

  Goal --> Selector
  Selector -->|--orchestrator| O_Plan
  Selector -->|--langgraph| L_React
  Selector -->|--crewai| C_Crew

  O_Plan --> O_Coord
  O_Coord --> O_Agents
  O_Agents --> O_Black

  L_React --> L_Tools
  L_Tools --> L_Memory

  C_Crew --> C_Plan
  C_Plan --> C_Exec
  C_Exec --> C_Report
```

### Orchestrator Agent Pipeline

```mermaid
stateDiagram-v2
  [*] --> Planner: User Goal
  Planner --> Coordinator: Execution Plan
  Coordinator --> ParseGoal: Extract Filters
  ParseGoal --> PropertyLookup: Find Properties
  PropertyLookup --> PropertySearch: Expand Search
  PropertySearch --> Analytics: Analyze Results
  Analytics --> GraphAnalysis: Graph Relations
  GraphAnalysis --> Ranking: Dedupe & Rank
  Ranking --> MapGeneration: Create Map Links
  MapGeneration --> Finance: Calculate Metrics
  Finance --> Compliance: Check Compliance
  Compliance --> Reporter: Generate Report
  Reporter --> [*]: Final Output
```

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

  Map --> Leaflet[Leaflet Map]
  Map --> Markers[Property Markers]
  Map --> Controls[Map Controls]
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

  GHCR --> ECS
  ECR --> ECS
  ACR --> ACA
  GAR --> CloudRun
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
| **Agentic** | `OPENAI_API_KEY` (for CrewAI) | `LANGCHAIN_API_KEY`<br>`AGENT_RUNTIME` |

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
- Add distributed tracing (OpenTelemetry)
- Improve test coverage to 90%+
- Optimize bundle sizes
- Implement progressive web app (PWA) features

## Appendix

### Glossary

- **RAG**: Retrieval-Augmented Generation
- **MoE**: Mixture of Experts
- **CoT**: Chain-of-Thought
- **MCP**: Model Context Protocol
- **ZPID**: Zillow Property ID
- **kNN**: k-Nearest Neighbors
- **TTL**: Time To Live
- **RTO**: Recovery Time Objective
- **RPO**: Recovery Point Objective
- **SLO**: Service Level Objective

### References

- [EstateWise API Documentation](https://estatewise-backend.vercel.app/api-docs)
- [Frontend Repository](https://github.com/hoangsonww/EstateWise-Chapel-Hill-Chatbot)
- [Technical Documentation](TECH_DOCS.md)
- [Deployment Guide](DEPLOYMENTS.md)
- [gRPC & tRPC Documentation](GRPC_TRPC_DOCUMENTATION.md)

---

*This architecture document is maintained alongside the codebase. Last updated: January 2025*
