import { Router } from "express";

import { underChangeMajorPlanHandler } from "./change-major-plan.js";
import { underSystemCheckHandler } from "./check.js";
import { underCourseTableHandler } from "./course-table.js";
import { underCreateStudentArchiveHandler } from "./create-archive";
import { underExamPlaceHandler } from "./exam-place.js";
import { underInfoHandler } from "./info.js";
import { loginToUnderSystem, underSystemLoginHandler } from "./login.js";
import { underStudentArchiveHandler } from "./student-archive.js";
import { underTestQueryHandler } from "./test-query.js";

const underSystemRouter = Router();

underSystemRouter.post("/login", underSystemLoginHandler);
underSystemRouter.post("/check", underSystemCheckHandler);

underSystemRouter.use(loginToUnderSystem);

underSystemRouter.post("/change-major-plan", underChangeMajorPlanHandler);
underSystemRouter.post("/course-table", underCourseTableHandler);
underSystemRouter.post("/create-archive", underCreateStudentArchiveHandler);
underSystemRouter.post("/exam-place", underExamPlaceHandler);
underSystemRouter.post("/info", underInfoHandler);
underSystemRouter.post("/student-archive", underStudentArchiveHandler);
underSystemRouter.post("/test-query", underTestQueryHandler);

export { underSystemRouter };
