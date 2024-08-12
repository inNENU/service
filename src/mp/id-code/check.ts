import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import type { IDCodeData } from "./utils.js";
import type { AuthLoginFailedResponse } from "../../auth/index.js";
import {
  ActionFailType,
  DatabaseErrorResponse,
  MissingArgResponse,
  MissingCredentialResponse,
} from "../../config/index.js";
import type { MyInfo } from "../../my/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import { getConnection, releaseConnection } from "../../utils/index.js";

export interface CheckIDCodeOptions {
  id: number;
  authToken: string;
  appId: string;
  uuid: string;
  openid: string;
  remark?: string;
}

export interface IdCodeInfo {
  name: string;
  grade: number;
  type: string;
  org: string;
  major: string;
  createTime: string;

  /**
   * @description Only available for admin
   */
  id: number | null;
  /**
   * @description Only available for admin
   */
  gender: string | null;
}

export type CheckIDCodeInfoSuccessResponse = CommonSuccessResponse<IdCodeInfo>;

export type CheckIDCodeInfoResponse =
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
  appId,
  uuid,
  openid,
  remark,
}: CheckIDCodeOptions): Promise<CheckIDCodeInfoResponse> => {
  let connection: PoolConnection | null = null;

  try {
    if (!authToken || !id) return MissingCredentialResponse;
    if (!appId) return MissingArgResponse("appId");
    if (!uuid) return MissingArgResponse("uuid");
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
        msg: "用户凭据已失效，无法取得校验身份码，请重新登录。\n提示: 为了保证身份码的可靠性，您只能在最后一次登录的设备校验身份码。",
      };

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
      [id],
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
      [id, Math.round(Date.now() / 1000), remark ?? "", uuid],
    );

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

    return {
      success: true,
      data: {
        name: info.name,
        grade: info.grade,
        org: info.org,
        major: info.major,
        type: info.type,
        id: isAdmin ? row.id : null,
        gender: isAdmin ? info.gender : null,
        createTime: row.createTime,
      },
    };
  } catch (err) {
    console.error(err);

    return DatabaseErrorResponse((err as Error).message);
  } finally {
    releaseConnection(connection);
  }
};
