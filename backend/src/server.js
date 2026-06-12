import "dotenv/config";
import fs from "node:fs/promises";
import { createApp } from "./app.js";
import { parseIbopeWorkbook } from "./parsers/ibopeParser.js";

const { app, repository } = createApp();
const port = Number(process.env.PORT || 3001);

if (process.env.DEMO_XLSX_PATH) {
  try {
    const uploads = await repository.listUploads();
    if (!uploads.length) {
      const buffer = await fs.readFile(process.env.DEMO_XLSX_PATH);
      await repository.createUpload({
        fileName: process.env.DEMO_XLSX_PATH.split("/").pop(),
        period: process.env.DEMO_PERIOD || "Abril 2026",
        userId: 1,
        parsed: parseIbopeWorkbook(buffer),
      });
      console.log("Relatório de demonstração importado.");
    }
  } catch (error) {
    console.error("Falha ao importar DEMO_XLSX_PATH:", error.message);
  }
}

app.listen(port, () => {
  console.log(`API Maravilha Ibope em http://localhost:${port}`);
});
