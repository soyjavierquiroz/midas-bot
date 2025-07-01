import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    // Aplica a todos tus .js/.mjs/.cjs
    files: ["**/*.{js,mjs,cjs}"],

    // 1) Parser y globals de Node + Browser
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "script",
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },

    // 2) Solo el plugin de JS y las reglas recomendadas
    plugins: {
      js,
    },
    extends: [
      "js/recommended"    // Reglas base de @eslint/js
    ],

    // 3) Tus reglas personalizadas
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-empty": ["error", { allowEmptyCatch: false }],
    },
  },
]);
