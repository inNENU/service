import { connect, getShortUUID } from "../../utils/index.js";

export interface PersonalInfo {
  id: number | null;
  name: string;
  gender: string;
  org: string;
  major: string;
  grade: number;
  openid: string | null;
}

export interface SetInfoOptions {
  info: PersonalInfo;
  /** @default account */
  type: "account" | "admission";
  remark?: string;
}

/**
 * @throws {Error} Database error
 */
export const setInfo = async ({
  type,
  info: { id, name, gender, org, major, grade, openid },
  remark,
}: SetInfoOptions): Promise<string> => {
  const { connection, release } = await connect();
  const uuid = getShortUUID();

  await connection.execute(
    `INSERT INTO student_info (uuid, openid, type, id, name, gender, school, major, grade, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      uuid,
      openid ?? null,
      type ?? "account",
      id,
      name,
      gender,
      org,
      major,
      grade,
      remark ?? null,
    ],
  );

  release();

  return uuid;
};
