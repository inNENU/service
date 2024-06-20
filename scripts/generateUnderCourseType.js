// @ts-nocheck
import { readFileSync } from "node:fs";

const files = [
  "benbu-raw-common.json",
  "benbu-raw-pro.json",
  "jingyue-raw-common.json",
  "jingyue-raw-pro.json",
];
const contents = files.map((file) => readFileSync(file, "utf-8"));

const classList = contents.flatMap((content) => JSON.parse(content).rows);

console.log(
  Array.from(
    new Set(
      classList.map((item) =>
        JSON.stringify({ name: item.kcflmc, value: item.kcfldm }),
      ),
    ),
  )
    .map((item) => JSON.parse(item))
    .sort((a, b) => a.value - b.value),
);
