import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import type { InfoData } from "./utils.js";
import type { ActionFailType } from "../../config/index.js";
import { DatabaseError, TEST_ID, UnknownResponse } from "../../config/index.js";
import { getMyInfo } from "../../my/info.js";
import { myLogin } from "../../my/login.js";
import { MY_SERVER } from "../../my/utils.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import { connect, getShortUUID, getWechatMPCode } from "../../utils/index.js";

export interface PersonalInfo {
  name: string;
  gender: string;
  org: string;
  major: string;
  grade: number;
}

export interface StoreAccountInfoOptions extends AccountInfo {
  openid?: string;
  remark: string;
  appID?: string;
  info?: PersonalInfo | null;
}

export type StoreAccountInfoCodeSuccessResponse = CommonSuccessResponse<{
  code: string;
}>;
export type StoreAccountInfoUUIDSuccessResponse = CommonSuccessResponse<{
  uuid: string;
}>;

export type StoreAccountInfoResponse =
  | StoreAccountInfoCodeSuccessResponse
  | StoreAccountInfoUUIDSuccessResponse
  | CommonFailedResponse<
      | ActionFailType.WrongPassword
      | ActionFailType.BlackList
      | ActionFailType.EnabledSSO
      | ActionFailType.DatabaseError
      | ActionFailType.Error
      | ActionFailType.AccountLocked
      | ActionFailType.NeedCaptcha
      | ActionFailType.NeedReAuth
      | ActionFailType.Expired
      | ActionFailType.Forbidden
      | ActionFailType.Unknown
    >;

export const storeStoreAccountInfo = async ({
  id,
  password,
  authToken,
  openid,
  remark,
  appID,
  info = null,
}: StoreAccountInfoOptions): Promise<StoreAccountInfoResponse> => {
  try {
    if (id.toString() === TEST_ID) {
      return UnknownResponse("测试账号不支持生成身份码");
    }

    const loginResult = await myLogin({ id, password, authToken });

    if (!loginResult.success) return loginResult;

    let connection: PoolConnection;
    let release: () => void;

    try {
      ({ connection, release } = await connect());

      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM student_info WHERE id = ? AND verifyId IS NULL`,
        [id],
      );

      if (rows.length > 0) {
        const { uuid } = rows[0] as InfoData;

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
          data: { uuid },
        };
      }

      release();
    } catch (err) {
      console.error(err);

      return DatabaseError((err as Error).message);
    }

    let infoData: PersonalInfo | null = info;

    if (
      typeof infoData !== "object" ||
      typeof infoData?.gender !== "string" ||
      typeof infoData?.org !== "string" ||
      typeof infoData?.major !== "string" ||
      typeof infoData?.grade !== "number" ||
      !infoData.gender ||
      !infoData.org ||
      !infoData.major
    ) {
      const infoResult = await getMyInfo(
        loginResult.cookieStore.getHeader(MY_SERVER),
      );

      if (!infoResult.success) return infoResult;

      const { name, gender, org, major, grade } = infoResult.data;

      infoData = {
        name,
        gender: gender[0],
        org,
        major,
        grade,
      };
    }

    const uuid = getShortUUID();

    try {
      const { connection, release } = await connect();

      await connection.execute(
        `INSERT INTO student_info (uuid, openid, type, id, name, gender, school, major, grade, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuid,
          openid ?? null,
          "account",
          id,
          infoData.name,
          infoData.gender[0],
          infoData.org,
          infoData.major,
          infoData.grade,
          remark ?? null,
        ],
      );

      release();
    } catch (err) {
      console.error(err);

      return DatabaseError((err as Error).message);
    }

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
  } catch (err) {
    console.error(err);

    return UnknownResponse((err as Error).message);
  }
};
