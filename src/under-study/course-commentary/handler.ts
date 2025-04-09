import type { RequestHandler } from "express";

import { InvalidArgResponse, MissingArgResponse } from "@/config/index.js";
import type { EmptyObject } from "@/typings.js";

import type { GetUnderCourseCommentaryOptions } from "./get.js";
import { getUnderCommentary } from "./get.js";
import type { ListUnderCourseCommentaryOptions } from "./list.js";
import {
  UNDER_COURSE_COMMENTARY_LIST_TEST_RESPONSE,
  listUnderCourseCommentary,
} from "./list.js";
import type { SubmitUnderCourseCommentaryOptions } from "./submit.js";
import { submitUnderCourseCommentary } from "./submit.js";
import type { ViewUnderCourseCommentaryOptions } from "./view.js";
import {
  UNDER_COURSE_COMMENTARY_VIEW_TEST_RESPONSE,
  viewUnderCourseCommentary,
} from "./view.js";

type UnderCourseCommentaryOptions =
  | ListUnderCourseCommentaryOptions
  | ViewUnderCourseCommentaryOptions
  | GetUnderCourseCommentaryOptions
  | SubmitUnderCourseCommentaryOptions;

export const underStudyCourseCommentaryHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderCourseCommentaryOptions
> = async (req, res) => {
  const cookieHeader = req.headers.cookie!;

  if (req.body.type === "list") {
    if (cookieHeader.includes("TEST"))
      return res.json(UNDER_COURSE_COMMENTARY_LIST_TEST_RESPONSE);

    return res.json(
      await listUnderCourseCommentary(cookieHeader, req.body.time),
    );
  }

  if (req.body.type === "view") {
    const { commentaryCode } = req.body;

    if (cookieHeader.includes("TEST"))
      return res.json(UNDER_COURSE_COMMENTARY_VIEW_TEST_RESPONSE);

    if (!commentaryCode) return res.json(MissingArgResponse("commentaryCode"));

    return res.json(
      await viewUnderCourseCommentary(cookieHeader, req.body.commentaryCode),
    );
  }

  if (req.body.type === "get") {
    const { courseCode, teacherCode } = req.body;

    if (!courseCode) return res.json(MissingArgResponse("courseCode"));
    if (!teacherCode) return res.json(MissingArgResponse("teacherCode"));

    return res.json(
      await getUnderCommentary(cookieHeader, courseCode, teacherCode),
    );
  }

  if (req.body.type === "submit") {
    return res.json(await submitUnderCourseCommentary(cookieHeader, req.body));
  }

  return res.json(InvalidArgResponse("type"));
};
