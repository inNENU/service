import { existsSync, mkdirSync, readFileSync, writeFile } from "node:fs";

import type { RichTextNode } from "@mptool/parser";

import { request } from "@/utils/index.js";

import { unknownResponse } from "../config/index.js";
import type { CommonFailedResponse, CommonSuccessResponse } from "../typings.js";
import { parseGradEnrollPlan } from "./grad-plan-parser.js";

const GRAD_ENROLL_PLAN_URL = "https://yz.nenu.edu.cn/source/ssml/2024zsml.html";

export interface GradEnrollPlanInfo {
  name: string;
  code: string;
  type: string;
  content: RichTextNode[];
}

export interface GradEnrollSchoolPlan {
  name: string;
  code: string;
  site: string;
  contact: string;
  phone: string;
  mail: string;
  majors: GradEnrollPlanInfo[];
}

export type GradEnrollSuccessResponse = CommonSuccessResponse<GradEnrollSchoolPlan[]>;

export type GradEnrollResponse = GradEnrollSuccessResponse | CommonFailedResponse;

if (!existsSync("./cache")) mkdirSync("./cache");

export const getGradEnrollPlan = async (): Promise<GradEnrollResponse> => {
  const response = await fetch(GRAD_ENROLL_PLAN_URL);

  if (response.status !== 200) {
    // FIXME: Should update to the new one when the website is updated
    if (existsSync("./cache/enroll-grad-plan.json")) {
      return {
        success: true,
        data: JSON.parse(
          readFileSync("./cache/enroll-grad-plan.json", {
            encoding: "utf-8",
          }),
        ) as GradEnrollSchoolPlan[],
      };
    }

    return unknownResponse("招生计划查询已下线");
  }

  const content = await response.text();

  // check cache
  if (
    existsSync("./cache/enroll-grad-plan.html") &&
    content.length === readFileSync("./cache/enroll-grad-plan.html", { encoding: "utf-8" }).length
  ) {
    return {
      success: true,
      data: JSON.parse(
        readFileSync("./cache/enroll-grad-plan.json", {
          encoding: "utf-8",
        }),
      ) as GradEnrollSchoolPlan[],
    };
  }

  const schoolInfo = await parseGradEnrollPlan(content);

  writeFile("./cache/enroll-grad-plan.html", content, { encoding: "utf-8" }, (err) => {
    if (err) console.error(err);
  });
  writeFile(
    "./cache/enroll-grad-plan.json",
    JSON.stringify(schoolInfo),
    { encoding: "utf-8" },
    (err) => {
      if (err) console.error(err);
    },
  );

  return { success: true, data: schoolInfo };
};

export const gradEnrollPlanHandler = request<GradEnrollResponse>(async (_, res) =>
  res.json(await getGradEnrollPlan()),
);
