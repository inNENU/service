import { rateLimit } from "express-rate-limit";

import { isDevelopment } from "../config/index.js";

// 创建速率限制中间件 - 每个IP每分钟最多5次请求
export const healthCheckRateLimit = rateLimit({
  windowMs: 60000, // 1 分钟
  max: 3,
  skip: () => isDevelopment,
  legacyHeaders: false,
  standardHeaders: true,
  message: {
    success: false,
    type: "Too Many Requests",
    msg: "健康检查请求过于频繁，请稍后再试",
  },
});
