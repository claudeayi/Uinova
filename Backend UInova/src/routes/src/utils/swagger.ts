import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "UInova API",
      version: "1.0.0",
      description: "API nocode UInova – Express + Prisma + OpenAI",
    },
    servers: [{ url: "http://localhost:5000/api" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: [
    "./src/routes/*.ts",
    "./src/controllers/*.ts"
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: any) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
