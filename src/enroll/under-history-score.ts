import type { ActionFailType } from "../config/index.js";
import { InvalidArgResponse, MissingArgResponse } from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../typings.js";
import { request } from "../utils/index.js";

export interface UnderHistoryScoreInfoOptions {
  type: "info";
}

export interface UnderHistoryScoreQueryOptions {
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

const INFO_URL = "https://gkcx.nenu.edu.cn/api/user/param";

interface RawUnderHistoryScoreOptionConfig {
  major_type: string;
  type: string;
  year: string;
}

type RawUnderHistoryScoreOptionInfo = Record<
  /* province */ string,
  RawUnderHistoryScoreOptionConfig[]
>;

type UnderEnrollOptionInfo = Record<
  /* province */ string,
  Record<
    /* year */ string,
    Record</* type */ string, /* major type */ string[]>
  >
>;

export type UnderHistoryScoreInfoSuccessResponse =
  CommonSuccessResponse<UnderEnrollOptionInfo>;

export type UnderHistoryScoreInfoResponse =
  | UnderHistoryScoreInfoSuccessResponse
  | CommonFailedResponse;

export const getUnderHistoryScoreInfo =
  async (): Promise<UnderHistoryScoreInfoResponse> => {
    // NOTE: year=2023 does not take any effect
    const infoResponse = await fetch(`${INFO_URL}?which=score`);

    const info = (await infoResponse.json()) as RawUnderHistoryScoreOptionInfo;

    return {
      success: true,
      data: Object.fromEntries(
        Object.entries(info).map(([province, configs]) => {
          const result: Record<string, Record<string, string[]>> = {};

          // eslint-disable-next-line @typescript-eslint/naming-convention
          configs.forEach(({ major_type, type, year }) => {
            const current = ((result[year] ??= {})[type] ??= []);

            if (!current.includes(major_type)) current.push(major_type);
          });

          return [province, result];
        }),
      ),
    };
  };

interface RawUnderHistoryScoreConfig {
  province: string;
  type: string;
  major_type: string;
  /** 专业名称 */
  major: string;
  /** 专业属性 */
  major_attr: string;
  /** 录取控制线 */
  baseline: string;
  /** 最低文化成绩 */
  min_culture_score: string;
  min_major_score: string;
  min_admission_score: string;
  min_rank: string;
  max_culture_score: string;
  max_major_score: string;
  max_admission_score: string;
  max_rank: string;
  /** 平均文化成绩 */
  avg_culture_score: string;
  /** 平均专业成绩 */
  avg_major_score: string;
  /** 平均录取成绩 */
  avg_admission_score: string;

  memo: { String: ""; Valid: false };
}

interface RawUnderHistoryScoreResult {
  message: "Success";
  year: string;
  scores: RawUnderHistoryScoreConfig[];
}

export interface UnderHistoryScoreConfig {
  /** 专业 */
  major: string;
  /** 专业属性 */
  majorAttr: string;
  /** 录取控制线 */
  baseline: number | null;
  /** 最低录取成绩 */
  minScore: number | null;
  /** 最高录取成绩 */
  maxScore: number | null;
  /** 录取平均成绩 */
  averageScore: number | null;
}

type UnderHistoryScoreQuerySuccessResponse = CommonSuccessResponse<
  UnderHistoryScoreConfig[]
>;

type UnderHistoryScoreQueryResponse =
  | UnderHistoryScoreQuerySuccessResponse
  | CommonFailedResponse<ActionFailType.MissingArg | ActionFailType.Unknown>;

export const queryUnderHistoryScore = async ({
  province,
  year,
  classType,
  majorType,
}: UnderHistoryScoreQueryOptions): Promise<UnderHistoryScoreQueryResponse> => {
  if (!province) return MissingArgResponse("province");

  if (!year) return MissingArgResponse("year");

  if (!classType) return MissingArgResponse("classType");

  if (!majorType) return MissingArgResponse("majorType");

  const queryResponse = await fetch(
    `https://gkcx.nenu.edu.cn/api/user/queryScore`,
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

  const result = (await queryResponse.json()) as RawUnderHistoryScoreResult;

  const getNumber = (text: string): number | null => {
    const result = Number(text);

    return Number.isNaN(result) || result < 0 ? null : result;
  };

  return {
    success: true,
    data: result.scores.map(
      ({
        major,
        major_attr: majorAttr,
        baseline,
        min_admission_score: minScore,
        max_admission_score: maxScore,
        avg_admission_score: averageScore,
      }) => ({
        major,
        majorAttr,
        baseline: getNumber(baseline),
        minScore: getNumber(minScore),
        maxScore: getNumber(maxScore),
        averageScore: getNumber(averageScore),
      }),
    ),
  };
};

export type UnderHistoryScoreOptions =
  | UnderHistoryScoreInfoOptions
  | UnderHistoryScoreQueryOptions;

export type UnderHistoryScoreResponse =
  | UnderHistoryScoreInfoResponse
  | UnderHistoryScoreQueryResponse
  | CommonFailedResponse<ActionFailType.InvalidArg>;

export const underHistoryScoreHandler = request<
  UnderHistoryScoreResponse,
  UnderHistoryScoreOptions
>(async (req, res) => {
  if (req.body.type === "info") {
    return res.json(await getUnderHistoryScoreInfo());
  }

  if (req.body.type === "query") {
    return res.json(await queryUnderHistoryScore(req.body));
  }

  return res.json(InvalidArgResponse("type"));
});
