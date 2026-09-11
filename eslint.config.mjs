import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Throwaway verification scripts sessions drop in the repo and delete
      // afterwards. A repo-wide lint that lists one and then finds it gone
      // crashed with ENOENT (tmp-verify-inv54.ts) and hid every real error.
      "**/tmp-*",
      "**/*.tmp.ts",
    ],
  },
];

export default eslintConfig;
