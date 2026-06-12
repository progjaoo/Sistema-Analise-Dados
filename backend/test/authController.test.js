import { describe, expect, it, vi } from "vitest";
import { createAuthController } from "../src/controllers/authController.js";

describe("Autenticação de produção", () => {
  it("desativa a credencial de demonstração", async () => {
    const controller = createAuthController({
      repository: { findUserByEmail: vi.fn().mockResolvedValue(null) },
      secret: "test-secret",
      env: { NODE_ENV: "production" },
    });
    const req = { body: { email: "admin@maravilhafm.com.br", senha: "maravilha123" } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await controller.login(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
