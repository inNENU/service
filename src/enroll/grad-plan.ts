import { existsSync, mkdirSync, readFileSync, writeFile } from "node:fs";

import type { RichTextNode } from "@mptool/parser";
import { getRichTextNodes } from "@mptool/parser";

import { request } from "@/utils/index.js";

import { unknownResponse } from "../config/index.js";
import type { CommonFailedResponse, CommonSuccessResponse } from "../typings.js";

const GRAD_ENROLL_PLAN_URL = "https://yz.nenu.edu.cn/source/ssml/2024zsml.html";
const schoolInfoRegExp =
  /bXYName\['.*?']="<tr><td colspan=4><a href='(.*?)' target='_blank'>([^<]+) ([^<]+)<\/a><br>联系方式：(\S+?)，(\S+?)，(\S+?)<\/td><\/tr>";/g;

const TABLE_HEADER = `<tr><th>专业代码</th><th>人数</th><th>考试科目</th><th>备注</th></tr>`;

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

  const schoolInfo: GradEnrollSchoolPlan[] = await Promise.all(
    [...content.matchAll(schoolInfoRegExp)].map(
      async ([, site, code, name, contact, phone, mail]) => {
        const info: GradEnrollSchoolPlan = {
          name,
          site,
          code,
          contact,
          phone,
          mail,
          majors: [],
        };

        const majorCodes = [
          ...content.matchAll(new RegExp(`cXYName\\['${name}'\\]\\.push\\('([^']+)'\\)`, "g")),
        ];

        const majorNameRegExp = [
          ...content.matchAll(new RegExp(`fXYName\\['${name}'\\]\\.push\\('([^']+)'\\)`, "g")),
        ];

        info.majors = await Promise.all(
          majorCodes.map(async ([, majorCode], index) => {
            const [, majorName] = majorNameRegExp[index];

            const majorTypeRegExp = new RegExp(
              `dXYName\\['${name}'\\]\\['(${majorCode})'\\]\\.push\\("<tr><td colspan=4><b>\\1\\s+\\S+【(\\S+)】<\\/b><\\/td><\\/tr>"`,
            );

            const startLine = `dXYName['${name}']['${majorCode}'].push("<tr>");`;

            const start = content.indexOf(startLine) + startLine.length;
            const end = content.lastIndexOf(`dXYName['${name}']['${majorCode}'].push("</tr>");`);
            const majorContent = content.slice(start, end);

            const lines = [
              ...majorContent.matchAll(/dXYName\['.*?'\]\['[^']+'\]\.push\("(.*)"\)/g),
            ].map(([, line]) => line.replaceAll(/<\/?center>/g, ""));

            return {
              name: majorName,
              code: majorCode,
              type: majorTypeRegExp.exec(content)?.[2] ?? "",
              content: await getRichTextNodes(
                `<table>${TABLE_HEADER}<tr>${lines.join("\n")}</tr></table>`,
              ),
            };
          }),
        );

        return info;
      },
    ),
  );

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
