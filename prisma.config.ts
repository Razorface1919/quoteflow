import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx --env-file=.env src/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
