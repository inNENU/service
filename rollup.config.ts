import json from "@rollup/plugin-json";
import esbuild from "rollup-plugin-esbuild";

const external = [
  /^node:/,
  "@alicloud/alinlp20200629",
  "@alicloud/openapi-client",
  "body-parser",
  "cheerio/lib/slim",
  "compression",
  "cookie-parser",
  "crypto-js",
  "dotenv",
  "express",
  "iconv-lite",
  "morgan",
  "nodejs-jieba",
  "qrcode",
  "set-cookie-parser",
];

export default [
  {
    input: "./src/index.ts",
    output: [
      {
        file: "./dist/index.js",
        format: "esm",
        sourcemap: true,
      },
    ],
    plugins: [
      json(),
      esbuild({
        charset: "utf8",
        minify: process.env.NODE_ENV !== "debug",
        target: "node18",
      }),
    ],
    external,
  },
];
