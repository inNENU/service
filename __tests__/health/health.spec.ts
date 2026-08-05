/** 健康检查 /health 端点测试（无需登录） */
import { describe, expect, it } from "vitest";

import { ApiClient } from "../client.js";
import { expectSuccess } from "../helpers.js";

const client = new ApiClient();

describe("健康检查 /health", () => {
  it("健康检查 GET /health", async () => {
    const res = await client.get("/health");

    expectSuccess(res, "/health");

    const { status, timestamp, system, database, services, summary } = res.body.data;

    // 整体状态：所有组件健康时才能为 healthy
    expect(status, "整体状态应为 healthy").toBe("healthy");

    // 时间戳应为合法 ISO 时间
    expect(timestamp, "timestamp 应为字符串").toBeTypeOf("string");
    expect(new Date(timestamp).getTime(), "timestamp 应为合法时间").not.toBeNaN();

    // 系统信息
    expect(system, "应包含 system").toBeTypeOf("object");
    expect(system.uptime, "uptime 应为数字").toBeTypeOf("number");
    expect(system.nodeVersion, "nodeVersion 应为字符串").toBeTypeOf("string");
    expect(system.platform, "platform 应为字符串").toBeTypeOf("string");
    expect(system.arch, "arch 应为字符串").toBeTypeOf("string");
    expect(system.memory, "应包含 memory").toBeTypeOf("object");

    // 数据库必须健康
    expect(database.healthy, "数据库必须健康").toBe(true);
    expect(database.errorMessage, "数据库不应有错误信息").toBeUndefined();

    // 服务列表与 summary 应一致
    expect(Array.isArray(services), "services 应为数组").toBe(true);
    expect(services.length, "services 应非空").toBeGreaterThan(0);
    expect(services, "services 数量应与 summary.totalServices 一致").toHaveLength(
      summary.totalServices,
    );
    expect(summary.totalServices, "totalServices 应大于 0").toBeGreaterThan(0);
    expect(summary.healthyServices, "healthyServices 应等于 totalServices").toBe(
      summary.totalServices,
    );
    expect(summary.unhealthyServices, "unhealthyServices 应为 0").toBe(0);

    // 每个服务都必须是健康的
    for (const service of services) {
      expect(service.name, "服务名应为非空字符串").toBeTypeOf("string");
      expect(service.name.length, "服务名不应为空").toBeGreaterThan(0);
      expect(service.url, "服务 url 应为字符串").toBeTypeOf("string");
      expect(service.url, "服务 url 应以 http 开头").toMatch(/^https?:\/\//u);
      expect(service.healthy, `服务「${service.name}」必须健康`).toBe(true);
      expect(service.responseTime, "responseTime 应为数字").toBeTypeOf("number");
      expect(service.error, `健康服务「${service.name}」不应有 error 字段`).toBeUndefined();
    }
  });
});
