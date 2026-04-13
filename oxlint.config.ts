import { defineHopeConfig } from "oxc-config-hope/oxlint";

export default defineHopeConfig({
  ignore: ["lib/"],
  node: true,
  rules: {
    complexity: "off",
    "max-depth": "off",
    "max-lines-per-function": "off",
    "max-statements": "off",
    "new-cap": ["warn", { capIsNewExceptions: ["Router"] }],
    "no-console": "off",
    "no-warning-comments": "off",
    "prefer-object-spread": "off",

    "import/max-dependencies": "off",
    "import/no-cycle": "off",

    "promise/prefer-await-to-callbacks": "off",

    "node/no-process-env": "off",

    "typescript/no-deprecated": "off",
    "typescript/no-non-null-assertion": "off",
    "typescript/strict-boolean-expressions": "off",

    "unicorn/prefer-global-this": "off",
  },
});
