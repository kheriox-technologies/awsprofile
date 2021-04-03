import { Command, flags } from "@oclif/command";
import { deleteProfile, displayBox } from "../utils";

export default class Delete extends Command {
  static description = "Delete profile";

  static flags = {
    help: flags.help({ char: "h" }),
    force: flags.boolean({ char: "f" }),
  };

  static args = [
    { name: "profile", required: true, description: "Profile name to delete" },
  ];

  async run() {
    const { args, flags } = this.parse(Delete);

    await deleteProfile(this.config.home, args.profile, flags.force).catch(
      (e) => {
        displayBox(e.message ? e.message : e, "danger");
      }
    );
  }
}
