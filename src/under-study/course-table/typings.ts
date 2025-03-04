export interface RawUnderCourseTableItem {
  /* ========= 课程基础信息 ========== */

  /**
   * 课程名称
   *
   * @example "习近平新时代中国特色社会主义思想概论"
   */
  kcmc: string;

  /**
   * 学时
   *
   * @example 2
   */
  xs: 2;

  /**
   * 课程编号
   *
   * @description 可用于查询指定课程
   */
  kcbh: string;
  /** 课程代码 */
  kcdm: string;

  /* ========= 班级信息 ========== */

  /**
   * 班级名称，可能为空
   *
   * @example "理科1班"
   */
  jxbmc: string;

  /**
   * 课容量
   *
   * @example 125
   */
  pkrs: number;

  /**
   * 教师姓名 (多个)，用英文逗号分隔
   *
   * @example "王庆勇,单桂晔,郭晋芝,周亚洲,邢海军,王玲玲,高志华,曹峻鸣"
   */
  teaxms: string;

  /**
   * 教师代码 (多个)，用英文逗号分隔
   *
   * @example "11300640,11841840,12432672"
   */
  teadms: "11300640,11841840,12432672";

  /**
   * 上课地址
   *
   * @example "逸夫教学楼401室"
   */
  jxcdmc: "逸夫教学楼401室";

  /**
   * 每周上课地址，用英文逗号分隔
   *
   * @example "逸夫教学楼401室-17,逸夫教学楼401室-12,逸夫教学楼401室-13,逸夫教学楼401室-14,逸夫教学楼401室-15,逸夫教学楼401室-16,逸夫教学楼401室-18,逸夫教学楼401室-19,逸夫教学楼401室-4,逸夫教学楼401室-5,逸夫教学楼401室-6,逸夫教学楼401室-7,逸夫教学楼401室-8,逸夫教学楼401室-9,逸夫教学楼401室-10,逸夫教学楼401室-11,逸夫教学楼401室-2,逸夫教学楼401室-3"
   */
  jxcdmc2: string;

  /**
   * 周次，用英文逗号分隔
   *
   * @example "17,12,13,14,15,16,18,19,4,5,6,7,8,9,10,11,2,3"
   */
  zc: string;

  /** 班级代码 */
  jxbdm: string;

  /* ========= 时间信息 ========== */

  /**
   * 学期代码
   *
   * @example "202301"
   */
  xnxqdm: string;
  /**
   * 星期
   *
   * @example "3"
   */
  xq: string;
  /**
   * 开始课时
   *
   * @example "01"
   */
  ps: string;
  /**
   * 结束课时
   *
   * @example "02"
   */
  pe: string;
  /**
   * 开始时间
   *
   * @example "08:00:00"
   */
  qssj: string;
  /**
   * 结束时间
   *
   * @example "09:30:00"
   */
  jssj: string;

  bapjxcd: "0";
  jxhjmc: "理论课时";
  kkxqdm: "MW";
  kcdldm: "03";
  jxcddm: "1015195";
  pkr: "";
  kcrwdm: "202320241000603";
  kxh: "1,10,11,12,13,14,15,16,17,2,3,4,5,6,7,8,9";
  islock: "0";
  pkrdms: "11369632";
  pkrlevel: 0;
  iszdjxcd: "0";
  jxxsmc: "";
  qsxq: "4";
  jsxq: "4";
  jxhjdm: "01";
  zdgnqdm: "";
  dgksdm: "223872330,223872000,223872066,223872132,223872198,223872264,223872396,223872462,246767928,246767994,246768060,246768126,246768192,246768258,246768324,246768390,268764936,268765002";
  tkbz: "1";
  zt: "1";
  jxmsmc: "";
  pkrdm: "";
  bgcolor: "#009688";
}

export interface TableClassData {
  name: string;
  teachers: string[];
  time: string;
  weeks: number[];
  locations: string[];
  classIndex: [number, number];
}

export type TableCellData = TableClassData[];
export type TableRowData = TableCellData[];
export type TableData = TableRowData[];
