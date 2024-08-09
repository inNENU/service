import type { RowDataPacket } from "mysql2";

import type { InfoData } from "./utils.js";
import type { AuthLoginFailedResponse } from "../../auth/index.js";
import { authLogin } from "../../auth/index.js";
import { ActionFailType, DatabaseError } from "../../config/index.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import { connect } from "../../utils/index.js";

export interface GetInfoOptions extends AccountInfo {
  uuid: string;
  remark?: string;
}

export type GetInfoSuccessResponse = CommonSuccessResponse<InfoData>;

export type GetInfoResponse =
  | GetInfoSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse<
      ActionFailType.DatabaseError | ActionFailType.WrongInfo
    >;

export const getInfo = async ({
  id,
  password,
  authToken,
  uuid,
  remark,
}: GetInfoOptions): Promise<GetInfoResponse> => {
  try {
    const { connection, release } = await connect();

    const loginResult = await authLogin({ id, password, authToken });

    if (!loginResult.success)
      return {
        success: false,
        type: loginResult.type,
        msg: loginResult.msg,
      };

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT * FROM student_info WHERE uuid = ?`,
      [uuid],
    );

    if (rows.length === 0)
      return {
        success: false,
        type: ActionFailType.WrongInfo,
        msg: "UUID 不存在",
      };

    const row = rows[0] as InfoData;

    if (row.verifyId)
      return {
        success: false,
        type: ActionFailType.Expired,
        msg: "身份码已过期",
      };

    if (row.id === id) {
      return {
        success: false,
        type: ActionFailType.Forbidden,
        msg: "不能核验自己的身份码",
      };
    }

    await connection.execute(
      `UPDATE student_info SET verifyId = ?, verifyTime = ?, verifyRemark = ? WHERE uuid = ?`,
      [id, Math.round(Date.now() / 1000), remark ?? "", uuid],
    );

    release();

    return {
      success: true,
      data: row,
    };
  } catch (err) {
    console.error(err);

    return DatabaseError((err as Error).message);
  }
};
