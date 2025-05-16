"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Luxera API",
            version: "1.0.0",
            description: "API documentation for Luxera chatbot - an AI assistant helping users find their dream homes in Chapel Hill, NC.",
            license: {
                name: "MIT",
                url: "https://opensource.org/licenses/MIT",
            },
            contact: {
                name: "LuxeraAI",
                email: "info@homesluxera.com",
                url: "https://ai.homesluxera.com",
            },
        },
        servers: [
            {
                url: "https://api.homesluxera.com/",
                description: "Production server",
            },
            {
                url: "http://localhost:3001",
                description: "Local server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        // Uncomment below to apply global security to all endpoints
        // security: [
        //   {
        //     bearerAuth: [],
        //   },
        // ],
    },
    apis: [
        "./src/routes/*.ts",
        "./src/routes/*.js",
        "./src/models/*.ts",
        "./src/models/*.js",
    ],
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(options);
exports.default = swaggerSpec;
