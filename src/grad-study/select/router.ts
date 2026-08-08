import { Router } from "express";

import { gradSelectCategoryHandler } from "./category.js";
import { gradSelectClassHandler } from "./class.js";
import { gradSelectInfoHandler } from "./info.js";
import { gradSelectProcessHandler } from "./process.js";
import { gradSelectSearchHandler } from "./search.js";
import { gradSelectSelectedHandler } from "./selected.js";

const gradStudySelectRouter = Router();

gradStudySelectRouter.post("/category", gradSelectCategoryHandler);
gradStudySelectRouter.post("/class", gradSelectClassHandler);
gradStudySelectRouter.post("/info", gradSelectInfoHandler);
gradStudySelectRouter.post("/search", gradSelectSearchHandler);
gradStudySelectRouter.post("/process", gradSelectProcessHandler);
gradStudySelectRouter.post("/selected", gradSelectSelectedHandler);

export { gradStudySelectRouter };
