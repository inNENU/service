import { Router } from "express";

import {
  selectClassSchema,
  selectInfoSchema,
  selectProcessSchema,
  selectSearchSchema,
  selectSelectedSchema,
} from "../../study/schemas.js";
import { validate } from "../../utils/validate.js";
import { gradSelectCategoryHandler } from "./category.js";
import { gradSelectClassHandler } from "./class.js";
import { gradSelectInfoHandler } from "./info.js";
import { gradSelectProcessHandler } from "./process.js";
import { gradSelectSearchHandler } from "./search.js";
import { gradSelectSelectedHandler } from "./selected.js";

const gradStudySelectRouter = Router();

gradStudySelectRouter.post("/category", gradSelectCategoryHandler);
gradStudySelectRouter.post("/class", validate(selectClassSchema), gradSelectClassHandler);
gradStudySelectRouter.post("/info", validate(selectInfoSchema), gradSelectInfoHandler);
gradStudySelectRouter.post("/search", validate(selectSearchSchema), gradSelectSearchHandler);
gradStudySelectRouter.post("/process", validate(selectProcessSchema), gradSelectProcessHandler);
gradStudySelectRouter.post("/selected", validate(selectSelectedSchema), gradSelectSelectedHandler);

export { gradStudySelectRouter };
