import { Router } from "express";

import { officialAcademicDetailHandler } from "./academic-detail.js";
import { officialAcademicListHandler } from "./academic-list.js";
import { officialInfoDetailHandler } from "./info-detail.js";
import { officialInfoListHandler } from "./info-list.js";
import { officialNoticeDetailHandler } from "./notice-detail.js";
import { officialNoticeListHandler } from "./notice-list.js";
import { underMajorPlanHandler } from "./under-major-plan.js";

const officialRouter = Router();

officialRouter.get("/academic-detail", officialAcademicDetailHandler);
officialRouter.post("/academic-detail", officialAcademicDetailHandler);
officialRouter.get("/academic-list", officialAcademicListHandler);
officialRouter.post("/academic-list", officialAcademicListHandler);

officialRouter.get("/info-detail", officialInfoDetailHandler);
officialRouter.post("/info-detail", officialInfoDetailHandler);
officialRouter.get("/info-list", officialInfoListHandler);
officialRouter.post("/info-list", officialInfoListHandler);

officialRouter.get("/notice-detail", officialNoticeDetailHandler);
officialRouter.post("/notice-detail", officialNoticeDetailHandler);
officialRouter.get("/notice-list", officialNoticeListHandler);
officialRouter.post("/notice-list", officialNoticeListHandler);

officialRouter.get("/under-major-plan", underMajorPlanHandler);
officialRouter.post("/under-major-plan", underMajorPlanHandler);

export { officialRouter };
