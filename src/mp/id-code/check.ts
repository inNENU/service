import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import type { IDCodeData } from "./utils.js";
import type { AuthLoginFailedResponse } from "../../auth/index.js";
import {
  ActionFailType,
  DatabaseErrorResponse,
  MissingArgResponse,
  MissingCredentialResponse,
  TEST_ID,
  UnknownResponse,
} from "../../config/index.js";
import type { MyInfo } from "../../my/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import type { WechatMpCodeError } from "../../utils/index.js";
import {
  getConnection,
  getWechatMPCode,
  releaseConnection,
  request,
} from "../../utils/index.js";

export interface CheckIDCodeOptions {
  id: number;
  authToken: string;
  appId: string;
  openid: string;
  uuid?: string;
  remark?: string;
  /** @deprecated */
  appID: string;
}

export interface IdCodeInfo {
  name: string;
  grade: number;
  type: string;
  org: string;
  major: string;
  createTime: string;
  remark: string;

  /**
   * @description Only available for admin
   */
  id: number | null;
  /**
   * @description Only available for admin
   */
  gender: string | null;
}

export type CheckIDCodeStatusSuccessResponse = CommonSuccessResponse<
  | { existed: true; code: string; remark: string }
  | { existed: false; verifier: string | null }
>;
export type CheckIDCodeInfoSuccessResponse = CommonSuccessResponse<IdCodeInfo>;

export type CheckIDCodeInfoResponse =
  | CheckIDCodeStatusSuccessResponse
  | CheckIDCodeInfoSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse<
      | ActionFailType.DatabaseError
      | ActionFailType.WrongInfo
      | ActionFailType.MissingArg
      | ActionFailType.MissingCredential
    >;

export const checkIDCode = async ({
  id,
  authToken,
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  appID,
  appId = appID,
  uuid,
  openid,
  remark,
}: CheckIDCodeOptions): Promise<CheckIDCodeInfoResponse> => {
  let connection: PoolConnection | null = null;

  try {
    if (id.toString() === TEST_ID)
      return UnknownResponse("不支持为测试账号生成身份码");

    if (!authToken || !id) return MissingCredentialResponse;
    if (!appId) return MissingArgResponse("appId");
    if (!openid) return MissingArgResponse("openid");

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
        msg: "用户凭据已失效，无法校验身份码，请重新登录。\n提示: 为了保证身份码的可靠性，您只能在最后一次登录的设备校验身份码。",
      };

    let isAdmin = false;

    try {
      const [adminRows] = await connection.execute<RowDataPacket[]>(
        "SELECT * FROM `admin` WHERE `openid` = ?",
        [openid],
      );

      isAdmin = adminRows.length > 0;
    } catch (err) {
      console.error(`Querying admin with openid ${openid}`, err);
    }

    if (!uuid) {
      // get the latest uuid
      const [idCodeRows] = await connection.execute<RowDataPacket[]>(
        "SELECT * FROM `id_code` WHERE `id` = ? ORDER BY `createTime` DESC LIMIT 1",
        [id],
      );

      // if no id code exists
      if (idCodeRows.length === 0)
        return {
          success: true,
          data: {
            existed: false,
            verifier: null,
          },
        };

      const row = idCodeRows[0] as IDCodeData;

      // already verified
      if (row.verifyRemark)
        return {
          success: true,
          data: {
            existed: false,
            verifier: row.verifyRemark,
          },
        };

      const result = await getWechatMPCode(
        appId,
        "pkg/user/pages/account/login",
        `verify:${row.uuid}`,
      );

      if (result instanceof Buffer) {
        return {
          success: true,
          data: {
            existed: true,
            code: `data:image/png;base64,${result.toString("base64")}`,
            remark: row.remark,
          },
        };
      }

      return UnknownResponse((result as WechatMpCodeError).errmsg);
    }

    // check whether uuid is valid
    const [idCodeRows] = await connection.execute<RowDataPacket[]>(
      "SELECT * FROM `id_code` WHERE `uuid` = ?",
      [uuid],
    );

    if (idCodeRows.length === 0)
      return {
        success: false,
        type: ActionFailType.WrongInfo,
        msg: "无效的身份码",
      };

    const row = idCodeRows[0] as IDCodeData;

    if (row.verifyId)
      return {
        success: false,
        type: ActionFailType.Expired,
        msg: "身份码已被核验",
      };

    if (row.id === id) {
      return {
        success: false,
        type: ActionFailType.Forbidden,
        msg: "不允许核验自己的身份码",
      };
    }

    // 获取用户信息
    const [infoRows] = await connection.execute<RowDataPacket[]>(
      "SELECT * FROM `student_info` WHERE `id` = ?",
      [row.id],
    );

    if (!infoRows.length)
      return {
        success: false,
        type: ActionFailType.WrongInfo,
        msg: "用户信息不存在",
      };

    const info = infoRows[0] as MyInfo;

    await connection.execute(
      "UPDATE `id_code` SET `verifyId` = ?, `verifyTime` = FROM_UNIXTIME(?), `verifyRemark` = ? WHERE `uuid` = ?",
      [
        id,
        Math.round(Date.now() / 1000),
        isAdmin ? "管理员" : (remark ?? ""),
        uuid,
      ],
    );

    return {
      success: true,
      data: {
        name: info.name,
        grade: info.grade,
        org: info.org,
        major: info.major,
        type: info.type,
        id: isAdmin ? info.id : null,
        gender: isAdmin ? info.gender : null,
        createTime: row.createTime,
        remark: row.remark,
      },
    };
  } catch (err) {
    console.error(err);

    return DatabaseErrorResponse((err as Error).message);
  } finally {
    releaseConnection(connection);
  }
};

export const checkIdCodeHandler = request<
  CheckIDCodeInfoResponse,
  CheckIDCodeOptions
>(async (req, res) => {
  return res.json(await checkIDCode(req.body));
});
