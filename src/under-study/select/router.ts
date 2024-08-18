import { Router } from "express";

import { underStudySelectCategoryHandler } from "./category.js";
import { underStudySearchClassHandler } from "./class.js";
import { underStudySelectInfoHandler } from "./info.js";
import { underStudyProcessCourseHandler } from "./process.js";
import { underStudySearchCourseHandler } from "./search.js";
import { underStudySelectedCourseHandler } from "./selected.js";

const selectRouter = Router();

selectRouter.post("/category", underStudySelectCategoryHandler);
selectRouter.post("/class", underStudySearchClassHandler);
selectRouter.post("/info", underStudySelectInfoHandler);
selectRouter.post("/search", underStudySearchCourseHandler);
selectRouter.post("/process", underStudyProcessCourseHandler);
selectRouter.post("/selected", underStudySelectedCourseHandler);

export { selectRouter };
