import { request } from "@/utils/index.js";

import { STUDY_TASK_TEST_RESPONSE, getStudyTask } from "../study/task.js";
import type { StudyTaskQueryOptions, StudyTaskResponse } from "../study/task.js";
import { UNDER_STUDY_SERVER } from "./utils.js";

export type * from "../study/task.js";

export const underStudyTaskHandler = request<StudyTaskResponse, StudyTaskQueryOptions>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(STUDY_TASK_TEST_RESPONSE);

    return res.json(await getStudyTask(cookieHeader, UNDER_STUDY_SERVER, req.body));
  },
);
