import type { MyInfo } from "../my/index.js";

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

const BLACKLIST_HINT = [
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

export const getRandomBlacklistHint = (): string =>
  BLACKLIST_HINT[Math.floor(Math.random() * BLACKLIST_HINT.length)];
