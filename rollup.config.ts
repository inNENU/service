import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import esbuild from "rollup-plugin-esbuild";

const isDev = process.env.NODE_ENV === "development";

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
      ...(isDev ? [] : [commonjs(), nodeResolve()]),
      json(),
      esbuild({
        charset: "utf8",
        minify: !isDev,
        target: "node20",
      }),
    ],
    external: isDev
      ? [
          /^node:/,
          "@alicloud/alinlp20200629",
          "@alicloud/openapi-client",
          "@mptool/net",
          "@mptool/parser",
          "body-parser",
          "cheerio/lib/slim",
          "compression",
          "cookie-parser",
          "cors",
          "crypto-js",
          "crypto-js/aes.js",
          "crypto-js/enc-utf8.js",
          "crypto-js/pad-pkcs7.js",
          "dotenv",
          "express",
          "express-rate-limit",
          "iconv-lite",
          "js-sha1",
          "morgan",
          "mysql2/promise",
          "picocolors",
          "qrcode",
          "uuid",
        ]
      : [/^node:/],
  },
];
