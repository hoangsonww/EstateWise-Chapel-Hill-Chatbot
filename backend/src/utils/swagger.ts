import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Luxera API",
      version: "1.0.0",
      description:
        "API documentation for Luxera chatbot - an AI assistant helping users find their dream homes in Chapel Hill, NC.",
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
      contact: {
        name: "Luxera Real Estate LLC",
        email: "info@homesluxera.com",
        url: "https://ai.homesluxera.com/",
      },
    },
    servers: [
      {
        url: "https://luxerachat.vercel.app/",
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

const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;
