export interface RawGradeResultItem {
  /** 修读学期 */
  xnxqmc: string;
  /** 课程名称 */
  kcmc: string;
  /** 课程英文名称 */
  kcywmc: string;
  /** 课程类别 */
  kcdlmc: string;
  /** 课程成绩文字 */
  zcj: string;
  /** 课程实际成绩 */
  zcjfs: number;
  /** 考试性质 */
  ksxzmc: "正常考试" | "校际交流" | "补考";
  /** 成绩方式 */
  cjfsmc: "百分制" | "五级制";
  /** 学分 */
  xf: number;
  /** 总学时 */
  zxs: number;
  /** 修读方式名称 */
  xdfsmc: string;
  /** 开课单位 */
  kkbmmc: string;
  /** 成绩标识 */
  cjbzmc: string;

  /** 学年学期代码 */
  xnxqdm: string;
  /** 课程编号 */
  kcbh: string;
  /** 课程平台编号 */
  kcptbh: string;
  /** 考试性质代码 */
  ksxzdm: string;
  /** 课程代码 */
  kcdm: string;
  /** 修读方式代码 */
  xdfsdm: string;
  /** 成绩代码 */
  cjdm: string;
  /** 考核分数代码 */
  khfsdm: string;

  /** 学生姓名 */
  xsxm: string;
  /** 学号 */
  xsbh: string;
  /** 学生代码 */
  xsdm: string;

  xsckcj: "0";
  rownum_: number;
  ismax: "1" | "0";
  isactive: "1";
  wpjbz: "";
  kcflmc: "";
  cjjd: "";
  bz: "";
  xsckcjbz: "";
  kcrwdm: "";
  wzc: "0";
  wpj: "0";

  xmmc: "";
  rwdm: "";
  wzcbz: "";
}

export interface RawGradeSuccessResult {
  data: "";
  rows: RawGradeResultItem[];
  total: number;
}

export interface RawUnderGradeFailedResult {
  code: number;
  data: string;
  message: string;
}

export type RawGradeResult = RawGradeSuccessResult | RawUnderGradeFailedResult;

export interface StudyGradeResult {
  /** 修读时间 */
  time: string;
  /** 课程 id */
  cid: string;
  /** 课程名称 */
  name: string;
  /** 分数 */
  grade: number;
  /** 成绩代码 */
  gradeCode: string;
  /** 分数文本 */
  gradeText: string;
  gradeType: "百分制" | "五级制";
  /** 课程类型 */
  courseType: string;
  /** 课程类型短称 */
  shortCourseType: string;
  /** 学时 */
  hours: number | null;
  /** 学分 */
  point: number;
  /** 成绩标识 */
  mark: string;
  /** 开课单位 */
  office: string;
  /** 考试性质 */
  examType: "正常考试" | "校际交流" | "补考";
}

export interface GradeListSuccessResponse {
  success: true;
  data: StudyGradeResult[];
}

export const getGradeLists = (records: RawGradeResultItem[]): StudyGradeResult[] =>
  records.map(
    ({
      xnxqmc,
      kcmc,
      kcdlmc,
      zcj,
      zcjfs,
      ksxzmc,
      cjfsmc,
      xf,
      zxs,
      xdfsmc,
      kkbmmc,
      cjdm,
      cjbzmc,
      kcptbh,
    }) => ({
      time: xnxqmc.replace(/^20/u, "").replace(/季学期$/u, ""),
      cid: kcptbh,
      name: kcmc,
      grade: zcjfs,
      gradeCode: cjdm,
      gradeText: zcj,
      gradeType: cjfsmc,
      courseType: kcdlmc,
      shortCourseType: xdfsmc,
      office: kkbmmc,
      hours: zxs,
      point: xf,
      examType: ksxzmc,
      mark: cjbzmc,
    }),
  );

export const GRADE_LIST_TEST_RESPONSE: GradeListSuccessResponse = {
  success: true,
  data: Array.from({ length: 10 }, (_, i) => ({
    time: `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
    cid: `${new Date().getFullYear() - 1}-${new Date().getFullYear()}-1`,
    name: `测试课程${i + 1}`,
    grade: 100 - i * 2,
    gradeCode: "A",
    gradeText: "优秀",
    gradeType: "百分制",
    courseType: "必修",
    shortCourseType: "必",
    office: "测试单位",
    hours: 36,
    point: 2,
    examType: "正常考试",
    mark: "正常",
  })),
};
