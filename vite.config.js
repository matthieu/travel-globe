/* eslint-env node */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const githubRepo = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineConfig({
  base: githubRepo ? `/${githubRepo}/` : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});
