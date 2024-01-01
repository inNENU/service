import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
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
          "body-parser",
          "cheerio/lib/slim",
          "compression",
          "cookie-parser",
          "crypto-js",
          "dotenv",
          "express",
          "iconv-lite",
          "morgan",
          "qrcode",
          "set-cookie-parser",
        ]
      : [/^node:/],
  },
];
