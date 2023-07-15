import esbuild from "rollup-plugin-esbuild";

const external = [
  "body-parser",
  "cheerio",
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
    plugins: [
      esbuild({
        charset: "utf8",
        minify: process.env.NODE_ENV !== "debug",
        target: "node18",
      }),
    ],
    external,
  },
];
