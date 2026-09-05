import { defineConfig } from "vite";

// GitHub project Pages: https://<user>.github.io/guitar-chord-quiz-line/
export default defineConfig({
  base: process.env.VITE_BASE || "/guitar-chord-quiz-line/",
});
