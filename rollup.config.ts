import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import nodeResolve from "@rollup/plugin-node-resolve";
import esbuild from "rollup-plugin-esbuild";

const external = [/^node:/];

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
      commonjs(),
      nodeResolve(),
      json(),
      esbuild({
        charset: "utf8",
        minify: process.env.NODE_ENV !== "debug",
        target: "node20",
      }),
    ],
    external,
  },
];
