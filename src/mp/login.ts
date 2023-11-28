import type { RequestHandler } from "express";

import { appIDInfo } from "../config/appID.js";
import { OPENID_BLACK_LIST } from "../config/blacklist.js";
import type { EmptyObject } from "../typings.js";

export type AppID = "wx33acb831ee1831a5" | "wx9ce37d9662499df3" | 1109559721;
export type Env = "qq" | "wx" | "web";

export interface MPLoginOptions {
  appID: AppID;
  env: string;
  code: string;
  openid?: string;
}

export const mpLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  MPLoginOptions
> = async (req, res) => {
  try {
    const { env, appID, code } = req.body;
    let { openid } = req.body;

    if (!openid) {
      const url = `https://api.${
        env === "qq" ? "q" : "weixin"
      }.qq.com/sns/jscode2session?appid=${appID}&secret=${
        appIDInfo[appID]
      }&js_code=${code}&grant_type=authorization_code`;
      const response = await fetch(url);

      ({ openid } = <{ openid: string }>await response.json());
    }

    res.json({
      openid,
      inBLACKLIST: OPENID_BLACK_LIST.includes(openid),
      isAdmin: false,
    });
  } catch (err) {
    console.error(err);

    res.status(500).end({
      success: false,
      msg: "获取失败",
    });
  }
};
