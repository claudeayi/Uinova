import JSZip from "jszip";

// Exemple d'export HTML à partir d’une structure de page (simplifiée)
export function exportPageToHTML(pageData: any): string {
  // À adapter selon ton format de données
  return `
    <html>
      <head><title>${pageData.name}</title></head>
      <body>
        <!-- Génère ici le HTML dynamiquement -->
        ${pageData.elements?.map((el: any) => `<div>${el.type}</div>`).join("")}
      </body>
    </html>
  `;
}

// Export ZIP
export async function exportProjectToZip(project: any, pages: any[]) {
  const zip = new JSZip();
  pages.forEach((page) => {
    zip.file(`${page.name}.html`, exportPageToHTML(page));
  });
  return await zip.generateAsync({ type: "nodebuffer" });
}
