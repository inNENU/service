import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import {
  ActionFailType,
  MissingArgResponse,
  MissingCredentialResponse,
  TEST_ID,
  UnknownResponse,
} from "@/config/index.js";
import type { CommonFailedResponse, CommonSuccessResponse } from "@/typings.js";
import type { WechatMpCodeError } from "@/utils/index.js";
import {
  getConnection,
  getShortUUID,
  getWechatMPCode,
  releaseConnection,
  request,
} from "@/utils/index.js";

import type { IDCodeData } from "./utils.js";

export interface GenerateIdCodeOptions {
  id: number;
  authToken: string;
  remark: string;
  appId: string;
  force?: boolean;
  /** @deprecated */
  appID: string;
}

export type GenerateIdCodeCodeSuccessResponse = CommonSuccessResponse<{
  code: string;
  existed: boolean;
}>;

export type GenerateIdCodeResponse =
  | GenerateIdCodeCodeSuccessResponse
  | CommonFailedResponse<
      | ActionFailType.Expired
      | ActionFailType.Existed
      | ActionFailType.DatabaseError
      | ActionFailType.MissingArg
      | ActionFailType.MissingCredential
      | ActionFailType.Unknown
    >;

export const generateIdCode = async ({
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  appID,
  id,
  authToken,
  remark,
  appId = appID,
  force = false,
}: GenerateIdCodeOptions): Promise<GenerateIdCodeResponse> => {
  let connection: PoolConnection | null = null;

  try {
    if (id.toString() === TEST_ID)
      return UnknownResponse("不支持为测试账号生成身份码");

    if (!authToken || !id) return MissingCredentialResponse;
    if (!appId) return MissingArgResponse("appId");

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
          "UPDATE `id_code` SET `uuid` = ?, `remark` = ? WHERE `uuid` = ?",
          [uuid, remark, rows[0].uuid],
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
        [uuid, id, remark],
      );
    }

    const result = await getWechatMPCode(
      appId,
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

    return UnknownResponse((result as WechatMpCodeError).errmsg);
  } finally {
    releaseConnection(connection);
  }
};

export const generateIdCodeHandler = request<
  GenerateIdCodeResponse,
  GenerateIdCodeOptions
>(async (req, res) => {
  return res.json(await generateIdCode(req.body));
});
