/** 服务大厅 /my 测试（本科生账号） */
import { beforeAll, describe, expect, it } from "vitest";

import type { ApiClient } from "../client.js";
import {
  checkSession,
  expectDataObject,
  expectSuccess,
  getAccount,
  loginSystem,
} from "../helpers.js";

const INFO_KEYS = [
  "id",
  "name",
  "idCard",
  "org",
  "orgId",
  "major",
  "majorId",
  "inYear",
  "grade",
  "type",
  "typeId",
  "code",
  "politicalStatus",
  "people",
  "peopleId",
  "gender",
  "genderId",
  "birth",
  "location",
];

const account = getAccount("undergraduate");

describe("服务大厅 /my", () => {
  let client: ApiClient;

  beforeAll(async () => {
    if (!account) throw new Error("缺少本科登录态，请先运行 pnpm test:provision");

    client = await loginSystem("my", account);
    await checkSession(client, "my", "my");
  });

  it("个人信息 POST /my/info", async () => {
    const res = await client.post("/my/info");

    expectDataObject(res, INFO_KEYS, "info");
    expect(res.body.data?.id, "id 应为数字").toBeTypeOf("number");
    expect(res.body.data?.name, "name 应为字符串").toBeTypeOf("string");
  });

  it("身份识别 POST /my/identity", async () => {
    const res = await client.post("/my/identity");

    if (!expectSuccess(res, "identity")) return;

    expect(["bks", "yjs", "lxs", "jzg"]).toContain(res.body.data?.type);
  });

  it("邮箱 POST /my/email", async () => {
    const res = await client.post("/my/email");

    expect(res.status).toBe(200);
    expect(res.body, "应返回 JSON 信封").toHaveProperty("success");
  });
});
