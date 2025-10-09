// ecosystem.config.cjs
import { version as VERSION } from './package.json';

module.exports = {
    apps: [
      {
        name: `hiretrack-${VERSION}`,
        script: "node_modules/next/dist/bin/next", // <-- call Node directly
        args: "start -p 3000",                      // <-- port
        cwd: "./",
        exec_mode: "fork",
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: "3.5G",
        env: {
          NODE_ENV: "production",
        },
        env_development: {
          NODE_ENV: "development",
        },
        error_file: "./logs/pm2-error.log",
        out_file: "./logs/pm2-out.log",
        log_date_format: "YYYY-MM-DD HH:mm:ss",
      },
    ],
  };
  