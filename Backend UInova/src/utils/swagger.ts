import { Express } from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";

// On charge swagger.yaml
const swaggerDocument = YAML.load(path.resolve(__dirname, "../../swagger.yaml"));

export function setupSwagger(app: Express) {
  // Swagger UI
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // Redoc
  app.get("/redoc", (_req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>UInova API Docs</title>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          <redoc spec-url='/swagger.yaml'></redoc>
          <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
        </body>
      </html>
    `);
  });

  // Permet d’exposer le YAML brut pour Redoc
  app.get("/swagger.yaml", (_req, res) => {
    res.setHeader("Content-Type", "text/yaml");
    res.send(swaggerDocument);
  });

  console.log("📚 Swagger UI: /api-docs");
  console.log("📖 Redoc: /redoc");
}
