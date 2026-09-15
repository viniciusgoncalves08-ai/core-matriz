import { execFileSync } from "node:child_process";

function run(command, args, env = process.env) {
  execFileSync(command, args, { stdio: "inherit", env });
}

run("npm", ["run", "db:generate"]);
run("npm", ["run", "build"]);

// Preview deployments may share the production database: only production migrates.
if (process.env.VERCEL_ENV === "production") {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for production migrations.");
  run("npm", ["run", "db:deploy"], {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  });
}
