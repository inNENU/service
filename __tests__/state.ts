/** 读取/写入 git 忽略的账号与登录态文件（位于 temp/ 目录） */
import { readFileSync, writeFileSync } from "node:fs";

import type { CookieType } from "@mptool/net";

/** 账号文件（temp/accounts.json）：真实账号由用户手动填写，git 忽略 */
export interface AccountCredentials {
  /** 学号 */
  id: number;
  /** 密码 */
  password: string;
}

export interface AccountsFile {
  undergraduate: AccountCredentials;
  graduate: AccountCredentials;
}

/** 招生查询测试信息（temp/enroll-info.json）：真实考生信息由用户手动填写，git 忽略 */
export interface EnrollInfo {
  /** 考生姓名 */
  name: string;
  /** 身份证号 */
  id: string;
  /** 考生号（学号） */
  testId: string;
}

/** 单个账号的二次认证登录态 */
export interface AccountAuth {
  id: number;
  /** MULTIFACTOR_USERS token（有效期至 2092，可复用于所有系统登录） */
  authToken: string;
  /** 认证服务器 cookie（调试用，系统登录实际只依赖 authToken） */
  cookies: CookieType[];
  /** 获取时间 */
  provisionedAt: string;
}

export interface AuthStateFile {
  undergraduate?: AccountAuth;
  graduate?: AccountAuth;
}

const ACCOUNTS_PATH = new URL("../temp/accounts.json", import.meta.url);
const AUTH_STATE_PATH = new URL("../temp/auth-state.json", import.meta.url);
const ENROLL_INFO_PATH = new URL("../temp/enroll-info.json", import.meta.url);

/** 读取招生查询测试信息（文件缺失时抛错） */
export const readEnrollInfo = (): EnrollInfo => {
  try {
    return JSON.parse(readFileSync(ENROLL_INFO_PATH, "utf8")) as EnrollInfo;
  } catch {
    throw new Error(
      "无法读取 temp/enroll-info.json，请先创建该文件（git 忽略），内容为 { name, id, testId }",
    );
  }
};

/** 读取账号文件 */
export const readAccounts = (): AccountsFile => {
  try {
    return JSON.parse(readFileSync(ACCOUNTS_PATH, "utf8")) as AccountsFile;
  } catch {
    throw new Error(
      "无法读取 temp/accounts.json，请先创建该文件（git 忽略），内容为 { undergraduate: {id, password}, graduate: {id, password} }",
    );
  }
};

/** 读取登录态（文件不存在时返回空对象） */
export const readAuthState = (): AuthStateFile => {
  try {
    return JSON.parse(readFileSync(AUTH_STATE_PATH, "utf8")) as AuthStateFile;
  } catch {
    return {};
  }
};

/** 写入登录态 */
export const writeAuthState = (state: AuthStateFile): void => {
  writeFileSync(AUTH_STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
};
