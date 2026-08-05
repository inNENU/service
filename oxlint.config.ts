import { defineHopeConfig } from "oxc-config-hope/oxlint";

export default defineHopeConfig(
  {
    ignore: ["lib/"],
    node: true,
    vitest: true,
    rules: {
      complexity: "off",
      "max-depth": "off",
      "max-lines-per-function": "off",
      "max-statements": "off",
      "new-cap": ["warn", { capIsNewExceptions: ["Router"] }],
      "no-console": "off",
      "no-warning-comments": "off",
      "prefer-named-capture-group": "off",
      "prefer-object-spread": "off",

      "import/max-dependencies": "off",
      "import/no-cycle": "off",

      "promise/prefer-await-to-callbacks": "off",

      "node/no-process-env": "off",
      "node/no-top-level-await": "off",

      "typescript/no-deprecated": "off",
      "typescript/no-non-null-assertion": "off",
      "typescript/strict-boolean-expressions": "off",

      "unicorn/prefer-global-this": "off",
    },
  },
  {
    files: ["**/__tests__/**"],
    plugins: ["vitest"],
    rules: {
      "max-classes-per-file": "off",
      "no-await-in-loop": "off",
      "no-empty-function": "off",
      "no-undefined": "off",

      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",

      "typescript/no-explicit-any": "off",
      "typescript/no-floating-promises": "off",
      "typescript/no-unsafe-assignment": "off",
      "typescript/no-unsafe-member-access": "off",
      "typescript/no-unsafe-call": "off",
      "typescript/no-unsafe-argument": "off",
      "typescript/strict-void-return": "off",
      "typescript/no-confusing-void-expression": "off",
      "typescript/use-unknown-in-catch-callback-variable": "off",
      "typescript/require-await": "off",

      "vitest/expect-expect": "off",
      "vitest/max-expects": "off",
      "vitest/no-conditional-expect": "off",
      "vitest/no-conditional-in-test": "off",
      "vitest/no-hooks": "off",
      "vitest/no-importing-vitest-globals": "off",
      "vitest/prefer-to-be-truthy": "off",
    },
  },
);
