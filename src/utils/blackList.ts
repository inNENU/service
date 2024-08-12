import type { RowDataPacket } from "mysql2/promise";

import { getConnection } from "./mysql.js";
import type { MyInfo } from "../my/index.js";

export const isInBlackList = async (
  id: number,
  openid: string | null = null,
  info: MyInfo | null = null,
): Promise<boolean> => {
  const connection = await getConnection();

  const [idRows] = await connection.execute<RowDataPacket[]>(
    "SELECT * FROM `id_blacklist` WHERE `id` = ?",
    [id],
  );

  if (idRows.length > 0) {
    console.info(`Blocking user ${id}`);

    if (openid)
      await connection.execute(
        "INSERT IGNORE INTO `openid_blacklist` (`openid`, `remark`) VALUES (?, ?)",
        [openid, `因登录 ${id} 添加`],
      );

    return true;
  }

  if (!info) return false;

  const [conditionRows] = await connection.execute<RowDataPacket[]>(
    "SELECT * FROM `condition_blacklist` WHERE (`name` = ? OR `name` IS NULL) AND (`type` = ? OR `type` IS NULL) AND (`grade` = ? OR `grade` IS NULL) AND (`org` = ? OR `org` IS NULL) AND (`major` = ? OR `major` IS NULL)",
    [info.name, info.type, info.grade, info.org, info.major],
  );

  if (conditionRows.length > 0) {
    console.info(`Blocking user ${id} due to condition`, conditionRows[0]);

    await connection.execute(
      "INSERT IGNORE INTO `id_blacklist` (`id`, `remark`) VALUES (?, ?)",
      [id, `因符合规则添加: ${JSON.stringify(conditionRows[0])}`],
    );

    if (openid)
      await connection.execute(
        "INSERT IGNORE INTO `openid_blacklist` (`openid`, `remark`) VALUES (?, ?)",
        [openid, `因登录 ${id} 添加`],
      );

    return true;
  }

  return false;
};
