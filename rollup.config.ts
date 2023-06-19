import esbuild from "rollup-plugin-esbuild";

const external = [
  "body-parser",
  "compression",
  "cookie-parser",
  "express"
];

export default [
  {
    input: "./src/index.ts",
    output: [
      {
        file: "./dist/index.js",
        format: "cjs",
        sourcemap: true,
      },
    ],
    plugins: [
      esbuild({
        charset: "utf8",
        minify: true,
        target: "node16",
      }),
    ],
    external,
  },
];
