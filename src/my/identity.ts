import { request } from "@/utils/index.js";

import type { MyLoginFailedResponse } from "./login.js";
import { MY_SERVER } from "./utils.js";
import type { ActionFailType } from "../config/index.js";
import { UnknownResponse } from "../config/index.js";
import type { AccountInfo, CommonFailedResponse } from "../typings.js";

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
};

export type MyIdentityResponse =
  | MyIdentitySuccessResult
  | MyLoginFailedResponse
  | CommonFailedResponse<ActionFailType.MissingCredential>;

export const myIdentityHandler = request<MyIdentityResponse, AccountInfo>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(TEST_IDENTITY_RESULT);

    return res.json(await getMyIdentity(cookieHeader));
  },
);
