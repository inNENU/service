import type { RequestHandler } from "express";

import type { ActionFailType } from "../config/index.js";
import {
  InvalidArgResponse,
  MissingArgResponse,
  UnknownResponse,
} from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  EmptyObject,
} from "../typings.js";

export interface UnderEnrollPlanInfoOptions {
  type: "info";
}

export interface UnderEnrollPlanQueryOptions {
  type: "query";
  /** 省份 */
  province: string;
  /** 年份 */
  year: string;
  /**类型 */
  classType: string;
  /** 专业类型 */
  majorType: string;
}

export type UnderEnrollPlanOptions =
  | UnderEnrollPlanInfoOptions
  | UnderEnrollPlanQueryOptions;

const INFO_URL = "https://gkcx.nenu.edu.cn/api/user/param";

interface RawUnderEnrollPlanOptionConfig {
  major_type: string;
  type: string;
  year: string;
}

type RawUnderEnrollPlanOptionInfo = Record<
  /* province */ string,
  RawUnderEnrollPlanOptionConfig[]
>;

type UnderEnrollPlanOptionInfo = Record<
  /* province */ string,
  Record<
    /* year */ string,
    Record</* type */ string, /* major type */ string[]>
  >
>;

export type UnderEnrollPlanInfoSuccessResponse =
  CommonSuccessResponse<UnderEnrollPlanOptionInfo>;

export type UnderEnrollPlanInfoResponse =
  | UnderEnrollPlanInfoSuccessResponse
  | CommonFailedResponse;

export const getUnderEnrollInfo =
  async (): Promise<UnderEnrollPlanInfoResponse> => {
    // NOTE: year=2024 does not take any effect
    const infoResponse = await fetch(`${INFO_URL}?which=plan`);

    const info = (await infoResponse.json()) as RawUnderEnrollPlanOptionInfo;

    return {
      success: true,
      data: Object.fromEntries(
        Object.entries(info).map(([province, configs]) => {
          const result: Record<string, Record<string, string[]>> = {};

          // eslint-disable-next-line @typescript-eslint/naming-convention
          configs.forEach(({ major_type, type, year }) => {
            ((result[year] ??= {})[type] ??= []).push(major_type);
          });

          return [province, result];
        }),
      ),
    };
  };

interface RawUnderEnrollPlanConfig {
  edu_cost: string;
  edu_len: string;
  major: string;
  major_attr: string;
  major_type: string;
  number: string;
  province: string;
  type: string;
  memo: { String: ""; Valid: false };
}

interface RawUnderEnrollPlanResult {
  message: "Success";
  year: string;
  plans: RawUnderEnrollPlanConfig[];
}

export interface UnderEnrollPlanConfig {
  /** 专业 */
  major: string;
  /** 专业属性 */
  majorAttr: string;
  /** 招生计划 */
  count: string;
  /** 学制 */
  years: string;
  /** 学费 */
  fee: string;
}

type UnderEnrollPlanQuerySuccessResponse = CommonSuccessResponse<
  UnderEnrollPlanConfig[]
>;

type UnderEnrollPlanQueryResponse =
  | UnderEnrollPlanQuerySuccessResponse
  | CommonFailedResponse<ActionFailType.MissingArg | ActionFailType.Unknown>;

export const queryUnderEnrollPlan = async ({
  province,
  year,
  classType,
  majorType,
}: UnderEnrollPlanQueryOptions): Promise<UnderEnrollPlanQueryResponse> => {
  if (!province) return MissingArgResponse("province");

  if (!year) return MissingArgResponse("year");

  if (!classType) return MissingArgResponse("classType");

  if (!majorType) return MissingArgResponse("majorType");

  const queryResponse = await fetch(
    `https://gkcx.nenu.edu.cn/api/user/queryPlan`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        province,
        year,
        major_type: classType,
        type: majorType,
      }),
    },
  );

  const result = (await queryResponse.json()) as RawUnderEnrollPlanResult;

  return {
    success: true,
    data: result.plans.map(
      ({
        major,
        major_attr: majorAttr,
        number,
        edu_len: years,
        edu_cost: fee,
      }) => ({
        major,
        majorAttr,
        count: number,
        years,
        fee,
      }),
    ),
  };
};

export const underEnrollPlanHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderEnrollPlanOptions
> = async (req, res) => {
  try {
    if (req.body.type === "info") {
      return res.json(await getUnderEnrollInfo());
    }

    if (req.body.type === "query") {
      return res.json(await queryUnderEnrollPlan(req.body));
    }

    return res.json(InvalidArgResponse("type"));
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
