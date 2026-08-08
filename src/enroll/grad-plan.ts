import { existsSync, mkdirSync, readFileSync, writeFile } from "node:fs";

import { request } from "@/utils/index.js";

import type { ActionFailType } from "../config/index.js";
import { invalidArgResponse, unknownResponse } from "../config/index.js";
import type { CommonFailedResponse, CommonSuccessResponse } from "../typings.js";
import type { GradEnrollPlanRow } from "./grad-plan-parser.js";
import { parseGradEnrollPlan } from "./grad-plan-parser.js";

const GRAD_ENROLL_PLAN_BASE_URL = "https://yz.nenu.edu.cn/ssmlZsmlGbGl";

/** 招生年份 → 招生计划编号（由研究生院每年发布，取自页面注入的 data-value） */
const GRAD_ENROLL_PLAN_YEARS = {
  2025: "52af9dc490c515960190d81a18600065",
  2026: "52af9dc498df604e0198f51f2ec30126",
} as const;

export type GradEnrollPlanYear = keyof typeof GRAD_ENROLL_PLAN_YEARS;

/** 专业研究方向 */
export interface GradEnrollDirection {
  /** 研究方向名称 */
  name: string;
  /** 研究方向代码 */
  code: string;
  /** 拟招收人数 */
  count: number;
  /** 推免录取人数 */
  recommendCount: number;
  /** 初试科目 */
  subjects: string;
  /** 备注 */
  note: string;
}

/** 专业 */
export interface GradEnrollPlanInfo {
  /** 专业名称 */
  name: string;
  /** 专业代码 */
  code: string;
  /** 专业类型：全日制学术学位 / 全日制专业学位 / 非全日制专业学位 */
  type: string;
  /** 研究方向 */
  directions: GradEnrollDirection[];
}

/** 院部 */
export interface GradEnrollSchoolPlan {
  /** 院部名称 */
  name: string;
  /** 院部代码 */
  code: string;
  /** 院部网址 */
  site: string;
  /** 联系人 */
  contact: string;
  /** 联系电话 */
  phone: string;
  /** 邮箱 */
  mail: string;
  /** 院部报考说明 */
  note: string;
  /** 专业列表 */
  majors: GradEnrollPlanInfo[];
}

export interface GradEnrollPlanOptions {
  /** 招生年份（2025 或 2026），缺省为最新年份 2026 */
  year?: number;
}

export type GradEnrollSuccessResponse = CommonSuccessResponse<GradEnrollSchoolPlan[]>;

export type GradEnrollResponse =
  | GradEnrollSuccessResponse
  | CommonFailedResponse<ActionFailType.InvalidArg | ActionFailType.Unknown>;

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

  const data: unknown = await response.json();

  return data;
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
        gbsjlx: "1",
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
    new URLSearchParams({ yxbh: schoolId, zsjhbh: planId, sfgs: "1", gbsjlx: "1" }).toString(),
  );

  return data as GradEnrollSchoolInfo;
};

/**
 * 获取单个院部招生目录明细
 *
 * @param planId 招生计划编号
 * @param schoolId 院部编号
 * @returns 招生目录单行数据
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
        gbsjlx: "1",
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
 * 将单个院部原始数据组装为返回结构
 *
 * @param planId 招生计划编号
 * @param school 院部列表项
 * @returns 组装完成的院部招生计划
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
 * @returns 组装完成的院部招生计划数组
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

/**
 * 将初试科目/备注中的逗号统一替换为换行
 *
 * 学校系统以半角逗号分隔科目与备注项，替换后配合小程序端 pre-line 分行展示（与网页一致）。 与小程序端 service 的 normalizeGradEnrollPlan 保持同一逻辑。
 *
 * @param plans 招生计划
 * @returns 替换完成后的招生计划
 */
const normalizeGradEnrollPlan = (plans: GradEnrollSchoolPlan[]): GradEnrollSchoolPlan[] =>
  plans.map((school) => ({
    ...school,
    majors: school.majors.map((major) => ({
      ...major,
      directions: major.directions.map((direction) => ({
        ...direction,
        subjects: direction.subjects.replaceAll(",", "\n"),
        note: direction.note.replaceAll(",", "\n"),
      })),
    })),
  }));

if (!existsSync("./cache")) mkdirSync("./cache");

/**
 * 获取指定年份的研究生招生计划
 *
 * @param year 招生年份（2025 或 2026）
 * @returns 招生计划响应
 */
export const getGradEnrollPlan = async (year: number): Promise<GradEnrollResponse> => {
  const planId = GRAD_ENROLL_PLAN_YEARS[year as GradEnrollPlanYear];

  if (!planId) return invalidArgResponse("年份");

  const dataPath = `./cache/enroll-grad-plan-${year}.json`;
  const signaturePath = `./cache/enroll-grad-plan-${year}.signature`;

  let schoolList: GradEnrollSchool[];

  try {
    schoolList = await getSchoolList(planId);
  } catch (err) {
    console.error(err);

    if (existsSync(dataPath)) {
      return {
        success: true,
        data: normalizeGradEnrollPlan(
          JSON.parse(readFileSync(dataPath, "utf-8")) as GradEnrollSchoolPlan[],
        ),
      };
    }

    return unknownResponse("招生计划查询失败");
  }

  // 院部列表为空视为抓取异常，避免写入空缓存
  if (schoolList.length === 0) return unknownResponse("招生计划查询失败");

  const signature = JSON.stringify(schoolList);

  // 院部列表未变化时直接返回缓存，避免逐院部重复抓取
  if (
    existsSync(dataPath) &&
    existsSync(signaturePath) &&
    readFileSync(signaturePath, "utf-8") === signature
  ) {
    return {
      success: true,
      data: normalizeGradEnrollPlan(
        JSON.parse(readFileSync(dataPath, "utf-8")) as GradEnrollSchoolPlan[],
      ),
    };
  }

  const schoolPlans = normalizeGradEnrollPlan(await buildSchoolPlans(planId, schoolList));

  writeFile(dataPath, JSON.stringify(schoolPlans), { encoding: "utf-8" }, (err) => {
    if (err) console.error(err);
  });
  writeFile(signaturePath, signature, { encoding: "utf-8" }, (err) => {
    if (err) console.error(err);
  });

  return { success: true, data: schoolPlans };
};

export const gradEnrollPlanHandler = request<GradEnrollResponse, GradEnrollPlanOptions>(
  async (req, res) => res.json(await getGradEnrollPlan(req.body.year ?? 2026)),
);
