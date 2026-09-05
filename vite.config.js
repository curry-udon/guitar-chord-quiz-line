import { defineConfig } from "vite";

// GitHub Pages project site needs a subpath; local uses "/"
export default defineConfig({
  base: process.env.VITE_BASE || "/",
});
