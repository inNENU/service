import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import esbuild from "rollup-plugin-esbuild";

const external = [
  "body-parser",
  "compression",
  "cookie-parser",
  "crypto-js",
  "dotenv",
  "express",
  "iconv-lite",
  "morgan",
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
    inlineDynamicImports: true,
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      commonjs(),
      esbuild({
        charset: "utf8",
        minify: true,
        target: "node18",
      }),
    ],
    external,
  },
];
