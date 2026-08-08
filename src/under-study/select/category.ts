import { request } from "@/utils/index.js";

import { TEST_SELECT_CATEGORY_RESPONSE, getSelectCategories } from "../../study/select/index.js";
import type { SelectCategoryResponse } from "../../study/select/index.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

export const underSelectCategoryHandler = request<SelectCategoryResponse>(async (req, res) => {
  const cookieHeader = req.headers.cookie!;

  if (cookieHeader.includes("TEST")) return res.json(TEST_SELECT_CATEGORY_RESPONSE);

  return res.json(await getSelectCategories(cookieHeader, UNDER_STUDY_SERVER));
});
