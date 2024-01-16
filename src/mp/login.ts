import type { RequestHandler } from "express";

import { appIDInfo } from "../config/appID.js";
import { OPENID_BLACK_LIST } from "../config/blacklist.js";
import type { CommonFailedResponse, EmptyObject } from "../typings.js";

export type AppID = "wx33acb831ee1831a5" | "wx9ce37d9662499df3" | 1109559721;
export type Env = "qq" | "wx" | "web";

export interface MPLoginCodeOptions {
  appID: AppID;
  env: string;
  code: string;
}

export interface MPLoginOpenidOptions {
  openid: string;
}

export interface MPloginSuccessResponse {
  success: true;
  openid: string;
  inBLACKLIST: boolean;
  isAdmin: boolean;
}

export type MPloginFailResponse = CommonFailedResponse;

export type MPLoginResponse = MPloginSuccessResponse | MPloginFailResponse;

export const mpLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  MPLoginCodeOptions | MPLoginOpenidOptions
> = async (req, res) => {
  try {
    if ("openid" in req.body) {
      const { openid } = req.body;

      return res.json(<MPloginSuccessResponse>{
        openid,
        inBLACKLIST: OPENID_BLACK_LIST.includes(openid),
        isAdmin: false,
      });
    }

    const { env, appID, code } = req.body;

    const url = `https://api.${
      env === "qq" ? "q" : "weixin"
    }.qq.com/sns/jscode2session?appid=${appID}&secret=${
      appIDInfo[appID]
    }&js_code=${code}&grant_type=authorization_code`;
    const response = await fetch(url);

    const { openid } = <{ openid: string }>await response.json();

    return res.json(<MPloginSuccessResponse>{
      openid,
      inBLACKLIST: OPENID_BLACK_LIST.includes(openid),
      isAdmin: false,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json(<CommonFailedResponse>{
      success: false,
      msg: "获取失败",
    });
  }
};
