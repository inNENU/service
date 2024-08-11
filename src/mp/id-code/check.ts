import type { RowDataPacket } from "mysql2";

import type { IDCodeData } from "./utils.js";
import type { AuthLoginFailedResponse } from "../../auth/index.js";
import {
  ActionFailType,
  DatabaseError,
  MissingArgResponse,
  MissingCredentialResponse,
} from "../../config/index.js";
import type { MyInfo } from "../../my/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import { connect } from "../../utils/index.js";

export interface GetInfoOptions {
  id: number;
  mpToken: string;
  uuid: string;
  remark?: string;
}

export interface IdCodeInfo {
  id: number;
  name: string;
  gender: string;
  grade: number;
  org: string;
  major: string;
  createTime: string;
}

export type GetInfoSuccessResponse = CommonSuccessResponse<IdCodeInfo>;

export type GetInfoResponse =
  | GetInfoSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse<
      | ActionFailType.DatabaseError
      | ActionFailType.WrongInfo
      | ActionFailType.MissingArg
      | ActionFailType.MissingCredential
    >;

export const checkIDCode = async ({
  id,
  mpToken,
  uuid,
  remark,
}: GetInfoOptions): Promise<GetInfoResponse> => {
  try {
    if (!mpToken || !id) return MissingCredentialResponse;
    if (!uuid) return MissingArgResponse("uuid");

    const { connection, release } = await connect();

    // check whether the mpToken is valid
    const [validatorInfoRows] = await connection.execute<RowDataPacket[]>(
      `SELECT * FROM student_info WHERE id = ? AND uuid = ?`,
      [id, mpToken],
    );

    if (!validatorInfoRows.length)
      return {
        success: false,
        type: ActionFailType.Expired,
        msg: "用户凭据已失效，无法取得校验身份码，请重新登录。\n提示: 为了保证身份码的可靠性，您只能在最后一次登录的设备校验身份码。",
      };

    // check whether uuid is valid
    const [idCodeRows] = await connection.execute<RowDataPacket[]>(
      `SELECT * FROM id_code WHERE uuid = ?`,
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
      `SELECT * FROM student_info WHERE id = ?`,
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
      `UPDATE id_code SET verifyId = ?, verifyTime = FROM_UNIXTIME(?), verifyRemark = ? WHERE uuid = ?`,
      [id, Math.round(Date.now() / 1000), remark ?? "", uuid],
    );

    release();

    return {
      success: true,
      data: {
        id: row.id,
        name: info.name,
        gender: info.gender,
        grade: info.grade,
        org: info.org,
        major: info.major,
        createTime: row.createTime,
      },
    };
  } catch (err) {
    console.error(err);

    return DatabaseError((err as Error).message);
  }
};
