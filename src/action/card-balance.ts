import type { RequestHandler } from "express";

import { actionLogin } from "./login.js";
import { SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import type {
  CommonFailedResponse,
  Cookie,
  CookieOptions,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { getCookieHeader } from "../utils/index.js";

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
    let cookies: Cookie[] = [];

    if ("cookies" in req.body) {
      ({ cookies } = req.body);
    } else {
      const result = await actionLogin(req.body);

      if (!result.success) return res.json(result);

      ({ cookies } = result);
    }

    const response = await fetch(`${SERVER}/soapBasic/postSoap`, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: getCookieHeader(cookies),
        Referer: `${SERVER}/basicInfo/studentPageTurn?type=lifeschool`,
      },
      body: "serviceAddress=wis-apis%2Fsoap%2F00001_00083_01_02_20181210185800&serviceSource=ds2&params=%7B%22xgh%22%3Anull%7D",
    });

    const data = <RawCardBalanceData>await response.json();

    if (data.success)
      return res.json(<CardBalanceSuccessResponse>{
        success: true,
        data: Number(data.demo.items.item[0].kye) / 100,
      });

    return res.json(<AuthLoginFailedResponse>{
      success: false,
      msg: JSON.stringify(data),
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
