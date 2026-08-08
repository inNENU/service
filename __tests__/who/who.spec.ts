/** 学工系统 /who 测试（本科 + 研究生账号；无 /check 端点） */
import { beforeAll, describe, expect, it } from "vitest";

import type { ApiClient } from "../client.js";
import { expectDataObject, getAccount, loginSystem } from "../helpers.js";

const INFO_KEYS = [
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
  "idCard",
  "people",
  "gender",
  "genderId",
  "birth",
  "location",
];

const CASES = [
  { role: "undergraduate", label: "本科生" },
  { role: "graduate", label: "研究生" },
] as const;

describe.each(CASES)("学工系统 /who（$label）", ({ role, label }) => {
  const account = getAccount(role);
  let client: ApiClient;

  beforeAll(async () => {
    if (!account) throw new Error(`缺少${label}登录态，请先运行 pnpm test:provision`);

    client = await loginSystem("who", account);
  });

  it("个人信息 POST /who/info", async () => {
    if (!account) throw new Error(`缺少${label}登录态，请先运行 pnpm test:provision`);

    const res = await client.post("/who/info", { id: account.id });

    expectDataObject(res, INFO_KEYS, "info");
    expect(res.body.data?.id, "返回学号应与请求一致").toBe(account.id);
    expect(res.body.data?.name, "name 应为字符串").toBeTypeOf("string");

    // 可选新字段：存在时校验类型（who 提供时才有）
    const { studyLength, age, expectedGraduationDate } = res.body.data as Record<string, unknown>;

    if (studyLength !== undefined) expect(studyLength, "studyLength 应为数字").toBeTypeOf("number");
    if (age !== undefined) expect(age, "age 应为数字").toBeTypeOf("number");
    if (expectedGraduationDate !== undefined)
      expect(expectedGraduationDate, "expectedGraduationDate 应为字符串").toBeTypeOf("string");
  });
});
