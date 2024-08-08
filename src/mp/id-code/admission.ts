import { ActionFailType, UnknownResponse } from "../../config/index.js";
import type { UnderAdmissionOptions } from "../../enroll/index.js";
import { getUnderAdmission } from "../../enroll/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import {
  getConnection,
  getShortUUID,
  getWechatMPCode,
} from "../../utils/index.js";

export interface StoreAdmissionInfoOptions extends UnderAdmissionOptions {
  remark: string;
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
  | CommonFailedResponse<ActionFailType.WrongInfo | ActionFailType.Unknown>;

export const storeStoreAdmissionInfo = async (
  options: StoreAdmissionInfoOptions,
): Promise<StoreAdmissionInfoResponse> => {
  const { name, id, testId } = options;

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

  const connection = await getConnection();

  await connection.query(
    `INSERT INTO student-info (uuid, name, school, major, grade, remark) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      uuid,
      name,
      result.data[3].text,
      result.data[2].text,
      new Date().getMonth() < 7
        ? new Date().getFullYear() - 1
        : new Date().getFullYear(),
      options.remark ?? "",
    ],
  );

  const { appID } = options;

  if (appID) {
    const result = await getWechatMPCode(
      appID,
      "pkg/user/pages/account/login",
      `verify:${uuid}`,
    );

    if (result instanceof Buffer) {
      return {
        success: true,
        data: {
          code: `data:image/jpeg;base64,${result.toString("base64")}`,
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
