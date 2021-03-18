import { Hook } from "@oclif/config";
import * as fs from "fs-extra";
import * as path from "path";
import * as cmdExists from "command-exists";
import { spinner } from "../../utils";

const hook: Hook<"init"> = async function (opts) {
  console.log();
  try {
    await cmdExists("aws");
    const configFile = path.join(opts.config.configDir, "config.json");
    const defaultConfig = {};
    try {
      if (!(await fs.pathExists(configFile))) {
        await fs.outputJson(configFile, defaultConfig);
      }
    } catch (error) {
      console.error(error || "An error occurred in the CLI");
    }
  } catch (error) {
    spinner.fail(
      "AWS CLI not found on your system. Please install AWS CLI and try again"
    );
    this.exit(1);
  }
};

export default hook;
