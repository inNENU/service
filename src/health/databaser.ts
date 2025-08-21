import type { Pool } from "mysql2/promise";

import { mysqlPool } from "@/utils/index.js";

/**
 * 数据库连接池监控器
 */
export class DatabaseMonitor {
  private pool: Pool;
  private intervalId?: NodeJS.Timeout;
  private activeConnections = 0;
  private queuedRequests = 0;
  private totalConnections = 0;

  constructor(pool: Pool) {
    this.pool = pool;
    this.setupPoolEventListeners();
  }

  /**
   * 设置连接池事件监听器
   */
  private setupPoolEventListeners(): void {
    // 监听连接获取事件
    this.pool.on("acquire", () => {
      this.activeConnections++;
      this.totalConnections = Math.max(
        this.totalConnections,
        this.activeConnections,
      );
    });

    // 监听连接入队事件
    this.pool.on("enqueue", () => {
      this.queuedRequests++;
    });

    // this.pool.on("connection", () => {
    //   console.debug("新数据库连接已创建");
    // });

    // 监听连接释放事件
    this.pool.on("release", () => {
      //   console.debug("数据库连接已释放");
      this.activeConnections = Math.max(0, this.activeConnections - 1);
    });
  }

  /**
   * 获取连接池统计信息
   */
  getPoolStats(): {
    activeConnections: number;
    queuedRequests: number;
    totalConnections: number;
    connectionLimit: number;
    queueLimit: number;
  } {
    const { config } = this.pool.pool;

    return {
      activeConnections: this.activeConnections,
      queuedRequests: this.queuedRequests,
      totalConnections: this.totalConnections,
      connectionLimit: config.connectionLimit ?? 10,
      queueLimit: config.queueLimit ?? 0,
    };
  }

  /**
   * 开始监控连接池状态
   */
  startMonitoring(intervalMs = /** 5 min */ 300000): void {
    if (this.intervalId) {
      console.warn("监控已经在运行中");

      return;
    }

    this.intervalId = setInterval(() => {
      this.logPoolStatus();
    }, intervalMs);

    this.logPoolStatus();
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * 记录连接池状态
   */
  private logPoolStatus(): void {
    try {
      const stats = this.getPoolStats();

      console.info("=== 数据库连接池状态 ===");
      console.info(
        `活跃连接数: ${stats.activeConnections}/${stats.connectionLimit}`,
      );
      console.info(
        `排队请求数: ${stats.queuedRequests} (限制: ${stats.queueLimit || "无限制"})`,
      );
      console.info(`历史最大连接数: ${stats.totalConnections}`);

      // 计算连接池使用率
      const usagePercent = (
        (stats.activeConnections / stats.connectionLimit) *
        100
      ).toFixed(1);

      console.info(`连接池使用率: ${usagePercent}%`);

      // 如果使用率过高，发出警告
      if (parseFloat(usagePercent) > 80) {
        console.warn(`⚠️  连接池使用率过高: ${usagePercent}%`);
      }

      // 如果有排队请求，发出警告
      if (stats.queuedRequests > 0) {
        console.warn(`⚠️  有 ${stats.queuedRequests} 个请求在排队等待连接`);
      }

      console.info("========================");
    } catch (error) {
      console.error("获取连接池状态失败:", error);
    }
  }

  /**
   * 重置统计计数器
   */
  resetStats(): void {
    this.totalConnections = this.activeConnections;
    console.info("连接池统计计数器已重置");
  }

  /**
   * 获取连接池健康状态
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    errorMessage?: string;
  }> {
    try {
      // 尝试获取一个连接来测试数据库是否可用
      const connection = await this.pool.getConnection();

      try {
        await connection.ping();
        this.pool.releaseConnection(connection);

        return {
          healthy: true,
        };
      } catch (error) {
        this.pool.releaseConnection(connection);
        throw error;
      }
    } catch (error) {
      return {
        healthy: false,
        errorMessage: (error as Error).message,
      };
    }
  }
}

export const databaseMonitor = new DatabaseMonitor(mysqlPool);

databaseMonitor.startMonitoring();

void databaseMonitor.getHealthStatus().then((status) => {
  console.log("Database Health Status:", status);
});
