/**
 * 原始班级数据
 */
export interface RawUnderSelectClassItem {
  /* ========= 基础信息 ========== */

  /**
   * 课程名称
   *
   * @example "习近平新时代中国特色社会主义思想概论"
   */
  kcmc: string;
  /**
   * 课程英文名称
   *
   * @example "Outline 0f Xi JinPing’s New China’s Socialist Ideology"
   */
  kcywmc: string;
  /**
   * 开课单位
   *
   * @example "马列教研室"
   */
  kkyxmc: string;
  /**
   * 课程类别名称
   *
   * @example "通识教育必修课"
   */
  kcdlmc: string;
  /**
   * 课程类别简称
   *
   * @example "通修"
   */
  jc: string;
  /**
   * 课程分类名称
   *
   * @example "思想政治教育"
   */
  kcflmc: string;
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
   * 学分
   *
   * @example 3
   */
  xf: number;
  /**
   * 总学时
   *
   * @example 27
   */
  zxs: number;

  /* ========= 上课信息 ========== */

  /**
   * 教师姓名
   *
   * @example "张三"
   */
  teaxm: string;
  /**
   * 教师姓名 (多个)
   *
   * @example "?????"
   */
  teaxms: string;
  /**
   * 上课地址
   *
   * @example "逸夫教学楼104室"
   */
  jxcdmc: "逸夫教学楼104室";
  /**
   * 上课地址 (多个)
   *
   * @example "????"
   */
  jxcdmcs: string;
  /**
   * 上课时间文字，用中文分号分割；周次可为复杂数字或数字范围组合，用英文逗号分割
   *
   * @default "1-18周 星期五0506节；1,3,5,7,9,11,13,15,17周 星期二0708节"
   */
  zcxqjc: string;
  /**
   * 课程节次文字，用中文分号分割
   *
   * @example "星期二0708节；星期五0506节"
   */
  xqjc: string;

  /* ========= 需要用到的字段 ID  ========== */
  /**
   * 课程平台代码
   *
   * @description 每个课程唯一，是查询课程班级的主键
   */
  kcptdm: string;
  /**
   * 课程编号
   *
   * @description 可用于查询指定课程
   */
  kcbh: string;
  /**
   * 课程任务代码
   *
   * @description 每个班级唯一，是选课/退选的主键
   */
  kcrwdm: string;
  /** 班级代码 */
  jxbdm: string;
  /** 课程代码 */
  kcdm: string;

  /** ?? */
  xq: "2";
  xzfsmc: "预选";
  jcdm2: "2-08,2-07,5-05,5-06";
  jxbrs: "281";
  kkbmdm: "SXXBHB2zzI";
  kcfldm: "4";
  zc: "1";
  wyfjdm: "";
  xbyqdm: "";
  syzydm: "1014037";
  zydm: ",1014037,";
  nd: ",2022,";
  tkbz: "1";
  rs1: "";
  rs2: "";
  kcdldm: "01";
  kkxqdm: "MW";
  xkxqdm: "MW";
  xmmc: "";
  rwdm: "435546723";
  sdm: "13253262";
}

/** 班级信息 */
export interface UnderSelectSearchClass {
  /** 上课时间 */
  time: string;
  /** 课容量 */
  capacity: number;

  /** 课程类别 */
  courseType: string;
  /** 课程分类 */
  courseCategory: string;
  /** 教师 */
  teacher: string;
  /** 地点 */
  location: string;
  /** 开课单位 */
  courseOffice: string;
  /** 总学时 */
  hours: number;
  /** 班级代码 */
  classCode: string;
  /** 课程 ID  */
  courseId: string;
  /** 班级 ID */
  classId: string;
}
