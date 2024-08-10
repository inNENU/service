import { setInfo } from "./setInfo.js";
import {
  ActionFailType,
  DatabaseError,
  UnknownResponse,
} from "../../config/index.js";
import type { UnderAdmissionOptions } from "../../enroll/index.js";
import { getUnderAdmission } from "../../enroll/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import { getShortUUID, getWechatMPCode } from "../../utils/index.js";

export interface StoreAdmissionInfoOptions extends UnderAdmissionOptions {
  remark: string;
  openid?: string | null;
  appID?: string;
}

export type StoreAdmissionInfoCodeSuccessResponse = CommonSuccessResponse<{
  code: string;
}>;

export type StoreAdmissionInfoUUIDSuccessResponse = CommonSuccessResponse<{
  uuid: string;
}>;

export type StoreAdmissionInfoResponse =
  | StoreAdmissionInfoCodeSuccessResponse
  | StoreAdmissionInfoUUIDSuccessResponse
  | CommonFailedResponse<
      | ActionFailType.DatabaseError
      | ActionFailType.WrongInfo
      | ActionFailType.Unknown
    >;

export const storeStoreAdmissionInfo = async ({
  name,
  id,
  testId,
  openid = null,
  remark,
  appID,
}: StoreAdmissionInfoOptions): Promise<StoreAdmissionInfoResponse> => {
  if (testId.length < 14)
    return {
      success: false,
      type: ActionFailType.WrongInfo,
      msg: "未提供有效的14位考生号",
    };

  const result = await getUnderAdmission({ name, id, testId });

  if (!result.success)
    return {
      success: false,
      type: ActionFailType.WrongInfo,
      msg: "信息有误",
    };

  const uuid = getShortUUID();

  try {
    await setInfo({
      type: "admission",
      info: {
        id: null,
        openid,
        name,
        gender: Number(id[17]) % 2 === 0 ? "女" : "男",
        org: result.data[3].text,
        major: result.data[2].text,
        grade:
          new Date().getMonth() < 7
            ? new Date().getFullYear() - 1
            : new Date().getFullYear(),
      },
      remark,
    });
  } catch (err) {
    console.error(err);

    return DatabaseError((err as Error).message);
  }

  if (appID) {
    const result = await getWechatMPCode(
      appID,
      "pkg/user/pages/account/login",
      `verify:${uuid}`,
      // FIXME: issues in release version
      "trial",
    );

    if (result instanceof Buffer) {
      return {
        success: true,
        data: {
          code: `data:image/png;base64,${result.toString("base64")}`,
        },
      };
    }

    return UnknownResponse(result.errmsg);
  }

  return {
    success: true,
    data: {
      uuid,
    },
  };
};
