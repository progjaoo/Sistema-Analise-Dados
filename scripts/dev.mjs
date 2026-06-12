import { spawn } from "node:child_process";

const children = [
  spawn("npm", ["run", "dev", "-w", "backend"], { stdio: "inherit" }),
  spawn("npm", ["run", "dev", "-w", "frontend"], { stdio: "inherit" }),
];

const stop = () => children.forEach((child) => child.kill("SIGTERM"));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

const results = await Promise.all(children.map((child) => new Promise((resolve) => child.on("exit", resolve))));
process.exit(results.find((code) => code) || 0);
