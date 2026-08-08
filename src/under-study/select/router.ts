import { Router } from "express";

import {
  selectClassSchema,
  selectInfoSchema,
  selectProcessSchema,
  selectSearchSchema,
  selectSelectedSchema,
} from "../../study/schemas.js";
import { validate } from "../../utils/validate.js";
import { underSelectCategoryHandler } from "./category.js";
import { underSelectClassHandler } from "./class.js";
import { underSelectInfoHandler } from "./info.js";
import { underSelectProcessHandler } from "./process.js";
import { underSelectSearchHandler } from "./search.js";
import { underSelectSelectedHandler } from "./selected.js";

const selectRouter = Router();

selectRouter.post("/category", underSelectCategoryHandler);
selectRouter.post("/class", validate(selectClassSchema), underSelectClassHandler);
selectRouter.post("/info", validate(selectInfoSchema), underSelectInfoHandler);
selectRouter.post("/search", validate(selectSearchSchema), underSelectSearchHandler);
selectRouter.post("/process", validate(selectProcessSchema), underSelectProcessHandler);
selectRouter.post("/selected", validate(selectSelectedSchema), underSelectSelectedHandler);

export { selectRouter };
