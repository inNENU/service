/** 测试端点 /test（无需登录） */
import { describe, expect, it } from "vitest";

import { ApiClient } from "../client.js";

const client = new ApiClient();

describe("测试端点 /test", () => {
  it("测试端点 POST /test/post", async () => {
    const res = await client.post("/test/post", { a: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });

  it("连通性测试 POST /test/connect", async () => {
    const res = await client.post("/test/connect");

    expect(res.status).toBe(200);
    expect(res.body).toBeTypeOf("string");
    expect((res.body as string).toLowerCase(), "应返回数据库连接成功信息").toContain("connected");
  });

  it("回显测试 GET /test/get", async () => {
    const res = await client.get("/test/get");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body, "应回显 query").toHaveProperty("query");
  });

  it("重定向测试 POST /test/302", async () => {
    const res = await client.post("/test/302");

    expect(res.status).toBe(302);
  });

  it("重定向测试 POST /test/301", async () => {
    const res = await client.post("/test/301");

    expect(res.status).toBe(301);
  });
});
