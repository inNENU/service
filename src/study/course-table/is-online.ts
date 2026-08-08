/** 一天的标准教学时间（6 节大课，每节 2 小节，各 1.5 小时） */
const STANDARD_CLASS_PERIODS = [
  ["08:00:00", "09:30:00"],
  ["10:00:00", "11:30:00"],
  ["13:30:00", "15:00:00"],
  ["15:30:00", "17:00:00"],
  ["17:30:00", "19:00:00"],
  ["19:30:00", "21:00:00"],
] as const;

/**
 * 判断两个 HH:MM:SS 时间段是否重叠
 *
 * @param startA 时间段 A 开始时间
 * @param endA 时间段 A 结束时间
 * @param startB 时间段 B 开始时间
 * @param endB 时间段 B 结束时间
 * @returns 是否重叠
 */
const isTimeOverlapping = (startA: string, endA: string, startB: string, endB: string): boolean =>
  startA < endB && endA > startB;

/**
 * 判断课程是否为网课
 *
 * 教学系统不允许同一时间选两门课，因此网课（无固定教室）必须排在所有标准教学大节之外， 以避免与学生其他课程冲突。若课程整个时间段不与任何标准大节重叠，则视为网课。
 *
 * 注意：不能只判断开始时间——如 09:00-11:30 的课程，开始时间虽非整点， 但仍与 3-4 节 (10:00-11:30) 重叠，属于正常排课而非网课。
 *
 * @param startTime 课程开始时间，格式 "HH:MM:SS"
 * @param endTime 课程结束时间，格式 "HH:MM:SS"
 * @returns 是否为网课
 */
export const isOnlineClass = (startTime: string, endTime: string): boolean =>
  !STANDARD_CLASS_PERIODS.some(([standardStart, standardEnd]) =>
    isTimeOverlapping(startTime, endTime, standardStart, standardEnd),
  );
