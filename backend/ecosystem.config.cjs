module.exports = {
  apps: [{
    name: "maravilha-ibope-api",
    script: "dist/src/server.js",
    cwd: __dirname,
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    max_memory_restart: "500M",
    env: { NODE_ENV: "production" },
    error_file: "logs/api-error.log",
    out_file: "logs/api-out.log",
    merge_logs: true,
    time: true,
  }],
};
