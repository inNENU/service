import { getMemoryUsage } from "@/utils/index.js";

export interface SystemHealthStatus {
  memory: NodeJS.MemoryUsage;
  uptime: number;
  nodeVersion: string;
  platform: string;
  arch: string;
}

export const getSystemHealthStatus = (): SystemHealthStatus => {
  // 检查内存使用情况
  const memory = getMemoryUsage();

  // 获取系统运行时间
  const uptime = Math.round(process.uptime());

  return {
    memory,
    uptime,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  };
};
