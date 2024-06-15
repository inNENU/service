import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import type { RichTextNode } from "@mptool/parser";
import { getRichTextNodes } from "@mptool/parser";
import type { RequestHandler } from "express";

import type { CommonFailedResponse, EmptyObject } from "../typings.js";

const GRAD_ENROLL_PLAN_URL = "https://yz.nenu.edu.cn/source/ssml/2024zsml.html";
const schoolInfoRegExp =
  /bXYName\['.*?']="<tr><td colspan=4><a href='(.*?)' target='_blank'>([^<]+) ([^<]+)<\/a><br>联系方式：(\S+?)，(\S+?)，(\S+?)<\/td><\/tr>";/g;

const TABLE_HEADER = `<tr><th>专业代码</th><th>人数</th><th>考试科目</th><th>备注</th></tr>`;

export interface GradEnrollPlanInfo {
  major: string;
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

export interface GradEnrollSuccessResponse {
  success: true;
  data: GradEnrollSchoolPlan[];
}

if (!existsSync("./cache")) mkdirSync("./cache");

export const gradEnrollPlanHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  EmptyObject
> = async (_req, res) => {
  try {
    const response = await fetch(GRAD_ENROLL_PLAN_URL);

    if (response.status !== 200) throw new Error("获取招生计划失败");

    const content = await response.text();

    // check cache
    if (
      existsSync("./cache/enroll-grad-plan.html") &&
      content.length ===
        readFileSync("./cache/enroll-grad-plan.html", { encoding: "utf-8" })
          .length
    )
      return res.json({
        success: true,
        data: JSON.parse(
          readFileSync("./cache/enroll-grad-plan.json", {
            encoding: "utf-8",
          }),
        ) as GradEnrollSchoolPlan[],
      });

    const schoolInfo: GradEnrollSchoolPlan[] = await Promise.all(
      Array.from(content.matchAll(schoolInfoRegExp)).map(
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

          const majorCodes = Array.from(
            content.matchAll(
              new RegExp(`cXYName\\['${name}'\\]\\.push\\('([^']+)'\\)`, "g"),
            ),
          );

          const majorNameRegExp = Array.from(
            content.matchAll(
              new RegExp(`fXYName\\['${name}'\\]\\.push\\('([^']+)'\\)`, "g"),
            ),
          );

          info.majors = await Promise.all(
            majorCodes.map(async ([, code], index) => {
              const [, majorName] = majorNameRegExp[index];

              const majorTypeRegExp = new RegExp(
                `dXYName\\['${name}'\\]\\['(${code})'\\]\\.push\\("<tr><td colspan=4><b>\\1\\s+\\S+【(\\S+)】<\\/b><\\/td><\\/tr>"`,
              );

              const startLine = `dXYName['${name}']['${code}'].push("<tr>");`;

              const start = content.indexOf(startLine) + startLine.length;
              const end = content.lastIndexOf(
                `dXYName['${name}']['${code}'].push("</tr>");`,
              );
              const majorContent = content.substring(start, end);

              const lines = Array.from(
                majorContent.matchAll(
                  /dXYName\['.*?'\]\['[^']+'\]\.push\("(.*)"\)/g,
                ),
              ).map(([, line]) => line.replace(/<\/?center>/g, ""));

              return {
                major: majorName,
                code,
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

    writeFileSync("./cache/enroll-grad-plan.html", content, {
      encoding: "utf-8",
    });
    writeFileSync("./cache/enroll-grad-plan.json", JSON.stringify(schoolInfo), {
      encoding: "utf-8",
    });

    return res.json({ success: true, data: schoolInfo });
  } catch (err) {
    const { message } = err as Error;

    console.error(err);
    res.json({
      success: false,
      msg: message,
    } as CommonFailedResponse);
  }
};
