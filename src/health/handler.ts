import { request } from "@/utils/index.js";

import type { CommonSuccessResponse } from "../typings.js";
import { databaseMonitor } from "./databaser.js";
import type { ServiceHealthStatus } from "./services.js";
import { checkAllServicesHealth } from "./services.js";
import type { SystemHealthStatus } from "./system.js";
import { getSystemHealthStatus } from "./system.js";

interface HealthCheckResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  system: SystemHealthStatus;
  database: {
    healthy: boolean;
    errorMessage?: string;
  };
  services: ServiceHealthStatus[];
  summary: {
    totalServices: number;
    healthyServices: number;
    unhealthyServices: number;
  };
}

export const healthCheckHandler = request<
  CommonSuccessResponse<HealthCheckResponse>
>(async (_req, res) => {
  const startTime = Date.now();

  try {
    // 并发执行数据库和服务健康检查
    const [dbHealth, servicesHealth] = await Promise.all([
      databaseMonitor.getHealthStatus(),
      checkAllServicesHealth(),
    ]);

    const status =
      dbHealth.healthy && servicesHealth.every((service) => service.healthy)
        ? "healthy"
        : "unhealthy";

    const healthyServices = servicesHealth.filter(
      (service) => service.healthy,
    ).length;
    const totalServices = servicesHealth.length;
    const unhealthyServices = totalServices - healthyServices;

    const healthData: HealthCheckResponse = {
      status,
      timestamp: new Date().toISOString(),
      database: dbHealth,
      services: servicesHealth,
      system: getSystemHealthStatus(),
      summary: {
        totalServices,
        healthyServices,
        unhealthyServices,
      },
    };

    const responseTime = Date.now() - startTime;

    console.info(
      `健康检查完成，耗时: ${responseTime}ms，状态: ${healthData.status}，` +
        `数据库: ${dbHealth.healthy ? "健康" : "异常"}，` +
        `服务: ${healthyServices}/${totalServices} 健康`,
    );

    return res.json({
      success: true,
      data: healthData,
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error(`健康检查失败，耗时: ${responseTime}ms`, error);

    return res.json({
      success: true,
      data: {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: {
          healthy: false,
          connectionTest: false,
          errorMessage: (error as Error).message,
        },
        services: [],
        system: getSystemHealthStatus(),
        summary: {
          totalServices: 0,
          healthyServices: 0,
          unhealthyServices: 0,
        },
      } as HealthCheckResponse,
    });
  }
});
