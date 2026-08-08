import type { RawSelectClassItem, SelectClassInfo, SelectCourseInfo } from "./typings.js";

export { COURSE_CATEGORIES } from "./categories.js";

export const getCourses = (records: RawSelectClassItem[]): SelectCourseInfo[] =>
  records.map(({ kcmc, jc, kcdlmc, kcflmc, kkyxmc, xf, zxs, kcbh, kcptdm }) => ({
    name: kcmc,
    shortType: jc,
    type: kcdlmc,
    category: kcflmc,
    office: kkyxmc,
    point: xf,
    hours: zxs,
    code: kcbh,
    id: kcptdm,
  }));

export const getClasses = (records: RawSelectClassItem[]): SelectClassInfo[] =>
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
      const classInfos = (/^复制(.*)-1$/u.exec(rawClassInfo)?.[1] ?? rawClassInfo).split(",");

      const isTarget = classInfos.every((info) => /^\d{4}.+$/u.exec(info));

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
