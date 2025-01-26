import { request } from "./utils/index.js";

const startupDate = new Date().toLocaleDateString("zh");

export const homeHandler = request((_req, res) => {
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

      @media (prefers-color-scheme: dark) {
        .button:hover {
          background-color: rgb(50.7909836066, 178.7090163934, 120.393442623);
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>inNENU 服务</h1>
      <p>当前版本: ${startupDate}</p>
      <p>服务运行状态 ✅</p>
      <a class="button" href="https://innenu.com">访问网页版 inNENU</a>
    </div>
  </body>
</html>
`);
});
