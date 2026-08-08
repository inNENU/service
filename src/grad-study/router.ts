import { Router } from "express";

import { gradStudyCheckHandler } from "./check.js";
import { gradStudyCourseTableHandler } from "./course-table/index.js";
import { gradGradeListHandler } from "./grade-list.js";
import { gradStudyLoginHandler, loginToGradStudy } from "./login.js";

const gradStudyRouter = Router();

gradStudyRouter.post("/login", gradStudyLoginHandler);
gradStudyRouter.post("/check", gradStudyCheckHandler);

gradStudyRouter.use(loginToGradStudy);

gradStudyRouter.post("/course-table", gradStudyCourseTableHandler);
gradStudyRouter.post("/grade-list", gradGradeListHandler);

export { gradStudyRouter };
