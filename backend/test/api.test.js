import fs from "node:fs";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { MemoryRepository } from "../src/repositories/memoryRepository.js";

const workbookPath = process.env.IBOPE_FIXTURE_PATH ||
  "/Users/joaomvalente/Documents/Trabalho/ANALISE DE DADOS/Analise ibope - ABRIL/Relatório_Ibope_Abril_MaravilhaFM.xlsx";

describe.skipIf(!fs.existsSync(workbookPath))("API do dashboard", () => {
  const repository = new MemoryRepository();
  const { app } = createApp({ repository, env: { JWT_SECRET: "test-secret" } });
  let token;
  let uploadId;

  beforeAll(async () => {
    const login = await request(app).post("/api/auth/login").send({
      email: "admin@maravilhafm.com.br",
      senha: "maravilha123",
    });
    token = login.body.token;
    const upload = await request(app)
      .post("/api/uploads")
      .set("Authorization", `Bearer ${token}`)
      .field("periodo", "Abril 2026")
      .attach("arquivo", workbookPath);
    uploadId = upload.body.upload.id;
  });

  it("lista o ranking e destaca a Maravilha", async () => {
    const response = await request(app)
      .get(`/api/dashboard/ranking?upload_id=${uploadId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(21);
    expect(response.body.summary.maravilha.posicao).toBe(19);
  });

  it("retorna o melhor bloco do somatório", async () => {
    const response = await request(app)
      .get(`/api/dashboard/maravilha/somatorio?upload_id=${uploadId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(response.body.summary.melhor.bloco_horario).toBe("15:00/15:59");
    expect(response.body.summary.melhor.audiencia_total).toBe(7079);
  });
});
