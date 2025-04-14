import js from "@eslint/js";
import globals from "globals";
import stylisticJs from "@stylistic/eslint-plugin-js";
import stylisticTs from "@stylistic/eslint-plugin-ts";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    extends: [
        js.configs.recommended,
        ...tseslint.configs.recommended,
    ],
    files: [
      "**/*.ts",
      "**/*.tsx",
    ],
    plugins: {
      "js": js,
      "@stylistic/js": stylisticJs,
      "@stylistic/ts": stylisticTs
    },
    languageOptions: {
      globals: {
          ...globals.browser
      },
      parserOptions: {
        project: "./tsconfig.json"
      }
    },
    rules: {
      "no-plusplus": ["error", { "allowForLoopAfterthoughts": true }],
      "@stylistic/js/comma-dangle": ["error", "always-multiline"],
      "@stylistic/js/comma-spacing": ["error"],
      "@stylistic/js/eol-last": ["error", "always"],
      "@stylistic/js/indent": ["error", 2],
      "@stylistic/js/linebreak-style": ["error", "unix"],
      "@stylistic/js/keyword-spacing": ["error"],
      "@stylistic/js/brace-style": ["error", "1tbs"],
      "@stylistic/js/quotes": ["error", "double"],
      "@stylistic/js/semi": ["error", "always"],
      "@stylistic/js/space-before-blocks": ["error", "always"],
      "@stylistic/js/space-before-function-paren": ["error", "never"],
      "@stylistic/js/space-in-parens": ["error", "never"],
      "@stylistic/js/space-infix-ops": ["error"],
      "@stylistic/js/space-unary-ops": ["error"],
      "@stylistic/ts/space-before-blocks": ["error"],
      "@stylistic/ts/type-annotation-spacing": ["error", {
          before: false,
          after: true,

          overrides: {
              arrow: {
                  before: true,
                  after: true
              }
          }
      }],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/explicit-member-accessibility": ["error", {
          accessibility: "explicit",
          overrides: {
              accessors: "explicit",
              constructors: "explicit",
              methods: "explicit",
              properties: "explicit",
              parameterProperties: "explicit"
          }
      }],
      "@typescript-eslint/prefer-readonly": ["error"],
      "@typescript-eslint/explicit-function-return-type": ["error"],
    }
  }
);
