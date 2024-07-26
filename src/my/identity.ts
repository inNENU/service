import type { RequestHandler } from "express";

import type { MyLoginFailedResponse } from "./login.js";
import { myLogin } from "./login.js";
import { MY_SERVER } from "./utils.js";
import { MissingCredentialResponse, UnknownResponse } from "../config/index.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  EmptyObject,
} from "../typings.js";

interface RAWIdentityInfo {
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

const TEST_IDENTITY_RESULT: MyIdentitySuccessResult = {
  success: true,
  data: {
    type: "bks",
  },
};

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

    const identityResult = (await infoResponse.json()) as RAWIdentityInfo;

    if (identityResult.success)
      return {
        success: true,
        data: {
          type: identityResult.sf,
        },
      };

    return UnknownResponse("获取人员身份失败");
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return UnknownResponse(message);
  }
};

export type MyIdentityResponse =
  | MyIdentitySuccessResult
  | MyLoginFailedResponse;

export const myIdentityHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  AccountInfo
> = async (req, res) => {
  try {
    const { id, password, authToken } = req.body;

    if (id && password && authToken) {
      const result = await myLogin(req.body);

      if (!result.success) return res.json(result);
      req.headers.cookie = result.cookieStore.getHeader(MY_SERVER);
    } else if (!req.headers.cookie) {
      return res.json(MissingCredentialResponse);
    }

    const cookieHeader = req.headers.cookie;

    if (cookieHeader.includes("TEST")) return res.json(TEST_IDENTITY_RESULT);

    return res.json(await getMyIdentity(cookieHeader));
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
