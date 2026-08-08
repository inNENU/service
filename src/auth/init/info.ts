import { CookieStore } from "@mptool/net";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import {
  ActionFailType,
  TEST_COOKIE_STORE,
  TEST_INFO,
  unknownResponse,
  getRandomBlacklistHint,
} from "@/config/index.js";
import type { AccountInfo, CommonFailedResponse } from "@/typings.js";
import { getConnection, isInBlackList, releaseConnection } from "@/utils/index.js";

import { AUTH_INFO_PREFIX, authCenterLogin, getAvatar } from "../../auth-center/index.js";
import { UNDER_STUDY_SERVER, getUnderStudyInfo, underStudyLogin } from "../../under-study/index.js";
import type { WhoInfoData } from "../../who/index.js";
import { WHO_SERVER, getWhoInfo, whoLogin } from "../../who/index.js";

export interface GetAuthInfoOptions extends AccountInfo {
  /** App ID */
  appId: string | number;
  /** 用户 OpenID */
  openid: string;
}

export type AuthInfo = WhoInfoData & { avatar: string };

export interface AuthInfoSuccessResponse {
  success: true;
  info: AuthInfo | null;
  cookieStore: CookieStore;
}

export type AuthInfoFailedResponse = CommonFailedResponse<
  ActionFailType.Forbidden | ActionFailType.Unknown | ActionFailType.BlackList
>;

export type AuthInfoResponse = AuthInfoSuccessResponse | AuthInfoFailedResponse;

export const TEST_AUTH_INFO: AuthInfoSuccessResponse = {
  success: true,
  info: TEST_INFO,
  cookieStore: TEST_COOKIE_STORE,
};

const DATABASE_FIELDS = [
  "id",
  "name",
  "org",
  "orgId",
  "major",
  "majorId",
  "inYear",
  "grade",
  "type",
  "typeId",
  "people",
  "gender",
  "genderId",
  "birth",
  "location",
  "idCard",
  "studyLength",
  "age",
  "expectedGraduationDate",
  "createTime",
  "updateTime",
];

const SQL_STRING = `INSERT INTO \`student_info\` (${DATABASE_FIELDS.map(
  (field) => `\`${field}\``,
).join(
  ", ",
)}) VALUES (${Array.from({ length: DATABASE_FIELDS.length - 2 }, () => "?").join(", ")}, NOW(), NOW()) ON DUPLICATE KEY UPDATE ${DATABASE_FIELDS.filter(
  (field) => !["id", "createTime"].includes(field),
)
  .map((field) => `\`${field}\` = VALUES(\`${field}\`)`)
  .join(", ")}`;

export const getAuthInfo = async (
  { id, password, authToken, appId, openid }: GetAuthInfoOptions,
  cookieStore = new CookieStore(),
): Promise<AuthInfoResponse> => {
  let connection: PoolConnection | null = null;

  try {
    let info: AuthInfo | null = null;

    // store authToken in database for auth
    if (appId) {
      try {
        connection ??= await getConnection();

        await connection.execute(
          "INSERT INTO `token` (`authToken`, `id`, `appId`, `openId`, `updateTime`) VALUES (?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE `authToken` = VALUES(`authToken`), `updateTime` = VALUES(`updateTime`)",
          [authToken, id, appId.toString(), openid ?? null],
        );
      } catch (err) {
        console.error("Database error", err);
      }
    }

    try {
      connection ??= await getConnection();

      const [infoRows] = await connection.execute<(RowDataPacket & Omit<WhoInfoData, "avatar">)[]>(
        "SELECT * FROM `student_info` WHERE `id` = ?",
        [id],
      );

      if (infoRows.length > 0) {
        const [infoData] = infoRows;

        // FIXME: 先直接使用原信息
        // 90 天内更新过信息，直接使用原信息
        // if (
        //   Date.parse(infoData.updateTime as string) + 1000 * 60 * 60 * 24 * 90 >
        //   Date.now()
        // ) {
        delete infoData.createTime;
        delete infoData.updateTime;

        const [avatarRows] = await connection.execute<(RowDataPacket & { avatar: string })[]>(
          "SELECT * FROM `student_avatar` WHERE `id` = ?",
          [id],
        );

        info = {
          avatar: avatarRows[0]?.avatar ?? "",
          ...infoData,
        };
        // }
      }
    } catch (err) {
      console.error("Database error", err);
    }

    const typeNumber = Number(id.toString()[4]);
    const typeId =
      typeNumber === 0 ? "bks" : typeNumber === 1 || typeNumber === 2 ? "yjs" : "unknown";

    if (!info) {
      if (typeId === "bks") {
        const loginResult = await underStudyLogin({ id, password, authToken }, cookieStore);

        if (!loginResult.success) {
          if (loginResult.type === ActionFailType.Forbidden) {
            return {
              success: false,
              type: ActionFailType.Forbidden,
              msg: "本科教务系统无法登录，获取个人信息失败，请通过小程序客服联系 Mr.Hope",
            };
          }

          return {
            success: false,
            type: ActionFailType.Unknown,
            msg: `账号密码校验成功，但${loginResult.msg}，你可通过小程序客服联系 Mr.Hope。`,
          };
        }

        const studentInfo = await getUnderStudyInfo(cookieStore.getHeader(UNDER_STUDY_SERVER));

        if (studentInfo.success) {
          let avatar = "";
          const authCenterResult = await authCenterLogin({ id, password, authToken }, cookieStore);

          if (authCenterResult.success) {
            const avatarInfo = await getAvatar(cookieStore.getHeader(AUTH_INFO_PREFIX));

            if (avatarInfo.success) {
              ({ avatar } = avatarInfo.data);
              try {
                connection ??= await getConnection();
                await connection.execute(
                  "REPLACE INTO `student_avatar` (`id`, `avatar`) VALUES (?, ?)",
                  [id, avatar],
                );
              } catch (err) {
                console.error("Database error", err);
              }
            } else {
              console.error("Get avatar failed", avatarInfo);
            }
          }

          info = {
            avatar,
            ...studentInfo.data,
          };

          try {
            connection ??= await getConnection();
            await connection.execute(SQL_STRING, [
              info.id,
              info.name,
              info.org,
              info.orgId,
              info.major,
              info.majorId,
              info.inYear,
              info.grade,
              info.type,
              info.typeId,
              info.people,
              info.gender,
              info.genderId,
              info.birth,
              info.location,
              info.idCard ?? null,
              info.studyLength ?? null,
              info.age ?? null,
              info.expectedGraduationDate ?? null,
            ]);
          } catch (err) {
            console.error("Database error", err);
          }
        } else {
          return unknownResponse("从本科生教务系统获取个人信息失败");
        }
      } else {
        // 研究生：通过 who（学工）系统获取并保存用户信息
        const whoLoginResult = await whoLogin({ id, password, authToken }, cookieStore);

        if (!whoLoginResult.success) {
          // 红线：登录失败要仔细分析，不原地重试，直接返回失败
          console.error("研究生 who 登录失败", whoLoginResult);

          return {
            success: false,
            type: ActionFailType.Unknown,
            msg: `账号密码校验成功，但${whoLoginResult.msg}，你可通过小程序客服联系 Mr.Hope。`,
          };
        }

        const whoInfo = await getWhoInfo(id, whoLoginResult.cookieStore.getHeader(WHO_SERVER));

        if (!whoInfo.success) {
          console.error("获取 who 信息失败", whoInfo);

          return unknownResponse("从学工系统获取个人信息失败");
        }

        info = {
          avatar: "",
          ...whoInfo.data,
        };

        try {
          connection ??= await getConnection();
          await connection.execute(SQL_STRING, [
            info.id,
            info.name,
            info.org,
            info.orgId,
            info.major,
            info.majorId,
            info.inYear,
            info.grade,
            info.type,
            info.typeId,
            info.people,
            info.gender,
            info.genderId,
            info.birth,
            info.location,
            info.idCard ?? null,
            info.studyLength ?? null,
            info.age ?? null,
            info.expectedGraduationDate ?? null,
          ]);
        } catch (err) {
          console.error("Database error", err);
        }
      }
    }

    // check blacklist
    if (await isInBlackList(id, openid, info)) {
      return {
        success: false,
        type: ActionFailType.BlackList,
        msg: getRandomBlacklistHint(),
      };
    }

    return {
      success: true,
      info,
      cookieStore,
    };
  } catch (err) {
    console.error("Get auth info error", err);

    return unknownResponse("未知错误");
  } finally {
    releaseConnection(connection);
  }
};
