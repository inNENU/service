import { Router } from "express";

import { underStudyCheckHandler } from "./check.js";
import { underStudyCourseCommentaryHandler } from "./course-commentary/handler.js";
import { underStudyGradeDetailHandler } from "./grade-detail.js";
import { underStudyGradeListHandler } from "./grade-list.js";
import { loginToUnderStudy, underStudyLoginHandler } from "./login.js";
import {
  underStudyProcessCourseHandler,
  underStudySearchClassHandler,
  underStudySearchCourseHandler,
  underStudySelectCategoryHandler,
  underStudySelectInfoHandler,
  underStudySelectedCourseHandler,
} from "./select/index.js";
import { underStudySpecialExamHandler } from "./special-exam.js";

const underStudyRouter = Router();

underStudyRouter.post("/login", underStudyLoginHandler);
underStudyRouter.post("/check", underStudyCheckHandler);

underStudyRouter.use("/:path", loginToUnderStudy);

underStudyRouter.post("/course-commentary", underStudyCourseCommentaryHandler);
underStudyRouter.post("/grade-detail", underStudyGradeDetailHandler);
underStudyRouter.post("/grade-list", underStudyGradeListHandler);
underStudyRouter.post("/special-exam", underStudySpecialExamHandler);

underStudyRouter.post("/select/category", underStudySelectCategoryHandler);
underStudyRouter.post("/select/class", underStudySearchClassHandler);
underStudyRouter.post("/select/info", underStudySelectInfoHandler);
underStudyRouter.post("/select/search", underStudySearchCourseHandler);
underStudyRouter.post("/select/process", underStudyProcessCourseHandler);
underStudyRouter.post("/select/selected", underStudySelectedCourseHandler);

export { underStudyRouter };
