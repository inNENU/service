import { checkAllServicesHealth, databaseMonitor } from "./health/index.js";
import { request } from "./utils/index.js";

const startupDate = new Date().toLocaleDateString("zh");

export const homeHandler = request(async (_req, res) => {
  // 获取系统健康状态
  let healthStatus = "⚠️ 获取中...";
  let healthDetails = "";

  try {
    // 创建健康检查器实例

    const [dbHealth, servicesHealth] = await Promise.all([
      databaseMonitor.getHealthStatus(),
      checkAllServicesHealth(),
    ]);

    const healthyServices = servicesHealth.filter(
      (service) => service.healthy,
    ).length;
    const totalServices = servicesHealth.length;

    // 严格判断：数据库健康且所有服务都健康
    const overallHealthy =
      dbHealth.healthy && healthyServices === totalServices;

    healthStatus = overallHealthy ? "✅ 健康" : "❌ 异常";

    // 构建健康详情
    healthDetails = `
        <div class="health-details">
          <h3>系统状态详情</h3>
          <div class="status-item">
            <span class="status-label">数据库:</span>
            <span class="status-value ${dbHealth.healthy ? "healthy" : "unhealthy"}">
              ${dbHealth.healthy ? "✅ 正常" : "❌ 异常"}
            </span>
          </div>
          <div class="status-item">
            <span class="status-label">外部服务:</span>
            <span class="status-value ${healthyServices === totalServices ? "healthy" : "warning"}">
              ${healthyServices}/${totalServices} 可用
            </span>
          </div>
          <div class="services-grid">
            ${servicesHealth
              .map(
                (service) => `
              <div class="service-item ${service.healthy ? "healthy" : "unhealthy"}">
                <span class="service-name">${service.name}</span>
                <span class="service-status">
                  ${service.healthy ? "✅" : "❌"}
                  ${service.responseTime ? `(${service.responseTime}ms)` : ""}
                </span>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `;
  } catch (error) {
    healthStatus = "❌ 检查失败";
    healthDetails = `<div class="error">健康检查失败: ${(error as Error).message}</div>`;
  }

  res.header("Content-Type", "text/html");
  res.send(`\
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>inNENU 服务</title>
    <style>
      html {
        color-scheme: light dark;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        text-align: center;
      }

      .container {
        max-width: 1200px;
        padding: 20px;
        margin: 0 auto;
      }

      .button {
        display: block;
        max-width: 240px;
        margin: 8px auto;
        padding: 8px 16px;
        border-radius: 18px;
        background-color: rgb(53.612704918, 188.637295082, 127.0819672131);
        color: inherit;
        line-height: 2;
        text-decoration: none;
      }

      .button:hover {
        background-color: rgb(56.4344262295, 198.5655737705, 133.7704918033);
      }

      .health-details {
        margin: 20px 0;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 8px;
        text-align: left;
        background-color: rgba(255, 255, 255, 0.1);
      }

      .status-item {
        display: flex;
        justify-content: space-between;
        margin: 10px 0;
        padding: 8px;
        border-radius: 4px;
        background-color: rgba(0, 0, 0, 0.05);
      }

      .status-label {
        font-weight: bold;
      }

      .status-value.healthy {
        color: #4CAF50;
      }

      .status-value.unhealthy {
        color: #f44336;
      }

      .status-value.warning {
        color: #ff9800;
      }

      .services-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 10px;
        margin-top: 15px;
      }

      .service-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        border-radius: 4px;
        border: 1px solid #eee;
        background-color: rgba(255, 255, 255, 0.5);
      }

      .service-item.healthy {
        border-color: #4CAF50;
        background-color: rgba(76, 175, 80, 0.1);
      }

      .service-item.unhealthy {
        border-color: #f44336;
        background-color: rgba(244, 67, 54, 0.1);
      }

      .service-name {
        font-weight: bold;
        font-size: 14px;
      }

      .service-status {
        font-size: 12px;
        color: #666;
      }

      .error {
        color: #f44336;
        padding: 10px;
        border: 1px solid #f44336;
        border-radius: 4px;
        background-color: rgba(244, 67, 54, 0.1);
      }

      @media (prefers-color-scheme: dark) {
        .button:hover {
          background-color: rgb(50.7909836066, 178.7090163934, 120.393442623);
        }
        
        .health-details {
          border-color: #555;
          background-color: rgba(0, 0, 0, 0.3);
        }
        
        .status-item {
          background-color: rgba(255, 255, 255, 0.05);
        }
        
        .service-item {
          border-color: #555;
          background-color: rgba(0, 0, 0, 0.3);
        }
        
        .service-status {
          color: #ccc;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>inNENU 服务</h1>
      <p>当前版本: ${startupDate}</p>
      <p>服务运行状态: ${healthStatus}</p>
      ${healthDetails}
      <a class="button" href="https://innenu.com">访问网页版 inNENU</a>
      <a class="button" href="/health">查看详细健康状态</a>
    </div>
  </body>
</html>
`);
});
