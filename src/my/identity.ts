import type { RequestHandler } from "express";

import type { MyLoginFailedResult } from "./login.js";
import { myLogin } from "./login.js";
import { MY_SERVER } from "./utils.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  EmptyObject,
} from "../typings.js";

interface IdentityInfo {
  success: true;
  sf: "bks" | "yjs" | "lxs" | "jzg";
}

export interface MyIdentity {
  /** 用户类型代码 */
  type: "bks" | "yjs" | "lxs" | "jzg";
}

export interface MyIdentitySuccessResult {
  success: true;
  data: MyIdentity;
}

export type MyIdentityResult = MyIdentitySuccessResult | CommonFailedResponse;

export const getMyIdentity = async (
  cookieHeader: string,
): Promise<MyIdentityResult> => {
  try {
    const infoResponse = await fetch(`${MY_SERVER}/hallIndex/getidentity`, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: cookieHeader,
      },
    });

    const identityResult = (await infoResponse.json()) as IdentityInfo;

    if (identityResult.success)
      return {
        success: true,
        data: {
          type: identityResult.sf,
        },
      };

    return {
      success: false,
      msg: "获取人员身份失败",
    };
  } catch (err) {
    console.error(err);

    return {
      success: false,
      msg: "获取人员身份失败",
    };
  }
};

export type MyIdentityResponse = MyIdentitySuccessResult | MyLoginFailedResult;

export const myIdentityHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  AccountInfo
> = async (req, res) => {
  try {
    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      const result = await myLogin(req.body);

      if (!result.success) return res.json(result);
      cookieHeader = result.cookieStore.getHeader(MY_SERVER);
    }

    const identity = await getMyIdentity(cookieHeader);

    return res.json(identity);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);
    res.json({
      success: false,
      msg: message,
    } as MyLoginFailedResult);
  }
};
