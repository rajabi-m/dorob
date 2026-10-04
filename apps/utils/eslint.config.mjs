import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.recommended,
  { files: ["dashboard/*.js"], languageOptions: { globals: Object.fromEntries(["document", "window", "Intl", "URL", "URLSearchParams", "fetch", "Option"].map(key => [key, "readonly"])) } },
  { ignores: ["output/**"] },
];
