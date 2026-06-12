import { Router } from "express";

export function dashboardRoutes(controller, authenticate) {
  const router = Router();
  router.use(authenticate);
  router.get("/ranking", controller.ranking);
  router.get("/maravilha/dia-a-dia", controller.maravilhaDiaDia);
  router.get("/maravilha/somatorio", controller.maravilhaSomatorio);
  router.get("/emissoras/dia-a-dia", controller.todasEmissoras);
  router.get("/competitiva", controller.competitiva);
  router.get("/faixa-horaria", controller.faixaHoraria);
  return router;
}
