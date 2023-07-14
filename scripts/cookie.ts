import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";

export default [
  {
    input: "./src/module/cookie.ts",
    output: [
      {
        file: "./dist/cookie.js",
        format: "cjs",
        sourcemap: true,
      },
    ],
    plugins: [
      nodeResolve({ preferBuiltins: false }),
      commonjs(),
      esbuild({
        charset: "utf8",
        minify: true,
        target: "es2015",
      }),
    ],
  },
  {
    input: "./src/module/cookie.ts",
    output: [
      {
        file: "./dist/cookie.d.ts",
        format: "esm",
        sourcemap: true,
      },
    ],
    plugins: [
      dts({
        compilerOptions: {
          preserveSymlinks: false,
        },
        respectExternal: true,
      }),
    ],
  },
];
