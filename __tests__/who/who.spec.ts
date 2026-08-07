/** 学工系统 /who 测试（本科生账号；无 /check 端点） */
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

const account = getAccount("undergraduate");

describe("学工系统 /who", () => {
  let client: ApiClient;

  beforeAll(async () => {
    if (!account) throw new Error("缺少本科登录态，请先运行 pnpm test:provision");

    client = await loginSystem("who", account);
  });

  it("个人信息 POST /who/info", async () => {
    if (!account) throw new Error("缺少本科登录态，请先运行 pnpm test:provision");

    const res = await client.post("/who/info", { id: account.id });

    expectDataObject(res, INFO_KEYS, "info");
    expect(res.body.data?.id, "返回学号应与请求一致").toBe(account.id);
    expect(res.body.data?.name, "name 应为字符串").toBeTypeOf("string");
  });
});
