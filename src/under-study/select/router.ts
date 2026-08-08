import { Router } from "express";

import { underSelectCategoryHandler } from "./category.js";
import { underSelectClassHandler } from "./class.js";
import { underSelectInfoHandler } from "./info.js";
import { underSelectProcessHandler } from "./process.js";
import { underSelectSearchHandler } from "./search.js";
import { underSelectSelectedHandler } from "./selected.js";

const selectRouter = Router();

selectRouter.post("/category", underSelectCategoryHandler);
selectRouter.post("/class", underSelectClassHandler);
selectRouter.post("/info", underSelectInfoHandler);
selectRouter.post("/search", underSelectSearchHandler);
selectRouter.post("/process", underSelectProcessHandler);
selectRouter.post("/selected", underSelectSelectedHandler);

export { selectRouter };
