import hopeConfig, {
  config,
  globals,
  tsParser,
} from "eslint-config-mister-hope";

export default config(
  ...hopeConfig,

  {
    ignores: ["coverage/**", "dist/**", "lib/**", "**/node_modules/**"],
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        parser: tsParser,
        tsconfigDirName: import.meta.dirname,
        projectService: {
          allowDefaultProject: ["eslint.config.js"],
        },
      },
    },
  },

  {
    files: ["src/**/*.ts", "commitlint.config.ts"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/naming-convention": [
        "warn",
        {
          selector: ["variable"],
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allowSingleOrDouble",
          trailingUnderscore: "allowSingleOrDouble",
        },
        {
          selector: ["parameter"],
          format: ["camelCase", "PascalCase"],
          leadingUnderscore: "allow",
          trailingUnderscore: "allow",
        },
        {
          selector: "import",
          format: ["PascalCase", "camelCase"],
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
      ],
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
    },
  },
);
