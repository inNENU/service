import { writeFile } from "node:fs";

import type { RowDataPacket } from "mysql2/promise";

import { getConnection } from "./mysql.js";
import type { ConditionBlackList } from "../config/index.js";
import { CONDITION_BLACK_LIST } from "../config/index.js";
import type { MyInfo } from "../my/index.js";

const testCondition = (info: MyInfo, condition: ConditionBlackList): boolean =>
  Object.entries(condition).every(([key, value]) => {
    if (value instanceof RegExp)
      return value.test(info[key as keyof MyInfo] as string);

    if (typeof value === "number") return info[key as keyof MyInfo] === value;

    return (
      info[key as keyof MyInfo] === Buffer.from(value, "base64").toString()
    );
  });

export const isInBlackList = async (
  id: number,
  openid?: string,
  info?: MyInfo | null,
): Promise<boolean> => {
  const connection = await getConnection();

  const [rows] = await connection.execute<RowDataPacket[]>(
    "SELECT * FROM `id_blacklist` WHERE `id` = ?",
    [id],
  );

  if (rows.length > 0) {
    console.info(`Blocking user ${id}`);

    if (openid)
      await connection.execute(
        "INSERT IGNORE INTO `openid_blacklist` (openid, remark) VALUES (?, ?)",
        [openid, `因登录 ${id} 添加`],
      );

    return true;
  }

  if (!info) return false;

  const result = CONDITION_BLACK_LIST.some((condition) =>
    testCondition(info, condition),
  );

  if (result)
    writeFile(
      "blacklist",
      `${id} new ${openid ?? ""} ${JSON.stringify(info)}\n`,
      {
        encoding: "utf8",
        flag: "a",
      },
      (err) => {
        if (err) {
          console.error(err);
        }
      },
    );

  return result;
};
