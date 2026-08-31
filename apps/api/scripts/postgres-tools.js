const path = require("path");
const { spawnSync } = require("child_process");

function databaseIdentity(databaseUrl) {
  const url = new URL(databaseUrl);
  return {
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    username: decodeURIComponent(url.username),
  };
}

function runPostgresTool(tool, args, options = {}) {
  const dockerService = process.env.POSTGRES_TOOL_DOCKER_SERVICE?.trim();
  const command = dockerService ? "docker" : (process.env[`${tool.toUpperCase()}_BIN`] || tool);
  const commandArgs = dockerService
    ? ["compose", "--project-directory", path.resolve(__dirname, "../../.."), "exec", "-T", dockerService, tool, ...args]
    : args;
  return spawnSync(command, commandArgs, {
    input: options.input,
    encoding: options.encoding,
    maxBuffer: 1024 * 1024 * 1024,
    stdio: options.input === undefined && options.inherit ? "inherit" : ["pipe", "pipe", "pipe"],
  });
}

function dockerDatabaseArgs(databaseUrl) {
  const { database, username } = databaseIdentity(databaseUrl);
  return ["--username", username, "--dbname", database];
}

module.exports = { dockerDatabaseArgs, runPostgresTool };
