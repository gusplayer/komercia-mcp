import tseslint from "typescript-eslint";

/** @type {import('typescript-eslint').Config} */
export default tseslint.config({
  extends: [
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
  ],
  rules: {
    // Async safety
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/require-await": "error",

    // Type safety
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-return": "error",

    // Code style: prefer top-level `import type { X }` for type-only imports.
    // This avoids the ambiguity with `import { type X }` which leaves a
    // side-effect import in CJS output. (`consistent-type-specifier-style`
    // and `no-import-type-side-effects` are otherwise contradictory.)
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports", fixStyle: "separate-type-imports" },
    ],
    "@typescript-eslint/no-import-type-side-effects": "error",
    "import-x/consistent-type-specifier-style": ["error", "prefer-top-level"],

    // Naming — enforce consistent casing in imports
    "@typescript-eslint/naming-convention": [
      "warn",
      {
        selector: "variable",
        format: ["camelCase", "UPPER_CASE", "PascalCase"],
        leadingUnderscore: "allow",
      },
      { selector: "typeLike", format: ["PascalCase"] },
    ],
  },
});
