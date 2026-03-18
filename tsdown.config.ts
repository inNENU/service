import path from "node:path";
import { defineConfig } from "tsdown";

// oxlint-disable-next-line node/no-process-env
const isDev = process.env.NODE_ENV === "development";

export default defineConfig([
  {
    entry: "./src/index.ts",
    dts: false,
    fixedExtension: false,
    minify: !isDev,
    inputOptions: {
      resolve: {
        alias: {
          "@": "/src",
        },
      },
    },
  },
  {
    entry: "./lib/encrypt.js",
    dts: false,
    fixedExtension: false,
    target: "es2017",
    minify: !isDev,
  },
]);
