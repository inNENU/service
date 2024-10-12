import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { dts } from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";

export default [
  {
    input: "./lib/encrypt.js",
    output: [
      {
        file: "./dist/encrypt.js",
        format: "esm",
        sourcemap: true,
      },
    ],
    plugins: [
      nodeResolve({ preferBuiltins: false }),
      commonjs(),
      esbuild({
        charset: "utf8",
        minify: true,
        target: "es2017",
      }),
    ],
  },
  {
    input: "./src/module/encrypt.ts",
    output: [
      {
        file: "./dist/encrypt.d.ts",
        format: "esm",
        sourcemap: true,
      },
    ],
    plugins: [
      dts({
        compilerOptions: {
          preserveSymlinks: false,
        },
        respectExternal: false,
      }),
    ],
  },
];
