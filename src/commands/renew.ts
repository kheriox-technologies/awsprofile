import { Command, flags } from "@oclif/command";
import * as inquirer from "inquirer";
import * as _ from "lodash";
import { IAWSProfile } from "../types";
import {
  getProfiles,
  spinner,
  displayBox,
  renewProfile,
  getConfig,
} from "../utils";

export default class Renew extends Command {
  static description =
    "Renew MFA / Assumed profile (Interactive mode if no flags are provided)";

  static flags = {
    help: flags.help({ char: "h" }),
  };

  static args = [
    { name: "profile", description: "Profile name to renew" },
    { name: "mfaCode", description: "MFA code" },
  ];

  async run() {
    const { args } = this.parse(Renew);
    const { profile, mfaCode } = args;
    const profiles = await getProfiles(this.config.home);
    const config = await getConfig(this.config.configDir);

    let renewableProfiles = _.filter(
      profiles,
      (p) => _.has(p, "mfa_serial") || _.has(p, "source_profile")
    ).map((p) => p.name);

    renewableProfiles = [
      ...renewableProfiles,
      ...config.assumedProfiles?.map((p) => p.name)!,
    ];

    if (profile && !renewableProfiles.includes(profile)) {
      displayBox(
        "The profile you are trying to renew is not found or cannot be renewed. Please try again",
        "danger"
      );
      displayBox(
        `Below is the list of profiles that can be renewd
${renewableProfiles}`,
        "info"
      );
      process.exit(1);
    }

    // console.log(profiles);
    // console.log(renewableProfiles);

    inquirer
      .prompt(
        [
          {
            name: "profile",
            type: "list",
            choices: renewableProfiles,
            message: "Please select the profile you want to renew",
            when: (answers) => {
              return !answers.profile;
            },
          },
          {
            name: "mfaCode",
            message: "Please enter the MFA code from your authenticator app",
            when: (answers) => {
              return !answers.mfaCode;
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
        args
      )
      .then(async (answers) => {
        const profile: IAWSProfile | undefined = _.find(
          profiles,
          (p) => p.name === answers.profile
        );
        await renewProfile(
          this.config.home,
          this.config.configDir,
          this.config.platform,
          profile || {},
          answers.mfaCode
        ).catch((e) => {
          displayBox(e.message ? e.message : e, "danger");
        });
      });
  }
}
