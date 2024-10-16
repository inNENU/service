import { getOAInfo } from "./info.js";
import type { OALoginFailedResponse } from "./login.js";
import { OA_WEB_VPN_SERVER } from "./utils.js";
import type { ActionFailType } from "../config/index.js";
import { InvalidArgResponse, UnknownResponse } from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  LoginOptions,
} from "../typings.js";
import { request } from "../utils/index.js";

interface RawCheckEmailSuccessData {
  result: "0";
}

interface RawCheckEmailFailData {
  result: "1" | "2";
  errmessage: string;
}

type RawCheckEmailData = RawCheckEmailSuccessData | RawCheckEmailFailData;

export interface CheckEmailOptions extends LoginOptions {
  type: "init";
  id: number;
}

export type CheckEmailSuccessResponse = CommonSuccessResponse<
  {
    display: string;
    key: string;
  }[]
>;

export type CheckEmailResponse =
  | CheckEmailSuccessResponse
  | OALoginFailedResponse;

export const checkEmail = async (
  cookieHeader: string,
): Promise<CheckEmailResponse> => {
  const infoResult = await getOAInfo(cookieHeader);

  if (!infoResult.success) {
    return infoResult;
  }

  const checkEmail = await fetch(
    `${OA_WEB_VPN_SERVER}/api/weaverccMailBox/checkMailBox`,
    {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: cookieHeader,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: new URLSearchParams({
        sqrxgh: infoResult.data.id,
        workflowid: "8021",
        requestid: "-1",
      }),
    },
  );

  const checkEmailData = (await checkEmail.json()) as RawCheckEmailData;

  if (checkEmailData.result !== "0") {
    return UnknownResponse(checkEmailData.errmessage);
  }

  const accountNameResponse = await fetch(
    `${OA_WEB_VPN_SERVER}/api/weaverccMailBox/getAccountList`,
    {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookieHeader,
      },
      body: new URLSearchParams({ username: infoResult.data.name }),
    },
  );

  const { account } = (await accountNameResponse.json()) as {
    account: { showname: string; key: string }[];
  };

  account.shift();

  return {
    success: true,
    data: account.map(({ showname, key }) => ({
      display: showname,
      key,
    })),
  };
};

export const emailApplyHandler = request<
  CheckEmailResponse | CommonFailedResponse<ActionFailType.InvalidArg>,
  CheckEmailOptions
>(async (req, res) => {
  const cookieHeader = req.headers.cookie!;
  const { type } = req.body;

  if (type === "init") {
    if (cookieHeader.includes("TEST")) {
      return res.json(
        UnknownResponse("您已有邮箱 test@nenu.edu.cn，请勿重复申请！"),
      );
    }

    return res.json(await checkEmail(cookieHeader));
  }

  return res.json(InvalidArgResponse("type"));
});
