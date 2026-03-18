import { defineConfig } from "oxlint";
import { defaultIgnorePatterns, getOxlintConfigs } from "oxc-config-hope/oxlint";

export default defineConfig({
  extends: getOxlintConfigs({
    node: true,
  }),
  options: {
    typeAware: true,
    typeCheck: true,
  },
  ignorePatterns: [...defaultIgnorePatterns, "lib/"],
  rules: {
    "no-console": "off",
    "no-warning-comments": "off",
    "typescript/strict-boolean-expressions": "off",
  },
  overrides: [
    {
      files: ["src/utils/mysql.ts"],
      rules: {
        "node/no-process-env": "off",
      },
    },
  ],
});
