import { getRichTextNodes } from "@mptool/parser";

import type { GradEnrollPlanInfo, GradEnrollSchoolPlan } from "./grad-plan.js";

const TABLE_HEADER = "<tr><th>专业代码</th><th>人数</th><th>考试科目</th><th>备注</th></tr>";

const schoolInfoRegExp =
  /bXYName\['.*?'\]="<tr><td colspan=4><a href='(.*?)' target='_blank'>([^<]+) ([^<]+)<\/a><br>联系方式：(\S+?)，(\S+?)，(\S+?)<\/td><\/tr>";/gu;

const parseMajors = async (content: string, name: string): Promise<GradEnrollPlanInfo[]> => {
  const majorCodes = [
    ...content.matchAll(new RegExp(`cXYName\\['${name}'\\]\\.push\\('([^']+)'\\)`, "gu")),
  ];

  const majorNameRegExp = [
    ...content.matchAll(new RegExp(`fXYName\\['${name}'\\]\\.push\\('([^']+)'\\)`, "gu")),
  ];

  return Promise.all(
    majorCodes.map(async ([, majorCode], index) => {
      const [, majorName] = majorNameRegExp[index];

      const majorTypeRegExp = new RegExp(
        `dXYName\\['${name}'\\]\\['(${majorCode})'\\]\\.push\\("<tr><td colspan=4><b>\\1\\s+\\S+【(\\S+)】<\\/b><\\/td><\\/tr>"`,
        "u",
      );

      const startLine = `dXYName['${name}']['${majorCode}'].push("<tr>");`;
      const start = content.indexOf(startLine) + startLine.length;
      const end = content.lastIndexOf(`dXYName['${name}']['${majorCode}'].push("</tr>");`);
      const majorContent = content.slice(start, end);

      const lines = [...majorContent.matchAll(/dXYName\['.*?'\]\['[^']+'\]\.push\("(.*)"\)/gu)].map(
        ([, line]) => line.replaceAll(/<\/?center>/gu, ""),
      );

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
};

export const parseGradEnrollPlan = async (content: string): Promise<GradEnrollSchoolPlan[]> =>
  Promise.all(
    [...content.matchAll(schoolInfoRegExp)].map(
      async ([, site, code, name, contact, phone, mail]) => ({
        name,
        site,
        code,
        contact,
        phone,
        mail,
        majors: await parseMajors(content, name),
      }),
    ),
  );
