import fs from "node:fs";

import type { IdConditionalBlackList } from "../config/idBackList.js";
import {
  ID_BLACK_LIST,
  ID_CONDITIONAL_BLACK_LIST,
} from "../config/idBackList.js";
import type { MyInfo } from "../my/index.js";

export const BACKLIST_HINT = [
  "外星人来了！",
  "发生什么事了？",
  "服务器正在高冷状态，决定无视你",
  "oops，你的信号太弱了",
  "我们听不到你的呼唤",
  "服务器无视了你的召唤",
  "服务器正在闹小情绪",
  "你的请求不见了",
  "登录按钮突然失效了",
  "还有十秒爆炸",
  "准备撞击，三、二、一",
  "正忙，预计等待时间99年",
  "对方撤回了回应",
  "你的请求正在龟速传输中",
  "我们不认识你",
  "老鼠吃掉了你的请求",
  "有人偷走了你的请求",
  "前面有人劫道，快𧾷",
  "呼，大风把你的请求吹跑了",
  "你的请求被雷劈了",
  "你的请求正在洗澡，请稍等",
  "山东蓝翔拦截了您的请求，并向您发出了录取邀请",
  "你的请求飞走了",
  "恶龙劫掠了你的请求",
];

const testCondition = (
  info: MyInfo,
  condition: IdConditionalBlackList,
): boolean =>
  Object.entries(condition).every(([key, value]) => {
    if (value instanceof RegExp)
      return value.test(<string>info[<keyof MyInfo>key]);

    if (typeof value === "number") return info[<keyof MyInfo>key] === value;

    return info[<keyof MyInfo>key] === Buffer.from(value, "base64").toString();
  });

export const isInBlackList = (id: number, info?: MyInfo | null): boolean => {
  if (ID_BLACK_LIST.includes(id)) {
    fs.writeFileSync("backlist", `${id}\n`, {
      encoding: "utf8",
      flag: "a",
    });

    return true;
  }

  if (!info) return false;

  const result = ID_CONDITIONAL_BLACK_LIST.some((condition) =>
    testCondition(info, condition),
  );

  if (result)
    fs.writeFileSync("backlist", `${id} new\n`, {
      encoding: "utf8",
      flag: "a",
    });

  return result;
};
