import type { MyInfo } from "../my/index.js";

export const OPENID_BLACK_LIST: string[] = [
  "oPPTV5XIq6LcgfO2pbpZVU4tjZKs",
  "oPPTV5YV7Fijf_7CiDgiKNpenVmw",
  // 辱骂
  "oPPTV5V7kt9qnn3EP9bsbTysjJig",
];

export const ID_BLACK_LIST = [2021012638, 2023010767];

export type ConditionBlackList = {
  [I in keyof MyInfo]?: MyInfo[I] | RegExp;
};

export const CONDITION_BLACK_LIST: ConditionBlackList[] = [
  {
    grade: 2023,
    name: "6ZKf5Y2a5a6H",
    org: "5pWw5a2m5a2m6Zmi",
  },
];
