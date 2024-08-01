import type { RequestHandler } from "express";
import type { RowDataPacket } from "mysql2";
import { v7 } from "uuid";

import { ActionFailType } from "../config/index.js";
import type { UnderAdmissionOptions } from "../enroll/index.js";
import { getUnderAdmission } from "../enroll/index.js";
import { getMyInfo } from "../my/info.js";
import { myLogin } from "../my/login.js";
import { MY_SERVER } from "../my/utils.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  EmptyObject,
} from "../typings.js";
import { getConnection, getShortUUID } from "../utils/index.js";

export interface AdmissionVerifyOptions extends UnderAdmissionOptions {
  referrer: string;
}

export interface AccountVerifyOptions {
  id: number;
  password: string;
  authToken: string;
}

export type VerifyInfoOptions = AdmissionVerifyOptions | AccountVerifyOptions;

export type VerifyInfoSuccessResponse = CommonSuccessResponse<{
  uuid: string;
}>;

export type VerifyInfoResponse =
  | VerifyInfoSuccessResponse
  | CommonFailedResponse<
      | ActionFailType.WrongInfo
      | ActionFailType.WrongPassword
      | ActionFailType.BlackList
      | ActionFailType.EnabledSSO
      | ActionFailType.Error
      | ActionFailType.AccountLocked
      | ActionFailType.NeedCaptcha
      | ActionFailType.NeedReAuth
      | ActionFailType.Expired
      | ActionFailType.Forbidden
      | ActionFailType.Unknown
    >;

export const verifyInfo = async (
  options: VerifyInfoOptions,
): Promise<VerifyInfoResponse> => {
  if ("name" in options) {
    const { name, id, testId } = options;

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

    const uuid = getShortUUID(v7());

    const connection = await getConnection();

    await connection.query(
      `INSERT INTO verify (uuid, name, school, major, grade) VALUES (?, ?, ?, ?, ?)`,
      [
        uuid,
        name,
        result.data[3].text,
        result.data[2].text,
        new Date().getMonth() < 7
          ? new Date().getFullYear() - 1
          : new Date().getFullYear(),
      ],
    );

    return {
      success: true,
      data: {
        uuid,
      },
    };
  }

  const loginResult = await myLogin(options);

  if (!loginResult.success) return loginResult;

  const infoResult = await getMyInfo(
    loginResult.cookieStore.getHeader(MY_SERVER),
  );

  if (!infoResult.success) return infoResult;

  const uuid = getShortUUID(v7());

  const connection = await getConnection();

  await connection.query(
    `INSERT INTO verify (uuid, name, school, major, grade) VALUES (?, ?, ?, ?, ?)`,
    [
      uuid,
      infoResult.data.name,
      infoResult.data.org,
      infoResult.data.major,
      infoResult.data.grade,
    ],
  );

  return {
    success: true,
    data: {
      uuid,
    },
  };
};

export interface VerifyData {
  name: string;
  school: string;
  major: string;
  grade: number;
}

export interface VerifyUUIDOptions {
  uuid: string;
  remove?: boolean;
}

export type VerifyUUIDSuccessResponse = CommonSuccessResponse<VerifyData>;

export type VerifyUUIDResponse =
  | VerifyUUIDSuccessResponse
  | CommonFailedResponse<ActionFailType.WrongInfo>;

export const verifyUUID = async ({
  uuid,
  remove = true,
}: VerifyUUIDOptions): Promise<VerifyUUIDResponse> => {
  const connection = await getConnection();

  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT * FROM verify WHERE uuid = ?`,
    [uuid],
  );

  if (rows.length === 0)
    return {
      success: false,
      type: ActionFailType.WrongInfo,
      msg: "UUID 不存在",
    };

  const row = rows[0] as VerifyData;

  const data = {
    name: row.name,
    school: row.school,
    major: row.major,
    grade: row.grade,
  };

  if (remove)
    await connection.execute(`DELETE FROM verify WHERE uuid = ?`, [uuid]);

  return {
    success: true,
    data,
  };
};

export const verifyHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  VerifyInfoOptions | VerifyUUIDOptions
> = async (req, res) => {
  if (!req.headers.referer?.startsWith("https://innenu.com/"))
    return res.status(403).json({
      success: false,
      msg: "Fuck you",
    });

  if ("uuid" in req.body) return res.json(await verifyUUID(req.body));

  return res.json(await verifyInfo(req.body));
};
