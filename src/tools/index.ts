import { Router } from "express";

import { weatherRouter } from "./weather/index.js";

export const toolsRouter = Router().use("/weather", weatherRouter);
