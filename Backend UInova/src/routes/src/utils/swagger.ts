// src/utils/swagger.ts
import swaggerJsdoc, { Options } from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Express, Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";

function getPkgInfo() {
  try {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const raw = fs.readFileSync(pkgPath, "utf-8");
    const json = JSON.parse(raw);
    return {
      name: json.name || "UInova",
      version: json.version || "1.0.0",
      description: json.description || "API nocode UInova – Express + Prisma + OpenAI",
    };
  } catch {
    return {
      name: "UInova",
      version: "1.0.0",
      description: "API nocode UInova – Express + Prisma + OpenAI",
    };
  }
}

const { name, version, description } = getPkgInfo();
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";

const options: Options = {
  definition: {
    openapi: "3.0.0",
    info: { title: `${name} API`, version, description },
    servers: [{ url: API_BASE_URL }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // Scanne routes + controllers pour les annotations JSDoc @swagger
  apis: ["./src/routes/**/*.ts", "./src/controllers/**/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  // JSON brut (utile pour Postman, Insomnia, CI, front docs…)
  app.get("/api-docs.json", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // UI
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      persistAuthorization: true,
      docExpansion: "none",
      displayRequestDuration: true,
      filter: true,
      swaggerOptions: {
        operationsSorter: "alpha",
        tagsSorter: "alpha",
      },
      customCss: `
        .topbar { display:none }
        body { background: #0b0c10; }
        .swagger-ui .opblock .opblock-summary { background: #111217; }
        .swagger-ui .info .title, .swagger-ui { color: #e5e7eb; }
        .swagger-ui .model-box { background: #0f1115; }
        .swagger-ui .opblock-tag { color: #e5e7eb; }
      `,
      customSiteTitle: `${name} API Docs`,
    })
  );
}
