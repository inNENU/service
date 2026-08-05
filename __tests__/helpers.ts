/** 测试公共辅助函数：系统登录、会话校验、统一严格断言 */
import { expect } from "vitest";

import type { ApiResponse } from "./client.js";
import { ApiClient } from "./client.js";
import type { AccountAuth } from "./state.js";
import { readAccounts, readAuthState } from "./state.js";

/**
 * 获取某角色的登录态（本科/研究生）
 *
 * @param role 角色
 * @returns 该角色的登录态，缺失时返回 undefined
 */
export const getAccount = (role: "undergraduate" | "graduate"): AccountAuth | undefined =>
  readAuthState()[role];

/**
 * 根据学号查找密码（来自 temp/accounts.json）
 *
 * @param id 学号
 * @returns 对应密码
 */
export const getPassword = (id: number): string => {
  const accounts = readAccounts();

  if (accounts.undergraduate.id === id) return accounts.undergraduate.password;
  if (accounts.graduate.id === id) return accounts.graduate.password;

  throw new Error(`temp/accounts.json 中未找到学号 ${id} 的密码`);
};

/**
 * 登录某个系统，返回带该系统 cookie 的客户端（复用 authToken，无需再次短信）
 *
 * @param system 系统名（与 /{system}/login 路径一致）
 * @param account 账号登录态
 * @returns 已登录的客户端
 */
export const loginSystem = async (system: string, account: AccountAuth): Promise<ApiClient> => {
  const client = new ApiClient();
  const res = await client.post(`/${system}/login`, {
    id: account.id,
    password: getPassword(account.id),
    authToken: account.authToken,
  });

  expect(res.status, `/${system}/login 返回 HTTP ${res.status}`).toBe(200);
  expect(res.body, `/${system}/login 失败`).toHaveProperty("success", true);

  return client;
};

/**
 * 校验会话有效性（/check 端点），登录后先验证再测业务接口
 *
 * @param client 已登录的客户端
 * @param system 系统名
 * @param label 断言标签
 */
export const checkSession = async (
  client: ApiClient,
  system: string,
  label: string,
): Promise<void> => {
  const res = await client.post(`/${system}/check`, { cookies: client.jar.toJSON() });

  expect(res.status, `${label}: /${system}/check 返回 HTTP ${res.status}`).toBe(200);
  expect(res.body, `${label}: /${system}/check 响应异常`).toHaveProperty("success", true);
  expect(res.body, `${label}: 会话校验无效`).toHaveProperty("valid", true);
};

/**
 * 成功断言。返回 true 表示成功；返回 false 表示命中良性失败（已记警告）。
 *
 * @param res 响应对象
 * @param label 断言标签
 * @param benign 良性失败类型列表
 * @returns 是否成功
 */
export const expectSuccess = (res: ApiResponse, label: string, benign: string[] = []): boolean => {
  expect(res.status, `${label}: HTTP ${res.status}`).toBe(200);

  if (res.body?.success === true) return true;

  const type = (res.body as { type?: string } | undefined)?.type;

  if (type && benign.includes(type)) {
    console.warn(`  ⚠ ${label}: 已知场景 ${type}（${(res.body as { msg?: string })?.msg ?? ""}）`);

    return false;
  }

  expect(res.body, `${label}: 失败`).toHaveProperty("success", true);

  return true;
};

/**
 * 对象必须包含指定键
 *
 * @param obj 待断言对象
 * @param keys 必须包含的键
 * @param label 断言标签
 */
export const expectObjectKeys = (obj: unknown, keys: string[], label: string): void => {
  expect(obj, `${label}: 应为对象`).toBeTypeOf("object");
  expect(obj, `${label}: 不应为 null`).not.toBeNull();

  for (const key of keys) expect(obj, `${label}: 缺少字段 ${key}`).toHaveProperty(key);
};

/**
 * 数组元素必须包含指定键
 *
 * @param data 待断言数组
 * @param keys 每个元素必须包含的键
 * @param label 断言标签
 */
export const expectArrayItems = (data: unknown, keys: string[], label: string): void => {
  expect(Array.isArray(data), `${label}: 应为数组`).toBe(true);

  (data as unknown[]).forEach((item, index) => {
    expectObjectKeys(item, keys, `${label}[${index}]`);
  });
};

/**
 * Data 为数组（可为空，B 级），非空时逐元素校验
 *
 * @param res 响应对象
 * @param keys 元素必须包含的键
 * @param label 断言标签
 * @param benign 良性失败类型列表
 */
export const expectDataArray = (
  res: ApiResponse,
  keys: string[],
  label: string,
  benign: string[] = [],
): void => {
  if (!expectSuccess(res, label, benign)) return;

  expectArrayItems(res.body.data, keys, label);
};

/**
 * Data 为数组且必须非空（S 级），逐元素校验
 *
 * @param res 响应对象
 * @param keys 元素必须包含的键
 * @param label 断言标签
 * @param benign 良性失败类型列表
 */
export const expectDataArrayNonEmpty = (
  res: ApiResponse,
  keys: string[],
  label: string,
  benign: string[] = [],
): void => {
  if (!expectSuccess(res, label, benign)) return;

  expect(Array.isArray(res.body.data), `${label}: data 应为数组`).toBe(true);
  expect(res.body.data.length, `${label}: 必须非空（测试账号必有数据）`).toBeGreaterThan(0);
  expectArrayItems(res.body.data, keys, label);
};

/**
 * Data 为对象且必须包含指定键（S 级）
 *
 * @param res 响应对象
 * @param keys 必须包含的键
 * @param label 断言标签
 * @param benign 良性失败类型列表
 */
export const expectDataObject = (
  res: ApiResponse,
  keys: string[],
  label: string,
  benign: string[] = [],
): void => {
  if (!expectSuccess(res, label, benign)) return;

  expectObjectKeys(res.body.data, keys, label);
};
