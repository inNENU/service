import type { CommonFailedResponse } from "../typings";

export interface SelectBaseOptions {
  /**
   * @deprecated
   *
   * Cookie
   */
  cookies: string[];
  /**
   * 服务器地址
   */
  server: string;

  /**
   * 用户层次
   */
  type: "under" | "post";
}

export interface SelectBaseSuccessResponse {
  success: true;
}

export type SelectBaseFailedResponse = CommonFailedResponse;

export interface CourseData {
  /** 课程名称 */
  name: string;
  /** 课程 ID */
  cid: string;
}

export interface StudentInfo {
  /** 当前学期 */
  period: string;
  /** 阶段 */
  stage: string;
  /** 姓名 */
  name: string;
  /** 学号 */
  id: string;
  /** 年级 */
  grade: string;
  /** 专业名 */
  majorName: string;
  max: number;
}
