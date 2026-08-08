import { missingArgResponse } from "@/config/index.js";
import { request } from "@/utils/index.js";

import { searchSelectCourses } from "../../study/select/index.js";
import type {
  UnderSelectSearchOptions,
  UnderSelectSearchResponse,
} from "../../study/select/index.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

export const underSelectSearchCourseHandler = request<
  UnderSelectSearchResponse,
  UnderSelectSearchOptions
>(async (req, res) => {
  const cookieHeader = req.headers.cookie!;

  if (!req.body.link) return res.json(missingArgResponse("link"));

  return res.json(await searchSelectCourses(req.body, cookieHeader, UNDER_STUDY_SERVER));
});
