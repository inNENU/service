import { missingArgResponse } from "@/config/index.js";
import { request } from "@/utils/index.js";

import { getSelectedCourses } from "../../study/select/index.js";
import type {
  UnderSelectSelectedOptions,
  UnderSelectSelectedResponse,
} from "../../study/select/index.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

export const underSelectSelectedCourseHandler = request<
  UnderSelectSelectedResponse,
  UnderSelectSelectedOptions
>(async (req, res) => {
  const { link } = req.body;
  const cookieHeader = req.headers.cookie!;

  if (!link) return res.json(missingArgResponse("link"));

  return res.json(await getSelectedCourses(link, cookieHeader, UNDER_STUDY_SERVER));
});
