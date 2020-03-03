import program from "commander";
import { readFileSync } from "fs";
import { join } from "path";

const { version } = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf-8"));

program
  .version(version)
  .command("import [open-api-file]", "generate typescript types from OpenAPI specs")
  .parse(process.argv);
