import type { RequestHandler } from "express";

import { appIDInfo } from "../config/appID";
import type { EmptyObject } from "../typings";

export type AppID = "wx33acb831ee1831a5" | "wx9ce37d9662499df3" | 1109559721;
export type Env = "qq" | "wx" | "web";

export interface MPLoginOptions {
  appID: Exclude<AppID, "wx69e79c3d87753512">;
  env: string;
  code: string;
}

export const mpLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  MPLoginOptions
> = async (req, res) => {
  try {
    const { env, appID, code } = req.body;

    const url = `https://api.${
      env === "qq" ? "q" : "weixin"
    }.qq.com/sns/jscode2session?appid=${appID}&secret=${
      appIDInfo[appID]
    }&js_code=${code}&grant_type=authorization_code`;
    const response = await fetch(url);

    const result = <Record<string, unknown>>await response.json();

    delete result.session_key;

    res.json(result);
  } catch (err) {
    console.error(err);

    res.status(500).end({
      success: false,
      msg: "获取失败",
    });
  }
};
