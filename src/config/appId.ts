import "./loadEnv.js";

export const rawId2appId: Record<string, string> = {
  gh_ef5423e51c35: "wx33acb831ee1831a5",
  gh_adfb1b973ed6: "wx2550e3fd373b79a8",
  gh_3f183bc1aa09: "wx2d632391509810f8",
};

export const donutAppIdInfo = {
  wx0009f7cdfeefa3da: "wx4671b8a86db743a6",
};

export const appIdInfo = {
  wx33acb831ee1831a5: process.env.WECHAT_API_KEY,
  wx2550e3fd373b79a8: process.env.WE_API_KEY,
  wx2d632391509810f8: process.env.ZAI_API_KEY,
  wx0009f7cdfeefa3da: process.env.APP_API_KEY,
} as const;
