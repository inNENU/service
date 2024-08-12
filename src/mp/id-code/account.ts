import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import type { IDCodeData } from "./utils.js";
import {
  ActionFailType,
  MissingArgResponse,
  MissingCredentialResponse,
  TEST_ID,
  UnknownResponse,
} from "../../config/index.js";
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

export interface StoreAccountInfoOptions {
  id: number;
  authToken: string;
  remark: string;
  appID: string;
  force?: boolean;
}

export type StoreAccountInfoCodeSuccessResponse = CommonSuccessResponse<{
  code: string;
  existed: boolean;
}>;

export type StoreAccountInfoResponse =
  | StoreAccountInfoCodeSuccessResponse
  | CommonFailedResponse<
      | ActionFailType.Expired
      | ActionFailType.Existed
      | ActionFailType.DatabaseError
      | ActionFailType.MissingArg
      | ActionFailType.MissingCredential
      | ActionFailType.Unknown
    >;

export const storeStoreAccountInfo = async ({
  id,
  authToken,
  remark,
  appID,
  force = false,
}: StoreAccountInfoOptions): Promise<StoreAccountInfoResponse> => {
  let connection: PoolConnection | null = null;

  try {
    if (id.toString() === TEST_ID)
      return UnknownResponse("不支持为测试账号生成身份码");

    if (!authToken || !id) return MissingCredentialResponse;
    if (!appID) return MissingArgResponse("appID");

    let existed = false;
    let uuid: string | null = null;

    connection = await getConnection();

    // check whether the id and authToken are valid
    const [tokenRows] = await connection.execute<RowDataPacket[]>(
      "SELECT * FROM `token` WHERE `id` = ? AND `authToken` = ?",
      [id, authToken],
    );

    if (!tokenRows.length)
      return {
        success: false,
        type: ActionFailType.Expired,
        msg: "用户凭据已失效，无法取得身份信息，请重新登录。\n提示: 为了保证身份码的可靠性，您只能在最后一次登录的设备获取身份码。",
      };

    // check whether there is existing uuid
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT * FROM `id_code` WHERE `id` = ? AND `verifyId` IS NULL",
      [id],
    );

    // there is existing uuid
    if (rows.length > 0) {
      // refresh uuid when force
      if (force) {
        uuid = getShortUUID();

        await connection.execute(
          "UPDATE `id_code` SET `uuid` = ? WHERE `uuid` = ?",
          [uuid, rows[0].uuid],
        );
      }
      // use old uuid
      else {
        existed = true;
        uuid = (rows[0] as IDCodeData).uuid;
      }
    }
    // generate new uuid
    else {
      // remark must be provided
      if (!remark) return MissingArgResponse("remark");

      uuid = getShortUUID();

      await connection.execute(
        "INSERT INTO `id_code` (`uuid`, `id`, `remark`) VALUES (?, ?, ?)",
        [uuid, id, remark ?? null],
      );
    }

    const result = await getWechatMPCode(
      appID,
      "pkg/user/pages/account/login",
      `verify:${uuid}`,
    );

    if (result instanceof Buffer) {
      return {
        success: true,
        data: {
          existed,
          code: `data:image/png;base64,${result.toString("base64")}`,
        },
      };
    }

    return UnknownResponse(result.errmsg);
  } catch (err) {
    console.error(err);

    return UnknownResponse((err as Error).message);
  } finally {
    releaseConnection(connection);
  }
};
