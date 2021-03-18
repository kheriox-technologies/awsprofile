const ora = require("ora");

export const spinner = ora({
  spinner: "simpleDotsScrolling",
});

// Exports
module.exports.spinner = spinner;
