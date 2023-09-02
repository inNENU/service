import type { MyInfo } from "../my/index.js";

export const ID_BLACK_LIST = [2021012638, 2023014072];

export type IdConditionalBlackList = {
  [I in keyof MyInfo]?: MyInfo[I] | RegExp;
};

export const ID_CONDITIONAL_BLACK_LIST: IdConditionalBlackList[] = [
  {
    grade: 2023,
    name: "6ZKf5Y2a5a6H",
    org: "5pWw5a2m5a2m6Zmi",
  },
  {
    name: /^王/,
    org: "5paH5a2m6Zmi",
    major: "5rGJ6K+t6KiA5paH5a2m",
    grade: 2023,
    idCard: /^220602/,
  },
  {
    name: "5YiY5rKB6ZuF",
    grade: 2023,
    org: "57uP5rWO5LiO566h55CG5a2m6Zmi",
  },
];
