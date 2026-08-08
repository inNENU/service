/** 校区类型 */
export type CampusLocation = "benbu" | "jingyue" | "unknown";

/** 理论物理（位于净月校区；物理学院在本部，理论物理为例外） */
const THEORETICAL_PHYSICS_MAJOR_ID = "070201";

/** 细胞生物学（导师在两个校区均有实验室，无法确定校区） */
const CELL_BIOLOGY_MAJOR_ID = "071009";

/** 本部校区学院代码 */
const BENBU_ORG_IDS = new Set([
  164000, // 文学院
  166000, // 历史文化学院
  170000, // 数学与统计学院
  173000, // 物理学院
  174000, // 化学学院
  175000, // 生命科学学院
  177000, // 体育学院
  232000, // 教育学部
  234000, // 地理科学学院
  236000, // 马克思主义学部
  253000, // 心理学院
]);

/** 净月校区学院代码 */
const JINGYUE_ORG_IDS = new Set([
  161000, // 政法学院
  167000, // 外国语学院
  168000, // 音乐学院
  169000, // 美术学院
  178000, // 传媒科学学院（新闻学院）
  235000, // 环境学院
  245000, // 罗格斯大学·纽瓦克学院
  246000, // 国际汉学院（海外教育学院）
  252000, // 信息科学与技术学院
  261000, // 经济与管理学院
]);

export interface CampusLocationOptions {
  /** 专业代码 */
  majorId: string;
  /** 学院代码 */
  orgId: number;
  /** 专业名称 */
  major?: string;
}

/**
 * 根据学院代码 / 专业代码推断校区
 *
 * 优先级：理论物理（净月）→ 细胞生物学（无法确定）→ 其余按学院固定校区（本部 / 净月，含外国语学院）
 *
 * @returns 校区：本部（benbu）、净月（jingyue）或未知（unknown）
 */
export const getCampusLocation = ({
  majorId,
  orgId,
  major,
}: CampusLocationOptions): CampusLocation => {
  // 理论物理位于净月校区（物理学院在本部，理论物理为例外）
  if (majorId === THEORETICAL_PHYSICS_MAJOR_ID) return "jingyue";
  // 细胞生物学导师在两个校区均有实验室，无法确定校区
  if (majorId === CELL_BIOLOGY_MAJOR_ID || major === "细胞生物学") return "unknown";
  // 其余按学院固定校区
  if (BENBU_ORG_IDS.has(orgId)) return "benbu";
  if (JINGYUE_ORG_IDS.has(orgId)) return "jingyue";

  return "unknown";
};
