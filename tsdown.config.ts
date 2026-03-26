import path from "node:path";

import { defineConfig } from "tsdown";

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
          "@": path.resolve(import.meta.dirname, "src"),
        },
      },
    },
    deps: {
      onlyBundle: false,
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
