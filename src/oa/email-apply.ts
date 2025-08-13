import { request } from "@/utils/index.js";

import { getOAInfo } from "./info.js";
import type { OALoginFailedResponse } from "./login.js";
import { OA_WEB_VPN_SERVER } from "./utils.js";
import {
  ActionFailType,
  InvalidArgResponse,
  UnknownResponse,
} from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  LoginOptions,
} from "../typings.js";

const WORKFLOW_ID = 8021;

type RawCheckEmailSuccessData =
  | {
      result: "0";
    }
  | {
      result: "1";
      mailname: string;
    };

interface RawCheckEmailFailData {
  result: string;
  errmessage: string;
}

type RawCheckEmailData = RawCheckEmailSuccessData | RawCheckEmailFailData;

export type CheckMailBoxResponse =
  | { success: true }
  | CommonFailedResponse<ActionFailType.Existed | ActionFailType.Unknown>;

export const checkMailBox = async (
  cookieHeader: string,
  id: number | string,
): Promise<CheckMailBoxResponse> => {
  const checkMailBoxResponse = await fetch(
    `${OA_WEB_VPN_SERVER}/api/weaverccMailBox/checkMailBox`,
    {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: cookieHeader,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: new URLSearchParams({
        sqrxgh: id.toString(),
        workflowid: WORKFLOW_ID.toString(),
        requestid: "-1",
      }),
    },
  );

  const checkMailBoxData =
    (await checkMailBoxResponse.json()) as RawCheckEmailData;

  if (checkMailBoxData.result === "1" && "mailname" in checkMailBoxData) {
    return {
      success: false,
      type: ActionFailType.Existed,
      msg: checkMailBoxData.mailname,
    };
  }

  if (checkMailBoxData.result === "0") {
    return {
      success: true,
    };
  }

  console.log("Check mailbox result:", checkMailBoxData);

  return UnknownResponse(
    "errmessage" in checkMailBoxData ? checkMailBoxData.errmessage : "无法申请",
  );
};

interface RawCheckEmailAccountSuccessData {
  result: "0";
}

interface RawCheckEmailAccountFailData {
  result: string;
  errmessage: string;
}

type RawCheckEmailAccountData =
  | RawCheckEmailAccountSuccessData
  | RawCheckEmailAccountFailData;

export const checkMailBoxAccount = async (
  cookieHeader: string,
  account: string,
): Promise<{ success: true } | CommonFailedResponse> => {
  const checkMailBoxAccountResponse = await fetch(
    `${OA_WEB_VPN_SERVER}/api/weaverccMailBox/checkMailBoxAccount`,
    {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: cookieHeader,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: new URLSearchParams({
        wzyxm: account,
        workflowid: WORKFLOW_ID.toString(),
        requestid: "-1",
      }),
    },
  );

  const checkMailBoxAccountData =
    (await checkMailBoxAccountResponse.json()) as RawCheckEmailAccountData;

  if (checkMailBoxAccountData.result === "0") {
    return {
      success: true,
    };
  }

  console.log("Check mailbox account result:", checkMailBoxAccountData);

  return UnknownResponse(
    "errmessage" in checkMailBoxAccountData
      ? checkMailBoxAccountData.errmessage
      : "无法申请",
  );
};

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
  | OALoginFailedResponse
  | CommonFailedResponse<ActionFailType.Existed>;

export const checkEmail = async (
  cookieHeader: string,
): Promise<CheckEmailResponse> => {
  const infoResult = await getOAInfo(cookieHeader);

  if (!infoResult.success) return infoResult;

  const checkEmailBoxResult = await checkMailBox(
    cookieHeader,
    infoResult.data.id,
  );

  if (!checkEmailBoxResult.success) return checkEmailBoxResult;

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

export interface ApplyEmailOptions {
  type: "apply";
  /** 学号 */
  id: number;
  /** 邮箱账户名 */
  account: string;
  /** 数字后缀 */
  suffix?: string;
  /** 手机号码 */
  phone: string;
}

export type ApplyEmailResponse = CommonSuccessResponse | CommonFailedResponse;

export const applyEmail = async (
  cookieHeader: string,
  { account, suffix = "", phone, id }: ApplyEmailOptions,
): Promise<ApplyEmailResponse> => {
  try {
    const checkEmailBoxResult = await checkMailBox(cookieHeader, id);

    if (!checkEmailBoxResult.success) return checkEmailBoxResult;

    const checkMailBoxAccountResult = await checkMailBoxAccount(
      cookieHeader,
      account,
    );

    if (!checkMailBoxAccountResult.success) return checkMailBoxAccountResult;

    const loadEmailFormResponse = await fetch(
      `${OA_WEB_VPN_SERVER}/api/workflow/reqform/loadForm`,
      {
        method: "POST",
        headers: {
          cookie: cookieHeader,
        },
        body: new URLSearchParams({
          iscreate: "1",
          workflowid: WORKFLOW_ID.toString(),
          requestid: "-1",
        }),
      },
    );

    const formData = (await loadEmailFormResponse.json()) as {
      maindata: Record<string, { value: string }>;
      params: Record<string, string | number | boolean>;
      submitParams: Record<string, string | number | boolean>;
    } & Record<string, unknown>;

    const data = {
      existChangeRange:
        "field19443,field19453,field19449,field19450,field19445",
      requestname: "个人邮箱申请",
      requestlevel: "0",
      field19446: "1",
      field19444: formData.maindata.field19444.value,
      field19442: formData.maindata.field19442.value,
      "field-10": "",
      field19450: account + suffix,
      field19447: "",
      field19453: "-1",
      field19443: id,
      field19445: phone,
      field19448: suffix,
      field19449: account,
      mainFieldUnEmptyCount: "8",
      detailFieldUnEmptyCount: "0",
    };

    const hardCodedData = {
      isOdocRequest: "0",
      enableIntervenor: "",
      verifyRequiredRange: "field-9999,field19445,field19446,field19450",
      linkageUnFinishedKey: "",
    };

    const applyResetBody: Record<string, string | number | boolean> = {
      ...formData.submitParams,
      ...data,

      languageid: 7,

      ...hardCodedData,

      useThread: 1,
      isReset: 1,
      wfTestStr: "",
    };

    const APPLY_URL = `${OA_WEB_VPN_SERVER}/api/workflow/reqform/conformCheck`;

    await fetch(APPLY_URL, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: cookieHeader,
      },
      body: new URLSearchParams(
        Object.fromEntries(
          Object.entries(applyResetBody).map(([key, value]) => [
            key,
            value.toString(),
          ]),
        ),
      ),
    });

    const applyBody: Record<string, string | number | boolean> = {
      ...formData.submitParams,
      ...data,

      languageid: 7,

      ...hardCodedData,

      useThread: 1,
      wfTestStr: "",
    };

    const applyEmailResponse = await fetch(APPLY_URL, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: cookieHeader,
      },
      body: new URLSearchParams(
        Object.fromEntries(
          Object.entries(applyBody).map(([key, value]) => [
            key,
            value.toString(),
          ]),
        ),
      ),
    });

    const applyEmailData = (await applyEmailResponse.json()) as {
      result: {
        allPass: boolean;
      };
      datas: {
        ruleDetail: string;
        ruleName: string;
        status: number;
      }[];
    };

    if (!applyEmailData.result.allPass) return UnknownResponse("校验不通过");

    const operationBody = {
      ...formData.submitParams,

      ...hardCodedData,

      needConformCheck: 0,
      remark: "",
      remarkquote: "",
      actiontype: "requestOperation",
      isaffirmance: 1,
      isFirstSubmit: "",

      ...data,

      signatureAttributesStr: formData.params.signatureAttributesStr,
      signatureSecretKey: formData.params.signatureSecretKey,
      selectNextFlow: 0,
      openDataVerify: 0,
      wfTestStr: "",
    };

    const operationResponse = await fetch(
      `${OA_WEB_VPN_SERVER}/api/workflow/reqform/requestOperation`,
      {
        method: "POST",
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          Cookie: cookieHeader,
        },
        body: new URLSearchParams(
          Object.fromEntries(
            Object.entries(operationBody).map(([key, value]) => [
              key,
              value.toString(),
            ]),
          ),
        ),
      },
    );

    const operationData = (await operationResponse.json()) as Record<
      string,
      string
    >;

    return {
      success: applyEmailData.result.allPass,
      data: operationData,
    };
  } catch (err) {
    console.error(err);

    return UnknownResponse("未知错误");
  }
};

export const emailApplyHandler = request<
  | CheckEmailResponse
  | ApplyEmailResponse
  | CommonFailedResponse<ActionFailType.InvalidArg>,
  CheckEmailOptions | ApplyEmailOptions
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

  if (type === "apply") {
    return res.json(await applyEmail(cookieHeader, req.body));
  }

  return res.json(InvalidArgResponse("type"));
});
