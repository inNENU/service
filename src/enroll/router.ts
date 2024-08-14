import { Router } from "express";

import { gradAdmissionHandler } from "./grad-admission.js";
import { gradEnrollPlanHandler } from "./grad-plan.js";
import { gradRecommendPlanHandler } from "./grad-recommend-plan.js";
import { underAdmissionHandler } from "./under-admission.js";
import { underHistoryScoreHandler } from "./under-history-score.js";
import { underEnrollPlanHandler } from "./under-plan.js";

const enrollRouter = Router();

enrollRouter.get("/under-admission", underAdmissionHandler);
enrollRouter.post("/under-admission", underAdmissionHandler);
enrollRouter.post("/under-history-score", underHistoryScoreHandler);
enrollRouter.post("/under-plan", underEnrollPlanHandler);
enrollRouter.post("/grad-admission", gradAdmissionHandler);
enrollRouter.post("/grad-recommend-plan", gradRecommendPlanHandler);
enrollRouter.post("/grad-plan", gradEnrollPlanHandler);

export { enrollRouter };
