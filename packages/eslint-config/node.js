import importPlugin from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";

import baseConfig from "./base.js";

/** @type {import('typescript-eslint').Config} */
export default tseslint.config(...baseConfig, {
  plugins: {
    "import-x": importPlugin,
  },
  rules: {
    "import-x/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          ["parent", "sibling"],
          "index",
          "type",
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "import-x/no-duplicates": "error",
    "import-x/no-cycle": "warn",
    "import-x/consistent-type-specifier-style": ["error", "prefer-inline"],
  },
});
