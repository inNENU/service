import { Router } from "express";

import { validate } from "../utils/validate.js";
import { gradAdmissionHandler } from "./grad-admission.js";
import { gradEnrollPlanHandler } from "./grad-plan.js";
import { gradRecommendPlanHandler } from "./grad-recommend-plan.js";
import {
  gradEnrollPlanSchema,
  underAdmissionSchema,
  underHistoryScoreSchema,
  underPlanSchema,
} from "./schemas.js";
import { underAdmissionHandler } from "./under-admission.js";
import { underHistoryScoreHandler } from "./under-history-score.js";
import { underEnrollPlanHandler } from "./under-plan.js";

const enrollRouter = Router();

enrollRouter.get("/under-admission", underAdmissionHandler);
enrollRouter.post("/under-admission", validate(underAdmissionSchema), underAdmissionHandler);
enrollRouter.post(
  "/under-history-score",
  validate(underHistoryScoreSchema),
  underHistoryScoreHandler,
);
enrollRouter.post("/under-plan", validate(underPlanSchema), underEnrollPlanHandler);
enrollRouter.post("/grad-admission", gradAdmissionHandler);
enrollRouter.post("/grad-recommend-plan", gradRecommendPlanHandler);
enrollRouter.post("/grad-plan", validate(gradEnrollPlanSchema), gradEnrollPlanHandler);

export { enrollRouter };
