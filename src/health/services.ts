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
 *
 * @param name 服务名称
 * @param url 服务地址
 * @param timeout 请求超时时间（毫秒）
 * @returns 服务健康状态
 */
const checkServiceHealth = async (
  name: string,
  url: string,
  timeout = 5000,
): Promise<ServiceHealthStatus> => {
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

    if (response.ok) {
      return {
        name,
        url,
        healthy: true,
        responseTime,
      };
    }

    return {
      name,
      url,
      healthy: false,
      responseTime,
      error: `HTTP ${response.status}`,
    };
  } catch (err) {
    const responseTime = Date.now() - startTime;

    return {
      name,
      url,
      healthy: false,
      responseTime,
      error: (err as Error).message,
    };
  }
};

/**
 * 统一认证服务健康检查
 *
 * @returns 统一认证服务的健康状态
 */
export const checkAuthServerHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("统一认证服务", AUTH_SERVER);

/**
 * 研究生系统健康检查
 *
 * @returns 研究生系统的健康状态
 */
export const checkGradSystemHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("研究生系统", CALLBACK_URL);

/**
 * 本科教学系统健康检查
 *
 * @returns 本科教学系统的健康状态
 */
export const checkUnderStudyHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("本科教学系统", UNDER_STUDY_SERVER);

/**
 * OA办公系统健康检查
 *
 * @returns OA办公系统的健康状态
 */
export const checkOAHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("OA办公系统", OA_SERVER);

/**
 * 个人门户健康检查
 *
 * @returns 个人门户的健康状态
 */
export const checkMyPortalHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("个人门户", MY_SERVER);

/**
 * 学校官网健康检查
 *
 * @returns 学校官网的健康状态
 */
export const checkOfficialSiteHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("学校官网", OFFICIAL_URL);

/**
 * 图书馆系统健康检查
 *
 * @returns 图书馆系统的健康状态
 */
export const checkLibraryHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("图书馆系统", LIBRARY_SERVER);

/**
 * 本科招生查询系统健康检查
 *
 * @returns 本科招生查询系统的健康状态
 */
export const checkEnrollmentHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("本科招生查询", "https://gkcx.nenu.edu.cn");

/**
 * 研究生招生系统健康检查
 *
 * @returns 研究生招生系统的健康状态
 */
export const checkGradEnrollmentHealth = (): Promise<ServiceHealthStatus> =>
  checkServiceHealth("研究生招生", "https://yz.nenu.edu.cn");

/**
 * 执行所有服务的健康检查
 * 注意：这是一个重型操作，建议配合速率限制使用
 *
 * @returns 各服务的健康状态列表
 */
export const checkAllServicesHealth = async (): Promise<ServiceHealthStatus[]> => {
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
    // FIXME: This server is currently down
    // checkEnrollmentHealth(),
    checkGradEnrollmentHealth(),
  ];

  const results = await Promise.allSettled(healthChecks);
  const healthStatuses = results.map((result, index) => {
    if (result.status === "fulfilled") return result.value;

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
  });

  const totalTime = Date.now() - startTime;
  const healthyCount = healthStatuses.filter(({ healthy }) => healthy).length;

  console.info(
    `全服务健康检查完成，耗时: ${totalTime}ms，` +
      `健康服务: ${healthyCount}/${healthStatuses.length}`,
  );

  return healthStatuses;
};
