import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.recommended,
  { ignores: ["**/dist/**", "packages/db/migrations/**"] },
];
