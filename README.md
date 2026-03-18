# EstateWise - Your Intelligent Estate Assistant 🏡

**EstateWise** is a **full‑stack, monorepo AI/ML** **chatbot & data analytics project** built for real estates in _Chapel Hill, NC_ and the surrounding areas _(Durham, Raleigh, Cary, Apex, Morrisville, Hillsborough, etc.)_. It features an intelligent chatbot
featuring a sleek, responsive UI with smart, agentic AI capabilities powered by comprehensive data analysis and advanced machine learning techniques to help you find your dream home! 🏠✨

Under the hood, it leverages **agentic AI, Hybrid RAG (Pinecone + Neo4j, kNN + graph enrichment), k‑Means clustering, Chain-of-Thought (CoT),
Large Language Models (LLMs), a Mixture‑of‑Experts ensemble, blue/green & canary deployment, and so much more** to deliver _fast,_ _hyper‑personalized_ property recommendations based on your preferences! 📲🧠

<p align="center">
  <a href="https://estatewise.vercel.app/">
    <img src="img/logo.png" alt="EstateWise Logo" width="35%" style="border-radius: 8px" />
  </a>
</p>

## Table of Contents

- [Live App](#live-app)
  - [Key Technologies Used](#key-technologies-used)
  - [AI Techniques](#ai-techniques)
- [Features](#features)
- [Architecture](#architecture)
- [Setup & Installation](#setup--installation)
- [Deployment](#deployment)
- [Usage](#usage)
- [User Interface](#user-interface)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Dockerization](#dockerization)
- [Prometheus Monitoring \& Visualizations](#prometheus-monitoring--visualizations)
- [CI/CD Pipelines](#cicd-pipelines)
- [MCP Server](#mcp-server)
- [Agentic AI Pipeline](#agentic-ai-pipeline)
- [Context Engineering](#context-engineering)
- [Codex Multi-Agent](#codex-multi-agent)
- [API Architecture Overview](#api-architecture-overview)
  - [When to Use Each API](#when-to-use-each-api)
  - [tRPC API](#trpc-api)
  - [gRPC Services](#grpc-services)
- [Travis CI](#travis-ci)
- [Testing](#testing)
- [OpenAPI Specification](#openapi-specification)
- [JSDoc & TypeDoc](#jsdoc--typedoc)
- [Containerization](#containerization)
- [VS Code Extension](#vs-code-extension)
- [Mintlify Documentation](#mintlify-documentation)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Live App

Visit the live app on **Vercel** at **[https://estatewise.vercel.app](https://estatewise.vercel.app/)** and explore the intelligent estate assistant! 🚀

The backend API & its documentation are also available at **[https://estatewise-backend.vercel.app](https://estatewise-backend.vercel.app/).** ✨

_Feel free to use the app as a guest or sign up for an account to save your conversations!_

### Key Technologies Used

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

> [!TIP]
> Feel free to go to this [Colaboratory Notebook](https://colab.research.google.com/drive/1-Z3h0LUHl0v-e0RaZgwruL8q180Uk4Z-?usp=sharing) to directly view and run the code in this notebook & see the results in real time.

For a CLI version of the chatbot, as well as the initial EDA (Exploratory Data Analysis) of the properties data and interactive geospatial visualizations, check out the Jupyter notebooks in the root directory: [EDA-CLI-Chatbot.ipynb](EDA-CLI-Chatbot.ipynb).

### AI Techniques

**EstateWise** combines a modern API, real‑time chat, and a responsive UI with a powerful AI stack to deliver hyper‑personalized property recommendations:

- **Hybrid RAG (Vector + Graph):** Uses Pinecone for kNN‑based vector retrieval and Neo4j for graph enrichment before fusing results into generated responses.
- **Agentic AI Pipeline:** Orchestrates the entire AI workflow, managing data retrieval, expert routing, response generation, and feedback integration.
- **MCP (Model Context Protocol):** Standardizes communication between models and the backend, ensuring consistent context handling and response formatting.
- **A2A (Agent-to-Agent Protocol):** Enables agent-native task orchestration between EstateWise Agentic AI and external agent systems.
- **Web-Grounded AI (Internet Research):** Supports web search and page retrieval for freshness-sensitive queries (latest market/rate/news context) through MCP web tools and Gemini web grounding service support.
- **Multi-LLM Approach:** Utilizes multiple LLMs for different tasks to optimize performance and cost.
- **k‑Means Clustering:** Automatically groups similar listings and finds closest matches to refine recommendations.
  - All features are also normalized to a range of 0-1 for better clustering and kNN performance.
- **Decision AI Agent:** Decides whether to fetch RAG data; if yes, it pulls in the Pinecone results, otherwise it skips straight to the Mixture‑of‑Experts pipeline, saving time and cost on simpler queries.
- **Mixture of Experts (MoE):** Dynamically routes each query through a master model to select specialized sub‑models (Data Analyst, Lifestyle Concierge, Financial Advisor, Neighborhood Expert, Cluster Analyst) for maximal relevance.
- **Chain-of-Thought (CoT):** Each expert uses a CoT approach to break down complex queries into manageable steps, ensuring accurate and relevant responses.
- **Feedback Loop & Reinforcement Learning:** Users rate responses; thumbs‑up/down adjust expert weights per conversation, and the system continuously learns to improve accuracy.
- **Prompt Engineering:** Each expert has a unique prompt template, ensuring tailored responses based on user input.
  - All experts, agents, and merger have a detailed and ultra-specific prompt template to ensure the best possible responses.
- **kNN & Cosine Similarity:** Uses Pinecone for fast, real‑time property retrieval based on user queries.
- **Graph Traversal & Enrichment:** Neo4j adds explainable relationships like same neighborhood/zip and vector‑similar links, enabling statements like “Recommended because it’s in the same neighborhood and similar in price/size to a liked home.”
- **AI-Generated Visualizations:** The AI generates live Chart.js graphs from Pinecone data to visualize trends and distributions instantly, directly within the chat messages.

For the full Hybrid RAG pipeline, including diagrams and evaluation notes, see **[RAG_SYSTEM.md](RAG_SYSTEM.md).**

#### Hybrid RAG at a Glance

Hybrid Retrieval-Augmented Generation (RAG) in EstateWise combines vector search with graph database enrichment to provide comprehensive and contextually relevant property recommendations. Here's a high-level overview of the process:

```mermaid
flowchart LR
  Q[User Query] --> E[Embed Query]
  E --> V[Pinecone Vector Search]
  V --> K[Top-K Results]
  K --> G[Neo4j Graph Enrichment]
  G --> M[Merge + Dedupe]
  M --> LLM[Augmented Prompt]
```

The user query is first embedded into a vector representation, which is then used to perform a k-nearest neighbors search in Pinecone. The top-k results are enriched with additional context from the Neo4j graph database, merging and deduplicating the information before constructing an augmented prompt for the LLM to generate a final response.

## Features

EstateWise is packed with both UI and AI features to enhance your home-finding experience:

- **Intelligent Property Recommendations:** Get tailored property suggestions powered by AI and Retrieval‑Augmented Generation (RAG).

- **Secure User Authentication:** Sign up, log in, and log out with JWT‑based security.

- **Conversation History:**
  - **Authenticated users** can view, rename, and delete past chats.
  - **Auto-Generated Conversation Titles**: New conversations automatically receive AI-generated titles (3-6 words) based on the first message, replacing the default "New Conversation" title within seconds.
  - **Guest users** still have their conversation history saved locally in the browser.

- **Full‑Text Search:** Quickly search your conversation history for keywords, topics, or specific properties.

- **Rating System & Feedback Loop:** Rate each AI response (thumbs up/down) to adjust expert weights and continuously improve recommendations.

- **Mixture‑of‑Experts (MoE) & Manual Expert View:**
  - The AI dynamically routes queries through specialized experts (Data Analyst, Lifestyle Concierge, Financial Advisor, Neighborhood Expert, Cluster Analyst).
  - There is a master merger model that synthesizes the responses from all experts.
  - Optionally switch to any single expert’s view to see their raw recommendation.

- **Chain-of-Thought (CoT):** Each expert uses a CoT approach to break down complex queries into manageable steps, ensuring accurate and relevant responses.

- **Interactive Visualizations:**
  - In‑chat, the AI generates live Chart.js graphs from Pinecone data so you can instantly see trends and distributions.
  - A dedicated Visualizations page offers aggregate charts and insights for all Chapel Hill properties.

- **Clustering & Similarity Search:**
  - k‑Means clustering groups similar properties for more focused suggestions.
  - kNN & Cosine Similarity (via Pinecone) finds the closest matches to your query in real time.
  - Graph traversal (via Neo4j) adds explainable relationships like same neighborhood/zip and vector‑similar links, enabling statements like “Recommended because it’s in the same neighborhood and similar in price/size to a liked home.”

- **Insights & Tools Page:** A dedicated page at `/insights` with:
  - Explain Relationship: shortest graph path between two homes (ZIP/Neighborhood/Similarity edges) with a mini node‑edge diagram.
  - Graph Similar Properties: reasoned similarities (same neighborhood/zip/similar‑to) with a radial node graph.
  - Neighborhood Stats: counts and averages for a named neighborhood.
  - Global Graph View: sampled whole-graph visualization (properties, ZIPs, neighborhoods) powered by `GET /api/graph/overview`.
  - Mortgage & Affordability tools: interactive breakdown + quick utilities.

- **Deal Analyzer:** Utilizes AI/ML to evaluate if a property is a good deal based on historical trends, neighborhood data, and market conditions (at `/analyzer`).
  - The AI provides a detailed breakdown of factors influencing the deal quality.
  - Users can input specific properties to analyze or let the AI suggest potential deals from the dataset.
  - Scorecard system rates properties on various criteria (e.g., price, location, amenities).
  - Comprehensive **factors considered** include:
    - Property and financing details
    - Income assumptions
    - Operating expenses
    - Growth and targets
    - and more...
  - **Outputs**: Overall deal score, detailed factor breakdowns, monthly breakdown, sensitivity, projection, risk & action plans, and more.
  - Visual indicators (e.g., color-coded scores) help users quickly assess deal quality.

- **Forums & Community Discussions:** A space for users to discuss properties, share experiences, and seek advice from fellow homebuyers (at `/forums`).
  - Users can create new discussion threads or reply to existing ones.
  - Upvote/downvote system to highlight valuable contributions.
  - Moderation tools to ensure a respectful and informative community environment.

- **Map Page:** A map view at `/map` that displays properties with markers:
  - Accepts `?zpids=123,456` to show specific homes only.
  - If no `zpids`, accepts `?q=` to search and caps to a safe max (200) for performance.
  - Includes a right-side Results Panel with Snapshot stats (median price, avg $/sqft, avg beds/baths, home-type mix).
  - Includes Top Matches cards that can focus/open the corresponding marker popup directly on the map.
  - Landing page hero includes an emphasized “Properties Map” CTA for direct navigation to `/map`.
  - Chat replies auto‑include a “View on Map” link when Zillow property links are present.

- **Smooth Animations:** Engaging transitions and micro‑interactions powered by Framer Motion.

- **Interactive Chat Interface:** Enjoy a fully animated chat experience with Markdown‑formatted responses, collapsible expert views, inline charts, and **real-time streaming responses** powered by Server-Sent Events (SSE).
  - **Streaming AI Responses:** Words appear in real-time as the AI generates them, providing an engaging and responsive user experience.
  - **Automatic Retries:** Built-in retry logic with exponential backoff ensures reliable message delivery even with unstable connections.
  - **Visual Feedback:** Loading indicators, animated cursors, and connection status updates keep users informed throughout the conversation.

- **Responsive, Themeable UI:**
  - Optimized for desktop, tablet, and mobile.
  - Dark and light modes with your preference saved locally.

- **Guest Mode**: Use the app without creating an account—history is stored only in your browser.

- **Comprehensive Property Data:**
  - **Over 50,000** Chapel Hill area listings, complete with prices, beds, baths, living area, year built, and more.
  - For security, this data isn’t included in the repo—please plug in your own.
  - Peek at our sample dataset here:  
    [Google Drive CSV (50k+ records)](https://drive.google.com/file/d/1vJCSlQgnQyVxoINosfWJWl6Jg1f0ltyo/view?usp=sharing)

- **Production-Ready DevOps & Multi-Cloud Delivery:**  
  - Turn-key deployments for **AWS (ECS Fargate)**, **Azure (Container Apps)**, **GCP (Cloud Run)**, and **HashiCorp Terraform + Kubernetes (Consul/Nomad mesh)**.  
  - Built-in support for **Vercel** (frontend + optional backend edge) and **kustomize/Helm** manifests for any Kubernetes cluster.  
  - Enterprise GitOps control plane with **Argo CD** and **Flux CD** in non-overlapping ownership scopes.
  - Progressive delivery with **Argo Rollouts** for core services and **Flagger** in an isolated delivery namespace.
  - Operational automation with **Argo Workflows** (`WorkflowTemplate` + `CronWorkflow`) and cluster preflight validation.
  - Helm charts and Kustomize manifests available in `helm/` and `kubernetes/` for easy customization and deployment to Kubernetes environments.
  - CI/CD ready with **Jenkins**, **GitHub Actions**, **Azure Pipelines**, and **Cloud Build**.  
  - See [DEPLOYMENTS.md](DEPLOYMENTS.md) for diagrams, step-by-step guides, and environment toggles.
  - After cleaning, approx. **30,772 properties** remain in the database, available for the chatbot to use.
  - Explore `Initial-Data-Analysis.ipynb` in the repo root for an initial, quick Jupyter‑powered dive into the data.
  - Explore `EDA-CLI-Chatbot.ipynb` in the repo root for a more detailed and comprehensive analysis of the data, as well as a CLI version of our chatbot.

- **Context Engineering & Knowledge Graph:**
  - Enterprise-grade context engineering system with in-memory knowledge graph (42 seed nodes, 55 edges, 12 node types).
  - Knowledge base with hybrid retrieval (semantic + keyword + graph-enhanced) and 10 pre-loaded domain documents.
  - Token-aware context window with priority-based allocation and per-agent budgets.
  - Interactive D3.js force-directed graph visualization dashboard on port 4200.
  - 10 MCP tools (`context.search`, `context.assembleForAgent`, `context.graphTraverse`, etc.) and 4 MCP resources.
  - Ingestion pipeline for properties, conversations, and documents.
  - Full integration with the agentic AI orchestrator via `ContextEngineerAgent`.

- _and so many more features in the app..._

> [!IMPORTANT]
> Please note that the deployed version of the app is subject to our infrastructure limitations, which may affect the performance and availability of the app. You are encouraged to run the app locally for the best experience.

## Architecture

### Detailed Diagram

```mermaid
graph LR
  %% Frontend
  subgraph Frontend
    Chat["/chat - Chat UI + charts"]
    Insights["/insights - Graph tools + calculators"]
    Map["/map - Leaflet map + results panel"]
  end

  %% Backend
  subgraph Backend
    ChatAPI["POST /api/chat"]
    RateAPI["POST /api/chat/rate"]
    PropsAPI["GET /api/properties"]
    ByIdsAPI["GET /api/properties/by-ids"]
    SimAPI["GET /api/graph/similar/:zpid"]
    ExplAPI["GET /api/graph/explain"]
    HoodAPI["GET /api/graph/neighborhood/:name"]
    OverAPI["GET /api/graph/overview"]
  end

  %% Services
  subgraph Services
    Gemini["Google Gemini"]
    Pinecone["Pinecone Index"]
    Neo4j["Neo4j Aura"]
    Mongo["MongoDB Atlas"]
    Redis["Redis Cache"]
    Prom["Prometheus"]
  end

  %% Ingestion
  subgraph Ingestion
    Clean["cleanProperties.ts"]
    Upsert["upsertProperties.ts"]
    IngestGraph["ingestNeo4j.ts"]
  end

  %% Frontend → Backend
  Chat --> ChatAPI
  Chat --> RateAPI
  Insights --> SimAPI
  Insights --> ExplAPI
  Insights --> HoodAPI
  Insights --> OverAPI
  Map --> PropsAPI
  Map --> ByIdsAPI

  %% Backend → Services
  ChatAPI --> Gemini
  ChatAPI --> Pinecone
  ChatAPI -. optional .-> Neo4j
  PropsAPI --> Pinecone
  ByIdsAPI --> Pinecone
  ByIdsAPI --> Mongo
  SimAPI --> Neo4j
  ExplAPI --> Neo4j
  HoodAPI --> Neo4j
  OverAPI --> Neo4j

  %% Ingestion → Stores
  Clean --> Mongo
  Upsert --> Pinecone
  IngestGraph --> Neo4j
```

**EstateWise** is built with a modern, full-stack architecture consisting of two major parts:

### Backend

- **Express.js & TypeScript:** A robust backend API that handles authentication, conversation management, and AI chat processing.
- **MongoDB:** Database for storing user data, conversation histories, and more.
- **Pinecone:** A managed vector database for fast, real‑time property retrieval using kNN and cosine similarity.
- **Neo4j (Graph DB):** Models explicit relationships (neighborhoods, zip codes, property‑to‑property similarities). New endpoints under `/api/graph` power explainable recommendations and path explanations.
- **Redis:** Caching layer for quick access to frequently used data and to improve performance.
- **JWT Authentication:** Secure user sessions using JSON Web Tokens.
- **Integration with AI & RAG:** Communicates with AI APIs and uses **Google Gemini API & Pinecone** for advanced property recommendation logic.
- **Swagger API Documentation:** Automatically generated API documentation for easy reference and testing.
- **Docker & Podman:** Containerization for easy deployment and scalability.
- **OpenAPI Specification:** An OpenAPI specification file (`openapi.yaml`) is included in the root directory. You can use Swagger UI or Postman to explore and test the API endpoints.
- **Prometheus Monitoring:** Collects and visualizes metrics for performance monitoring.
- **GitHub Actions:** CI/CD pipeline for automated testing and deployment.
- and more...

### Frontend

- **Next.js & React:** A responsive, animation-rich web application.
- **Shadcn UI Components:** For a consistent design system across the app.
- **Framer Motion:** Provides smooth animations and transitions throughout the user experience.
- **Dark Mode/Light Mode:** Users can toggle themes with seamless background color transitions.
- **Chart.js:** For interactive data visualizations and graphs.
- **Tailwind CSS:** Utility-first CSS framework for rapid UI development.
- **Responsive Design:** Optimized for desktop, tablet, and mobile devices.
- **API Integration:** Communicates with the backend API for chat functionality, user authentication, and conversation management.
- and more...

### High-Level Architecture Flow Diagrams

#### AI Architecture Flow Diagram

Here's a high-level architecture flow diagram that shows the AI processing and expert selection process:

<p align="center">
  <img src="img/flowchart.png" alt="High-Level Architecture Flow Diagram" width="100%" />
</p>

#### Mermaid Diagram

This diagram illustrates the flow of user messages through the backend processing, including authentication, loading conversation history, preparing AI agent input, and generating responses using a mixture of experts:

```mermaid
flowchart TD
    UM["User Message"]
    API["RESTful APIs"]
    RME["Receive Message Event"]
    BP["Backend Processing"]
    Auth{"Is User Authenticated?"}
    LMDB["Load Conversation History from MongoDB"]
    LBrowser["Load Conversation History from Local Browser Storage"]
    Prep["Prepare AI Agent Input\n(message + system history + system prompt)"]
    AInput["AI Agent Input"]
    Orchestration["Agent Tool Orchestration"]
    UsePinecone{"Use Data from Pinecone?"}
    QueryPinecone["Queries Vectorized Properties Data from Pinecone"]
    NoPinecone["Proceed without RAG data from Pinecone"]
    MOE["Mixture-of-Experts API Request Pipeline\n(6 specialized AI experts + 1 AI merger)"]
    Generate["Generate Final Response\n(text + charts)"]
    APIResp["API Request Response"]
    Display["Display Response\n(Show Output in UI)"]
    Rate{"User Rates Response?"}
    Update["User Gives Thumbs Down\nNeed to Update Expert Weights\nGo Through Another API Request"]
    End["User Gives Thumbs Up\nNo Update Needed"]

    UM --> API --> RME --> BP --> Auth
    Auth -- Yes --> LMDB
    Auth -- No  --> LBrowser
    LMDB --> Prep
    LBrowser --> Prep
    Prep --> AInput --> Orchestration --> UsePinecone
    UsePinecone -- Yes --> QueryPinecone
    UsePinecone -- No  --> NoPinecone
    QueryPinecone --> MOE
    NoPinecone   --> MOE
    MOE --> Generate --> APIResp --> Display --> Rate
    Rate -- Thumbs Down --> Update --> MOE
    Rate -- Thumbs Up   --> End
```

#### Overall App Architecture Flow Diagram

Below is a high-level diagram that illustrates the flow of the application, including user interactions, frontend and backend components, and data storage:

```plaintext
         ┌────────────────────────────────┐
         │      User Interaction          │
         │   (Chat, Signup, Login, etc.)  │
         └─────────────┬──────────────────┘
                       │
                       ▼
         ┌───────────────────────────────┐
         │    Frontend (Next.js, React)  │
         │ - Responsive UI, Animations   │
         │ - API calls to backend        │
         │ - User ratings for AI         │
         │   responses                   │
         └─────────────┬─────────────────┘
                       │
                       │ (REST APIs & gRPC & tRPC Calls)
                       │
                       ▼
         ┌─────────────────────────────┐
         │   Backend (Express + TS)    │
         │ - Auth (JWT, Signup/Login)  │
         │ - Conversation & Chat APIs  │
         │ - AI processing & RAG       │
         │ - MongoDB & Pinecone        │
         │ - Swagger API Docs          │
         │ - Dockerized for deployment │
         └─────────────┬───────────────┘
                       │
                       │
                       │
           ┌───────────┴────────────┐
           │                        │
           ▼                        ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   MongoDB       │       │ Pinecone Vector │       │ Neo4j Graph DB  │
│ (User Data,     │◄─────►│   Database      │◄─────►│ (relationships, │
│  Convo History) │       │ (Knowledge Base)│       │ explainability) │
└─────────────────┘       └─────────────────┘       └─────────────────┘
           ▲                                            
           │
           │  (Utilizes stored data & docs)
           │
           ▼
         ┌─────────────────────────────┐
         │   Response Processing       │
         │ - Uses Google Gemini API    │
         │ - RAG (kNN) for retrieval   │
         │ - k-Means clustering for    │
         │   property recommendations  │
         │ - Agentic AI for            │
         │   orchestration &           │
         |   response generation       │
         │ - Expert models (Data       │
         │   Analyst,                  │
         │   Lifestyle Concierge,      │
         │   Financial Advisor,        │
         │   Neighborhood Expert,      │
         │   Cluster Analyst)          │
         │ - Expert selection process  │
         │   (Mixture of Experts)      │
         │ - Chain-of-Thought (CoT)    │
         │ - Combine responses from    │
         │   experts                   │
         │ - Feedback loop for rating  │
         │   AI responses              │
         │ - Reinforcement learning    │
         │   for expert weights        │
         │ - Caching with Redis        │
         │ - and more...               │
         └─────────────┬───────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │    Frontend Display         │
         │ - Show chat response        │
         │ - Update UI (conversation)  │
         │ - User authentication flows │
         │ - Save conversation history │
         │ - Search and manage         │
         │   conversations             │
         │ - User ratings for AI       │
         │   responses                 │
         │ - Visualizations of data    │
         └─────────────────────────────┘
```

#### Neo4j Graph Integration

The graph database layer is optional. If enabled, it adds explicit relationship modeling between properties, neighborhoods, and zip codes,

<p align="center">
  <img src="img/neo4j.png" alt="Neo4j Graph Integration" width="100%" />
</p>

The graph layer enhances explainability by allowing the AI to reference relationships like "same neighborhood" or "similar properties" in its recommendations.

**Neo4j integration details:**

- What it adds
  - Explicit relationship modeling: `(Property)‑[:IN_ZIP|IN_NEIGHBORHOOD]->(...)` and optional `(:Property)‑[:SIMILAR_TO]->(:Property)`.
  - New API endpoints under `/api/graph` for explainable recommendations and path explanations.
  - Optional graph context appended to chat responses for better explainability when Neo4j is configured.

- Configure (env)
  - `NEO4J_ENABLE=true`
  - `NEO4J_URI=neo4j+s://<your-instance-id>.databases.neo4j.io`
  - `NEO4J_USERNAME=neo4j`
  - `NEO4J_PASSWORD=<paste-once-admin-password>`
  - `NEO4J_DATABASE=neo4j` (optional)

- Ingest data
  - `cd backend`
  - `npm run graph:ingest` (uses `INGEST_LIMIT` to cap batch)

- Endpoints
  - `GET /api/graph/similar/:zpid?limit=10` → graph‑based similar properties + reasons (same neighborhood/zip, similar edge).
  - `GET /api/graph/explain?from=<zpid>&to=<zpid>` → shortest path explanation between two properties.
  - `GET /api/graph/neighborhood/:name?limit=50` → stats + sample properties in a neighborhood.
  - `GET /api/graph/overview?limit=250` → sampled global graph subset (properties, ZIPs, neighborhoods) for visualization.

Note: The graph layer is optional. If not configured, the API gracefully responds with 503 for graph routes and the chat pipeline skips graph context.

Example managed credentials
- Username: `neo4j`
- Password: paste your one‑time admin password from Neo4j Aura (e.g., the one you saved when provisioning)
- URI: from your Neo4j Aura instance (e.g., `neo4j+s://<id>.databases.neo4j.io`)

## Setup & Installation

### Backend Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/hoangsonww/EstateWise-Chapel-Hill-Chatbot.git
   cd EstateWise-Chapel-Hill-Chatbot/backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Environment Variables:**  
   Create a `.env` file in the `server` directory with the following variables (adjust as needed):

   ```env
    PORT=<your_port>
    MONGO_URI=<your_mongo_uri>
    JWT_SECRET=<your_jwt_secret>
    GOOGLE_AI_API_KEY=<your_google_ai_api_key>
    PINECONE_API_KEY=<your_pinecone_api_key>
    PINECONE_INDEX=estatewise-index
    NEO4J_ENABLE=false
    NEO4J_URI=neo4j+s://<your-instance-id>.databases.neo4j.io
    NEO4J_USERNAME=neo4j
    NEO4J_PASSWORD=<paste-once-admin-password>
    NEO4J_DATABASE=neo4j
    INGEST_LIMIT=30772
    
    # Speed & reliability tuning for Pinecone -> Neo4j ingest
    # Max IDs per page (serverless only). Range 1..1000
    PINECONE_PAGE_SIZE=1000
    # Auto-resume from checkpoint after failures
    INGEST_RESUME=true
    # Optional starting token to resume from a specific point (overrides checkpoint)
    PINECONE_START_TOKEN=
    # Checkpoint file path (optional). Default: .neo4j_ingest_checkpoint.json in backend/
    INGEST_CHECKPOINT_FILE=
    # Overwrite behavior for Neo4j before ingest:
    # - set to "all" to delete ALL nodes (destructive)
    # - set to any non-empty value (e.g., "true") to delete only Property/Zip/Neighborhood
    NEO4J_RESET=true
    # Increase write retries for transient disconnects
    NEO4J_WRITE_RETRIES=7
    # Namespace for Pinecone (leave blank for default)
    PINECONE_NAMESPACE=
   ```

   Important: Be sure that you created the Pinecone index with the name `estatewise-index` in your Pinecone account before proceeding. Then,
   add data to the index using the `pinecone` CLI or API. For security purposes, our properties data is not publicly available in the repository. Please use your own data.

4. **Upsert Properties Data to Pinecone:**  
   Use the `upsertProperties.ts` script to upsert your properties data into the Pinecone index. This script assumes that you place the 4 JSON files in the same directory as the script itself,
   under the names `Zillow-March2025-dataset_part0.json`, `Zillow-March2025-dataset_part1.json`, `Zillow-March2025-dataset_part2.json`, and `Zillow-March2025-dataset_part3.json`.

   ```bash
   ts-node-dev --respawn --transpile-only src/scripts/upsertProperties.ts
   ```

   Alternatively, and preferably, you can use the following NPM command from the `backend` directory to quickly upsert the properties data:

   ```bash
   npm run upsert
   ```

   Note that it may take quite long to upsert all the 30,772 properties data into the Pinecone index, so please be patient.

5. **Run the Backend in Development Mode:** After the properties data has been upserted into the Pinecone index, you can run the backend server in development mode:

   ```bash
   npm run dev
   ```

   This command starts the backend server with live reloading.

### Frontend Setup

1. **Navigate to the client folder:**

   ```bash
   cd ../frontend
   ```

2. **Install dependencies:**

   ```bash
   npm install --legacy-peer-deps
   ```

3. **Run the Frontend Development Server:**

   ```bash
   npm run dev
   ```

   The frontend should be running at [http://localhost:3000](http://localhost:3000).

4. **Change API URL:**  
   If your backend is running on a different port or domain, update the API URL in the frontend code (simply CTRL + F or CMD + F and search for our official backend API URL in all frontend files, then replace it with your backend URL - by default it is `http://localhost:3001`).

5. **View and Interact with the App:**  
   Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to view the app. You can interact with the chatbot, sign up, log in, and explore the features.

> [!CAUTION]
> As you develop, before committing, we recommend running the linter and formatter to ensure code quality with `npm run format`. This will format your code according to the project's ESLint and Prettier configurations.

## Deployment

> [!TIP]
> See [DEPLOYMENTS.md](DEPLOYMENTS.md) for platform guides, [DEVOPS.md](DEVOPS.md) for comprehensive operational documentation, and [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md) for the complete checklist.

EstateWise has **enterprise-grade DevOps practices** across major clouds. Choose your deployment strategy and platform:

### GitOps Control Plane (Argo CD + Flux CD)

EstateWise now ships with a dual-controller GitOps topology that is production-safe by design:

- **Argo CD owns core platform delivery** (`kubernetes/overlays/prod-gitops`) and Argo-native controllers.
- **Flux owns Flagger lifecycle** and the isolated `estatewise-delivery` canary sandbox.
- Controller scopes are intentionally separated to avoid reconciliation loops.
- Canonical GitOps repository URL:
  - `https://github.com/hoangsonww/EstateWise-Chapel-Hill-Chatbot.git`

```mermaid
flowchart TB
  Repo[GitHub Repository<br/>hoangsonww/EstateWise-Chapel-Hill-Chatbot]

  subgraph ArgoCD["Argo CD Scope"]
    ArgoRoot[Root App]
    ArgoCore[estatewise-core app]
    ArgoRolloutsCtl[Argo Rollouts Controller App]
    ArgoWfCtl[Argo Workflows Controller App]
    ArgoWfDefs[Workflow Definitions App]
  end

  subgraph Flux["Flux Scope"]
    FluxSource[GitRepository source]
    FluxCtl[Flux controllers Kustomization]
    FluxFlagger[Flagger Kustomization]
    FlaggerCtl[Flagger HelmRelease]
  end

  subgraph Runtime["Runtime Namespaces"]
    CoreNs[estatewise]
    RolloutsNs[argo-rollouts]
    WorkflowsNs[argo-workflows]
    DeliveryNs[estatewise-delivery]
    FlaggerNs[flagger-system]
  end

  Repo --> ArgoRoot
  ArgoRoot --> ArgoCore --> CoreNs
  ArgoRoot --> ArgoRolloutsCtl --> RolloutsNs
  ArgoRoot --> ArgoWfCtl --> WorkflowsNs
  ArgoRoot --> ArgoWfDefs --> WorkflowsNs

  Repo --> FluxSource --> FluxCtl --> FlaggerCtl --> FlaggerNs
  FluxSource --> FluxFlagger --> DeliveryNs
```

### Progressive Delivery (Argo Rollouts + Flagger)

- **Argo Rollouts** manages progressive delivery for `estatewise-backend` and `estatewise-frontend` in `estatewise`.
- **Flagger** runs canary analysis in `estatewise-delivery` against `estatewise-frontend-preview`, isolated from core production workloads.
- This split allows production-grade canary experimentation without controller contention on core services.

```mermaid
flowchart LR
  subgraph CoreProd["Core Production Namespace (estatewise)"]
    BR[Rollout: estatewise-backend]
    FR[Rollout: estatewise-frontend]
    BAT[AnalysisTemplate: backend-*]
    FAT[AnalysisTemplate: frontend-*]
  end

  subgraph Delivery["Delivery Sandbox (estatewise-delivery)"]
    FCanary[Flagger Canary: estatewise-frontend-preview]
    FDeploy[Deployment: estatewise-frontend-preview]
    FMetrics[MetricTemplate]
    FLoad[flagger-loadtester]
  end

  BR --> BAT
  FR --> FAT
  FCanary --> FDeploy
  FCanary --> FMetrics
  FCanary --> FLoad
```

### Workflow Orchestration (Argo Workflows)

- `WorkflowTemplate` pipelines gate rollout health and smoke checks.
- `CronWorkflow` performs scheduled nightly validation.
- Workflow namespaces include Pod Security labels, quotas, and limit ranges.

```mermaid
sequenceDiagram
  participant Cron as CronWorkflow
  participant WF as WorkflowTemplate
  participant R as Argo Rollouts
  participant S as Core Services

  Cron->>WF: Trigger nightly smoke pipeline
  WF->>S: Pre-deploy smoke checks
  WF->>R: Wait for backend rollout Healthy
  WF->>R: Wait for frontend rollout Healthy
  WF->>S: Post-deploy smoke checks
  WF-->>Cron: Success/Failure status
```

### Bootstrap & Preflight

Use the GitOps bootstrap and policy-aware preflight scripts before promoting into production:

```bash
# Install/apply GitOps control plane manifests
bash kubernetes/gitops/bootstrap.sh

# Validate rendered manifests + source URL policy
bash kubernetes/gitops/preflight.sh
```

### Advanced Deployment Strategies

EstateWise now supports **three deployment strategies** for zero-downtime releases:

1. **Blue-Green Deployment** – Instant traffic switch with immediate rollback capability
   - Deploy to inactive environment (blue/green)
   - Full testing before traffic switch
   - Rollback in < 1 second
   - Best for: Major releases

2. **Canary Deployment** – Progressive rollout with real user testing
   - Gradual traffic shifting (10% → 25% → 50% → 75% → 100%)
   - Automated health monitoring and rollback
   - Manual approval gates
   - Best for: New features

3. **Rolling Update** – Kubernetes-native gradual rollout
   - Zero-downtime pod replacement
   - Resource-efficient
   - Best for: Regular updates

See [DEVOPS.md](DEVOPS.md) for detailed guides and [kubernetes/scripts/](kubernetes/scripts/) for automation scripts.

### Multi-Cloud Deployment Platforms

- **AWS Fargate Stack** – [`aws/`](aws/README.md)
  CloudFormation templates for VPC, ALB, IAM, ECS, plus CodePipeline/CodeBuild automation and a full `deploy.sh` helper that also provisions DocumentDB.
  <sub>Observability via CloudWatch/Container Insights, secrets in AWS Secrets Manager.</sub>

- **Azure Container Apps Stack** – [`azure/`](azure/README.md)
  Modular Bicep (network, Log Analytics + App Insights, ACR, Cosmos DB, Key Vault, Container Apps), `deploy.sh`, and Azure DevOps pipeline support.
  <sub>Secrets managed by Key Vault, logs shipped to Log Analytics.</sub>

- **GCP Cloud Run Stack** – [`gcp/`](gcp/README.md)
  Deployment Manager configs (VPC + NAT + Serverless connector, Cloud Run, IAM, Storage), Cloud Build pipeline, and `deploy.sh` wrapper.
  <sub>Secrets from Secret Manager, instrumentation via Cloud Logging/Monitoring.</sub>

- **Oracle Cloud (OCI) Stack** – [`oracle-cloud/`](oracle-cloud/README.md)
  Terraform-based VCN, compute, optional load balancer, and OCIR-backed container deployment with Docker Compose.
  <sub>Production-ready OCI deployment with optional load balancer for TLS and stable ingress.</sub>

- **HashiCorp + Kubernetes Stack** – [`hashicorp/`](hashicorp/README.md) & [`kubernetes/`](kubernetes/README.md)
  Terraform installs Consul + Nomad on any Kubernetes cluster, with Kubernetes manifests including HPA, PDB, NetworkPolicies, RBAC, and monitoring.
  <sub>Full observability with Prometheus/Grafana, chaos engineering tests, and automated backups.</sub>

- **Vercel Frontend/Edge** – [`frontend/`](frontend/)
  Next.js app ready for Vercel (`vercel.json`), with optional backend edge routes or reverse proxy to the primary API.

### CI/CD & DevOps Features

**Jenkins Pipeline** (`jenkins/workflow.Jenkinsfile`) with comprehensive stages:
- Linting & Formatting
- Unit & Integration Tests
- **Security Scanning** (5 layers: npm audit, SAST, secrets, container vulnerabilities, best practices)
- **Code Coverage** reporting
- Docker image building & pushing
- **Blue-Green & Canary** deployment automation
- Multi-cloud deployment (AWS/Azure/GCP/Kubernetes/OCI/Vercel)
- Helm/Kustomize support for Kubernetes clusters

**Production-Ready Infrastructure:**
- **Horizontal Pod Autoscaling** (HPA) – Auto-scale from 2-10 replicas based on CPU/memory
- **Pod Disruption Budgets** (PDB) – High availability during updates
- **NetworkPolicies** – Network segmentation and security
- **RBAC** – Role-based access control with least privilege
- **Prometheus Monitoring** – 16 alert rules across 5 categories
- **Grafana Dashboards** – Real-time metrics visualization
- **Automated Backups** – Daily MongoDB backups to S3
- **Chaos Engineering** – Resilience testing suite

**Additional CI/CD Options:**
- **GitHub Actions / GitLab CI** – Reuse deployment scripts or trigger native cloud pipelines
- **Azure Pipelines** – Container build/update pipeline for Container Apps
- **GCP Cloud Build** – Docker build + Cloud Run deploy in a single step
- **Travis CI** – Alternative CI provider (see [TRAVIS_CI.md](TRAVIS_CI.md))
- **GitLab CI** – Support for GitLab-hosted repos
- **Deployment Control Dashboard** – View deployment status, history, rollbacks across clouds, and control canary/blue-green deployments (see [deployment-control/](deployment-control/))

### Deployment Architecture Overview

**DevOps Metrics:**
- Deployment Frequency: **Multiple per day** (automated)
- Lead Time: **< 30 minutes**
- MTTR: **< 5 minutes** (instant rollback)
- Change Failure Rate: **< 5%** (automated tests + canary)
- Availability: **99.95%+** (HA setup)

**Infrastructure as Code (IaC)**

  - **Terraform**: Provision VPC, subnets, Internet Gateway, ECS/Fargate cluster & service, ALB, IAM roles, and security groups via the `terraform/` modules.
  - **CloudFormation**: Modular templates under `aws/cloudformation/` for VPC, IAM roles, ECS cluster/task/service, and ALB if you prefer AWS’s native IaC.

**CI/CD Pipelines**

  - **GitHub Actions**: Builds, tests, and pushes Docker images to AWS ECR or Google Artifact Registry, then triggers deployments.
  - **AWS CodePipeline**: (Optional) Fully AWS-native pipeline—CodeBuild builds & pushes your image, CodePipeline deploys to ECS via Fargate.
  - **GCP Cloud Build**: Builds and pushes containers to Artifact Registry and deploys the backend to Cloud Run using `gcp/cloudbuild.yaml`.

**Backend**

  - **AWS ECS (Fargate)**: Containerized Node/TypeScript API hosted on ECS behind an Application Load Balancer, with autoscaling.
  - **GCP Cloud Run**: Serverless container deployment option via Cloud Build; autoscaling to zero when idle.
  - **Microsoft Azure**: Another option for hosting the backend with easy scaling.
  - **Vercel** (Backup): Node server largely stateless, can run on Vercel for smaller workloads.
  - **Docker / Podman**: Containerized backend for consistent environments across dev, test, and prod. Both Docker Compose and Podman Compose files are provided (see [`docker/README.md`](docker/README.md)).
  - **Load Balancing & SSL**: ALB (AWS) or Cloud Load Balancing (GCP) with managed SSL certs for secure HTTPS.
  - **Secrets Management**: Vault (HashiCorp), AWS Secrets Manager, or GCP Secret Manager for sensitive config.

**Frontend**

  - **Vercel**: Primary host for the Next.js/React UI with edge caching.
  - **Netlify** (Backup): Can also deploy static build artifacts with environment overrides for API endpoints.
  - **S3 + CloudFront**: (Optional) Host `out/` export of Next.js as static site, fronted by a CDN.

**Data Stores**

  - **MongoDB Atlas**: Global, fully managed MongoDB for user data and chat histories.
  - **Pinecone**: Managed vector database for RAG-based property retrieval.
  - **MongoDB Atlas**: Fully managed, global MongoDB for user data and chat histories.
  - **Neo4j Aura**: Managed Neo4j graph database for relationship modeling and explainable recommendations.
  - **Redis**: Managed Redis (Elasticache on AWS, Memorystore on GCP) for caching and performance.

**Monitoring & Logging**

  - **Prometheus + Grafana** on AWS ECS (or GKE) for metrics collection and dashboards.
  - **CloudWatch** (AWS) / **Cloud Logging** (GCP) for logs, alarms, and alerts.

### Azure Deployment

Infrastructure and deployment scripts for Microsoft Azure live in the [`azure/`](azure/) directory. Provision resources with Bicep and deploy the backend using the provided script or Azure Pipelines workflow.

![AWS](https://img.shields.io/badge/Compatible_With%20AWS-232F3E?style=for-the-badge&logo=task&logoColor=white)
![GCP](https://img.shields.io/badge/Compatible_With%20GCP-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)
![Azure](https://img.shields.io/badge/Compatible_With%20Azure-232F3E?style=for-the-badge&logo=micropython&logoColor=white)
![Terraform](https://img.shields.io/badge/IaC%20with%20Terraform-623CE4?style=for-the-badge&logo=terraform&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed_On%20Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/CI/CD%20with%20GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)
![Cloud Build](https://img.shields.io/badge/CI/CD%20with%20Cloud%20Build-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)
![MongoDB Atlas](https://img.shields.io/badge/Using%20MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Pinecone](https://img.shields.io/badge/Using%20Pinecone-FF6F61?style=for-the-badge&logo=googledataflow&logoColor=white)

## Usage

- **Authentication:** Create an account, log in, and manage your user profile securely using JWT authentication.
- **Chat Interface:** Interact with the AI assistant in real time. Authenticated users can save, rename, and delete conversations.
- **Theme Toggle:** Switch between dark and light modes with smooth background transitions.
- **Search & Management:** Easily search through your conversation history and manage your saved conversations from the sidebar.
- **Insights & Tools Page:** Access graph-based tools and mortgage calculators to assist in your property search.
- **Map Page:** View properties on an interactive map with markers, search functionality, and links to Zillow listings.
- **Visualizations Page:** Explore aggregate charts and insights for all Chapel Hill properties.
- **Market Insights Page:** Get the latest market trends and insights for Chapel Hill real estate and other markets across the US.
- **Deal Analyzer Page:** Analyze potential real estate deals with our AI-powered deal analyzer tool.
- **Forum Page:** Engage with the community, ask questions, and share insights about Chapel Hill real estate.
- **Expert View:** Toggle between the combined AI response and individual expert responses (Data Analyst, Lifestyle Concierge, Financial Advisor, Neighborhood Expert, Cluster Analyst) to see different perspectives on your query.
- **Interactive Charts:** View dynamic charts generated by the AI based on your queries, embedded directly in the chat interface.
- **Smooth Animations:** Enjoy engaging transitions and micro-interactions powered by Framer Motion.
- **Responsive Design:** The app is optimized for desktop, tablet, and mobile devices, ensuring a seamless experience across
- **Guest Mode:** Use the app as a guest without creating an account. Conversations will still be saved locally in the browser.
- **Rating System:** Rate the AI's responses to help improve its performance over time. If you are not satisfied with the AI's response, you can give a thumbs down rating, and the backend API will tweak the experts selection process (i.e. the weights of the experts) to improve the model's performance.
- **Expert Selection:** The AI uses a mixture of experts to provide the best possible response based on user input. Users can also select a specific expert's response to view.
- **Chat History:** View and manage your conversation history, including the ability to search for specific conversations (only available for authenticated users).
- **Full‑Text Search:** Quickly search your conversation history for keywords, topics, or specific properties.
- **Visualizations:** View interactive charts and graphs generated by the AI based on your queries. The visualizations page provides aggregate charts and insights for all Chapel Hill properties.
- **Graph-Based Tools:** Access tools that leverage the Neo4j graph database for explainable recommendations and insights about properties, neighborhoods, and zip codes.
- and so much more...

> [!CAUTION]
> Note: The expert view feature is ONLY available for new messages. If you load a conversation from either the local storage or the database, the expert view feature will not be available, and only the combined response will be shown.

## User Interface

EstateWise features a modern, animated, and fully responsive user interface built with Next.js and Shadcn UI, with the help of Tailwind CSS for styling. The UI is designed to be intuitive and user-friendly, ensuring a seamless experience across devices.

### Landing Page

<p align="center">
  <img src="img/landing.png" alt="EstateWise UI" width="100%" />
</p>

### Chat Interface - Dark Mode

<p align="center">
  <img src="img/home.png" alt="EstateWise UI" width="100%" />
</p>

### Chat Interface - Light Mode

<p align="center">
  <img src="img/home-light.png" alt="EstateWise UI" width="100%" />
</p>

<p align="center">
  <img src="img/home-chat.png" alt="EstateWise UI Animated" width="100%" />
</p>

### Visualizations Page

<p align="center">
  <img src="img/visualizations.png" alt="EstateWise UI" width="100%" />
</p>

### Insights & Tools Page

<p align="center">
  <img src="img/insights.png" alt="EstateWise UI" width="100%" />
</p>

#### More Tools...

<p align="center">
  <img src="img/more-tools.png" alt="EstateWise UI" width="100%" />
</p>

### Market Insights Page

<p align="center">
  <img src="img/market-insights.png" alt="EstateWise UI" width="100%" />
</p>

### Deal Analyzer Page

<p align="center">
  <img src="img/deal-analyzer.png" alt="EstateWise UI" width="100%" />
</p>

### Map Page

<p align="center">
  <img src="img/map.png" alt="EstateWise UI" width="100%" />
</p>

### Forum Page

<p align="center">
  <img src="img/forum.png" alt="EstateWise UI" width="100%" />
</p>

### Profile Page

<p align="center">
  <img src="img/profile.png" alt="EstateWise UI" width="100%" />
</p>

### Login Page

<p align="center">
  <img src="img/login.png" alt="EstateWise UI" width="100%" />
</p>

### Register Page

<p align="center">
  <img src="img/register.png" alt="EstateWise UI" width="100%" />
</p>

### Reset Password Page

<p align="center">
  <img src="img/reset-password.png" alt="EstateWise UI" width="100%" />
</p>

## API Endpoints

### Graph

- **GET** `/api/graph/similar/:zpid?limit=10` – Find similar properties via explicit relationships with reasons (same neighborhood/zip, vector similarity edge when present).
- **GET** `/api/graph/explain?from=<zpid>&to=<zpid>` – Return the shortest path (≤3 hops) between two homes over `IN_ZIP|IN_NEIGHBORHOOD|SIMILAR_TO`.
- **GET** `/api/graph/neighborhood/:name?limit=50` – Neighborhood stats and a sample list of properties.
- **GET** `/api/graph/overview?limit=250` – Return a sampled global graph payload sized for browser visualization.

Graph endpoints are available when Neo4j is configured; otherwise they respond with `503`.

### Properties (Map Helpers)

- **GET** `/api/properties` – Search Pinecone and return listings with lat/lon; accepts `q` and `topK`.
- **GET** `/api/properties/by-ids?ids=123,456` – Return listings by ZPIDs (enriches from Pinecone metadata, falls back to Mongo for lat/lon).

### Authentication

- **POST** `/api/auth/signup` – Create a new user.
- **POST** `/api/auth/login` – Log in a user and return a JWT.
- **GET** `/api/auth/verify-email` – Verify if an email exists.
- **POST** `/api/auth/reset-password` – Reset a user's password.

### Conversations

- **POST** `/api/conversations` – Create a new conversation.
- **GET** `/api/conversations` – Retrieve all conversations for a user.
- **GET** `/api/conversations/:id` – Retrieve a conversation by its ID.
- **PUT** `/api/conversations/:id` – Rename a conversation.
- **DELETE** `/api/conversations/:id` – Delete a conversation.
- **GET** `/api/conversations/search/:query` – Search conversations by title or content.
- **POST** `/api/conversations/:id/generate-name` – Generate an AI-powered conversation name suggestion based on conversation content.

### Chat

- **POST** `/api/chat` – Send a chat message and receive an AI-generated response.
  - **Query Parameter:** `?stream=true` – Enable real-time streaming of AI responses using Server-Sent Events (SSE).
  - **Streaming Features:**
    - Real-time text generation as the AI model produces tokens
    - Automatic retry mechanism with exponential backoff (up to 3 retries)
    - Connection loss detection and recovery
    - Visual streaming indicators in the UI (animated cursor, loading states)
    - Graceful fallback to non-streaming mode on errors
- **POST** `/api/chat/rate` – Rate the AI's response (thumbs up or down).

More endpoints can be found in the Swagger API documentation. Endpoints may be added or modified as the project evolves, so this may not be an exhaustive list of all available endpoints.

### Swagger API Documentation

Access detailed API docs at the `/api-docs` endpoint on your deployed backend.

<p align="center">
  <img src="img/swagger.png" alt="Swagger API Documentation" width="100%" />
</p>

> [!TIP]
> Live API documentation is available at: **[https://estatewise-backend.vercel.app/api-docs](https://estatewise-backend.vercel.app/api-docs)**. You can visit it to explore and directly interact with the API endpoints, right in your web browser!

## Project Structure

```plaintext
EstateWise/
├── aws/                      # AWS deployment scripts
│   ├── deploy.sh             # Script to deploy the backend to AWS
│   └── ... (other AWS config files, Dockerfiles, etc.)
├── agentic-ai/               # Agentic AI services and tools
│   ├── src/
│   │   ├── agents/           # Agent implementations
│   │   ├── mcp/              # Model Context Protocol tools
│   │   └── ... (other source files, tests, etc.)
│   ├── package.json
│   ├── tsconfig.json
│   └── ... (other config files, etc.)
├── frontend/                 # Frontend Next.js application
│   ├── public/               # Static assets (images, icons, etc.)
│   ├── components/           # Reusable UI components
│   ├── pages/                # Next.js pages (Chat, Login, Signup, etc.)
│   ├── styles/               # CSS/SCSS files
│   ├── package.json
│   ├── tsconfig.json
│   └── ... (other config files, tests, etc.)
├── backend/                   # Backend Express application
│   ├── src/
│   │   ├── controllers/      # API controllers and endpoints
│   │   ├── models/           # Mongoose models
│   │   ├── routes/           # Express routes
│   │   ├── services/         # Business logic and integrations
│   │   └── middleware/       # Authentication, error handling, etc.
│   ├── package.json
│   ├── tsconfig.json
│   └── ... (other config files, tests, etc.)
├── data/                     # Additional data analytics scripts (Python and JS)
├── shell/                    # Shell scripts for deployment and setup
├── azure/                    # Azure deployment scripts
├── deployment-control/       # Deployment control dashboard for multi-cloud deployments, blue-green, canary, etc.
├── extension/                # VS Code extension for EstateWise
├── kubernetes/               # Kubernetes deployment scripts and manifests
├── oracle-cloud/             # Oracle Cloud Infrastructure deployment scripts
├── helm/                     # Helm charts for Kubernetes deployments
├── hashicorp/                # HashiCorp Consul + Nomad deployment scripts
├── jenkins/                  # Jenkins CI/CD pipeline scripts
├── terraform/                # Terraform scripts for infrastructure as code
├── gitlab/                   # GitLab CI/CD pipeline scripts
├── gcp/                      # GCP deployment scripts
├── mcp/                      # Model Context Protocol server (tools over stdio)
├── context-engineering/      # Knowledge graph, knowledge base, context engine, D3 UI
├── .env                      # Environment variables for development
├── README.md                 # This file
├── TECH_DOCS.md              # Detailed technical documentation (highly recommended to read)
├── docker-compose.yml        # Docker/Podman Compose configuration for backend and frontend
├── Dockerfile                # Root Dockerfile for application
├── openapi.yaml              # OpenAPI specification for API documentation
├── EDA-CLI-Chatbot.ipynb        # Jupyter notebook for CLI chatbot
├── Initial-Data-Analysis.ipynb  # Jupyter notebook for initial data analysis
├── Makefile                  # Makefile for build and deployment tasks
└── ... (other config files, etc.)
```

## Dockerization

To run the application **(OPTIONAL)** using Docker or Podman:

1. Ensure you have [Docker](https://www.docker.com/) (v2+) or [Podman](https://podman.io/) (4.1+) installed.
2. Copy `/.env.example` to `/.env` and fill in real values.
3. In the project root directory, run:

   ```bash
   # Docker — quick start (basic compose, frontend + backend only)
   docker compose up --build

   # Docker — production stack (nginx, mongo, healthchecks)
   docker compose -f docker/compose.prod.yml --env-file .env up --build -d

   # Podman — quick start
   podman compose up --build

   # Podman — production stack
   podman compose -f docker/podman-compose.prod.yml --env-file .env up --build -d
   ```

See [`docker/README.md`](docker/README.md) for full details on ports, profiles, and optional services (Neo4j, Agentic AI).

However, you don't need to run the app using Docker or Podman. You can run the backend and frontend separately as described in the **Setup & Installation** section.

## Prometheus Monitoring & Visualizations

Prometheus is used for monitoring the backend server. It collects metrics from the server and provides a web interface to visualize them.

Metrics collected & visualized include:

- CPU usage
- Memory usage
- Heap usage
- Load average
- Event loops
- Requests per second
- Status codes
- Response times

To view our live server metrics, go to [this link](https://estatewise-backend.vercel.app/metrics) in your browser. This will show you the raw metrics of our server collected by Prometheus. If you are running the app locally, you can go to `http://localhost:3001/metrics` in your browser.

To view our live server data, go to [this URL](https://estatewise-backend.vercel.app/status) in your browser. If you are running the app locally, you can go to `http://localhost:3001/status` in your browser.

<p align="center">
  <img src="img/prometheus.png" alt="Prometheus Monitoring" width="100%" style="border-radius: 8px" />
</p>

## CI/CD Pipelines

EstateWise supports multiple CI/CD options depending on hosting and operational needs. GitHub Actions is the default for GitHub-hosted automation, Jenkins is the primary production CI/CD engine, and GitLab CI is supported for GitLab-hosted repos.

### GitHub Actions

GitHub Actions is used for continuous integration and deployment (CI/CD) of the application. It automatically runs tests, builds the Docker images, and deploys the application to Vercel or AWS whenever changes are pushed to the main branch or when pull requests are created.

To view the GitHub Actions workflow, go to the [Actions tab](https://github.com/hoangsonww/EstateWise-Chapel-Hill-Chatbot/actions) of this repository. You can see the status of the latest runs, view logs, and check for any errors.

Our pipeline is set up to run the following steps:

* **Linting:** Runs ESLint to check for code quality and style issues, enforcing consistent standards across the codebase.
* **Formatting:** Uses Prettier to automatically format code according to project style guidelines.
* **Testing:** Executes unit tests for both the backend (Jest) and frontend (Jest), ensuring that all functionality works as expected.
* **End-to-End Testing:** Runs Cypress and Selenium tests to validate user interactions in a real browser environment.
* **Security Scanning:** Includes CodeQL analysis, `npm audit`, Semgrep, and license checks to detect known vulnerabilities and license conflicts.
* **Build:** Compiles both the frontend and backend code, preparing optimized production artifacts.
* **Database Connectivity Check:** Validates that environment database credentials are correct and that the app can reach its database instances.
* **Performance Testing:** Runs Lighthouse for web performance metrics and Artillery for load testing of critical endpoints.
* **Docker Publishing:** Builds and pushes Docker images for both the frontend and backend to GitHub Container Registry (GHCR).
* **Vulnerability Scanning:** Uses Trivy to scan Docker images for security issues before deployment.
* **Documentation Generation:** Builds JSDoc and TypeDoc documentation and stores the results as build artifacts.
* **Deployment:** Automates infrastructure deployments to AWS and application deployments to Vercel.
* **Final Confirmation:** Marks the pipeline as successfully completed after all previous steps pass.

<p align="center">
  <img src="img/github-actions.png" alt="GitHub Actions CI/CD" width="100%" style="border-radius: 8px" />
</p>

This ensures that the application is always in a deployable state and that any issues are caught early in the development process.

### Jenkins (Primary CI/CD)

Jenkins orchestrates production deployments and multi-cloud rollouts. The primary pipeline is defined in `Jenkinsfile`, with supporting scripts and documentation in `jenkins/`.

- **Scope**: Full pipeline (lint/format → tests → build → security scan → perf checks → deploy).
- **Deploy strategies**: Blue-Green, Canary, Rolling (implemented by `kubernetes/scripts/blue-green-deploy.sh` and `kubernetes/scripts/canary-deploy.sh`).
- **Targets**: Kubernetes plus optional AWS/Azure/GCP/OCI deploys (multi-cloud toggles).
- **Key env toggles**:
  - Strategy: `DEPLOY_BLUE_GREEN`, `DEPLOY_CANARY`, `BLUE_GREEN_SERVICE`, `CANARY_SERVICE`
  - Canary flow: `CANARY_STAGES`, `CANARY_STAGE_DURATION`, `AUTO_PROMOTE_CANARY`
  - Blue/Green flow: `AUTO_SWITCH_BLUE_GREEN`, `SCALE_DOWN_OLD_DEPLOYMENT`
  - Cloud targets: `DEPLOY_AWS`, `DEPLOY_AZURE`, `DEPLOY_GCP`, `DEPLOY_OCI`, `DEPLOY_K8S_MANIFESTS`
- **Recommended use**: Production releases, staged rollouts, and multi-cloud promotion.
- **Docs**: See `DEVOPS.md` and `jenkins/README.md` for variable details and examples.

### GitLab CI

GitLab CI is supported via `.gitlab-ci.yml` and helper scripts under `gitlab/`. It mirrors the Jenkins stages and can reuse the Kubernetes deployment scripts for blue/green, canary, or rolling releases.

- **Pipeline file**: `.gitlab-ci.yml`
- **Helper scripts**: `gitlab/` (wraps existing Kubernetes deploy scripts)
- **Stages**: lint → test → build → security (npm audit) → deploy (manual by default)
- **Defaults**: Node 20 runner image, project-local `.npm` cache, `NEXT_TELEMETRY_DISABLED=1`
- **Key variables**:
  - `DEPLOY_STRATEGY`: `blue-green`, `canary`, or `rolling`
  - `IMAGE_TAG`, `SERVICE_NAME` (default `backend`), `NAMESPACE` (default `estatewise`)
  - Optional toggles: `AUTO_SWITCH`, `SMOKE_TEST`, `SCALE_DOWN_OLD`, `CANARY_STAGES`, `STAGE_DURATION`, `AUTO_PROMOTE`, `ENABLE_METRICS`
- **Kube auth**: Prefer GitLab’s Kubernetes agent or protected CI variables for `KUBECONFIG`.
- **Recommended use**: GitLab-hosted repos or teams standardizing on GitLab CI.

## MCP Server

Bring EstateWise data, graphs, analytics, and utilities to MCP‑compatible clients (IDEs/assistants) via the `mcp/` package, with Agent-to-Agent (A2A) bridge tools for cross-agent collaboration.

![MCP](https://img.shields.io/badge/Model_Context_Protocol-Server-6E56CF?style=for-the-badge&logo=modelcontextprotocol) ![A2A](https://img.shields.io/badge/A2A-Bridge-0EA5E9?style=for-the-badge) ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) ![Zod](https://img.shields.io/badge/Zod-3068B7?style=for-the-badge&logo=zod&logoColor=white)

- Location: `mcp/`
- Transport: stdio (works with typical MCP launchers)
- **Total Tools: 60+** spanning properties, graphs, analytics, web research, market analysis, batch operations, monitoring, finance, and utilities

### Tool Categories

- **Properties**: `properties.search`, `properties.searchAdvanced`, `properties.lookup`, `properties.byIds`, `properties.sample`
- **Graph**: `graph.similar`, `graph.explain`, `graph.neighborhood`, `graph.similarityBatch`, `graph.comparePairs`, `graph.pathMatrix`
- **Charts & Analytics**: `charts.priceHistogram`, `analytics.summarizeSearch`, `analytics.groupByZip`, `analytics.distributions`, `analytics.pricePerSqft`
- **Market Analysis**: `market.pricetrends`, `market.inventory`, `market.competitiveAnalysis`, `market.affordabilityIndex`
- **Web Research**: `web.search`, `web.fetch`
- **Batch Operations**: `batch.compareProperties`, `batch.bulkSearch`, `batch.enrichProperties`, `batch.exportProperties`
- **Monitoring**: `monitoring.stats`, `monitoring.toolUsage`, `monitoring.health`, `monitoring.reset`
- **MCP Token Management**: `mcp.token.generate`, `mcp.token.validate`, `mcp.token.revoke`, `mcp.token.refresh`, and more
- **Map**: `map.linkForZpids`, `map.buildLinkByQuery`, `map.decodeLink`
- **Utilities & Finance**: `util.extractZpids`, `util.zillowLink`, `util.summarize`, `util.parseGoal`, `util.address.parse`, `util.geo.distance`, `util.geo.center`, `finance.mortgage`, `finance.affordability`, `finance.schedule`, `finance.capRate`, `finance.rentVsBuy`
- **Auth**: `auth.login`, `auth.signup`, `auth.verifyEmail`, `auth.resetPassword`
- **Commute**: `commute.create`, `commute.list`, `commute.get`, `commute.update`, `commute.delete`
- **System**: `system.config`, `system.time`, `system.health`, `system.tools`, `system.cache.clear`
- **A2A Bridge**: `a2a.agentCard`, `a2a.task.create`, `a2a.task.get`, `a2a.task.wait`, `a2a.task.cancel`, `a2a.task.list`
- **Context Engineering**: `context.search`, `context.graphOverview`, `context.findRelated`, `context.assembleContext`, `context.ingestDocument`, `context.getMetrics`, `context.nodeDetail`

### Key Features

✨ **Comprehensive Coverage**: 50+ tools covering every aspect of real estate research  
📊 **Market Intelligence**: Advanced market analysis, competitive analysis, and affordability metrics  
🌐 **Web Freshness Layer**: Internet search/fetch tools for current events, rates, and news context  
⚡ **Batch Processing**: Compare, enrich, and export multiple properties efficiently  
📈 **Monitoring**: Built-in usage tracking, health checks, and performance metrics  
🔒 **Type-Safe**: Full Zod validation on all tool inputs  
💾 **Smart Caching**: LRU cache for GET requests with configurable TTL

and more!

```mermaid
flowchart LR
  Client[IDE or Assistant MCP Client] -- stdio --> Server[MCP Server]
  Server -->|properties, graph, analytics, market, web, batch, monitoring| API[Backend API]
  Server -->|deep links| Frontend[Frontend map]
  Server -->|metrics| Cache[(LRU Cache)]
```

### Environment Variables

Configure in `mcp/.env` (copy from `.env.example`):
- `API_BASE_URL` (default: `https://estatewise-backend.vercel.app`)
- `FRONTEND_BASE_URL` (default: `https://estatewise.vercel.app`)
- `A2A_BASE_URL` (default: `http://localhost:4318`) – Target Agentic AI A2A endpoint for `a2a.*` bridge tools
- `WEB_TIMEOUT_MS` (default: `12000`) – Timeout for `web.search`/`web.fetch` outbound requests
- `MCP_CACHE_TTL_MS` (default: `30000`) – Cache TTL in milliseconds
- `MCP_CACHE_MAX` (default: `200`) – Maximum cached GET responses
- `MCP_DEBUG` (default: `false`) – Enable verbose debug logs

### Quick Start

Local development
```bash
cd mcp
npm install
npm run dev
```

Build & run
```bash
cd mcp
npm run build
npm start
```

Test with example client
```bash
npm run client:dev  # List all tools
npm run client:call -- properties.search '{"q":"Chapel Hill 3 bed","topK":5}'
npm run client:call -- market.pricetrends '{"q":"Chapel Hill","topK":100}'
npm run client:call -- batch.compareProperties '{"zpids":[1234567,2345678,3456789]}'
npm run client:call -- monitoring.stats '{"detailed":true}'
```

### Notes

- Returns are text content blocks; JSON payloads are stringified for portability across clients.
- Graph tools require the backend to have Neo4j configured; otherwise they may return 503 from the API.
- Monitoring automatically tracks all tool usage without requiring manual instrumentation.
- Cache can be cleared anytime via `system.cache.clear` or `monitoring.reset`.

> [!TIP]
> **For comprehensive documentation, tool examples, and deployment guides, see [mcp/README.md](mcp/README.md).**

## Agentic AI Pipeline

A production-grade, multi-runtime agent stack is available under `agentic-ai/`:

- **Default Orchestrator:** deterministic, round-based specialist agents sharing a blackboard.
- **LangChain + LangGraph:** ReAct tool-calling runtime over MCP + optional Pinecone/Neo4j tools.
- **CrewAI (Python):** crew-style sequential execution with structured timeline output.
- **A2A Bridge:** Expose agent tasks and lifecycle via JSON-RPC for cross-agent collaboration.
- **Runtime selection:** via CLI flags or HTTP parameters, with consistent tool access and tracing across runtimes.
- **Observability:** built-in cost telemetry, tool execution traces, and optional LangSmith integration.

### Runtime Entry Points

| Surface | Endpoint / Command | Notes |
|---------|--------------------|-------|
| CLI | `npm run dev -- "<goal>"` | Default orchestrator runtime |
| CLI (LangGraph) | `npm run dev -- --langgraph "<goal>"` | ReAct runtime with tool traces |
| CLI (CrewAI) | `npm run dev -- --crewai "<goal>"` | Python crew runtime |
| HTTP batch | `POST /run` | Supports `runtime`, `rounds`, `threadId`, `requestId` |
| HTTP stream | `GET /run/stream` | SSE streaming + optional `requestId` correlation |
| Runtime metadata | `GET /config` | Includes runtime/tool modes and LangSmith status |
| A2A JSON-RPC | `POST /a2a` | `tasks.create/get/list/wait/cancel` (supports optional `requestId`) |
| A2A events | `GET /a2a/tasks/{taskId}/events` | SSE task lifecycle stream |

### Observability & Tracing

- **Cost telemetry:** LangChain/Crew usage is tracked and exposed in `/costs/latest`.
- **Tool execution traces:** LangGraph includes per-tool duration/status/output in responses.
- **LangSmith integration:** optional enterprise tracing with `LANGSMITH_ENABLED`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`.
- **Request correlation:** `requestId` (or `x-request-id`) flows through HTTP runs into LangGraph trace metadata.
- **A2A task events:** Task lifecycle events (start, tool call, end) are emitted for A2A runs, enabling cross-agent observability.
- **Runtime metadata endpoint:** `/config` exposes current runtime modes and LangSmith status for client awareness.

### Quick Start

```bash
cd mcp && npm run build
cd ../agentic-ai
npm run dev "Find 3-bed homes in Chapel Hill, NC and compare two ZPIDs"
```

```bash
cd agentic-ai
LANGSMITH_ENABLED=true LANGSMITH_API_KEY=<key> npm run dev -- --langgraph \
  "Compare 123456 vs 654321, include map + mortgage"
```

```bash
cd agentic-ai/crewai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd ..
npm run dev -- --crewai "Find 3-bed homes in Chapel Hill and summarize investment risks"
```

```mermaid
flowchart LR
  subgraph EntryPoints
    CLI[CLI]
    HTTP[HTTP /run]
    A2A[A2A /a2a]
  end

  subgraph AgenticAI
    Selector{Runtime Selector}
    ORCH[Orchestrator Runtime]
    LG[LangGraph Runtime]
    CREW[CrewAI Runtime]
  end

  subgraph Tools
    MCP[MCP Tools]
    Pinecone[Pinecone]
    Neo4j[Neo4j]
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

> [!IMPORTANT]
> **For details and examples, see [agentic-ai/README.md](agentic-ai/README.md).**

## Context Engineering

EstateWise includes an enterprise-grade **context engineering** subsystem (`context-engineering/`) that provides AI agents with structured domain knowledge through a knowledge graph, knowledge base, and intelligent context window management.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![D3.js](https://img.shields.io/badge/D3.js-F9A03C?style=for-the-badge&logo=d3&logoColor=white)
![Neo4j](https://img.shields.io/badge/Neo4j-008CC1?style=for-the-badge&logo=neo4j&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)

### System Architecture

```mermaid
flowchart TB
  subgraph "Context Engineering"
    KG[Knowledge Graph<br/>42 nodes, 55 edges<br/>12 types, 14 edge types]
    KB[Knowledge Base<br/>10 seed documents<br/>hybrid retrieval]
    CE[Context Engine<br/>4 providers, ranking<br/>token budgets]
    IP[Ingestion Pipeline<br/>property, conversation<br/>document parsers]
    MON[Monitoring<br/>metrics, time-series<br/>rolling window]
  end

  subgraph "Integration Layer"
    MCPT[MCP Tools<br/>10 context tools]
    API[REST API<br/>14 endpoints]
    WS[WebSocket<br/>real-time events]
    UI[D3 Visualization<br/>force-directed graph]
  end

  subgraph "Consumers"
    AGENTS[Agentic AI<br/>ContextEngineerAgent]
    MCPS[MCP Server<br/>67+ tools]
    BROWSER[Browser<br/>port 4200]
  end

  KG <--> CE
  KB <--> CE
  IP --> KG
  IP --> KB
  MON --> CE

  CE --> MCPT
  KG --> API
  KB --> API
  MON --> API
  API --> UI
  WS --> UI

  MCPT --> MCPS
  CE --> AGENTS
  UI --> BROWSER
```

### Knowledge Graph

The knowledge graph is an in-memory, event-driven graph with typed nodes and edges. It comes pre-seeded with 42 domain knowledge nodes:

- **14 Concepts**: Property Valuation, Market Analysis, Mortgage Calculator, Investment ROI, Comparable Sales, Price Per Square Foot, Days on Market, Appreciation Rate, Property Tax, HOA Fees, School District, Crime Rate, Walk Score, Commute Time
- **11 Agents**: Planner, Coordinator, GraphAnalyst, PropertyAnalyst, MapAnalyst, Reporter, FinanceAnalyst, ZpidFinder, AnalyticsAnalyst, DedupeRanking, Compliance
- **7 Tools**: graph.similar, graph.explain, properties.search, properties.lookup, analytics.summarizeSearch, finance.mortgage, map.linkForZpids
- **6 Topics**: Residential Real Estate, Commercial Real Estate, Market Trends, Financial Planning, Neighborhood Analysis, Property Search
- **4 Workflows**: Property Search Flow, Market Research Flow, Financial Analysis Flow, Compliance Check Flow

```mermaid
graph LR
  subgraph "Node Types"
    P[Property] --> N[Neighborhood]
    P --> Z[ZipCode]
    A[Agent] --> T[Tool]
    C[Concept] --> TP[Topic]
    W[Workflow] --> A
    W --> T
  end

  P -- SIMILAR_TO --> P
  P -- IN_NEIGHBORHOOD --> N
  P -- IN_ZIP --> Z
  A -- USES --> T
  A -- HAS_CAPABILITY --> C
  T -- PRODUCES --> C
  W -- PART_OF --> TP
  C -- RELATED_TO --> C
```

**Graph algorithms:** BFS, DFS, Dijkstra shortest path, PageRank, community detection, connected components, betweenness centrality, neighborhood expansion.

<p align="center">
  <img src="img/context-graph.png" alt="Context Engineering UI" width="100%"/>
</p>

### Knowledge Base

10 pre-loaded domain documents covering the full EstateWise platform:

| Document | Content |
|----------|---------|
| Platform Overview | Architecture, capabilities, tech stack |
| Property Search Guide | Filters, ZPID lookup, search strategies |
| Market Analysis Methodology | Data sources, metrics, trend analysis |
| Financial Analysis Tools | Mortgage, ROI, affordability calculators |
| Graph & Knowledge System | Neo4j integration, graph enrichment |
| Agent Capabilities Reference | All 12 AI agent roles and specialties |
| MCP Tool Reference | All 67+ MCP tools and descriptions |
| Neighborhood Analysis Guide | School districts, crime, demographics |
| Commute Analysis | Scoring, transportation modes |
| Compliance & Regulations | Fair housing, data privacy |

**Retrieval strategies:** semantic (cosine similarity), keyword (TF-IDF), hybrid (weighted blend).

### Context Window Engine

The context engine assembles optimized context windows for each agent query:

```mermaid
flowchart LR
  Q[Agent Query] --> P1[Graph Provider]
  Q --> P2[Document Provider]
  Q --> P3[Conversation Provider]
  Q --> P4[Tool Result Provider]
  P1 --> R[Ranker]
  P2 --> R
  P3 --> R
  P4 --> R
  R --> W[Token Window<br/>priority allocation]
  W --> AC[Assembled Context<br/>for agent prompt]
```

| Priority | Level | Examples |
|----------|-------|---------|
| Critical (4) | System prompts, safety rules | Always included |
| High (3) | Direct graph/KB matches | Core relevance |
| Medium (2) | Related context, recent conversation | Supporting info |
| Low (1) | Background knowledge | Space permitting |
| Background (0) | Oldest/least relevant | First evicted |

### D3 Visualization UI

A professional dark-themed dashboard at `http://localhost:4200` featuring:
- **Force-directed graph** with 12 color-coded node types, zoom/pan/drag, click-to-inspect
- **Node detail panel** with properties, metadata, and neighbor navigation
- **Knowledge base search** with scored results
- **Real-time metrics** footer and charts

### Quick Start

```bash
cd context-engineering
npm install
npm run dev          # Start API + D3 UI on http://localhost:4200
npm run seed         # Verify seed data (42 nodes, 55 edges, 10 docs)
npm run build        # Production build
```

> [!TIP]
> **For comprehensive documentation, see [context-engineering/README.md](context-engineering/README.md).**

## Codex Multi-Agent

This repository now includes a project-level Codex configuration under `.codex/` for experimental multi-agent workflows.

- Multi-agent support is enabled in `.codex/config.toml`.
- Shared EstateWise roles are defined for `explorer`, `reviewer`, `docs_researcher`, `browser_debugger`, `worker`, and `monitor`.
- The `docs_researcher` role is wired to the OpenAI Developers MCP server at `https://developers.openai.com/mcp` for Codex and API verification work.

Typical uses:

- Parallel PR review across code exploration, risk review, and docs verification.
- UI debugging where one agent reproduces in the browser while another traces code ownership.
- Long-running validation where a monitor agent waits on builds, tests, or deploy polls.

See `.codex/README.md` for the role definitions, enablement notes, and example prompts.

## API Architecture Overview

EstateWise provides three complementary API protocols, each optimized for different use cases:

```mermaid
flowchart TB
    subgraph "Client Applications"
        WebApp[Next.js Web App]
        Mobile[Mobile Apps]
        Services[Microservices]
        Scripts[Python/Go Scripts]
    end

    subgraph "API Gateway Layer"
        REST[REST API<br/>/api/*<br/>JSON/HTTP]
        TRPC[tRPC API<br/>/trpc/*<br/>Type-safe RPC]
        GRPC[gRPC Server<br/>:50051<br/>Binary RPC]
    end

    subgraph "Shared Backend Services"
        Auth[Authentication]
        BL[Business Logic]
        Cache[Redis Cache]
        DB[(Databases)]
    end

    WebApp -->|Primary| TRPC
    WebApp -->|Fallback| REST
    Mobile -->|iOS/Android| REST
    Services -->|High Performance| GRPC
    Scripts -->|Multi-language| GRPC

    REST --> Auth
    TRPC --> Auth
    GRPC --> Auth

    Auth --> BL
    BL --> Cache
    Cache --> DB

    style REST fill:#85EA2D,color:#000
    style TRPC fill:#2596BE,color:#fff
    style GRPC fill:#4285F4,color:#fff
```

### When to Use Each API

| API | Best For | Protocol | Type Safety | Languages |
|-----|----------|----------|-------------|-----------|
| **REST** | Web standards, wide compatibility | JSON/HTTP/1.1 | OpenAPI/Swagger | Any |
| **tRPC** | TypeScript apps, React/Next.js | JSON/HTTP | End-to-end TS | TypeScript |
| **gRPC** | Microservices, high performance | Protobuf/HTTP/2 | Code generation | 10+ languages |

### tRPC API

EstateWise includes a **tRPC** (TypeScript Remote Procedure Call) API as an optional, type-safe alternative to the REST API. This provides end-to-end type safety between backend and frontend, automatic API client generation, and improved developer experience.

#### tRPC Features

- **End-to-End Type Safety**: Full TypeScript support from backend to frontend with automatic type inference
- **No Code Generation**: Unlike traditional API clients, tRPC infers types directly from your router
- **RPC-like DX**: Call backend functions as if they were local TypeScript functions
- **Built-in Validation**: Input/output validation using Zod schemas
- **Batching & Caching**: Automatic request batching and built-in caching support
- **WebSocket Support**: Real-time subscriptions (when configured)
- **Non-Breaking**: Runs alongside existing REST API at `/trpc` endpoint

#### tRPC Router Structure

The tRPC API is organized into logical routers:

```typescript
// Main app router combining all sub-routers
appRouter = {
  properties: propertiesRouter,  // Property CRUD and search
  analytics: analyticsRouter,    // Market trends, predictions, metrics
  // Additional routers can be added here
}
```

**Properties Router** (`/trpc/properties.*`):
- `list` - Get paginated properties with filters (type, price, bedrooms)
- `byId` - Get single property by ID
- `search` - Full-text search across properties
- `create` - Create new property (protected)
- `stats` - Get aggregate statistics

**Analytics Router** (`/trpc/analytics.*`):
- `marketTrends` - Historical price/volume data for a location
- `pricePrediction` - AI-powered price estimates
- `neighborhoodInsights` - Demographics, schools, amenities
- `investmentMetrics` - ROI, cap rate, cash flow calculations

#### tRPC Architecture

```mermaid
flowchart TB
    subgraph "Frontend (Next.js/React)"
        Client[tRPC Client]
        Types[TypeScript Types<br/>Auto-inferred]
        ReactHooks[React Query Hooks]
    end

    subgraph "tRPC Layer (/trpc)"
        Router[App Router]
        Props[Properties Router]
        Analytics[Analytics Router]
        Context[Context & Auth]
        Validation[Zod Validation]
    end

    subgraph "Backend Services"
        MongoDB[(MongoDB)]
        Pinecone[(Pinecone)]
        Gemini[Google Gemini]
        Neo4j[(Neo4j)]
    end

    Client -->|Type-safe RPC| Router
    ReactHooks -->|useQuery/useMutation| Router
    Types -.->|Generated from| Router

    Router --> Props
    Router --> Analytics

    Props --> Context
    Analytics --> Context
    Context --> Validation

    Props --> MongoDB
    Props --> Pinecone
    Analytics --> Gemini
    Analytics --> Neo4j

    style Client fill:#2596BE,color:#fff
    style Router fill:#2596BE,color:#fff
    style Types fill:#007ACC,color:#fff
```

#### tRPC Request Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant T as tRPC Endpoint
    participant V as Zod Validator
    participant P as Procedure
    participant DB as Database

    C->>T: HTTP Request to /trpc/properties.list
    T->>V: Validate Input Schema
    V-->>T: Validation Result

    alt Valid Input
        T->>P: Execute Procedure
        P->>DB: Query Data
        DB-->>P: Return Results
        P-->>T: Type-safe Response
        T-->>C: JSON with TypeScript Types
    else Invalid Input
        V-->>T: Validation Error
        T-->>C: Type-safe Error Response
    end
```

#### tRPC Type Safety

One of tRPC's main benefits is compile-time type safety:

```typescript
// ❌ TypeScript Error - 'apartament' is not a valid type
trpc.properties.list.query({ type: 'apartament' });

// ❌ TypeScript Error - 'bedroom' doesn't exist
trpc.properties.list.query({ bedroom: 3 });

// ✅ Correct - TypeScript knows all valid parameters
trpc.properties.list.query({
  type: 'apartment',
  bedrooms: 3,
  maxPrice: 750000,
});
```

**Environment Setup**:

The tRPC server requires no additional configuration beyond the standard backend `.env`. It automatically runs at `/trpc` when the backend starts.

**Testing the tRPC API**:

```bash
# Query properties
curl -G "http://localhost:3001/trpc/properties.list" \
  --data-urlencode 'input={"limit":5}'

# Get property statistics
curl "http://localhost:3001/trpc/properties.stats"

# Get market trends
curl -G "http://localhost:3001/trpc/analytics.marketTrends" \
  --data-urlencode 'input={"location":"Austin, TX","period":"month"}'
```

### gRPC Services

EstateWise also provides **gRPC** (Google Remote Procedure Call) services for high-performance, language-agnostic communication between services. This is particularly useful for microservices architectures and cross-language integrations.

#### Protocol Buffers

All gRPC services are defined using Protocol Buffers (protobuf), providing:
- **Strongly typed contracts** between services
- **Language-agnostic** service definitions
- **Efficient binary serialization** (smaller payloads than JSON)
- **Automatic client/server code generation** for multiple languages

#### Service Definitions

Our gRPC services are organized in the `grpc/` directory:

```protobuf
// grpc/protos/properties.proto
service PropertyService {
  rpc GetProperty(GetPropertyRequest) returns (Property);
  rpc ListProperties(ListPropertiesRequest) returns (PropertiesResponse);
  rpc SearchProperties(SearchRequest) returns (stream Property);
  rpc CreateProperty(CreatePropertyRequest) returns (Property);
}

// grpc/protos/analytics.proto
service AnalyticsService {
  rpc GetMarketTrends(MarketTrendsRequest) returns (MarketTrendsResponse);
  rpc PredictPrice(PricePredictionRequest) returns (PricePrediction);
  rpc StreamPriceUpdates(StreamRequest) returns (stream PriceUpdate);
}
```

#### gRPC Architecture

```mermaid
flowchart TB
    subgraph "Client Applications"
        JSClient[JavaScript Client]
        PyClient[Python Client]
        GoClient[Go Client]
        JavaClient[Java Client]
    end

    subgraph "gRPC Server (Port 50051)"
        Proto[Proto Definitions]
        PropertySvc[Property Service]
        AnalyticsSvc[Analytics Service]
        Stream[Streaming Handler]
    end

    subgraph "Protocol Layer"
        PB[Protocol Buffers<br/>Binary Serialization]
        HTTP2[HTTP/2 Transport]
        TLS[TLS Security]
    end

    subgraph "Backend Services"
        MongoDB[(MongoDB)]
        Pinecone[(Pinecone)]
        Neo4j[(Neo4j)]
        Redis[(Redis)]
    end

    JSClient -->|grpc-js| PB
    PyClient -->|grpcio| PB
    GoClient -->|grpc-go| PB
    JavaClient -->|grpc-java| PB

    PB --> HTTP2
    HTTP2 --> TLS
    TLS --> Proto

    Proto --> PropertySvc
    Proto --> AnalyticsSvc
    PropertySvc --> Stream
    AnalyticsSvc --> Stream

    PropertySvc --> MongoDB
    PropertySvc --> Pinecone
    AnalyticsSvc --> Neo4j
    AnalyticsSvc --> Redis

    style Proto fill:#4285F4,color:#fff
    style PB fill:#4285F4,color:#fff
    style HTTP2 fill:#1a73e8,color:#fff
```

#### gRPC Communication Flow

```mermaid
sequenceDiagram
    participant C as gRPC Client
    participant S as gRPC Server
    participant P as Proto Parser
    participant H as Service Handler
    participant DB as Database

    Note over C,S: Unary RPC Example
    C->>S: Binary Request (Protocol Buffers)
    S->>P: Deserialize Proto Message
    P->>H: Call Service Method
    H->>DB: Query Data
    DB-->>H: Return Results
    H->>P: Create Response Message
    P->>S: Serialize to Proto
    S-->>C: Binary Response

    Note over C,S: Server Streaming Example
    C->>S: SearchProperties Request
    S->>H: Start Stream Handler
    loop Stream Results
        H->>DB: Fetch Batch
        DB-->>H: Property Data
        H->>P: Serialize Each Property
        P-->>C: Stream Property Message
    end
    H-->>C: End Stream
```

#### gRPC vs REST vs tRPC Comparison

```mermaid
graph LR
    subgraph "REST API"
        REST[JSON over HTTP/1.1]
        REST1[Manual Type Definitions]
        REST2[Text-based Protocol]
        REST3[Request/Response Only]
    end

    subgraph "tRPC"
        TRPC[JSON over HTTP]
        TRPC1[Auto Type Inference]
        TRPC2[TypeScript-First]
        TRPC3[Request/Response + Subscriptions]
    end

    subgraph "gRPC"
        GRPC[Protobuf over HTTP/2]
        GRPC1[Code Generation]
        GRPC2[Binary Protocol]
        GRPC3[Unary + Streaming]
    end

    style REST fill:#85EA2D,color:#000
    style TRPC fill:#2596BE,color:#fff
    style GRPC fill:#4285F4,color:#fff
```

#### gRPC Performance Benefits

- **Binary Protocol**: 20-30% smaller payloads compared to JSON
- **HTTP/2**: Multiplexing, server push, header compression
- **Streaming**: Bidirectional streaming for real-time updates
- **Code Generation**: Type-safe clients in 10+ languages
- **Load Balancing**: Built-in support for client-side load balancing

**Running the gRPC Server**:

```bash
# Install dependencies
cd grpc
npm install

# Generate TypeScript types from proto files
npm run proto:generate

# Start gRPC server (runs on port 50051)
npm run server
```

**Environment Variables**:

```env
GRPC_SERVER_PORT=50051
GRPC_SERVER_HOST=0.0.0.0
GRPC_USE_TLS=false  # Set to true for production
GRPC_CERT_PATH=/path/to/server.crt
GRPC_KEY_PATH=/path/to/server.key
```

**Testing with grpcurl**:

```bash
# List available services
grpcurl -plaintext localhost:50051 list

# Get property by ID
grpcurl -plaintext -d '{"id": "123"}' \
  localhost:50051 properties.PropertyService/GetProperty

# Stream property search
grpcurl -plaintext -d '{"query": "3 bedrooms"}' \
  localhost:50051 properties.PropertyService/SearchProperties
```

**Language Support**:

The gRPC services can be consumed by clients written in:
- JavaScript/TypeScript (Node.js)
- Python
- Go
- Java
- C#/.NET
- Ruby
- PHP
- And many more...

This makes EstateWise's data and services accessible to a wide range of applications and microservices, regardless of their technology stack.

## Travis CI

Travis CI complements the existing GitHub Actions workflows by running the Node 20 pipeline defined in `.travis.yml`. Each build caches npm dependencies and executes backend and frontend jobs in isolation.

- **Backend stage:** Installs dependencies with `npm --prefix backend ci`, then runs the TypeScript build and Jest suite.
- **Frontend stage:** Installs dependencies with `npm --prefix frontend ci`, performs linting, builds the Next.js app, and runs Jest.
- **Secrets:** Configure the same environment variables used locally (database URIs, Pinecone, Google AI keys, etc.) through the Travis project settings.

> [!NOTE]
> **More details:** See [`TRAVIS_CI.md`](TRAVIS_CI.md) for enablement steps, local parity commands, and maintenance tips.

## Testing

The application includes unit tests for both the backend and frontend components. These tests ensure that the application functions correctly and that any changes made do not break existing functionality.

### Running Tests

To run the tests, follow these steps:

1. **Backend Unit & Integration Tests:**
  - Navigate to the `backend` directory.
  - Run the tests using the following command:

    ```bash
    npm run test
    
    # or run with watch mode (recommended for development - reruns tests on file changes)
    npm run test:watch
    
    # or run with coverage report (recommended for CI/CD - generates a coverage report)
    npm run test:coverage
    ```
  - This command runs the unit tests defined in the `src/tests` directory using Jest.

2. **Frontend Unit & Integration Tests:**
  - Navigate to the `frontend` directory.
  - Run the tests using the following command:

    ```bash
    npm run test
    
    # or run with watch mode (recommended for development - reruns tests on file changes)
    npm run test:watch
    
    # or run with coverage report (recommended for CI/CD - generates a coverage report)
    npm run test:coverage
    ```
  - This command runs the unit tests defined in the `__tests__` directory using Jest and React Testing Library.

3. **Frontend E2E Tests:**
  - For end-to-end tests, we use Cypress and Selenium WebDriver.
  - To run the Selenium E2E tests, navigate to the `frontend` directory and run:

    ```bash
    npm run test:selenium
    ```

  - To run the Cypress E2E tests, navigate to the `frontend` directory and run:

    ```bash
    npm run cypress:run
    
    # to open the Cypress Test Runner in interactive mode, run:
    npm run cypress:open
    ```

  - This command runs the end-to-end tests defined in the `cypress/integration` directory using Cypress.

These tests cover various aspects of the application, including:
- **Unit Tests:** Individual components and functions to ensure they behave as expected.
- **Integration Tests:** Multiple components working together to ensure they interact correctly.
- **End-to-End Tests:** Simulating user interactions to ensure the entire application flow works as intended.

## OpenAPI Specification

An OpenAPI specification file (`openapi.yaml`) is included in the root directory. You can use Swagger UI or Postman to explore and test the API endpoints.

> [!TIP]
> Note: It may not be the latest and most updated version of the API specification, so please refer to the [Swagger API Documentation](#swagger-api-documentation) for the most up-to-date information.

## JSDoc & TypeDoc

We use **JSDoc** and **TypeDoc** to generate developer-friendly documentation for the project.

### JSDoc (for JavaScript)

1. Install:

   ```bash
   npm install --save-dev jsdoc
   ```

2. Configure `jsdoc.json`:

   ```json
   {
     "source": {
       "include": ["backend", "frontend"],
       "includePattern": ".js$"
     },
     "opts": {
       "destination": "docs",
       "recurse": true
     }
   }
   ```

3. Run:

   ```bash
   npx jsdoc -c jsdoc.json
   ```

Open `docs/index.html` to view.

### TypeDoc (for TypeScript)

1. Install:

   ```bash
   npm install --save-dev typedoc
   ```

2. Generate backend docs:

   ```bash
   npm run typedoc:backend
   ```

3. Generate frontend docs:

   ```bash
   npm run typedoc:frontend
   ```

The generated HTML will be in `docs-backend/` and `docs-frontend/`. Open the respective `index.html` files to view.

For more details, see [jsdoc.app](https://jsdoc.app) and [typedoc.org](https://typedoc.org).

## Containerization

The application is containerized using Docker or Podman to ensure consistent, portable, and reproducible builds across different environments.

* **Backend and Frontend Dockerfiles:**
  The `backend/Dockerfile` and `frontend/Dockerfile` define how to build the container images for their respective services. They include steps to install dependencies, build the code, and configure the production servers.

* **Production Stack:**
  The `docker/` directory contains a full production compose stack (`compose.prod.yml` for Docker, `podman-compose.prod.yml` for Podman) with Nginx, MongoDB, healthchecks, and optional Neo4j/Agentic AI profiles. See [`docker/README.md`](docker/README.md) for details.

* **Package-level Compose:**
  Each package with its own container also ships a `podman-compose.yaml` alongside its `docker-compose.yaml` (`agentic-ai/`, `mcp/`).

* **GitHub Actions Integration:**
  As part of the CI/CD pipeline, the workflow automatically builds these Docker images after testing and linting have succeeded. It uses the `docker/build-push-action@v5` to build the images and then push them to GitHub Container Registry (GHCR).

* **Image Scanning:**
  Once the images are built and published, they are scanned for vulnerabilities using Trivy in the pipeline to catch any security issues before deployment.

* **Local Usage:**
  For local development or quick testing:

  ```bash
  # Docker
  docker compose up --build

  # Podman
  podman compose up --build
  ```

* **Deployment:**
  In production, the images are pulled directly from GHCR and deployed to AWS infrastructure or Vercel, enabling a consistent artifact to run from local to production.

This approach ensures faster onboarding for developers, simplifies deployments, and minimizes environment drift.

## VS Code Extension

We have developed a VSCode extension to enhance the development experience with **EstateWise**. This extension provides features such as:

- **Instant Chat Access**  
  Open the EstateWise chatbot directly in VS Code via the Command Palette (`Estatewise Chat: Open Chat`).

- **Persistent Webview Panel**  
  Keeps your conversation context alive even when the panel is hidden or you switch files.

- **Configurable Panel**  
  Customize the panel title, target editor column, iframe width/height, script permissions, and auto‑open behavior via VS Code settings.

- **Secure Embedding**  
  Loads the chatbot through a sandboxed iframe with a strict Content‑Security‑Policy, so all logic remains safely hosted on `https://estatewise.vercel.app/chat`.

- **Zero Backend Overhead**  
  No extra server or API keys required in VS Code—everything runs through the existing EstateWise web app.

- **Easy Installation**  
  Install the `.vsix` package locally or grab it from the VS Code Marketplace, then start chatting with EstateWise without leaving your editor.

<p align="center">
  <img src="img/extension.png" alt="EstateWise VSCode Extension" width="100%" />
</p>

**For full installation, development, and configuration instructions, see the [VS Code Extension docs](extension/README.md).**

> [!TIP]
> VS Code Marketplace: [Estatewise Chat Extension](https://marketplace.visualstudio.com/items?itemName=hoangsonw.estatewise-chat).

## Mintlify Documentation

This project is also documented using Mintlify, which provides an easy way to create and maintain documentation.

The Mintlify documentation complements, rather than replaces, the existing README and technical docs. It offers a more AI-native, user-friendly interface for exploring the project's features, setup instructions, architecture, and usage examples.

You can access the Mintlify documentation for this project at the [Mintlify docs directory](mintlify-ai-docs/README.md).

<p align="center">
  <img src="img/mintlify.png" alt="EstateWise Logo" width="100%"/>
</p>

## Contributing

Contributions are welcome! Follow these steps:

1. **Fork the repository.**
2. **Create a feature branch:**  
   `git checkout -b feature/your-feature-name`
3. **Commit your changes:**  
   `git commit -m 'Add new feature'`
4. **Push to the branch:**  
   `git push origin feature/your-feature-name`
5. **Open a Pull Request** with a clear description of your changes.
6. **Follow the project's coding standards:**  
   - Use ESLint and Prettier for code formatting.
   - Write tests for new features or bug fixes.
   - Update documentation as needed.
7. **Review and address feedback:**  
   - Be responsive to comments on your pull request.
   - Make necessary changes and push updates to the same branch.
8. **Celebrate your contribution!**  
   Once your pull request is merged, you will be recognized as a contributor to the project.

This project follows the [Contributor Covenant Code of Conduct](.github/CODE_OF_CONDUCT.md). By participating, you agree to abide by its terms.

## License

This project is licensed under the [MIT License](LICENSE).

> [!CAUTION]
> This project is provided for educational purposes only. Any use, including non-commercial or academic, must include proper attribution to the original creators. Unauthorized redistribution or commercial use without explicit permission is strictly prohibited.

**Copyright © 2025 EstateWise Team. All rights reserved.**

## Contact

For any questions or inquiries, please contact the [repository maintainer](https://github.com/hoangsonww) or open an issue in the repository [here](https://github.com/hoangsonww/EstateWise-Chapel-Hill-Chatbot/issues). You're also welcome to join our ongoing discussions [at this link](https://github.com/hoangsonww/EstateWise-Chapel-Hill-Chatbot/discussions).

---

Thank you for checking out **EstateWise**! We hope you find it useful in your real estate journey. If you have any questions or feedback, feel free to reach out or contribute to the project. 🏡🚀

[🔗 Visit the Live App](https://estatewise.vercel.app)

[📖 Read the Technical Documentation](TECH_DOCS.md)

[📝 Go to Architecture Overview](ARCHITECTURE.md)

[🗺️ RAG Architecture Documentation](RAG_SYSTEM.md)

[⚖️ gRPC & tRPC Documentation](GRPC_TRPC.md)

[⬆️ Back to Top](#table-of-contents)
