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
    // Too many legitimate non-null assertions in HTML parsing code
    "typescript/no-non-null-assertion": "off",
    // Too many false positives with regex match results and complex patterns
    "prefer-destructuring": "off",
    // Architectural circular imports are intentional
    "import/no-cycle": "off",
    // Express Router() is a factory function, not a constructor
    "new-cap": "off",
    // JSDoc return annotations not always needed for void/Promise<void>
    "jsdoc/require-returns": "off",
    // Variable shadowing in complex parsing functions is intentional
    "no-shadow": "off",
    // Legitimate process.env usage throughout the service
    "node/no-process-env": "off",
    // Complex parsing functions necessarily exceed line limits
    "max-lines-per-function": "off",
    // Express error handler callbacks cannot always be replaced with async/await
    "promise/prefer-await-to-callbacks": "off",
    // Regex match destructuring with consecutive ignored values is necessary
    "unicorn/no-unreadable-array-destructuring": "off",
    // Complex parsing functions necessarily have many statements
    "max-statements": "off",
    // Deeply nested HTML/form parsing requires depth
    "max-depth": "off",
    // Complex parsing functions necessarily have high cyclomatic complexity
    complexity: "off",
    // deprecated API usage is sometimes required for compatibility
    "typescript/no-deprecated": "off",
    // Node.js service code legitimately uses global
    "unicorn/prefer-global-this": "off",
    // Explicit flat depth values improve readability
    "unicorn/no-magic-array-flat-depth": "off",
    // JSDoc param annotations not always required
    "jsdoc/require-param": "off",
    // Explicit undefined usage is valid
    "no-undefined": "off",
    // Increment operator is common and readable in loops
    "no-plusplus": "off",
    // Spreading in map is a legitimate and readable pattern
    "no-map-spread": "off",
    // Short identifiers are acceptable in certain contexts (e.g. generic type params)
    "id-length": "off",
    // Top-level await is not always appropriate for fire-and-forget patterns
    "unicorn/prefer-top-level-await": "off",
    // Entry files legitimately have many dependencies
    "import/max-dependencies": "off",
    // Parameter reassignment is used for optional param initialization
    "no-param-reassign": "off",
    // for-in over own-property-only objects does not need a guard
    "guard-for-in": "off",
    // Mixed function declaration styles are acceptable
    "func-style": "off",
    // TypeScript parameter properties are a valid language feature
    "typescript/parameter-properties": "off",
    // Side-effect imports for environment loading are intentional
    "import/no-unassigned-import": "off",
    // prefer-spread conflicts with no-misused-spread for string-to-array conversions
    "unicorn/prefer-spread": "off",
  },
});
