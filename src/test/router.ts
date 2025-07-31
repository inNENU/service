import { Router } from "express";

import { test301Handler } from "./301.js";
import { test302Handler } from "./302.js";
import { testConnectHandler } from "./connect.js";
import { testGetHandler } from "./get.js";
import { testPostHandler } from "./post.js";

const testRouter = Router();

testRouter.get("/connect", testConnectHandler);
testRouter.post("/connect", testConnectHandler);
testRouter.get("/get", testGetHandler);
testRouter.post("/post", testPostHandler);
testRouter.post("/301", test301Handler);
testRouter.post("/302", test302Handler);

export { testRouter };
