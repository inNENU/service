/**
 * 各个服务的健康检查函数
 */

// 导入各模块的服务器地址
import { AUTH_SERVER } from "../auth/utils.js";
import { CALLBACK_URL } from "../grad-system/utils.js";
import { LIBRARY_SERVER } from "../library/utils.js";
import { MY_SERVER } from "../my/utils.js";
import { OA_SERVER } from "../oa/utils.js";
import { OFFICIAL_URL } from "../official/utils.js";
import { UNDER_STUDY_SERVER } from "../under-study/utils.js";

export interface ServiceHealthStatus {
  name: string;
  url: string;
  healthy: boolean;
  responseTime?: number;
  error?: string;
}

/**
 * 检查单个服务的健康状态
 */
async function checkServiceHealth(
  name: string,
  url: string,
  timeout = 5000,
): Promise<ServiceHealthStatus> {
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(timeout),
      headers: {
        "User-Agent": "inNENU-Health-Check/1.0",
      },
    });

    const responseTime = Date.now() - startTime;

    return {
      name,
      url,
      healthy: response.ok,
      responseTime,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      name,
      url,
      healthy: false,
      responseTime,
      error: (error as Error).message,
    };
  }
}

/**
 * 统一认证服务健康检查
 */
export const checkAuthServerHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("统一认证服务", AUTH_SERVER);

/**
 * 研究生系统健康检查
 */
export const checkGradSystemHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("研究生系统", CALLBACK_URL);

/**
 * 本科教学系统健康检查
 */
export const checkUnderStudyHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("本科教学系统", UNDER_STUDY_SERVER);

/**
 * OA办公系统健康检查
 */
export const checkOAHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("OA办公系统", OA_SERVER);

/**
 * 个人门户健康检查
 */
export const checkMyPortalHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("个人门户", MY_SERVER);

/**
 * 学校官网健康检查
 */
export const checkOfficialSiteHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("学校官网", OFFICIAL_URL);

/**
 * 图书馆系统健康检查
 */
export const checkLibraryHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("图书馆系统", LIBRARY_SERVER);

/**
 * 本科招生查询系统健康检查
 */
export const checkEnrollmentHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("本科招生查询", "https://gkcx.nenu.edu.cn");

/**
 * 研究生招生系统健康检查
 */
export const checkGradEnrollmentHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("研究生招生", "https://yz.nenu.edu.cn");

/**
 * 执行所有服务的健康检查
 * 注意：这是一个重型操作，建议配合速率限制使用
 */
export const checkAllServicesHealth = async (): Promise<
  ServiceHealthStatus[]
> => {
  console.info("开始执行全服务健康检查...");
  const startTime = Date.now();

  const healthChecks = [
    checkAuthServerHealth(),
    checkGradSystemHealth(),
    checkUnderStudyHealth(),
    checkOAHealth(),
    checkMyPortalHealth(),
    checkOfficialSiteHealth(),
    checkLibraryHealth(),
    checkEnrollmentHealth(),
    checkGradEnrollmentHealth(),
  ];

  const results = await Promise.allSettled(healthChecks);
  const healthStatuses = results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      // 如果健康检查本身出错，返回一个错误状态
      const serviceNames = [
        "统一认证服务",
        "研究生系统",
        "本科教学系统",
        "OA办公系统",
        "个人门户",
        "学校官网",
        "图书馆系统",
        "本科招生查询",
        "研究生招生",
      ];

      return {
        name: serviceNames[index] || "未知服务",
        url: "unknown",
        healthy: false,
        error: (result.reason as Error)?.message ?? "健康检查失败",
      };
    }
  });

  const totalTime = Date.now() - startTime;
  const healthyCount = healthStatuses.filter((s) => s.healthy).length;

  console.info(
    `全服务健康检查完成，耗时: ${totalTime}ms，` +
      `健康服务: ${healthyCount}/${healthStatuses.length}`,
  );

  return healthStatuses;
};
