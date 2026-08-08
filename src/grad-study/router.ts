import { Router } from "express";

import { gradStudyCheckHandler } from "./check.js";
import { gradStudyCourseTableHandler } from "./course-table/index.js";
import { gradGradeDetailHandler } from "./grade-detail.js";
import { gradGradeListHandler } from "./grade-list.js";
import { gradStudyLoginHandler, loginToGradStudy } from "./login.js";
import { gradStudySelectRouter } from "./select/index.js";

const gradStudyRouter = Router();

gradStudyRouter.post("/login", gradStudyLoginHandler);
gradStudyRouter.post("/check", gradStudyCheckHandler);

gradStudyRouter.use(loginToGradStudy);

gradStudyRouter.post("/course-table", gradStudyCourseTableHandler);
gradStudyRouter.post("/grade-detail", gradGradeDetailHandler);
gradStudyRouter.post("/grade-list", gradGradeListHandler);
gradStudyRouter.use("/select", gradStudySelectRouter);

export { gradStudyRouter };
