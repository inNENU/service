import { Router } from "express";

import { libraryPeopleHandler } from "./people.js";

const libraryRouter = Router();

libraryRouter.get("/people", libraryPeopleHandler);

export { libraryRouter };
