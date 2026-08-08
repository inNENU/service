import { existsSync, mkdirSync, readFileSync, writeFile } from "node:fs";

import { request } from "@/utils/index.js";

import type { ActionFailType } from "../config/index.js";
import { invalidArgResponse, unknownResponse } from "../config/index.js";
import type { CommonFailedResponse, CommonSuccessResponse } from "../typings.js";
import type { GradEnrollPlanRow } from "./grad-plan-parser.js";
import { parseGradEnrollPlan } from "./grad-plan-parser.js";
import { GRAD_ENROLL_PLAN_YEARS } from "./grad-plan.js";
import type { GradEnrollSchoolPlan } from "./grad-plan.js";

const GRAD_ENROLL_PLAN_BASE_URL = "https://yz.nenu.edu.cn/ssmlZsmlGbGl";

/** 推免（推荐免试）招生类型代码 */
const GRAD_RECOMMEND_GBSJLX = "3";

/** 院部列表项（querySsZsyx4Gbb 响应） */
interface GradEnrollSchool {
  /** 院部编号 */
  id: string;
  /** 院部名称 */
  name: string;
}

/** 院部信息（getZsmlYxInfo4Gbb 响应，字段为学校系统命名） */
interface GradEnrollSchoolInfo {
  /** 院部名称 */
  organName: string;
  /** 院部代码 */
  organCode: string;
  /** 联系人 */
  lxr: string;
  /** 联系电话 */
  lxdh: string;
  /** 邮箱 */
  dzxx: string;
  /** 院部网址 */
  yxgw: string;
  /** 报考说明 */
  yxbz?: string;
}

/** 招生目录原始行响应（querySsZsml4Gbb，字段为学校系统命名） */
interface RawPlanRow {
  /** 专业及研究方向文本 */
  zyYjfx: string;
  /** 分组键 */
  zymlKey: string;
  /** 是否为专业分组行（1 为分组行，0 为研究方向明细行） */
  isXkRow: string;
  /** 研究方向代码 */
  yjfxdm?: string;
  /** 研究方向名称 */
  yjfxmc?: string;
  /** 拟招收人数 */
  jhrs?: number;
  /** 推免录取人数 */
  tmslqrs?: number;
  /** 初试科目 */
  cskms?: string;
  /** 备注 */
  bz?: string;
  /** 备注（兼容字段） */
  gbbz?: string;
}

export interface GradRecommendPlanOptions {
  /** 招生年份（2025 或 2026），缺省为最新年份 2026 */
  year?: number;
}

export type GradRecommendSuccessResponse = CommonSuccessResponse<GradEnrollSchoolPlan[]>;

export type GradRecommendResponse =
  | GradRecommendSuccessResponse
  | CommonFailedResponse<ActionFailType.InvalidArg | ActionFailType.Unknown>;

/**
 * 向研究生招生服务系统发送表单 POST 请求
 *
 * @param path 接口路径
 * @param body 表单请求体
 * @returns 解析后的 JSON 响应
 */
const postForm = async (path: string, body: string): Promise<unknown> => {
  const response = await fetch(`${GRAD_ENROLL_PLAN_BASE_URL}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (response.status !== 200) throw new Error(`${path} 请求失败：HTTP ${response.status}`);

  return response.json();
};

/**
 * 获取院部列表
 *
 * @param planId 招生计划编号
 * @returns 院部列表
 */
const getSchoolList = async (planId: string): Promise<GradEnrollSchool[]> => {
  const data = await postForm(
    "querySsZsyx4Gbb",
    new URLSearchParams({
      conditions: JSON.stringify({
        zsjhbh: planId,
        sfgs: "1",
        isPreview: "0",
        gbsjlx: GRAD_RECOMMEND_GBSJLX,
        yxbh: "",
      }),
    }).toString(),
  );

  return (data as { yxbh: string; yxmc: string }[]).map(({ yxbh: id, yxmc: name }) => ({
    id,
    name,
  }));
};

/**
 * 获取单个院部信息
 *
 * @param planId 招生计划编号
 * @param schoolId 院部编号
 * @returns 院部信息
 */
const getSchoolInfo = async (planId: string, schoolId: string): Promise<GradEnrollSchoolInfo> => {
  const data = await postForm(
    "getZsmlYxInfo4Gbb",
    new URLSearchParams({
      yxbh: schoolId,
      zsjhbh: planId,
      sfgs: "1",
      gbsjlx: GRAD_RECOMMEND_GBSJLX,
    }).toString(),
  );

  return data as GradEnrollSchoolInfo;
};

/**
 * 获取单个院部推免目录明细
 *
 * @param planId 招生计划编号
 * @param schoolId 院部编号
 * @returns 推免目录单行数据
 */
const getSchoolPlan = async (planId: string, schoolId: string): Promise<GradEnrollPlanRow[]> => {
  const data = await postForm(
    "querySsZsml4Gbb",
    `${new URLSearchParams({
      conditions: JSON.stringify({
        yxbh: schoolId,
        xkbh: null,
        zsjhbh: planId,
        sfgs: "1",
        isPreview: "0",
        gbsjlx: GRAD_RECOMMEND_GBSJLX,
        isShowJhrs: null,
      }),
    }).toString()}&_gridInfo={}`,
  );

  return (data as RawPlanRow[]).map((row) => ({
    isMajorRow: row.isXkRow === "1",
    title: row.zyYjfx,
    groupKey: row.zymlKey,
    code: row.yjfxdm,
    name: row.yjfxmc,
    count: row.jhrs,
    recommendCount: row.tmslqrs,
    subjects: row.cskms,
    note: row.bz ?? row.gbbz,
  }));
};

/**
 * 组装单个院部推免计划
 *
 * @param planId 招生计划编号
 * @param school 院部列表项
 * @returns 组装完成的院部推免计划
 */
const buildSchoolPlan = async (
  planId: string,
  school: GradEnrollSchool,
): Promise<GradEnrollSchoolPlan> => {
  const [info, rows] = await Promise.all([
    getSchoolInfo(planId, school.id),
    getSchoolPlan(planId, school.id),
  ]);

  return {
    name: info.organName || school.name,
    code: info.organCode || "",
    site: info.yxgw || "",
    contact: info.lxr || "",
    phone: info.lxdh || "",
    mail: info.dzxx || "",
    note: info.yxbz ?? "",
    majors: parseGradEnrollPlan(rows),
  };
};

/**
 * 分批并发抓取所有院部，避免一次性请求过多冲击学校服务器
 *
 * @param planId 招生计划编号
 * @param schoolList 院部列表
 * @returns 组装完成的院部推免计划数组
 */
const buildSchoolPlans = async (
  planId: string,
  schoolList: GradEnrollSchool[],
): Promise<GradEnrollSchoolPlan[]> => {
  const CHUNK_SIZE = 5;
  const batches: GradEnrollSchool[][] = [];

  for (let index = 0; index < schoolList.length; index += CHUNK_SIZE)
    batches.push(schoolList.slice(index, index + CHUNK_SIZE));

  return batches.reduce<Promise<GradEnrollSchoolPlan[]>>(async (promise, batch) => {
    const schoolPlans = await promise;
    const results = await Promise.all(
      batch.map(async (school) => {
        try {
          return { plan: await buildSchoolPlan(planId, school) };
        } catch (err) {
          console.error(`院部 ${school.name} 抓取失败`, err);

          return null;
        }
      }),
    );

    results.forEach((result) => {
      if (result) schoolPlans.push(result.plan);
    });

    return schoolPlans;
  }, Promise.resolve([]));
};

if (!existsSync("./cache")) mkdirSync("./cache");

/**
 * 获取指定年份的研究生推免（推荐免试）计划
 *
 * @param year 招生年份（2025 或 2026）
 * @returns 推免计划响应
 */
export const getGradRecommendPlan = async (year: number): Promise<GradRecommendResponse> => {
  const planId = GRAD_ENROLL_PLAN_YEARS[year as keyof typeof GRAD_ENROLL_PLAN_YEARS];

  if (!planId) return invalidArgResponse("年份");

  const dataPath = `./cache/enroll-grad-recommend-plan-${year}.json`;
  const signaturePath = `./cache/enroll-grad-recommend-plan-${year}.signature`;

  let schoolList: GradEnrollSchool[];

  try {
    schoolList = await getSchoolList(planId);
  } catch (err) {
    console.error(err);

    if (existsSync(dataPath)) {
      return {
        success: true,
        data: JSON.parse(readFileSync(dataPath, "utf-8")) as GradEnrollSchoolPlan[],
      };
    }

    return unknownResponse("推免计划查询失败");
  }

  // 院部列表为空视为抓取异常，避免写入空缓存
  if (schoolList.length === 0) return unknownResponse("推免计划查询失败");

  const signature = JSON.stringify(schoolList);

  // 院部列表未变化时直接返回缓存，避免逐院部重复抓取
  if (
    existsSync(dataPath) &&
    existsSync(signaturePath) &&
    readFileSync(signaturePath, "utf-8") === signature
  ) {
    return {
      success: true,
      data: JSON.parse(readFileSync(dataPath, "utf-8")) as GradEnrollSchoolPlan[],
    };
  }

  const schoolPlans = await buildSchoolPlans(planId, schoolList);

  writeFile(dataPath, JSON.stringify(schoolPlans), { encoding: "utf-8" }, (err) => {
    if (err) console.error(err);
  });
  writeFile(signaturePath, signature, { encoding: "utf-8" }, (err) => {
    if (err) console.error(err);
  });

  return { success: true, data: schoolPlans };
};

export const gradRecommendPlanHandler = request<GradRecommendResponse, GradRecommendPlanOptions>(
  async (req, res) => res.json(await getGradRecommendPlan(req.body.year ?? 2026)),
);
