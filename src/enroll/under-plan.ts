import type { RequestHandler } from "express";

import type { CommonFailedResponse, EmptyObject } from "../typings.js";

export interface UnderEnrollInfoOptions {
  type: "info";
}

export interface UnderEnrollInfo {
  years: string[];
  provinces: string[];
}

const UNDER_ENROLL_PAGE_URL =
  "https://bkzsw.nenu.edu.cn/col_000018_000171.html";

const YEAR_REG_EXP =
  /<select class="custom-select year" id="inputGroupSelect01">\s*?<option selected>请选择<\/option>\s*((?:<option value=".*">.*<\/option>\s*?)+)<\/select>/;
const PROVINCE_REG_EXP =
  /<select class="custom-select province" id="inputGroupSelect01"[^>]*>\s*?<option selected>请选择<\/option>\s*((?:<option value=".*">.*<\/option>\s*?)+)<\/select>/;

const OPTION_REG_EXP = /<option value="(.*?)">.*?<\/option>/g;

const getUnderEnrollInfo = async (): Promise<UnderEnrollInfo> => {
  const infoResponse = await fetch(UNDER_ENROLL_PAGE_URL);
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

export interface UnderEnrollPlanTypeOptions {
  type: "planType";
  province: string;
  year: string;
}

const UNDER_ENROLL_PLAN_URL = "https://bkzsw.nenu.edu.cn/getPlanOpt";

const getUnderEnrollPlanType = async ({
  year,
  province,
}: UnderEnrollPlanTypeOptions): Promise<string[]> => {
  const searchResponse = await fetch(UNDER_ENROLL_PLAN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ typename: "plan", year, province }),
  });

  const plans = (await searchResponse.json()) as string[];

  return plans;
};

export interface UnderEnrollMajorTypeOptions {
  type: "majorType";
  province: string;
  year: string;
  plan: string;
}

const UNDER_ENROLL_MAJOR_TYPE_URL = "https://bkzsw.nenu.edu.cn/getMajorTypeOpt";

const getUnderEnrollMajorType = async ({
  year,
  province,
  plan,
}: UnderEnrollMajorTypeOptions): Promise<string[]> => {
  const searchResponse = await fetch(UNDER_ENROLL_MAJOR_TYPE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ typename: "plan", year, province, plan }),
  });

  const plans = (await searchResponse.json()) as string[];

  return plans;
};

export interface UnderEnrollMajorClassOptions {
  type: "majorClass";
  province: string;
  year: string;
  plan: string;
  majorType: string;
}

const UNDER_ENROLL_MAJOR_CLASS_URL =
  "https://bkzsw.nenu.edu.cn/getMajorClassOpt";

const getUnderEnrollMajorClass = async ({
  year,
  province,
  plan,
  majorType,
}: UnderEnrollMajorClassOptions): Promise<string[]> => {
  const searchResponse = await fetch(UNDER_ENROLL_MAJOR_CLASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      typename: "plan",
      year,
      province,
      plan,
      major_type: majorType,
    }),
  });

  const plans = (await searchResponse.json()) as string[];

  return plans;
};

export interface UnderEnrollPlanQueryOptions {
  type: "query";
  majorClass: string;
  majorType: string;
  plan: string;
  province: string;
}

export interface RawUnderEnrollPlanConfig {
  major: string;
  major_attr: string;
  admission_num: string;
  admission_len: string;
  admission_cost: string;
}

export interface UnderEnrollPlanConfig {
  /** 专业 */
  major: string;
  /** 专业类别 */
  majorType: string;
  /** 招生计划 */
  count: string;
  /** 学制 */
  years: string;
  /** 学费 */
  fee: string;
}

const QUERY_URL = "https://bkzsw.nenu.edu.cn/queryPlan";

const getUnderEnrollPlans = async (
  options: UnderEnrollPlanQueryOptions,
): Promise<UnderEnrollPlanConfig[]> => {
  const searchResponse = await fetch(QUERY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });

  const rawPlans = (await searchResponse.json()) as RawUnderEnrollPlanConfig[];

  return rawPlans.map(
    ({ major, major_attr, admission_num, admission_len, admission_cost }) => ({
      major,
      majorType: major_attr,
      count: admission_num,
      years: admission_len,
      fee: admission_cost,
    }),
  );
};

export interface UnderEnrollInfoSuccessResponse {
  success: true;
  data: UnderEnrollInfo;
}

export interface UnderEnrollDetailsSuccessResponse {
  success: true;
  data: string[];
}

export interface UnderEnrollPlanSuccessResponse {
  success: true;
  data: UnderEnrollPlanConfig[];
}

export type UnderEnrollPlanOptions =
  | UnderEnrollInfoOptions
  | UnderEnrollPlanTypeOptions
  | UnderEnrollMajorClassOptions
  | UnderEnrollMajorTypeOptions
  | UnderEnrollPlanQueryOptions;

export type UnderEnrollPlanResponse =
  | UnderEnrollInfoSuccessResponse
  | UnderEnrollDetailsSuccessResponse
  | UnderEnrollPlanSuccessResponse
  | CommonFailedResponse;

export const underEnrollPlanHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderEnrollPlanOptions
> = async (req, res) => {
  try {
    const { type } = req.body;

    if (type === "info") {
      const info = await getUnderEnrollInfo();

      return res.json({
        success: true,
        data: info,
      } as UnderEnrollInfoSuccessResponse);
    }

    if (type === "planType") {
      const plans = await getUnderEnrollPlanType(req.body);

      return res.json({
        success: true,
        data: plans,
      } as UnderEnrollDetailsSuccessResponse);
    }

    if (type === "majorType") {
      const majorTypes = await getUnderEnrollMajorType(req.body);

      return res.json({
        success: true,
        data: majorTypes,
      } as UnderEnrollDetailsSuccessResponse);
    }

    if (type === "majorClass") {
      const majorClasses = await getUnderEnrollMajorClass(req.body);

      return res.json({
        success: true,
        data: majorClasses,
      } as UnderEnrollDetailsSuccessResponse);
    }

    if (type === "query") {
      const data = await getUnderEnrollPlans(req.body);

      return res.json({
        success: true,
        data,
      } as UnderEnrollPlanSuccessResponse);
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
