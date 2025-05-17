import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import favicon from "serve-favicon";
import path from "path";
import dotenv from "dotenv";
import swaggerSpec from "./utils/swagger";
import authRoutes from "./routes/auth.routes";
import chatRoutes from "./routes/chat.routes";
import conversationRoutes from "./routes/conversation.routes";
import propertyRoutes from "./routes/property.routes";
import { errorHandler } from "./middleware/error.middleware";
import cookieParser from "cookie-parser";

// ─── Winston Logger Setup ────────────────────────────────────────────────────
import winston from "winston";
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      ({ timestamp, level, message }) =>
        `${timestamp} [${level.toUpperCase()}] ${message}`,
    ),
  ),
  transports: [new winston.transports.Console()],
});

// ─── Express Status Monitor ─────────────────────────────────────────────────
import statusMonitor from "express-status-monitor";

// ─── Prometheus Metrics Setup ───────────────────────────────────────────────
import client from "prom-client";

// Collect default system metrics (CPU, memory, etc)
client.collectDefaultMetrics();

// HTTP request duration histogram
const httpHistogram = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Histogram of HTTP request durations in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 1, 1.5, 3, 5],
});

// MongoDB connection status gauge
const mongoConnectionGauge = new client.Gauge({
  name: "mongodb_connection_status",
  help: "MongoDB connection status (1 = connected, 0 = disconnected)",
});

// ─── Global Error Handlers ───────────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  logger.error(`❌ Uncaught Exception: ${err.stack || err}`);
});
process.on("unhandledRejection", (reason) => {
  logger.error(`❌ Unhandled Rejection: ${reason}`);
});

// ─── App Setup ────────────────────────────────────────────────────────────────
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cookieParser());

// ─── Status Monitor Middleware ───────────────────────────────────────────────
app.use(
  statusMonitor({
    title: "EstateWise Status",
    path: "/status",
    spans: [
      { interval: 1, retention: 60 },
      { interval: 5, retention: 60 },
      { interval: 15, retention: 60 },
    ],
    chartVisibility: {
      cpu: true,
      mem: true,
      load: true,
      heap: true,
      responseTime: true,
      rps: true,
      statusCodes: true,
    },
  }),
);

// ─── Request/Response Logging & Metrics ─────────────────────────────────────
app.use((req, res, next) => {
  const { method, url, headers, body } = req;
  logger.info(`➡️ Incoming Request: ${method} ${url}`);
  logger.debug(`   Headers: ${JSON.stringify(headers)}`);
  if (body && Object.keys(body).length > 0) {
    logger.debug(`   Body: ${JSON.stringify(body)}`);
  }

  const end = httpHistogram.startTimer({ method, route: url });

  res.on("finish", () => {
    const durationSec = end({ status_code: res.statusCode });
    logger.info(
      `⬅️ Response: ${method} ${url} → ${res.statusCode} (${(durationSec * 1000).toFixed(1)}ms)`,
    );
  });

  next();
});

// CORS configuration
const corsOptions = {
  origin: "*", // Allow all origins
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
};
app.use(cors(corsOptions));
app.use(express.json());

// Serve favicon
app.use(favicon(path.join(__dirname, "public", "favicon.ico")));

// ─── Expose Prometheus /metrics endpoint ───────────────────────────────────
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  } catch (ex) {
    logger.error(`Error in /metrics endpoint: ${ex}`);
    res.status(500).end(String(ex));
  }
});

// REST API routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/properties", propertyRoutes);

// Serve Swagger JSON definition
app.get("/swagger.json", (req, res) => {
  res.json(swaggerSpec);
});

// Serve Swagger UI using a CDN
app.get("/api-docs", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>EstateWise API Documentation</title>
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
        <link rel="icon" type="image/png" href="/favicon-32x32.png" sizes="32x32" />
        <link rel="icon" type="image/png" href="/favicon-32x32.png" sizes="16x16" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <style>
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
        <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
        <script>
          window.onload = function() {
            const ui = SwaggerUIBundle({
              url: '/swagger.json',
              dom_id: '#swagger-ui',
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
              ],
              layout: "StandaloneLayout"
            });
            window.ui = ui;
          }
        </script>
      </body>
    </html>
  `);
});

// Redirect root to /api-docs
app.get("/", (req, res) => {
  res.redirect("/api-docs");
});

// Error Handling Middleware
app.use(errorHandler);

// ─── MongoDB Connection & Resilience ─────────────────────────────────────────
const connectWithRetry = () => {
  mongoose
    .connect(process.env.MONGO_URI!, {
      // @ts-ignore
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 60000, // retry up to 60s on initial connect
      keepAlive: true, // keep sockets alive
      keepAliveInitialDelay: 300000, // 5m before sending first keepAlive
      socketTimeoutMS: 45000, // close socket after 45s of no response
    })
    .then(() => {
      logger.info("✅ Connected to MongoDB");
    })
    .catch((err) => {
      logger.error(`❌ Error connecting to MongoDB: ${err}`);
      logger.info("🔄 Retrying MongoDB connection in 5s...");
      setTimeout(connectWithRetry, 5000);
    });
};

// Start initial connection
connectWithRetry();

// Mongoose connection event listeners
const db = mongoose.connection;
db.on("error", (err) => {
  logger.error(`❌ MongoDB connection error: ${err}`);
  mongoConnectionGauge.set(0);
  if ((err as any).code === "ECONNRESET") {
    logger.info("🔄 ECONNRESET detected — reconnecting to MongoDB...");
    connectWithRetry();
  }
});
db.on("disconnected", () => {
  logger.warn("⚠️ MongoDB disconnected — reconnecting...");
  mongoConnectionGauge.set(0);
  connectWithRetry();
});
db.on("reconnected", () => {
  logger.info("🔌 MongoDB reconnected");
  mongoConnectionGauge.set(1);
});
db.once("open", () => {
  logger.info("📡 MongoDB connection open");
  mongoConnectionGauge.set(1);
  // Only start listening after DB is open
  app.listen(PORT, () => {
    logger.info(`🏠 EstateWise backend listening on port ${PORT}`);
  });
});

export default app;
