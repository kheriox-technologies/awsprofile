import { Command, flags } from "@oclif/command";
import { switchProfile, displayBox } from "../utils";

export default class Switch extends Command {
  static description =
    "Switch profiles. (Renews expired MFA / assumed profiles)";

  static flags = {
    help: flags.help({ char: "h" }),
  };

  static args = [
    { name: "profile", required: true, description: "Profile name to switch" },
  ];

  async run() {
    const { args } = this.parse(Switch);
    await switchProfile(
      this.config.home,
      this.config.configDir,
      this.config.platform,
      args.profile
    ).catch((e) => {
      displayBox(e.message ? e.message : e, "danger");
    });
  }
}
