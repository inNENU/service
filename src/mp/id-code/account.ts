import type { ActionFailType } from "../../config/index.js";
import { DatabaseError, UnknownResponse } from "../../config/index.js";
import { getMyInfo } from "../../my/info.js";
import { myLogin } from "../../my/login.js";
import { MY_SERVER } from "../../my/utils.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import { connect, getShortUUID, getWechatMPCode } from "../../utils/index.js";

export interface StoreAccountInfoOptions {
  id: number;
  password: string;
  authToken: string;
  remark: string;
  appID?: string;
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

export const storeStoreAccountInfo = async (
  options: StoreAccountInfoOptions,
): Promise<StoreAccountInfoResponse> => {
  try {
    const loginResult = await myLogin(options);

    if (!loginResult.success) return loginResult;

    const infoResult = await getMyInfo(
      loginResult.cookieStore.getHeader(MY_SERVER),
    );

    if (!infoResult.success) return infoResult;

    const uuid = getShortUUID();

    try {
      const { connection, release } = await connect();

      await connection.query(
        `INSERT INTO student_info (uuid, name, gender, school, major, grade, remark) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuid,
          infoResult.data.name,
          infoResult.data.gender[0],
          infoResult.data.org,
          infoResult.data.major,
          infoResult.data.grade,
          options.remark ?? "",
        ],
      );

      release();
    } catch (err) {
      console.error(err);

      return DatabaseError((err as Error).message);
    }

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
  } catch (err) {
    console.error(err);

    return UnknownResponse((err as Error).message);
  }
};
