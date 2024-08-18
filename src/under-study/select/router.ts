import { Router } from "express";

import { underSelectCategoryHandler } from "./category.js";
import { underSelectClassHandler } from "./class.js";
import { underStudySelectInfoHandler } from "./info.js";
import { underSelectProcessHandler } from "./process.js";
import { underSelectSearchCourseHandler } from "./search.js";
import { underSelectSelectedCourseHandler } from "./selected.js";

const selectRouter = Router();

selectRouter.post("/category", underSelectCategoryHandler);
selectRouter.post("/class", underSelectClassHandler);
selectRouter.post("/info", underStudySelectInfoHandler);
selectRouter.post("/search", underSelectSearchCourseHandler);
selectRouter.post("/process", underSelectProcessHandler);
selectRouter.post("/selected", underSelectSelectedCourseHandler);

export { selectRouter };
