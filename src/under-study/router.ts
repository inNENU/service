import { Router } from "express";

import { underStudyCheckHandler } from "./check.js";
import { underStudyCourseCommentaryHandler } from "./course-commentary/handler.js";
import { underStudyCourseTableHandler } from "./course-table/index.js";
import { underStudyGradeDetailHandler } from "./grade-detail.js";
import { underStudyGradeListHandler } from "./grade-list.js";
import { loginToUnderStudy, underStudyLoginHandler } from "./login.js";
import { selectRouter } from "./select/index.js";
import { underStudySpecialExamHandler } from "./special-exam.js";

const underStudyRouter = Router();

underStudyRouter.post("/login", underStudyLoginHandler);
underStudyRouter.post("/check", underStudyCheckHandler);

underStudyRouter.use(loginToUnderStudy);

underStudyRouter.use("/select", selectRouter);

underStudyRouter.post("/course-commentary", underStudyCourseCommentaryHandler);
underStudyRouter.use("/course-table", underStudyCourseTableHandler);
underStudyRouter.post("/grade-detail", underStudyGradeDetailHandler);
underStudyRouter.post("/grade-list", underStudyGradeListHandler);
underStudyRouter.post("/special-exam", underStudySpecialExamHandler);

export { underStudyRouter };
