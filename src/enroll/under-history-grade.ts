import type { RequestHandler } from "express";

import type { CommonFailedResponse, EmptyObject } from "../typings.js";

export interface UnderHistoryGradeInfoOptions {
  type: "info";
}

export interface UnderHistoryGradeInfo {
  years: string[];
  provinces: string[];
}

const UNDER_HISTORY_GRADE_PAGE_URL =
  "https://bkzsw.nenu.edu.cn/col_000018_000170.html";

const YEAR_REG_EXP =
  /<select class="custom-select year" id="inputGroupSelect01">\s*?<option selected>请选择<\/option>\s*((?:<option value=".*">.*<\/option>\s*?)+)<\/select>/;
const PROVINCE_REG_EXP =
  /<select class="custom-select province" id="inputGroupSelect01"[^>]*>\s*?<option selected>请选择<\/option>\s*((?:<option value=".*">.*<\/option>\s*?)+)<\/select>/;

const OPTION_REG_EXP = /<option value="(.*?)">.*?<\/option>/g;

const getUnderHistoryGradeInfo = async (): Promise<UnderHistoryGradeInfo> => {
  const infoResponse = await fetch(UNDER_HISTORY_GRADE_PAGE_URL);
  const content = await infoResponse.text();

  const yearOptions = YEAR_REG_EXP.exec(content)?.[1];
  const provinceOptions = PROVINCE_REG_EXP.exec(content)?.[1];

  if (!yearOptions || !provinceOptions) {
    throw new Error("获取省份和年份信息失败");
  }

  const years = Array.from(yearOptions.matchAll(OPTION_REG_EXP)).map(
    ([, value]) => value,
  );
  const provinces = Array.from(provinceOptions.matchAll(OPTION_REG_EXP)).map(
    ([, value]) => value,
  );

  return {
    years,
    provinces,
  };
};

export interface UnderHistoryGradeTypeOptions {
  type: "planType";
  province: string;
  year: string;
}

const UNDER_HISTORY_GRADE_PLAN_URL = "https://bkzsw.nenu.edu.cn/getPlanOpt";

const getUnderHistoryGradeType = async ({
  year,
  province,
}: UnderHistoryGradeTypeOptions): Promise<string[]> => {
  const searchResponse = await fetch(UNDER_HISTORY_GRADE_PLAN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ typename: "score", year, province }),
  });

  const plans = (await searchResponse.json()) as string[];

  return plans;
};

export interface UnderHistoryGradeMajorTypeOptions {
  type: "majorType";
  province: string;
  year: string;
  plan: string;
}

const UNDER_HISTORY_GRADE_MAJOR_TYPE_URL =
  "https://bkzsw.nenu.edu.cn/getMajorTypeOpt";

const getUnderHistoryGradeMajorType = async ({
  year,
  province,
  plan,
}: UnderHistoryGradeMajorTypeOptions): Promise<string[]> => {
  const searchResponse = await fetch(UNDER_HISTORY_GRADE_MAJOR_TYPE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ typename: "score", year, province, plan }),
  });

  const plans = (await searchResponse.json()) as string[];

  return plans;
};

export interface UnderHistoryGradeMajorClassOptions {
  type: "majorClass";
  province: string;
  year: string;
  plan: string;
  majorType: string;
}

const UNDER_HISTORY_GRADE_MAJOR_CLASS_URL =
  "https://bkzsw.nenu.edu.cn/getMajorClassOpt";

const getUnderHistoryGradeMajorClass = async ({
  year,
  province,
  plan,
  majorType,
}: UnderHistoryGradeMajorClassOptions): Promise<string[]> => {
  const searchResponse = await fetch(UNDER_HISTORY_GRADE_MAJOR_CLASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      typename: "score",
      year,
      province,
      plan,
      major_type: majorType,
    }),
  });

  const plans = (await searchResponse.json()) as string[];

  return plans;
};

export interface UnderHistoryGradeQueryOptions {
  type: "query";
  majorClass: string;
  majorType: string;
  plan: string;
  province: string;
  year: string;
}

export interface RawUnderHistoryGradeConfig {
  /** 专业 */
  major: string;
  /** 专业类别 */
  major_class: null;
  /** 专业属性 */
  admission_type: string;
  /** 重点线 */
  baseline: number;
  /** 专业录取线 */
  min_major_achievement: number;
  /** 最低文化成绩 */
  min_cultural_achievement: number;
  /** 最低录取成绩 */
  min_admission_achievement: number;
  /** 最高录取成绩 */
  max_admission_achievement: number;
}

export interface UnderHistoryGradeConfig {
  /** 专业 */
  major: string;
  /** 专业类别 */
  majorType: string;
  /** 重点线 */
  baseline: number;
  /** 专业录取线 */
  minMajorScore: number;
  /** 最低文化成绩 */
  minCulturalScore: number;
  /** 最低录取成绩 */
  minAdmissionScore: number;
  /** 最高录取成绩 */
  maxAdmissionScore: number;
}

const QUERY_URL = "https://bkzsw.nenu.edu.cn/queryPlan";

const getUnderHistoryGrades = async (
  options: UnderHistoryGradeQueryOptions,
): Promise<UnderHistoryGradeConfig[]> => {
  const searchResponse = await fetch(QUERY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });

  const rawPlans =
    (await searchResponse.json()) as RawUnderHistoryGradeConfig[];

  return rawPlans.map(
    ({
      major,
      admission_type: majorType,
      baseline,
      min_major_achievement: minMajorScore,
      min_cultural_achievement: minCulturalScore,
      min_admission_achievement: minAdmissionScore,
      max_admission_achievement: maxAdmissionScore,
    }) => ({
      major,
      majorType,
      baseline,
      minMajorScore,
      minCulturalScore,
      minAdmissionScore,
      maxAdmissionScore,
    }),
  );
};

export interface UnderHistoryGradeInfoSuccessResponse {
  success: true;
  data: UnderHistoryGradeInfo;
}

export interface UnderHistoryGradeDetailsSuccessResponse {
  success: true;
  data: string[];
}

export interface UnderHistoryGradeSuccessResponse {
  success: true;
  data: UnderHistoryGradeConfig[];
}

export type UnderHistoryGradeOptions =
  | UnderHistoryGradeInfoOptions
  | UnderHistoryGradeTypeOptions
  | UnderHistoryGradeMajorClassOptions
  | UnderHistoryGradeMajorTypeOptions
  | UnderHistoryGradeQueryOptions;

export type UnderHistoryGradeResponse =
  | UnderHistoryGradeInfoSuccessResponse
  | UnderHistoryGradeDetailsSuccessResponse
  | UnderHistoryGradeSuccessResponse
  | CommonFailedResponse;

export const underHistoryGradeHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderHistoryGradeOptions
> = async (req, res) => {
  try {
    const { type } = req.body;

    if (type === "info") {
      const info = await getUnderHistoryGradeInfo();

      return res.json({
        success: true,
        data: info,
      } as UnderHistoryGradeInfoSuccessResponse);
    }

    if (type === "planType") {
      const plans = await getUnderHistoryGradeType(req.body);

      return res.json({
        success: true,
        data: plans,
      } as UnderHistoryGradeDetailsSuccessResponse);
    }

    if (type === "majorType") {
      const majorTypes = await getUnderHistoryGradeMajorType(req.body);

      return res.json({
        success: true,
        data: majorTypes,
      } as UnderHistoryGradeDetailsSuccessResponse);
    }

    if (type === "majorClass") {
      const majorClasses = await getUnderHistoryGradeMajorClass(req.body);

      return res.json({
        success: true,
        data: majorClasses,
      } as UnderHistoryGradeDetailsSuccessResponse);
    }

    if (type === "query") {
      const data = await getUnderHistoryGrades(req.body);

      return res.json({
        success: true,
        data,
      } as UnderHistoryGradeSuccessResponse);
    }

    res.json({
      success: false,
      msg: "未知的请求类型",
    } as CommonFailedResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);
    res.json({
      success: false,
      msg: message,
    } as CommonFailedResponse);
  }
};
