import { Router } from "express";

import { commentarySchema } from "../study/schemas.js";
import { validate } from "../utils/validate.js";
import { gradStudyCheckHandler } from "./check.js";
import { gradStudyCourseCommentaryHandler } from "./course-commentary/index.js";
import { gradStudyCourseTableHandler } from "./course-table/index.js";
import { gradGradeDetailHandler } from "./grade-detail.js";
import { gradGradeListHandler } from "./grade-list.js";
import { gradStudyLoginHandler, loginToGradStudy } from "./login.js";
import {
  gradCourseTableSchema,
  gradGradeDetailSchema,
  gradGradeListSchema,
  gradStudyLoginSchema,
} from "./schemas.js";
import { gradStudySelectRouter } from "./select/index.js";

const gradStudyRouter = Router();

gradStudyRouter.post("/login", validate(gradStudyLoginSchema), gradStudyLoginHandler);
gradStudyRouter.post("/check", gradStudyCheckHandler);

gradStudyRouter.use(loginToGradStudy);

gradStudyRouter.post("/course-table", validate(gradCourseTableSchema), gradStudyCourseTableHandler);
gradStudyRouter.post("/grade-detail", validate(gradGradeDetailSchema), gradGradeDetailHandler);
gradStudyRouter.post("/grade-list", validate(gradGradeListSchema), gradGradeListHandler);
gradStudyRouter.post(
  "/course-commentary",
  validate(commentarySchema),
  gradStudyCourseCommentaryHandler,
);
gradStudyRouter.use("/select", gradStudySelectRouter);

export { gradStudyRouter };
