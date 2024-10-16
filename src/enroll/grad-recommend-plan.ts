import { existsSync, mkdirSync, readFileSync, writeFile } from "node:fs";

import type { RichTextNode } from "@mptool/parser";
import { getRichTextNodes } from "@mptool/parser";

import { UnknownResponse } from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../typings.js";
import { request } from "../utils/index.js";

const POST_RECOMMEND_PLAN_URL =
  "https://pg.nenu.edu.cn/yjsy/HData/ZSB/ZSJZ2024-TM-1.html";
const schoolInfoRegExp =
  /bXYName\['.*?']="<tr><td colspan=6><a href='(.*?)' target='_blank'>([^<]+) ([^<]+)<\/a><br>联系方式：(\S+?)，(\S+?)，(\S+?)<\/td><\/tr>";/g;

const TABLE_HEADER = `<tr><th>招生专业</th><th>研究方向</th><th>学习方式</th><th>招生类型</th><th>拟接收人数</th><th>备注</th></tr>`;

export interface GradRecommendPlanInfo {
  name: string;
  code: string;
  content: RichTextNode[];
}

export interface GradRecommendSchoolPlan {
  name: string;
  code: string;
  site: string;
  contact: string;
  phone: string;
  mail: string;
  majors: GradRecommendPlanInfo[];
}

export type GradRecommendPlanSuccessResponse = CommonSuccessResponse<
  GradRecommendSchoolPlan[]
>;

export type GradRecommendPlanResponse =
  | GradRecommendPlanSuccessResponse
  | CommonFailedResponse;

if (!existsSync("./cache")) mkdirSync("./cache");

export const getGradRecommendPlan =
  async (): Promise<GradRecommendPlanResponse> => {
    const response = await fetch(POST_RECOMMEND_PLAN_URL);

    if (response.status !== 200) {
      // FIXME: Should update to the new one when the website is updated
      if (existsSync("./cache/enroll-grad-recommend-plan.json"))
        return {
          success: true,
          data: JSON.parse(
            readFileSync("./cache/enroll-grad-recommend-plan.json", {
              encoding: "utf-8",
            }),
          ) as GradRecommendSchoolPlan[],
        };

      return UnknownResponse("推免计划查询已下线");
    }

    const content = await response.text();

    // check cache
    if (
      existsSync("./cache/enroll-grad-recommend-plan.html") &&
      content.length ===
        readFileSync("./cache/enroll-grad-recommend-plan.html", {
          encoding: "utf-8",
        }).length
    )
      return {
        success: true,
        data: JSON.parse(
          readFileSync("./cache/enroll-grad-recommend-plan.json", {
            encoding: "utf-8",
          }),
        ) as GradRecommendSchoolPlan[],
      };

    const schoolInfo: GradRecommendSchoolPlan[] = await Promise.all(
      Array.from(content.matchAll(schoolInfoRegExp)).map(
        async ([, site, code, name, contact, phone, mail]) => {
          const info: GradRecommendSchoolPlan = {
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
                name: majorName,
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

    writeFile(
      "./cache/enroll-grad-recommend-plan.html",
      content,
      { encoding: "utf-8" },
      (err) => {
        if (err) {
          console.error(err);
        }
      },
    );
    writeFile(
      "./cache/enroll-grad-recommend-plan.json",
      JSON.stringify(schoolInfo),
      { encoding: "utf-8" },
      (err) => {
        if (err) {
          console.error(err);
        }
      },
    );

    return { success: true, data: schoolInfo };
  };

export const gradRecommendPlanHandler = request<GradRecommendPlanResponse>(
  async (_req, res) => {
    return res.json(await getGradRecommendPlan());
  },
);
