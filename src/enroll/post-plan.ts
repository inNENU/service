import { existsSync, readFileSync, writeFileSync } from "node:fs";

import type { RequestHandler } from "express";

import type { CommonFailedResponse, EmptyObject } from "../typings";

const POST_ENROLL_PLAN_URL = "https://yzb.nenu.edu.cn/tmp/2024ssml.html";
const schollInfoRegExp =
  /bXYName\['.*?']="<tr><td colspan=4><a href='(.*?)' target='_blank'>([^<]+) ([^<]+)<\/a><br>联系方式：(\S+?)，(\S+?)，(\S+?)<\/td><\/tr>";/g;

const TABLE_HEADER = `<tr><th>专业代码</th><th>人数</th><th>考试科目</th><th>备注</th></tr>`;

export interface PostEnrollPlanInfo {
  major: string;
  code: string;
  type: string;
}

export interface PostEnrollSchoolPlan {
  name: string;
  code: string;
  site: string;
  contact: string;
  phone: string;
  mail: string;
  majors: PostEnrollPlanInfo[];
}

export interface PostEnrollSuccessResponse {
  success: true;
  data: PostEnrollSchoolPlan[];
}

export const postEnrollPlanHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  EmptyObject
> = async (_req, res) => {
  try {
    const response = await fetch(POST_ENROLL_PLAN_URL);

    const content = await response.text();

    // check cache
    if (
      existsSync("./cache/post-plan.html") &&
      content.length ===
        readFileSync("./cache/post-plan.html", { encoding: "utf-8" }).length
    )
      return res.json({
        success: true,
        data: <PostEnrollSchoolPlan[]>JSON.parse(
          readFileSync("./cache/post-plan.json", {
            encoding: "utf-8",
          }),
        ),
      });

    const schoolInfo: PostEnrollSchoolPlan[] = Array.from(
      content.matchAll(schollInfoRegExp),
    ).map(([, site, code, name, contact, phone, mail]) => {
      const info: PostEnrollSchoolPlan = {
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

      info.majors = majorCodes.map(([, code], index) => {
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
          majorContent.matchAll(/dXYName\['.*?'\]\['[^']+'\]\.push\("(.*)"\)/g),
        ).map(([, line]) => line.replace(/<\/?center>/g, ""));

        return {
          major: majorName,
          code,
          type: majorTypeRegExp.exec(content)?.[2] ?? "",
          content: `<table>${TABLE_HEADER}<tr>${lines.join("\n")}</tr></table>`,
        };
      });

      return info;
    });

    writeFileSync("./cache/post-plan.html", content, {
      encoding: "utf-8",
    });
    writeFileSync("./cache/post-plan.json", JSON.stringify(schoolInfo), {
      encoding: "utf-8",
    });

    return res.json(schoolInfo);
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<CommonFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
