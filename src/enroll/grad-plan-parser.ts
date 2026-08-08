import type { GradEnrollPlanInfo } from "./grad-plan.js";

/** 招生目录单行数据（已从学校系统响应字段映射为可读字段） */
export interface GradEnrollPlanRow {
  /** 是否为专业分组行（true 为专业标题行，false 为研究方向明细行） */
  isMajorRow: boolean;
  /** 专业及研究方向文本（分组行为"专业代码 专业名【类型】"，明细行为研究方向名） */
  title: string;
  /** 分组键：专业代码_学习方式_考试方式 */
  groupKey: string;
  /** 研究方向代码 */
  code?: string;
  /** 研究方向名称 */
  name?: string;
  /** 拟招收人数 */
  count?: number;
  /** 推免录取人数 */
  recommendCount?: number;
  /** 初试科目 */
  subjects?: string;
  /** 备注 */
  note?: string;
}

/** 专业分组行 title 格式：`040101 教育学原理【全日制学术学位】` */
const majorInfoRegExp = /^(\S+)\s+(.+?)【([^】]+)】$/u;

/**
 * 将招生目录单行数组解析为专业列表
 *
 * 分组行开启一个新专业，其后的明细行作为该专业的研究方向
 *
 * @param rows 招生目录单行数据
 * @returns 专业列表
 */
export const parseGradEnrollPlan = (rows: GradEnrollPlanRow[]): GradEnrollPlanInfo[] => {
  const majors: GradEnrollPlanInfo[] = [];
  let currentMajor: GradEnrollPlanInfo | undefined;

  for (const row of rows) {
    if (row.isMajorRow) {
      const info = majorInfoRegExp.exec(row.title);

      currentMajor = {
        name: info?.[2] ?? row.title,
        code: info?.[1] ?? "",
        type: info?.[3] ?? "",
        directions: [],
      };

      majors.push(currentMajor);
    } else if (currentMajor) {
      currentMajor.directions.push({
        name: row.name ?? row.title,
        code: row.code ?? "",
        count: row.count ?? 0,
        recommendCount: row.recommendCount ?? 0,
        subjects: row.subjects ?? "",
        note: row.note ?? "",
      });
    }
  }

  return majors;
};
