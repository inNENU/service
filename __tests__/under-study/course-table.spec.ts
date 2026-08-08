import { describe, expect, it } from "vitest";

import { isOnlineClass } from "../../src/study/course-table/is-online.js";

describe("isOnlineClass：判断课程时间段是否为网课", () => {
  it("6 个标准教学大节的时间段应为普通课", () => {
    expect(isOnlineClass("08:00:00", "09:30:00")).toBe(false);
    expect(isOnlineClass("10:00:00", "11:30:00")).toBe(false);
    expect(isOnlineClass("13:30:00", "15:00:00")).toBe(false);
    expect(isOnlineClass("15:30:00", "17:00:00")).toBe(false);
    expect(isOnlineClass("17:30:00", "19:00:00")).toBe(false);
    expect(isOnlineClass("19:30:00", "21:00:00")).toBe(false);
  });

  it("开始时间非整点但与标准大节重叠的课应为普通课", () => {
    // 09:00-11:30 与 3-4 节 (10:00-11:30) 重叠
    expect(isOnlineClass("09:00:00", "11:30:00")).toBe(false);
    // 08:30-10:30 与 1-2 节 (08:00-09:30) 重叠
    expect(isOnlineClass("08:30:00", "10:30:00")).toBe(false);
    // 11:00-13:00 与 3-4 节 (10:00-11:30) 重叠
    expect(isOnlineClass("11:00:00", "13:00:00")).toBe(false);
    // 17:00-18:30 与 9-10 节 (17:30-19:00) 重叠
    expect(isOnlineClass("17:00:00", "18:30:00")).toBe(false);
  });

  it("跨多个标准大节的连排课应为普通课", () => {
    expect(isOnlineClass("08:00:00", "11:30:00")).toBe(false);
    expect(isOnlineClass("10:00:00", "15:00:00")).toBe(false);
    expect(isOnlineClass("13:30:00", "17:00:00")).toBe(false);
    expect(isOnlineClass("17:30:00", "21:00:00")).toBe(false);
  });

  it("完全避开所有标准教学时间的课应为网课", () => {
    // 中午缝隙（劳动教育 11:45-13:15）
    expect(isOnlineClass("11:45:00", "13:15:00")).toBe(true);
    // 上午大节之间的缝隙
    expect(isOnlineClass("11:30:00", "13:00:00")).toBe(true);
    // 早于第一节课
    expect(isOnlineClass("06:00:00", "08:00:00")).toBe(true);
    // 晚于最后一节课
    expect(isOnlineClass("21:00:00", "22:00:00")).toBe(true);
  });

  it("边界：与标准大节恰好端点相接的课不视为重叠", () => {
    // 06:00-08:00 与 08:00-09:30 端点相接（前节结束 = 后节开始），不算重叠 → 网课
    expect(isOnlineClass("06:00:00", "08:00:00")).toBe(true);
    // 恰好等于整个标准大节 → 普通课
    expect(isOnlineClass("08:00:00", "09:30:00")).toBe(false);
    // 09:30-10:00 是 1-2 节与 3-4 节之间的小缝隙 → 网课
    expect(isOnlineClass("09:30:00", "10:00:00")).toBe(true);
  });
});
