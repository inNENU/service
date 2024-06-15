import type {
  RawUnderSelectClassItem,
  UnderSelectCourseInfo,
  UnderSelectSearchClass,
} from "./typings";

export const getCourses = (
  records: RawUnderSelectClassItem[],
): UnderSelectCourseInfo[] =>
  records.map(
    ({ kcmc, jc, kcdlmc, kcflmc, kkyxmc, xf, zxs, kcbh, kcptdm }) => ({
      name: kcmc,
      courseShortType: jc,
      courseType: kcdlmc,
      courseCategory: kcflmc,
      courseOffice: kkyxmc,
      point: xf,
      hours: zxs,
      courseNumber: kcbh,
      courseId: kcptdm,
    }),
  );

export const getClasses = (
  records: RawUnderSelectClassItem[],
): UnderSelectSearchClass[] =>
  records.map(
    ({
      kcmc,
      jc,
      kcdlmc,
      kcflmc,
      kkyxmc,
      xf,
      zxs,
      kcbh,
      kcptdm,

      teaxms,
      jxcdmcs,
      jxbmc,
      zcxqjc,
      pkrs,

      jxbdm,
      kcrwdm,
    }) => ({
      name: kcmc,
      courseShortType: jc,
      courseType: kcdlmc,
      courseCategory: kcflmc,
      courseOffice: kkyxmc,
      point: xf,
      hours: zxs,
      courseNumber: kcbh,
      courseId: kcptdm,

      teacher: teaxms,
      location: jxcdmcs,
      className: jxbmc,
      time: zcxqjc,
      capacity: pkrs,

      classCode: jxbdm,
      classId: kcrwdm,
    }),
  );
