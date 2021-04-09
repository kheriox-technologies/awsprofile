import { Command, flags } from "@oclif/command";
import * as inquirer from "inquirer";
import * as _ from "lodash";
import {
  getConfig,
  getProfiles,
  spinner,
  checkExistingProfile,
  getAWSRegions,
  displayBox,
} from "../utils";
import { IAWSRegion, IConfig } from "../types";

export default class Create extends Command {
  static description = `Create new AWS profile (Interactive mode if no flags are provided)`;

  static flags = {
    help: flags.help({ char: "h" }),
    name: flags.string({
      char: "n",
      description: "Profile name",
    }),
    type: flags.string({
      char: "t",
      description: "Profile type",
      options: ["normal", "assumed"],
    }),
    accessKey: flags.string({
      char: "a",
      description: "AWS Access Key",
    }),
    secretAccessKey: flags.string({
      char: "s",
      description: "AWS Secret Access Key",
    }),
    sourceProfile: flags.string({
      char: "p",
      description: "Source profile for assumed profile types",
    }),
    roleArn: flags.string({
      char: "r",
      description: "IAM role ARN for assumed profile types",
    }),
    region: flags.string({
      description: "AWS region",
    }),
    mfa: flags.boolean({
      description: "Is MFA profile ?",
    }),
    mfaSerial: flags.string({
      char: "m",
      description: "MFA serial (ARN)",
    }),
    mfaCode: flags.string({
      char: "c",
      description: "MFA code from the authenticator app",
    }),
  };

  async run() {
    const { flags } = this.parse(Create);
    const defaultConfig: IConfig = await getConfig(this.config.configDir);
    const profiles = await getProfiles(this.config.home);
    const profileNames = profiles.map((p) => p.name);
    const awsRegions = await getAWSRegions();

    // Set flags (if any) as asnswers and ask for missing values
    inquirer
      .prompt(
        [
          {
            name: "name",
            message: "What do you want to call the new AWS profile ?",
          },
          {
            name: "type",
            type: "list",
            choices: [
              { name: "NORMAL (Uses Access Keys)", value: "normal" },
              {
                name: "ASSUMED (Uses source profile and a role to assume)",
                value: "assumed",
              },
            ],
            message: "What type of profile you want to create ?",
          },
          {
            name: "region",
            type: "list",
            message: "Please select AWS region for this profile",
            choices: awsRegions.map((r) => {
              return { name: `${r.code} : ${r.fullName}`, value: r.code };
            }),
            default:
              defaultConfig.region && defaultConfig.region !== ""
                ? defaultConfig.region
                : "us-east-1",
          },
          {
            name: "output",
            type: "list",
            message: "Please select your default output format",
            choices: ["json", "table", "text"],
            default:
              defaultConfig.output && defaultConfig.output !== ""
                ? defaultConfig.output
                : "json",
          },
          {
            name: "accessKey",
            message: "Please enter your AWS access key",
            when: (answers) => {
              return answers.type === "normal";
            },
            validate: (accessKey) => {
              if (accessKey === "") {
                return "Looks like you haven't provided your AWS access key. Its mandatory for NORMAL profile types. Please try again";
              } else if (accessKey.length < 16) {
                return "Your Access Key doesn't seem to be right. It must be minimum 16 chars long.";
              } else return true;
            },
          },
          {
            name: "secretAccessKey",
            message: "Please enter your AWS secret access key",
            type: "password",
            mask: "*",
            when: (answers) => {
              return answers.type === "normal";
            },
            validate: (secretAccessKey) => {
              if (secretAccessKey === "") {
                return "Looks like you haven't provided your AWS secret access key. Its mandatory for NORMAL profile types. Please try again";
              } else return true;
            },
          },
          {
            name: "sourceProfile",
            type: "list",
            pageSize: 15,
            choices: () => {
              if (profileNames.length === 0) {
                spinner.fail(
                  "No source profiles found. Please create one by selecting 'NORMAL' as profile type"
                );
                process.exit(1);
              } else {
                return profileNames;
              }
            },
            message: "Choose your source profile",
            when: (answers) => {
              return answers.type === "assumed";
            },
          },
          {
            name: "roleArn",
            message:
              "What is the IAM role ARN you are assuming ? (Ex: arn:aws:iam::123456789012:role/rolename)",
            when: (answers) => {
              return answers.type === "assumed";
            },
            validate: (roleArn) => {
              if (roleArn === "") {
                return "Looks like you haven't provided IAM role ARN to assume. Please try again";
              } else return true;
            },
          },
          {
            name: "mfa",
            type: "confirm",
            message: "Do you want to use MFA for this profile ?",
            default: false,
            when: (answers) => {
              return answers.type === "normal";
            },
          },
          {
            name: "mfaSerial",
            message:
              "What is MFA serial ARN (Ex: arn:aws:iam::123456789012:mfa/username) ?",
            default:
              defaultConfig.mfaSerial && defaultConfig.mfaSerial !== ""
                ? defaultConfig.mfaSerial
                : "",
            when: (answers) => {
              return answers.mfa;
            },
            validate: (mfaSerial) => {
              if (mfaSerial === "") {
                return "Looks like you haven't provided your MFA serial. Please try again";
              } else return true;
            },
          },
          {
            name: "mfaCode",
            message: "Please enter the MFA code from your authenticator app",
            when: (answers) => {
              return answers.mfa;
            },
            validate: (mfaCode) => {
              if (mfaCode === "") {
                return "Looks like you haven't provided your MFA code. Please try again";
              } else if (mfaCode.length < 6 || isNaN(mfaCode)) {
                return "Your MFA code doesn't seem to be right. It must be a number & minimum 6 digits long.";
              } else return true;
            },
          },
        ],
        flags
      )
      .then(async (answers) => {
        await checkExistingProfile(
          this.config.home,
          this.config.configDir,
          this.config.platform,
          answers
        ).catch((e) => {
          displayBox(e.message ? e.message : e, "danger");
        });
      });
  }
}
