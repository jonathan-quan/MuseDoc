import { defineConfig } from "vitest/config";

// Unit tests cover the app's pure logic (the diff engine, Markdown export,
// text-block parsing, and formatters), which live in dependency-free modules
// under app/lib. The default "node" environment is enough — no DOM needed.
export default defineConfig({
  test: {
    environment: "node",
    include: ["app/**/*.test.ts"],
  },
});
