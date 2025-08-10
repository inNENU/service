import { IE_8_USER_AGENT, getIETimeStamp, request } from "@/utils/index.js";

import {
  UNDER_SYSTEM_SERVER,
  fieldRegExp,
  keyCodeRegExp,
  otherFieldsRegExp,
  printHQLInputRegExp,
  printHQLJSRegExp,
  printPageSizeRegExp,
  sqlStringRegExp,
  tableFieldsRegExp,
  totalPagesRegExp,
} from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";

const HEADER_REGEXP = /<title>(.*)<\/title>/;

const PLAN_REGEXP =
  /<tr[^>]*><td[^>]*>.*?<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<\/tr>/g;

const DEFAULT_TABLE_FIELD =
  "控制名称:12:1:100:e.kzmc,学院:11:1:150:c.dwmc,专业名称:10:1:150:zymc,接收科类:16:1:80:zykl,考核方式:3:1:70:zzykhfs.dmmc,考核时间:4:1:110:khsj,考核地点:5:1:80:khdd,拟转入人数:6:1:90:zrrs,报名人数:17:1:90:jyzrrs,转入条件:15:1:60:zrtj,联系人:18:1:90:lxr,咨询电话:19:1:100:lxdh";
const DEFAULT_OTHER_FIELD = "null";

const QUERY_URL = `${UNDER_SYSTEM_SERVER}/jiaowu/xjgl/zzygl/zzyxxgl_xsd_list.jsp`;

export interface ChangeMajorPlan {
  /** 学院 */
  school: string;
  /** 专业 */
  major: string;
  /** 科类 */
  subject: string;
  /** 考试类型 */
  examType: string;
  /** 考试时间 */
  time: string;
  /** 考试地点 */
  location: string;
  /** 计划数 */
  plan: number;
  /** 当前报名人数 */
  current: number;
  /** 准入要求 */
  requirement: string;
  /** 联系人 */
  contact: string;
  /** 电话 */
  phone: string;
}

const getPlans = (content: string): ChangeMajorPlan[] =>
  Array.from(content.matchAll(PLAN_REGEXP)).map(
    ([
      ,
      ,
      school,
      major,
      subject,
      examType,
      time,
      location,
      plan,
      current,
      requirement,
      contact,
      phone,
    ]) => ({
      school,
      major,
      subject,
      examType,
      time,
      location,
      plan: Number(plan),
      current: Number(current),
      requirement: requirement
        .replace(/准入考核内容/g, "\n准入考核内容")
        .replace(/(\d+)\./g, "\n$1.")
        .replace(/([一二三四五六七八九十]+)、/g, "\n$1、")
        .trim(),
      contact,
      phone,
    }),
  );

export const getPlanList = async (
  cookieHeader: string,
  content: string,
): Promise<ChangeMajorPlan[]> => {
  // We force writing these 2 field to ensure we care getting the default table structure
  const tableFields = tableFieldsRegExp.exec(content)![1];
  const otherFields = String(otherFieldsRegExp.exec(content)?.[1]);
  const totalPages = Number(totalPagesRegExp.exec(content)![1]);

  // users are editing them, so the main page must be refetched
  const shouldRefetch =
    tableFields !== DEFAULT_TABLE_FIELD || otherFields !== DEFAULT_OTHER_FIELD;

  const plans = shouldRefetch ? [] : getPlans(content);

  if (totalPages === 1 && !shouldRefetch) return plans;

  const field = String(fieldRegExp.exec(content)?.[1]);
  const printPageSize = String(printPageSizeRegExp.exec(content)?.[1]);
  const keyCode = String(keyCodeRegExp.exec(content)?.[1]);
  const printHQL =
    String(printHQLInputRegExp.exec(content)?.[1]) ||
    String(printHQLJSRegExp.exec(content)?.[1]);
  const sqlString = sqlStringRegExp.exec(content)?.[1];

  const pages: number[] = [];

  for (let page = shouldRefetch ? 1 : 2; page <= totalPages; page++)
    pages.push(page);

  await Promise.all(
    pages.map(async (page) => {
      const params = new URLSearchParams({
        keyCode,
        PageNum: page.toString(),
        printHQL,
        ...(sqlString ? { sqlString } : {}),
        printPageSize,
        field,
        totalPages: totalPages.toString(),
        tableFields: DEFAULT_TABLE_FIELD,
        otherFields: DEFAULT_OTHER_FIELD,
      });

      const response = await fetch(QUERY_URL, {
        method: "POST",
        headers: {
          Cookie: cookieHeader,
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: QUERY_URL,
          "User-Agent": IE_8_USER_AGENT,
        },
        body: params.toString(),
      });

      const responseText = await response.text();

      const newPlans = getPlans(responseText);

      plans.push(...newPlans);
    }),
  );

  return plans;
};

export interface UnderChangeMajorPlanSuccessResponse {
  success: true;
  /** 计划标题 */
  header: string;
  /** 计划 */
  plans: ChangeMajorPlan[];
}

export type UnderChangeMajorPlanFailedResponse =
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

export type UnderChangeMajorPlanResponse =
  | UnderChangeMajorPlanSuccessResponse
  | UnderChangeMajorPlanFailedResponse;

const TEST_UNDER_CHANGE_MAJOR_PLAN_RESPONSE: UnderChangeMajorPlanSuccessResponse =
  {
    success: true,
    header: `${new Date().getFullYear()}年度本科生专业转换计划`,
    plans: Array<ChangeMajorPlan>(2).fill({
      school: "计算机学院",
      major: "计算机科学与技术",
      subject: "理科",
      examType: "统一考试",
      time: "2021-08-01",
      location: "A栋101",
      plan: 100,
      current: 50,
      requirement: "准入考核内容\n1. 本科生\n2. 专业课程\n3. 通过率70%",
      contact: "张三",
      phone: "123456789",
    }),
  };

export const getUnderChangeMajorPlan = async (
  cookieHeader: string,
): Promise<UnderChangeMajorPlanResponse> => {
  const response = await fetch(`${QUERY_URL}?tktime=${getIETimeStamp()}`, {
    headers: {
      Cookie: cookieHeader,
      "User-Agent": IE_8_USER_AGENT,
    },
  });

  const content = await response.text();
  const header = HEADER_REGEXP.exec(content)![1].trim();

  return {
    success: true,
    header,
    plans: await getPlanList(cookieHeader, content),
  };
};

export const underChangeMajorPlanHandler =
  request<UnderChangeMajorPlanResponse>(async (req, res) => {
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST"))
      return res.json(TEST_UNDER_CHANGE_MAJOR_PLAN_RESPONSE);

    return res.json(await getUnderChangeMajorPlan(cookieHeader));
  });
