/** 测试通用配置 */

/** 本地服务地址（可通过环境变量覆盖） */
export const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:8080";

/** 单个请求超时时间（毫秒） */
export const REQUEST_TIMEOUT = 20_000;

/** 认证流程中使用的占位 appId / openid。 仅用于写入 `token` 表（upsert，无副作用），不影响真实登录。 */
export const TEST_APP_ID = "wx0009f7cdfeefa3da";
export const TEST_OPENID = "automated-test";

/** 当前学期（本科新系统，需 >= 2023） */
export const CURRENT_SEMESTER = "2025-2026-2";

/** 备用学期（秋季），成绩主查学期为空时 fallback */
export const FALLBACK_SEMESTER = "2025-2026-1";

/** 旧系统可用学期（本科旧系统，需 < 2024） */
export const LEGACY_SEMESTER = "2023-2024-2";
