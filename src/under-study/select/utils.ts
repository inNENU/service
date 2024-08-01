import type { SelectOptionConfig } from "./store";
import type {
  RawUnderSelectClassItem,
  UnderSelectClassInfo,
  UnderSelectCourseInfo,
} from "./typings";

export const COURSE_CATEGORIES: SelectOptionConfig[] = [
  { name: "专业系列课", value: "3" },
  { name: "思想政治教育", value: "4" },
  { name: "共通教育课程（必修）", value: "5" },
  { name: "学科教育课程（必修）", value: "9" },
  { name: "教育实践课程", value: "10" },
  { name: "学科基础课", value: "11" },
  { name: "数学与逻辑", value: "15" },
  { name: "人文与艺术", value: "16" },
  { name: "体育与国防教育", value: "22" },
  { name: "交流表达与信息素养", value: "24" },
  { name: "发展方向课", value: "25" },
  { name: "专业教育系列课程", value: "31" },
  { name: "共通教育及学科教育选修课程", value: "32" },
  { name: "实践与毕业论文", value: "33" },
  { name: "学院自设通识课", value: "34" },
  { name: "思想政治与社会科学", value: "35" },
  { name: "社会与行为科学", value: "39" },
  { name: "专业主干课", value: "41" },
  { name: "综合实践课程", value: "42" },
  { name: "自然科学", value: "45" },
];

export const getCourses = (
  records: RawUnderSelectClassItem[],
): UnderSelectCourseInfo[] =>
  records.map(
    ({ kcmc, jc, kcdlmc, kcflmc, kkyxmc, xf, zxs, kcbh, kcptdm }) => ({
      name: kcmc,
      shortType: jc,
      type: kcdlmc,
      category: kcflmc,
      office: kkyxmc,
      point: xf,
      hours: zxs,
      code: kcbh,
      id: kcptdm,
    }),
  );

export const getClasses = (
  records: RawUnderSelectClassItem[],
): UnderSelectClassInfo[] =>
  records.map(
    ({
      kcmc: name,
      jc: shortType,
      kcdlmc: type,
      kcflmc: category,
      kkyxmc: office,
      xf: point,
      zxs: hours,
      kcbh: code,
      kcptdm: id,

      teaxms: teacher,
      jxcdmcs: place,
      jxbmc: rawClassInfo,
      zcxqjc: time,
      pkrs: capacity,
      jxbrs: rawCurrent,

      jxbdm: classCode,
      kcrwdm: classId,
    }) => {
      const classInfos = (
        /^复制(.*)-1$/.exec(rawClassInfo)?.[1] ?? rawClassInfo
      ).split(",");

      const isTarget = classInfos.every((info) => /^\d{4}.+$/.exec(info));

      return {
        name,
        shortType,
        type,
        category,
        office,
        point,
        hours,
        code,
        id,

        ...(isTarget
          ? {
              target: classInfos.join(" "),
            }
          : {
              className: classInfos.join(" "),
            }),
        teacher,
        place,
        time,
        capacity,
        current: Number(rawCurrent),

        classCode,
        classId,
      };
    },
  );
