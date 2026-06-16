import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { MemoryRepository } from "../src/repositories/memoryRepository.js";

const workbookPath = process.env.IBOPE_FIXTURE_PATH || "/Users/joaomvalente/Documents/Trabalho/ANALISE DE DADOS/Analise ibope - ABRIL/Relatório_Ibope_Abril_MaravilhaFM.xlsx";

describe.skipIf(!fs.existsSync(workbookPath))("API dinâmica", () => {
  const repository = new MemoryRepository();
  const { app } = createApp({ repository, env: { JWT_SECRET: "test-secret", FRONTEND_ORIGIN: "http://localhost:5173" } });
  let token = ""; let importId = 0;
  beforeAll(async () => {
    await repository.createLocalUser({ name: "Admin", email: "admin@example.com", passwordHash: await bcrypt.hash("senha-segura", 4), role: "ADMIN" });
    token = (await request(app).post("/api/auth/login").send({ email: "admin@example.com", senha: "senha-segura" })).body.token;
    const response = await request(app).post("/api/imports").set("Authorization", `Bearer ${token}`).field("periodo", "Abril 2026").attach("arquivo", workbookPath);
    expect(response.status).toBe(201); importId = response.body.import.id;
  });
  it("lista análises detectadas", async () => { const response = await request(app).get(`/api/analyses?import_id=${importId}`).set("Authorization", `Bearer ${token}`); expect(response.body.analyses).toHaveLength(6); });
  it("retorna dados e metadados pelo slug", async () => { const response = await request(app).get(`/api/analyses/ranking-geral/data?import_id=${importId}`).set("Authorization", `Bearer ${token}`); expect(response.status).toBe(200); expect(response.body.rows.length).toBeGreaterThan(0); expect(response.body.analysis.schema_json.columns.length).toBe(3); });
  it("faz download da planilha original importada", async () => {
    const response = await request(app).get(`/api/imports/${importId}/download`).set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.headers["content-disposition"]).toContain("Relato");
    expect(Number(response.headers["content-length"])).toBeGreaterThan(0);
  });
  it("registra falha de importação no histórico", async () => {
    const failed = await request(app).post("/api/imports").set("Authorization", `Bearer ${token}`).field("periodo", "Arquivo inválido").attach("arquivo", Buffer.from("conteúdo inválido"), "invalido.xlsx");
    expect(failed.status).toBe(400);
    const history = await request(app).get("/api/imports").set("Authorization", `Bearer ${token}`);
    expect(history.body.imports.some((item: { status: string }) => item.status === "FAILED")).toBe(true);
  });
});

describe("auth e download", () => {
  const repository = new MemoryRepository();
  const { app } = createApp({ repository, env: { JWT_SECRET: "test-secret", FRONTEND_ORIGIN: "http://localhost:5173", FRONTEND_PUBLIC_URL: "http://localhost:5173", UPLOAD_STORAGE_DIR: "/tmp/maravilha-ibope-test-uploads" } });

  it("cadastra usuário público como VIEWER e permite login", async () => {
    const created = await request(app).post("/api/auth/register").send({ nome: "Gestor Teste", email: "gestor@example.com", senha: "Senha123", confirmarSenha: "Senha123" });
    expect(created.status).toBe(201);
    const user = await repository.findUserByEmail("gestor@example.com");
    expect(user?.role).toBe("VIEWER");

    const login = await request(app).post("/api/auth/login").send({ email: "gestor@example.com", senha: "Senha123" });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("VIEWER");
  });

  it("bloqueia download sem autenticação", async () => {
    const response = await request(app).get("/api/imports/1/download");
    expect(response.status).toBe(401);
  });

  it("gera token e redefine senha pelo fluxo de recuperação", async () => {
    await repository.createLocalUser({ name: "Reset", email: "reset@example.com", passwordHash: await bcrypt.hash("Senha123", 4), role: "VIEWER" });
    const tokenBytes = Buffer.alloc(32, 1);
    const token = tokenBytes.toString("hex");
    const spy = vi.spyOn(crypto, "randomBytes").mockReturnValue(tokenBytes as never);

    const forgot = await request(app).post("/api/auth/forgot-password").send({ email: "reset@example.com" });
    expect(forgot.status).toBe(200);
    spy.mockRestore();

    const reset = await request(app).post("/api/auth/reset-password").send({ token, senha: "NovaSenha123" });
    expect(reset.status).toBe(200);

    const login = await request(app).post("/api/auth/login").send({ email: "reset@example.com", senha: "NovaSenha123" });
    expect(login.status).toBe(200);
  });
});
