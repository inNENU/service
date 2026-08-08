import { Router } from "express";

import { commentarySchema } from "../study/schemas.js";
import { validate } from "../utils/validate.js";
import { underStudyCheckHandler } from "./check.js";
import { underStudyCourseCommentaryHandler } from "./course-commentary/index.js";
import { underStudyCourseTableHandler } from "./course-table/index.js";
import { underStudyExamArrangementHandler } from "./exam-arrangement.js";
import { underStudyGradeDetailHandler } from "./grade-detail.js";
import { underStudyGradeListHandler } from "./grade-list.js";
import { underInfoHandler } from "./info.js";
import { loginToUnderStudy, underStudyLoginHandler } from "./login.js";
import {
  courseTableSchema,
  examArrangementSchema,
  gradeDetailSchema,
  gradeListSchema,
  underStudyLoginSchema,
} from "./schemas.js";
import { selectRouter } from "./select/index.js";
import { underStudySpecialExamHandler } from "./special-exam.js";

const underStudyRouter = Router();

underStudyRouter.post("/login", validate(underStudyLoginSchema), underStudyLoginHandler);
underStudyRouter.post("/check", underStudyCheckHandler);

underStudyRouter.use(loginToUnderStudy);

underStudyRouter.use("/select", selectRouter);

underStudyRouter.post(
  "/course-commentary",
  validate(commentarySchema),
  underStudyCourseCommentaryHandler,
);
underStudyRouter.use("/course-table", validate(courseTableSchema), underStudyCourseTableHandler);
underStudyRouter.post("/grade-detail", validate(gradeDetailSchema), underStudyGradeDetailHandler);
underStudyRouter.post("/grade-list", validate(gradeListSchema), underStudyGradeListHandler);
underStudyRouter.post("/info", underInfoHandler);
underStudyRouter.post(
  "/exam-arrangement",
  validate(examArrangementSchema),
  underStudyExamArrangementHandler,
);
underStudyRouter.post("/special-exam", underStudySpecialExamHandler);

export { underStudyRouter };
