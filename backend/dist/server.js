"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const serve_favicon_1 = __importDefault(require("serve-favicon"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_1 = __importDefault(require("./utils/swagger"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const conversation_routes_1 = __importDefault(require("./routes/conversation.routes"));
const property_routes_1 = __importDefault(require("./routes/property.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
// ─── Winston Logger Setup ────────────────────────────────────────────────────
const winston_1 = __importDefault(require("winston"));
const logger = winston_1.default.createLogger({
    level: "info",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`)),
    transports: [new winston_1.default.transports.Console()],
});
// ─── Express Status Monitor ─────────────────────────────────────────────────
const express_status_monitor_1 = __importDefault(require("express-status-monitor"));
// ─── Prometheus Metrics Setup ───────────────────────────────────────────────
const prom_client_1 = __importDefault(require("prom-client"));
// Collect default system metrics (CPU, memory, etc)
prom_client_1.default.collectDefaultMetrics();
// HTTP request duration histogram
const httpHistogram = new prom_client_1.default.Histogram({
    name: "http_request_duration_seconds",
    help: "Histogram of HTTP request durations in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 1, 1.5, 3, 5],
});
// MongoDB connection status gauge
const mongoConnectionGauge = new prom_client_1.default.Gauge({
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
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cookie_parser_1.default)());
// ─── Status Monitor Middleware ───────────────────────────────────────────────
app.use((0, express_status_monitor_1.default)({
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
}));
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
        logger.info(`⬅️ Response: ${method} ${url} → ${res.statusCode} (${(durationSec * 1000).toFixed(1)}ms)`);
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
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Serve favicon
app.use((0, serve_favicon_1.default)(path_1.default.join(__dirname, "public", "favicon.ico")));
// ─── Expose Prometheus /metrics endpoint ───────────────────────────────────
app.get("/metrics", async (req, res) => {
    try {
        res.set("Content-Type", prom_client_1.default.register.contentType);
        res.end(await prom_client_1.default.register.metrics());
    }
    catch (ex) {
        logger.error(`Error in /metrics endpoint: ${ex}`);
        res.status(500).end(String(ex));
    }
});
// REST API routes
app.use("/api/auth", auth_routes_1.default);
app.use("/api/chat", chat_routes_1.default);
app.use("/api/conversations", conversation_routes_1.default);
app.use("/api/properties", property_routes_1.default);
// Serve Swagger JSON definition
app.get("/swagger.json", (req, res) => {
    res.json(swagger_1.default);
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
app.use(error_middleware_1.errorHandler);
// ─── MongoDB Connection & Resilience ─────────────────────────────────────────
const connectWithRetry = () => {
    mongoose_1.default
        .connect(process.env.MONGO_URI, {
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
const db = mongoose_1.default.connection;
db.on("error", (err) => {
    logger.error(`❌ MongoDB connection error: ${err}`);
    mongoConnectionGauge.set(0);
    if (err.code === "ECONNRESET") {
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
exports.default = app;
