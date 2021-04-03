import { Command, flags } from "@oclif/command";
import { listProfiles, displayBox } from "../utils";

export default class List extends Command {
  static description = "List AWS profiles";

  static flags = {
    help: flags.help({ char: "h" }),
    wide: flags.boolean({
      char: "w",
      description: "Wider display (All details except keys)",
    }),
    keys: flags.boolean({ char: "k", description: "Display keys" }),
  };

  async run() {
    const { flags } = this.parse(List);
    await listProfiles(this.config.home, flags).catch((e) => {
      displayBox(e.message ? e.message : e, "danger");
    });
  }
}
