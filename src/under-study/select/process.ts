import { invalidArgResponse, missingArgResponse } from "@/config/index.js";
import { request } from "@/utils/index.js";

import { addSelectCourse, removeSelectCourse } from "../../study/select/index.js";
import type {
  UnderSelectProcessOptions,
  UnderSelectProcessResponse,
} from "../../study/select/index.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

export const underSelectProcessHandler = request<
  UnderSelectProcessResponse,
  UnderSelectProcessOptions
>(async (req, res) => {
  const { link, type, classId } = req.body;
  const cookieHeader = req.headers.cookie!;

  if (!link) return res.json(missingArgResponse("link"));
  if (!classId) return res.json(missingArgResponse("classId"));

  if (type === "add")
    return res.json(await addSelectCourse(req.body, cookieHeader, UNDER_STUDY_SERVER));
  if (type === "remove")
    return res.json(await removeSelectCourse(req.body, cookieHeader, UNDER_STUDY_SERVER));

  return res.json(invalidArgResponse("type"));
});
