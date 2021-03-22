import { Hook } from "@oclif/config";
import * as fs from "fs-extra";
import * as path from "path";
import * as cmdExists from "command-exists";
import * as inquirer from "inquirer";
import { spinner } from "../../utils";
import * as _ from "lodash";
import { IAWSRegion, IDefaultConfig } from "../../types";
import { getDefaultConfig, askForDefaults } from "../../utils";
import * as ini from "ini";

const hook: Hook<"init"> = async function (opts) {
  console.log();
  try {
    // Check if AWS CLI exists. Abort if AWS CLI is not found
    await cmdExists("aws");

    // Config file Path
    // Unix: ~/.config/awsprofile/config.json
    // Windows: %LOCALAPPDATA%\awsprofile\config.json
    const configFile = path.join(opts.config.configDir, "config.json");

    // AWS credentials paths
    const awsCredsFile = path.join(opts.config.home, ".aws", "credentials");
    const awsConfigFile = path.join(opts.config.home, ".aws", "config");

    try {
      if (!(await fs.pathExists(configFile))) {
        // Ask for defaults and create the config file on first execution
        spinner.info(
          "Looks like you are executing the CLI for the first time. Lets set some defaults\n"
        );
        const defaultConfig: IDefaultConfig = await askForDefaults();
        fs.outputJSONSync(configFile, defaultConfig);
        console.log();
      }

      // Create AWS creds and config files if doesn't exist
      const defaultConfig: IDefaultConfig = await getDefaultConfig(
        opts.config.configDir
      );
      if (!(await fs.pathExists(awsCredsFile))) {
        fs.writeFileSync(
          awsCredsFile,
          ini.stringify(
            {
              aws_access_key_id: "thisisasampleaccesskey",
              aws_secret_access_key: "thisisasamplesecretaccesskey",
            },
            { section: "default", whitespace: false }
          )
        );
      }
      if (!(await fs.pathExists(awsConfigFile))) {
        fs.writeFileSync(
          awsConfigFile,
          ini.stringify(
            { region: defaultConfig.region, output: "json" },
            { section: "default", whitespace: false }
          )
        );
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
