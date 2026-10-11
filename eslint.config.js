import globals from "globals";
import react from "eslint-plugin-react";

export default [
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    plugins: {
      react
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      "no-undef": "error",
      "react/jsx-no-undef": "error"
    }
  }
];
