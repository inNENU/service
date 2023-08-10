import type { RequestHandler } from "express";

import { actionLogin } from "./login.js";
import { SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/index.js";
import type { AuthLoginFailedResponse } from "../auth/login.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type {
  CommonFailedResponse,
  CookieOptions,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { CookieStore, getCookieItems } from "../utils/index.js";

type RawCardBalanceData =
  | {
      success: true;
      demo: {
        items: {
          item: [{ kye: string }];
        };
      };
    }
  | {
      success: false;
    };

export type CardBalanceOptions = LoginOptions | CookieOptions;

export interface CardBalanceSuccessResponse {
  success: true;
  data: number;
}

export type CardBalanceResponse =
  | CardBalanceSuccessResponse
  | CommonFailedResponse;

export const cardBalanceHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  CardBalanceOptions
> = async (req, res) => {
  try {
    const cookieStore = new CookieStore();

    if (!req.headers.cookie)
      if ("cookies" in req.body) {
        cookieStore.apply(getCookieItems(req.body.cookies));
      } else {
        const result = await actionLogin(req.body, cookieStore);

        if (!result.success) return res.json(result);
      }

    const url = `${SERVER}/soapBasic/postSoap`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: req.headers.cookie || cookieStore.getHeader(url),
        Referer: `${SERVER}/basicInfo/studentPageTurn?type=lifeschool`,
      },
      body: "serviceAddress=wis-apis%2Fsoap%2F00001_00083_01_02_20181210185800&serviceSource=ds2&params=%7B%22xgh%22%3Anull%7D",
      redirect: "manual",
    });

    if (response.status === 302)
      return res.json(<AuthLoginFailedResponse>{
        success: false,
        type: LoginFailType.Expired,
        msg: "登录信息已过期，请重新登录",
      });

    const data = <RawCardBalanceData>await response.json();

    if (data.success) {
      const balanceList = data.demo.items.item;

      if (typeof balanceList[0]?.kye === "number")
        return res.json(<CardBalanceSuccessResponse>{
          success: true,
          data: Number(data.demo.items.item[0].kye) / 100,
        });

      return res.json(<CommonFailedResponse>{
        success: false,
        msg: "暂无余额信息",
      });
    }

    return res.json(<AuthLoginFailedResult>{
      success: false,
      msg: JSON.stringify(data),
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};
