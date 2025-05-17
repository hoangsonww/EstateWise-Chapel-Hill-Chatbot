# Luxera – Your Intelligent Estate Assistant 🏡

**Luxera** is a full‑stack AI chatbot built for Chapel Hill, NC and the surrounding areas, featuring a sleek, responsive UI with smooth
animations and optional sign‑in to save your conversation history. Under the hood it leverages agentic AI, Retrieval‑Augmented Generation with Pinecone
(kNN & cosine similarity), k‑Means clustering, and a Mixture‑of‑Experts ensemble to deliver fast, hyper‑personalized property recommendations based on your preferences. 📲

> Built by Rikhil Fellner, Muskaan Joshi, David Nguyen, Vinir Rai, Rishabh Singh, and Rajbalan Yogarajan for the BUSI/COMP-488 course at UNC-Chapel Hill, Spring 2025.

## Table of Contents

- [Live App](#live-app)
  - [Key Technologies](#key-technologies-used)
  - [AI Techniques](#ai-techniques)
- [Features](#features)
- [Architecture](#architecture)
  - [Backend](#backend)
  - [Frontend](#frontend)
  - [High-Level Architecture Flow Diagrams](#high-level-architecture-flow-diagrams)
- [Setup & Installation](#setup--installation)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Deployment](#deployment)
- [Usage](#usage)
- [User Interface](#user-interface)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication)
  - [Conversations](#conversations)
  - [Chat](#chat)
  - [Swagger API Documentation](#swagger-api-documentation)
- [Project Structure](#project-structure)
- [Dockerization](#dockerization)
- [Prometheus Monitoring & Visualizations](#prometheus-monitoring--visualizations)
- [OpenAPI Specification](#openapi-specification)
- [Challenges & Future Improvements](#challenges--future-improvements)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgments](#acknowledgments)

## Live App

Visit the live app on **Vercel** at **[https://ai.homesluxera.com/](https://ai.homesluxera.com/)** and explore the intelligent estate assistant!

The backend API is also available at: [https://api.homesluxera.com/](https://api.homesluxera.com/).

Feel free to use the app as a guest or sign up for an account to save your conversations!

### Key Technologies Used

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer%20Motion-000000?style=for-the-badge&logo=framer&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-F38B4A?style=for-the-badge&logo=chartdotjs&logoColor=white)
![Shadcn UI](https://img.shields.io/badge/Shadcn%20UI-000000?style=for-the-badge&logo=shadcn/ui&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Pinecone](https://img.shields.io/badge/Pinecone-FF6F61?style=for-the-badge&logo=googledataflow&logoColor=white)
![Google AI](https://img.shields.io/badge/Google%20AI-4285F4?style=for-the-badge&logo=google&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=json-web-tokens)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Prometheus](https://img.shields.io/badge/Prometheus-E6512D?style=for-the-badge&logo=prometheus&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=white)
![Postman](https://img.shields.io/badge/Postman-FF6C37?style=for-the-badge&logo=postman&logoColor=white)

For a more detailed technical overview, check out the [Technical Documentation](TECH_DOCS.md) file. It includes more information on how the app was built, how it works, how the data was processed, and more.

> Feel free to go to this [Colaboratory Notebook](https://colab.research.google.com/drive/1-Z3h0LUHl0v-e0RaZgwruL8q180Uk4Z-?usp=sharing) to directly view and run the code in this notebook & see the results in real time.

For a CLI version of the chatbot, as well as the initial EDA (Exploratory Data Analysis) of the properties data and interactive geospatial visualizations, check out the Jupyter notebooks in the root directory: [EDA-CLI-Chatbot.ipynb](EDA-CLI-Chatbot.ipynb).

### AI Techniques

**Luxera** combines a modern API, real‑time chat, and a responsive UI with a powerful AI stack to deliver hyper‑personalized property recommendations:

- **Retrieval‑Augmented Generation (RAG):** Uses Pinecone for kNN‑based vector retrieval, then fuses retrieved data into generated responses.
- **k‑Means Clustering:** Automatically groups similar listings and finds closest matches to refine recommendations.
  - All features are also normalized to a range of 0-1 for better clustering and kNN performance.
- **Decision AI Agent:** Decides whether to fetch RAG data (via `queryProperties`); if yes, it pulls in the Pinecone results, otherwise it skips straight to the Mixture‑of‑Experts pipeline.
- **Mixture of Experts (MoE):** Dynamically routes each query through a master model to select specialized sub‑models (Data Analyst, Lifestyle Concierge, Financial Advisor, Neighborhood Expert, Cluster Analyst) for maximal relevance.
- **Feedback Loop & Reinforcement Learning:** Users rate responses; thumbs‑up/down adjust expert weights per conversation, and the system continuously learns to improve accuracy.
- **Prompt Engineering:** Each expert has a unique prompt template, ensuring tailored responses based on user input.
  - All experts, agents, and merger have a detailed and ultra-specific prompt template to ensure the best possible responses.
- **kNN & Cosine Similarity:** Uses Pinecone for fast, real‑time property retrieval based on user queries.

## Features

Luxera is packed with both UI and AI features to enhance your home-finding experience:

- **Intelligent Property Recommendations**  
  Get tailored property suggestions powered by AI and Retrieval‑Augmented Generation (RAG).

- **Secure User Authentication**  
  Sign up, log in, and log out with JWT‑based security.

- **Conversation History**

  - **Authenticated users** can view, rename, and delete past chats.
  - **Guest users** still have their conversation history saved locally in the browser.

- **Full‑Text Search**  
  Quickly search your conversation history for keywords, topics, or specific properties.

- **Rating System & Feedback Loop**  
  Rate each AI response (thumbs up/down) to adjust expert weights and continuously improve recommendations.

- **Mixture‑of‑Experts (MoE) & Manual Expert View**

  - The AI dynamically routes queries through specialized experts (Data Analyst, Lifestyle Concierge, Financial Advisor, Neighborhood Expert, Cluster Analyst).
  - Optionally switch to any single expert’s view to see their raw recommendation.

- **Interactive Visualizations**

  - In‑chat, the AI generates live Chart.js graphs from Pinecone data so you can instantly see trends and distributions.
  - A dedicated Visualizations page offers aggregate charts and insights for all Chapel Hill properties.

- **Clustering & Similarity Search**

  - k‑Means clustering groups similar properties for more focused suggestions.
  - kNN & Cosine Similarity (via Pinecone) finds the closest matches to your query in real time.

- **Smooth Animations**  
  Engaging transitions and micro‑interactions powered by Framer Motion.

- **Interactive Chat Interface**  
  Enjoy a fully animated chat experience with Markdown‑formatted responses, collapsible expert views, and inline charts.

- **Responsive, Themeable UI**

  - Optimized for desktop, tablet, and mobile.
  - Dark and light modes with your preference saved locally.

- **Guest Mode**  
  Use the app without creating an account—history is stored only in your browser.

- **Comprehensive Property Data**
  - **Over 50,000** Chapel Hill area listings, complete with prices, beds, baths, living area, year built, and more.
  - For security, this data isn’t included in the repo—please plug in your own.
  - Peek at our sample dataset here:  
    [Google Drive CSV (50k+ records)](https://drive.google.com/file/d/1vJCSlQgnQyVxoINosfWJWl6Jg1f0ltyo/view?usp=sharing)
  - After cleaning, **30,772 properties** remain in the database, available for the chatbot to use.
  - Explore `Initial-Data-Analysis.ipynb` in the repo root for an initial, quick Jupyter‑powered dive into the data.
  - Explore `EDA-CLI-Chatbot.ipynb` in the repo root for a more detailed and comprehensive analysis of the data, as well as a CLI version of our chatbot.

> Note: Please note that the deployed version of the app is subject to Vercel's infrastructure limitations, which may affect the performance and availability of the app. You are encouraged to run the app locally for the best experience.

## Architecture

**Luxera** is built with a modern, full-stack architecture consisting of two major parts:

### Backend

- **Express.js & TypeScript:** A robust backend API that handles authentication, conversation management, and AI chat processing.
- **MongoDB:** Database for storing user data, conversation histories, and more.
- **JWT Authentication:** Secure user sessions using JSON Web Tokens.
- **Integration with AI & RAG:** Communicates with AI APIs and uses **Google Gemini API & Pinecone** for advanced property recommendation logic.
- **Swagger API Documentation:** Automatically generated API documentation for easy reference and testing.
- **Docker:** Containerization for easy deployment and scalability.
- **OpenAPI Specification:** An OpenAPI specification file (`openapi.yaml`) is included in the root directory. You can use Swagger UI or Postman to explore and test the API endpoints.
- and more...

### Frontend

- **Next.js & React:** A responsive, animation-rich web application.
- **Shadcn UI Components:** For a consistent design system across the app.
- **Framer Motion:** Provides smooth animations and transitions throughout the user experience.
- **Dark Mode/Light Mode:** Users can toggle themes with seamless background color transitions.
- **Chart.js:** For interactive data visualizations and graphs.
- and more...

### High-Level Architecture Flow Diagrams

#### AI Architecture Flow Diagram

Here's a high-level architecture flow diagram that shows the AI processing and expert selection process:

<p align="center">
  <img src="img/flowchart.png" alt="High-Level Architecture Flow Diagram" width="100%" />
</p>

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
                       │ (REST API Calls)
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
┌─────────────────┐       ┌─────────────────┐
│   MongoDB       │       │ Pinecone Vector │
│ (User Data,     │◄─────►│   Database      │
│  Convo History) │       │ (Knowledge Base)│
└─────────────────┘       └─────────────────┘
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
         │   orchestration             │
         │ - Expert models (Data       │
         │   Analyst,                  │
         │   Lifestyle Concierge,      │
         │   Financial Advisor,        │
         │   Neighborhood Expert,      │
         │   Cluster Analyst)          │
         │ - Expert selection process  │
         │   (Mixture of Experts)      │
         │ - Combine responses from    │
         │   experts                   │
         │ - Feedback loop for rating  │
         │   AI responses              │
         │ - Reinforcement learning    │
         │   for expert weights        │
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

## Setup & Installation

### Backend Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/hoangsonww/Luxera-Chapel-Hill-Chatbot.git
   cd Luxera-Chapel-Hill-Chatbot/backend
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
   PINECONE_INDEX=Luxera-index
   ```

   Important: Be sure that you created the Pinecone index with the name `Luxera-index` in your Pinecone account before proceeding. Then,
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
   npm install
   ```

3. **Run the Frontend Development Server:**

   ```bash
   npm run dev
   ```

   The frontend should be running at [http://localhost:3000](http://localhost:3000).

4. **Change API URL:**  
   If your backend is running on a different port or domain, update the API URL in the frontend code (simply CTRL + F or CMD + F and search for `https://api.homesluxera.com` in all frontend files, then replace it with your backend URL - by default it is `http://localhost:3001`).

5. **View and Interact with the App:**  
   Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to view the app. You can interact with the chatbot, sign up, log in, and explore the features.

> Note: As you develop, before committing, we recommend running the linter and formatter to ensure code quality with `npm run format`. This will format your code according to the project's ESLint and Prettier configurations.

## Deployment

- **Backend:** Deploy your backend on your chosen platform (Heroku, Vercel, AWS, etc.) and ensure environment variables are properly set.
  - Currently, the backend is deployed on Vercel at [https://api.homesluxera.com/](https://api.homesluxera.com/).
- **Frontend:** Deploy the React/Next.js frontend using services like Vercel or Netlify. Update any API endpoints if necessary.
  - Currently, the frontend is deployed on Vercel at [https://ai.homesluxera.com/](https://ai.homesluxera.com/).
- **Database:** Ensure your MongoDB instance is accessible from your deployed backend. You can use services like MongoDB Atlas for cloud hosting.
  - Currently, we are using MongoDB Atlas for the database. It is a cloud-hosted MongoDB service that provides a fully managed database solution.
- **Pinecone:** Ensure your Pinecone instance is accessible from your deployed backend. You can use the Pinecone CLI or API to manage your index and data.
  - Currently, we are using Pinecone for vector storage and retrieval. It is a cloud-hosted vector database that provides a fully managed solution for storing and retrieving vectors.

![Vercel](https://img.shields.io/badge/Deployed%20on%20Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![MongoDB Atlas](https://img.shields.io/badge/Using%20MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Pinecone](https://img.shields.io/badge/Using%20Pinecone-FF6F61?style=for-the-badge&logo=googledataflow&logoColor=white)

## Usage

- **Landing Page:**  
  Learn about the app’s features and get started by signing in or continuing as a guest.
- **Authentication:**  
  Create an account, log in, and manage your user profile securely using JWT authentication.
- **Chat Interface:**  
  Interact with the AI assistant in real time. Authenticated users can save, rename, and delete conversations.
- **Theme Toggle:**  
  Switch between dark and light modes with smooth background transitions.
- **Search & Management:**  
  Easily search through your conversation history and manage your saved conversations from the sidebar.
- **Guest Mode:**  
  Use the app as a guest without creating an account. Conversations will still be saved locally in the browser.
- **Rating System:**  
  Rate the AI's responses to help improve its performance over time. If you are not satisfied with the AI's response, you can give a thumbs down rating, and the backend API will tweak the experts selection process (i.e. the weights of the experts) to improve the model's performance.
- **Expert Selection:**  
  The AI uses a mixture of experts to provide the best possible response based on user input. Users can also select a specific expert's response to view.

> Note: The expert view feature is ONLY available for new messages. If you load a conversation from either the local storage or the database, the expert view feature will not be available, and only the combined response will be shown.

## User Interface

Luxera features a modern, animated, and fully responsive user interface built with Next.js and Shadcn UI, with the help of Tailwind CSS for styling. The UI is designed to be intuitive and user-friendly, ensuring a seamless experience across devices.

### Landing Page

<p align="center">
  <img src="img/landing.png" alt="Luxera UI" width="100%" />
</p>

### Chat Interface - Guest

<p align="center">
  <img src="img/home-guest.png" alt="Luxera UI" width="100%" />
</p>

### Chat Interface - Authenticated

<p align="center">
  <img src="img/home-authed.png" alt="Luxera UI" width="100%" />
</p>

### Dark Mode: Chat Interface - Guest

<p align="center">
  <img src="img/home-guest-dark.png" alt="Luxera UI" width="100%" />
</p>

### Dark Mode: Chat Interface - Authenticated

<p align="center">
  <img src="img/home-authed-dark.png" alt="Luxera UI" width="100%" />
</p>

### Visualizations Page

<p align="center">
  <img src="img/visualizations.png" alt="Luxera UI" width="100%" />
</p>

### Login Page

<p align="center">
  <img src="img/login.png" alt="Luxera UI" width="100%" />
</p>

### Register Page

<p align="center">
  <img src="img/register.png" alt="Luxera UI" width="100%" />
</p>

### Reset Password Page

<p align="center">
  <img src="img/reset-password.png" alt="Luxera UI" width="100%" />
</p>

## API Endpoints

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

### Chat

- **POST** `/api/chat` – Send a chat message and receive an AI-generated response.
- **POST** `/api/chat/rate` – Rate the AI's response (thumbs up or down).

More endpoints can be found in the Swagger API documentation. Endpoints may be added or modified as the project evolves, so this may not be an exhaustive list of all available endpoints.

### Swagger API Documentation

Access detailed API docs at the `/api-docs` endpoint on your deployed backend.

<p align="center">
  <img src="img/swagger.png" alt="Swagger API Documentation" width="100%" />
</p>

Live API documentation is available at: [https://api.homesluxera.com/api-docs](https://api.homesluxera.com/api-docs). You can visit it to explore and directly interact with the API endpoints, right in your web browser!

## Project Structure

```plaintext
Luxera/
├── frontend/                 # Frontend Next.js application
│   ├── public/               # Static assets (images, icons, etc.)
│   ├── components/           # Reusable UI components
│   ├── pages/                # Next.js pages (Chat, Login, Signup, etc.)
│   ├── styles/               # CSS/SCSS files
│   ├── package.json
│   ├── tsconfig.json
│   └── ... (other config files, etc.)
├── server/                   # Backend Express application
│   ├── src/
│   │   ├── controllers/      # API controllers and endpoints
│   │   ├── models/           # Mongoose models
│   │   ├── routes/           # Express routes
│   │   ├── services/         # Business logic and integrations
│   │   └── middleware/       # Authentication, error handling, etc.
│   ├── package.json
│   ├── tsconfig.json
│   └── ... (other config files, etc.)
├── .env                      # Environment variables for development
├── README.md                 # This file
├── docker-compose.yml        # Docker configuration for backend and frontend
├── Dockerfile                # Dockerfile for backend
├── openapi.yaml              # OpenAPI specification for API documentation
├── EDA-CLI-Chatbot.ipynb        # Jupyter notebook for CLI chatbot
├── Initial-Data-Analysis.ipynb  # Jupyter notebook for initial data analysis
└── ... (other config files, etc.)
```

## Dockerization

To run the application **(OPTIONAL)** using Docker:

1. Ensure you have [Docker](https://www.docker.com/) installed.
2. In the project root directory, run:

   ```bash
   docker-compose up --build
   ```

This command builds and starts both the backend and frontend services as defined in the `docker-compose.yml` file.

However, you don't need to run the app using Docker. You can run the backend and frontend separately as described in the **Setup & Installation** section.

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

To view live server metrics, go to `https://api.homesluxera.com/metrics` in your browser. This will show you the raw metrics collected by Prometheus. If you are running the app locally, you can go to `http://localhost:3001/metrics` in your browser.

To view live server data, go to `https://api.homesluxera.com/status` in your browser. If you are running the app locally, you can go to `http://localhost:3001/status` in your browser.

<p align="center">
  <img src="img/prometheus.png" alt="Prometheus Monitoring" width="100%" style="border-radius: 8px" />
</p>

## OpenAPI Specification

An OpenAPI specification file (`openapi.yaml`) is included in the root directory. You can use Swagger UI or Postman to explore and test the API endpoints.

> Note: It may not be the latest and most updated version of the API specification, so please refer to the [Swagger API Documentation](#swagger-api-documentation) for the most up-to-date information.

## Challenges & Future Improvements

- **Data Quality:** Ensuring the quality and accuracy of the property data used for recommendations.
- **Performance Optimization:** Improving the speed and efficiency of the AI processing and response generation.
- **User Experience:** Enhancing the user interface and experience based on user feedback.
- **Vercel Infrastructure Limitations:** The current Vercel infrastructure has limitations on the number of requests and the amount of data that can be processed. We may need to consider using a different hosting solution for the backend in the future.
  - Additionally, it imposes a limit of 60 seconds to process API requests, which may not be sufficient for some complex queries. Thus, it may cause timeouts for some requests.
  - The user will be notified if the request times out, and the user will be prompted to try again later.
- **Gemini API Limitations:** The current Gemini API has limitations on the number of requests and the amount of data that can be processed. We may need to consider using a different AI solution in the future.
  - Also, Google imposes rate limits on the number of requests that can be made to the Gemini API. If the rate limit is exceeded, the user will be notified and prompted to try again later.

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

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

For any questions or inquiries, please contact the [repository maintainer](https://github.com/hoangsonww) or open an issue in the repository.

## Acknowledgments

- Thanks to the BUSI/COMP-488 course at UNC-Chapel Hill for the inspiration and opportunity to build this project.
  - Thanks to the professors and TAs for the comprehensive Chapel Hill real-estate datasets provided. Without them, we would not have been able to build this project.
- Special thanks to our instructor and TA for their guidance and support throughout the course.
- Huge thanks to the team members for their hard work and collaboration in building this project!

---

[📝 Go to Technical Documentation](TECH_DOCS.md)

[⬆️ Back to Top](#table-of-contents)
