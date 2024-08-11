import type { PoolConnection } from "mysql2/promise";

import {
  ActionFailType,
  DatabaseErrorResponse,
  UnknownResponse,
} from "../../config/index.js";
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
  releaseConnection,
} from "../../utils/index.js";

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

  let connection: PoolConnection | null = null;

  try {
    connection = await getConnection();

    await connection.execute(
      "INSERT INTO `admission_code` (`uuid`, `openid`, `type`, `id`, `name`, `gender`, `school`, `major`, `remark`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        uuid,
        openid ?? null,
        id,
        name,
        Number(id[17]) % 2 === 0 ? "女" : "男",
        result.data[3].text,
        result.data[2].text,
        remark ?? null,
      ],
    );
  } catch (err) {
    console.error(err);

    return DatabaseErrorResponse((err as Error).message);
  } finally {
    releaseConnection(connection);
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
