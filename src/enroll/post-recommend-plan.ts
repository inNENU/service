import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import type { RequestHandler } from "express";

import type { CommonFailedResponse, EmptyObject } from "../typings.js";
import type { RichTextNode } from "../utils/index.js";
import { getRichTextNodes } from "../utils/index.js";

const POST_RECOMMEND_PLAN_URL =
  "https://math127.nenu.edu.cn/yjsy/HData/ZSB/ZSJZ2024-TM-1.html";
const schoolInfoRegExp =
  /bXYName\['.*?']="<tr><td colspan=6><a href='(.*?)' target='_blank'>([^<]+) ([^<]+)<\/a><br>联系方式：(\S+?)，(\S+?)，(\S+?)<\/td><\/tr>";/g;

const TABLE_HEADER = `<tr><th>招生专业</th><th>研究方向</th><th>学习方式</th><th>招生类型</th><th>拟接收人数</th><th>备注</th></tr>`;

export interface PostRecommendPlanInfo {
  major: string;
  code: string;
  content: RichTextNode[];
}

export interface PostRecommendSchoolPlan {
  name: string;
  code: string;
  site: string;
  contact: string;
  phone: string;
  mail: string;
  majors: PostRecommendPlanInfo[];
}

export interface PostRecommendSuccessResponse {
  success: true;
  data: PostRecommendSchoolPlan[];
}

if (!existsSync("./cache")) mkdirSync("./cache");

export const postRecommendPlanHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  EmptyObject
> = async (_req, res) => {
  try {
    const response = await fetch(POST_RECOMMEND_PLAN_URL);

    if (response.status !== 200) throw new Error("获取招生计划失败");

    const content = await response.text();

    // check cache
    if (
      existsSync("./cache/post-recommend-plan.html") &&
      content.length ===
        readFileSync("./cache/post-recommend-plan.html", { encoding: "utf-8" })
          .length
    )
      return res.json({
        success: true,
        data: <PostRecommendSchoolPlan[]>JSON.parse(
          readFileSync("./cache/post-recommend-plan.json", {
            encoding: "utf-8",
          }),
        ),
      });

    const schoolInfo: PostRecommendSchoolPlan[] = await Promise.all(
      Array.from(content.matchAll(schoolInfoRegExp)).map(
        async ([, site, code, name, contact, phone, mail]) => {
          const info: PostRecommendSchoolPlan = {
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

              const lines = Array.from(
                content.matchAll(
                  new RegExp(
                    `dXYName\\['${name}'\\]\\['${code}'\\]\\.push\\('(.*)'\\)`,
                    "g",
                  ),
                ),
              ).map(([, line]) => line.replace(/<\/?center>/g, ""));

              return {
                major: majorName,
                code,
                content: await getRichTextNodes(
                  `<table>${TABLE_HEADER}${lines.join("\n")}</table>`,
                ),
              };
            }),
          );

          return info;
        },
      ),
    );

    writeFileSync("./cache/post-recommend-plan.html", content, {
      encoding: "utf-8",
    });
    writeFileSync(
      "./cache/post-recommend-plan.json",
      JSON.stringify(schoolInfo),
      {
        encoding: "utf-8",
      },
    );

    return res.json({ success: true, data: schoolInfo });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<CommonFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
