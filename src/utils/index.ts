import * as ora from "ora";
import * as fs from "fs-extra";
import * as path from "path";
import * as ini from "ini";
import * as _ from "lodash";
import {
  IDefaultConfig,
  IProfileData,
  IAWSProfile,
  IAWSRegion,
  ISTSCredential,
  IMFABaseKeys,
} from "../types";
import inquirer = require("inquirer");
import { exec } from "child_process";
import * as AWS from "aws-sdk";
import * as clipboard from "clipboardy";
import * as chalk from "chalk";
import * as boxen from "boxen";
import * as moment from "moment";
import * as Table from "cli-table3";

import { awsRegions } from "./awsRegions";
const successBox: boxen.Options = {
  borderColor: "green",
  borderStyle: "round",
  padding: 1,
  margin: 1,
};
const dangerBox: boxen.Options = {
  borderColor: "red",
  borderStyle: "round",
  padding: 1,
  margin: 1,
};
const warningBox: boxen.Options = {
  borderColor: "yellow",
  borderStyle: "round",
  padding: 1,
  margin: 1,
};

export const spinner = ora({
  spinner: "simpleDotsScrolling",
});

export const displayBox = (message: string, level: string = "success") => {
  console.log(
    boxen(
      level === "danger"
        ? chalk.red(message)
        : level === "warning"
        ? chalk.yellow(message)
        : chalk.green(message),
      level === "danger"
        ? dangerBox
        : level === "warning"
        ? warningBox
        : successBox
    )
  );
};

// Get AWS Version
export const getAWSVersion = async () => {
  return new Promise<string>(async (resolve, reject) => {
    exec("aws --version", (err, stdout, stderr) => {
      if (err) reject("AWS CLI not found");
      if (stderr) reject("AWS CLI not found");
      resolve(stdout.split(" ")[0].split("/")[1]);
    });
  });
};

// Get AWS Version
export const getAWSRegions = async () => {
  return new Promise<IAWSRegion[]>(async (resolve, reject) => {
    // Get AWS Regions from Data
    try {
      // const awsRegions: IAWSRegion[] = await fs.readJSONSync(
      //   path.resolve(__dirname, "../data/awsRegions.json")
      // );
      resolve(_.orderBy(awsRegions, ["code"], ["asc"]));
    } catch (error) {
      displayBox(
        error.message ? error.message : "Unable to fetch AWS regions",
        "danger"
      );
    }
  });
};

// Ask for defaults
export const askForDefaults = () => {
  return new Promise<IDefaultConfig>(async (resolve, reject) => {
    try {
      // Get AWS Regions from Data
      const awsRegions: IAWSRegion[] = await getAWSRegions();

      // Ask questions
      inquirer
        .prompt([
          {
            name: "region",
            type: "list",
            message: "Please select your default AWS region",
            choices: awsRegions.map((r) => {
              return { name: `${r.code} : ${r.fullName}`, value: r.code };
            }),
          },
          {
            name: "output",
            type: "list",
            message: "Please select your default output format",
            choices: ["json", "table", "text"],
            default: "json",
          },
          {
            name: "mfaSerial",
            message: "Please enter your default MFA serial ARN",
            default: "arn:aws:iam::123456789012:mfa/username",
          },
        ])
        .then((answers) => {
          resolve(answers);
        });
    } catch (error) {
      displayBox(error.message ? error.message : error, "danger");
    }
  });
};

// Get Config
export const getDefaultConfig = async (configPath: string) => {
  return new Promise<IDefaultConfig>(async (resolve, reject) => {
    try {
      const configFile = path.join(configPath, "config.json");
      const config = fs.readJSONSync(configFile);
      resolve(config);
    } catch (error) {
      displayBox(error.message ? error.message : error, "danger");
    }
  });
};

// Get AWS Profiles
export const getProfiles = async (homePath: string) => {
  return new Promise<IAWSProfile[]>(async (resolve, reject) => {
    try {
      const credsObject = JSON.parse(
        JSON.stringify(
          ini.parse(
            fs.readFileSync(path.join(homePath, ".aws", "credentials"), "utf-8")
          )
        )
      );
      const configObject = JSON.parse(
        JSON.stringify(
          ini.parse(
            fs.readFileSync(path.join(homePath, ".aws", "config"), "utf-8")
          )
        )
      );

      const profiles: IAWSProfile[] = [];
      for (let key of Object.keys(credsObject)) {
        let profile = {
          ...{ name: key },
          ...credsObject[key],
        };
        if (key === "default") {
          if (_.has(configObject, "default")) {
            profile = { ...profile, ...configObject["default"] };
          }
        } else {
          if (_.has(configObject, `profile ${key}`)) {
            profile = { ...profile, ...configObject[`profile ${key}`] };
          }
        }
        profiles.push(profile);
      }
      for (let key of Object.keys(configObject)) {
        const profileName =
          key === "default" ? "default" : key.replace("profile ", "");

        if (!_.find(profiles, (p) => p.name === profileName)) {
          let profile = { name: profileName };
          if (key === "default") {
            if (_.has(configObject, "default")) {
              profile = { ...profile, ...configObject["default"] };
            }
          } else {
            if (_.has(configObject, `profile ${profileName}`)) {
              profile = {
                ...profile,
                ...configObject[`profile ${profileName}`],
              };
            }
          }
          profiles.push(profile);
        }
      }
      resolve(_.orderBy(profiles, ["name"], ["asc"]));
    } catch (error) {
      displayBox(error.message ? error.message : error, "danger");
    }
  });
};

// Check Profile
export const checkExistingProfile = async (
  homePath: string,
  configPath: string,
  platform: string,
  profileData: IProfileData
) => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      // AWS current profiles
      const profiles = await getProfiles(homePath);

      if (_.find(profiles, (p) => p.name === profileData.name)) {
        inquirer
          .prompt([
            {
              name: "overwrite",
              type: "confirm",
              message: `Profile with name ${profileData.name} already exists. Do you want to overwrite it ?`,
              default: false,
            },
          ])
          .then(async (answers) => {
            if (answers.overwrite) {
              await createProfile(
                homePath,
                configPath,
                profileData,
                profiles,
                platform,
                true
              );
            } else {
              process.exit(0);
            }
          });
      } else {
        await createProfile(
          homePath,
          configPath,
          profileData,
          profiles,
          platform,
          false
        );
      }
    } catch (error) {
      displayBox(error.message ? error.message : error, "danger");
    }
  });
};

// Create Profile
export const createProfile = async (
  homePath: string,
  configPath: string,
  profileData: IProfileData,
  profiles: IAWSProfile[],
  platform: string,
  existing: boolean
) => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      // Remove profile if existing to overwrite
      if (existing) {
        profiles = _.filter(profiles, (p) => p.name !== profileData.name);
      }

      // Normal profile without MFA
      if (profileData.type === "normal" && !profileData.mfa) {
        const newProfile: IAWSProfile = {
          name: profileData.name,
          aws_access_key_id: profileData.accessKey ? profileData.accessKey : "",
          aws_secret_access_key: profileData.secretAccessKey
            ? profileData.secretAccessKey
            : "",
          region: profileData.region,
          output: profileData.output,
        };
        profiles.push(newProfile);
        // Write Profiles
        await writeProfiles(homePath, profiles);
        // Display Message
        await displayMessage(profileData, platform, "create");
        resolve();
      }

      // Normal profile with MFA
      if (profileData.type === "normal" && profileData.mfa) {
        const newProfile: IAWSProfile = {
          name: profileData.name,
          aws_access_key_id: profileData.accessKey ? profileData.accessKey : "",
          aws_secret_access_key: profileData.secretAccessKey
            ? profileData.secretAccessKey
            : "",
          region: profileData.region,
          output: profileData.output,
          mfa_serial: profileData.mfaSerial,
        };
        profiles.push(newProfile);
        const stsCredentials = await getSTSCredentials(profileData);
        const newMFAProfile: IAWSProfile = {
          name: `${profileData.name}-mfa`,
          aws_access_key_id: stsCredentials.aws_access_key_id,
          aws_secret_access_key: stsCredentials.aws_secret_access_key,
          aws_session_token: stsCredentials.aws_session_token,
          expiration: stsCredentials.expiration,
          region: profileData.region,
          output: profileData.output,
        };
        profiles.push(newMFAProfile);
        // Write Profiles
        await writeProfiles(homePath, profiles);
        // Display Message
        await displayMessage(profileData, platform, "create");
        resolve();
      }

      // Assumed profile
      if (profileData.type === "assumed") {
        // Get Source Profile from the list of profiles
        const sourceProfile: IAWSProfile | undefined = _.find(
          profiles,
          (p) => p.name === profileData.sourceProfile
        );

        if (!sourceProfile)
          return reject(
            `Source profile ${profileData.sourceProfile} not found. Please try again`
          );

        if (sourceProfile.mfa_serial && sourceProfile.mfa_serial !== "") {
          inquirer
            .prompt([
              {
                name: "mfaCode",
                message: `Please enter the MFA code for source profile '${
                  sourceProfile.name
                }' and user ${_.last(_.split(sourceProfile.mfa_serial, "/"))}`,
                validate: (mfaCode) => {
                  if (mfaCode === "") {
                    return "Looks like you haven't provided your MFA code. Please try again";
                  } else if (mfaCode.length < 6 || isNaN(mfaCode)) {
                    return "Your MFA code doesn't seem to be right. It must be a number & minimum 6 digits long.";
                  } else return true;
                },
              },
            ])
            .then(async (answers) => {
              const stsCredentials = await getSTSCredentials({
                ...profileData,
                ...{
                  type: "normal",
                  accessKey: sourceProfile.aws_access_key_id,
                  secretAccessKey: sourceProfile.aws_secret_access_key,
                  mfaSerial: sourceProfile.mfa_serial,
                  mfaCode: answers.mfaCode,
                },
              });
              const newMFAProfile: IAWSProfile = {
                name: `${sourceProfile.name}-mfa`,
                aws_access_key_id: stsCredentials.aws_access_key_id,
                aws_secret_access_key: stsCredentials.aws_secret_access_key,
                aws_session_token: stsCredentials.aws_session_token,
                expiration: stsCredentials.expiration,
                region: profileData.region,
                output: profileData.output,
              };
              profiles.push(newMFAProfile);
              const newProfile: IAWSProfile = {
                name: profileData.name,
                source_profile: `${profileData.sourceProfile}-mfa`,
                role_arn: profileData.roleArn,
                role_session_name: `${_.kebabCase(profileData.roleArn).replace(
                  "arn-aws-iam-",
                  ""
                )}-assumed-session`,
                region: profileData.region,
                output: profileData.output,
              };
              profiles.push(newProfile);
              // Write Profiles
              await writeProfiles(homePath, profiles);
              // Display Message
              await displayMessage(profileData, platform, "create");
              resolve();
            });
        } else {
          const newProfile: IAWSProfile = {
            name: profileData.name,
            source_profile: profileData.sourceProfile,
            role_arn: profileData.roleArn,
            role_session_name: `${_.kebabCase(profileData.roleArn).replace(
              "arn-aws-iam-",
              ""
            )}-assumed-session`,
            region: profileData.region,
            output: profileData.output,
          };
          profiles.push(newProfile);
          // Write Profiles
          await writeProfiles(homePath, profiles);
          // Display Message
          await displayMessage(profileData, platform, "create");
          resolve();
        }
      }
    } catch (error) {
      displayBox(error.message ? error.message : error, "danger");
    }
  });
};

// Renew Profile
export const renewProfile = async (
  homePath: string,
  platform: string,
  profile: IAWSProfile,
  mfaCode: string
) => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      // AWS current profiles
      let profiles = await getProfiles(homePath);

      // Renew MFA Profile
      if (profile?.mfa_serial) {
        // Remove existing MFA profile
        if (profile.mfa_serial) {
          profiles = _.filter(
            profiles,
            (p) => p.name !== `${profile.name}-mfa`
          );
        }
        const profileData: IProfileData = {
          name: profile.name || "",
          region: profile.region || "",
          type: profile.mfa_serial ? "normal" : "assumed",
          accessKey: profile.aws_access_key_id,
          secretAccessKey: profile.aws_secret_access_key,
          mfa: true,
          mfaSerial: profile.mfa_serial,
          mfaCode,
        };
        const stsCredentials = await getSTSCredentials(profileData);
        const newMFAProfile: IAWSProfile = {
          name: `${profile.name}-mfa`,
          aws_access_key_id: stsCredentials.aws_access_key_id,
          aws_secret_access_key: stsCredentials.aws_secret_access_key,
          aws_session_token: stsCredentials.aws_session_token,
          expiration: stsCredentials.expiration,
          region: profile.region,
          output: profile.output,
        };
        profiles.push(newMFAProfile);
        // Write Profiles
        await writeProfiles(homePath, profiles);
        // Display Message
        await displayMessage(profileData, platform, "renew");
        resolve();
      }

      // Renew Assumed Profile
      if (profile.source_profile) {
        // Get Source Profile from the list of profiles
        const sourceProfile: IAWSProfile | undefined = _.find(
          profiles,
          (p) => p.name === profile.source_profile?.replace("-mfa", "")
        );
        if (!sourceProfile)
          return reject(
            `Source profile ${profile.source_profile} not found. Please try again`
          );

        if (sourceProfile.mfa_serial && sourceProfile.mfa_serial !== "") {
          // Remove existing Source MFA profile
          profiles = _.filter(
            profiles,
            (p) => p.name !== `${sourceProfile.name}-mfa`
          );

          const profileData: IProfileData = {
            name: profile.name || "",
            region: profile.region || "",
            output: profile.output || "json",
            type: "assumed",
            accessKey: sourceProfile.aws_access_key_id,
            secretAccessKey: sourceProfile.aws_secret_access_key,
            mfa: true,
            mfaSerial: sourceProfile.mfa_serial,
            mfaCode,
            roleArn: profile.role_arn,
          };
          const stsCredentials = await getSTSCredentials(profileData);
          const newMFAProfile: IAWSProfile = {
            name: `${sourceProfile.name}-mfa`,
            aws_access_key_id: stsCredentials.aws_access_key_id,
            aws_secret_access_key: stsCredentials.aws_secret_access_key,
            aws_session_token: stsCredentials.aws_session_token,
            expiration: stsCredentials.expiration,
            region: profileData.region,
            output: profileData.output,
          };
          profiles.push(newMFAProfile);

          // Write Profiles
          await writeProfiles(homePath, profiles);
          // Display Message
          await displayMessage(profileData, platform, "renew");
          resolve();
        } else {
          displayBox(
            `The source profile '${sourceProfile.name}' is not MFA enabled. No renewal required`,
            "warning"
          );
          resolve();
        }
      }
    } catch (error) {
      displayBox(error.message ? error.message : error, "danger");
    }
  });
};

// Get STS credentials
export const getSTSCredentials = async (profileData: IProfileData) => {
  return new Promise<ISTSCredential>(async (resolve, reject) => {
    try {
      const sts = new AWS.STS({
        accessKeyId: profileData.accessKey,
        secretAccessKey: profileData.secretAccessKey,
      });

      spinner.start("Requesting temporary credentials from STS");

      const stsParams: any = {};

      // Set MFA details for MFA profiles
      if (profileData.mfaSerial) {
        stsParams.SerialNumber = profileData.mfaSerial;
        stsParams.TokenCode = profileData.mfaCode;
        stsParams.DurationSeconds = 900;
      }

      let stsRes: any;
      stsRes = await sts.getSessionToken(stsParams).promise();
      const stsCredentials: ISTSCredential = {
        aws_access_key_id: stsRes.Credentials.AccessKeyId,
        aws_secret_access_key: stsRes.Credentials.SecretAccessKey,
        aws_session_token: stsRes.Credentials.SessionToken,
        expiration: moment(stsRes.Credentials.Expiration).local().format(),
      };
      spinner.succeed();
      return resolve(stsCredentials);
    } catch (error) {
      spinner.fail();
      displayBox(error.message ? error.message : error, "danger");
    }
  });
};

// Write Profile
export const writeProfiles = async (
  homePath: string,
  profiles: IAWSProfile[]
) => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const credsAttributes = [
        "aws_access_key_id",
        "aws_secret_access_key",
        "aws_session_token",
        "expiration",
      ];
      const configAttributes = [
        "region",
        "output",
        "mfa_serial",
        "source_profile",
        "role_arn",
        "role_session_name",
      ];

      const credsObject: any = {};
      const configObject: any = {};

      for (const profile of profiles) {
        const iniSection =
          profile.name === "default" ? "default" : `profile ${profile.name}`;
        if (profile.name) credsObject[profile.name] = {};
        configObject[iniSection] = {};
        for (const profileKey in profile) {
          if (_.findIndex(credsAttributes, (x) => x === profileKey) >= 0) {
            if (profile.name)
              credsObject[profile.name][profileKey] = profile[profileKey];
          }
          if (_.findIndex(configAttributes, (x) => x === profileKey) >= 0) {
            configObject[iniSection][profileKey] = profile[profileKey];
          }
        }
      }
      // console.log("Credentials");
      // console.log(ini.stringify(credsObject));
      // console.log("Config");
      // console.log(ini.stringify(configObject));
      fs.writeFileSync(
        path.join(homePath, ".aws", "credentials"),
        ini.stringify(credsObject)
      );
      fs.writeFileSync(
        path.join(homePath, ".aws", "config"),
        ini.stringify(configObject)
      );

      resolve();
    } catch (error) {
      displayBox(error.message ? error.message : error, "danger");
    }
  });
};

const displayMessage = async (
  profileData: IProfileData,
  platform: string,
  action: string
) => {
  // Copy AWS Profile command
  let profileName: string = "";
  if (profileData.type === "normal" && !profileData.mfa)
    profileName = profileData.name;
  if (profileData.type === "normal" && profileData.mfa)
    profileName = `${profileData.name}-mfa`;
  if (profileData.type === "assumed") profileName = profileData.name;

  if (platform === "win32") {
    clipboard.writeSync(`setx AWS_PROFILE ${profileName}`);
  } else {
    clipboard.writeSync(`export AWS_PROFILE=${profileName}`);
  }

  // Display Message
  console.log(
    boxen(
      `Profile '${profileData.name}' ${
        action === "create" ? "created" : action === "renew" ? "renewed" : ""
      } succesfully
AWS export command is copied to your clipboard. Please paste (${
        platform === "darwin" ? "Cmd-V" : "Ctrl-V"
      }) the command to set your profile`,
      successBox
    )
  );
  return;
};

// List Profiles
export const listProfiles = async (homePath: string, flags: any) => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const profiles = await getProfiles(homePath);

      // Headers
      let tableHeaders = ["Name", "Type", "MFA", "Expiry"];

      if (flags.wide && !flags.keys) {
        tableHeaders = [
          ...tableHeaders,
          ...["Region", "Output", "MFA Serial", "Role", "Source Profile"],
        ];
      }

      if (flags.keys) {
        tableHeaders = [
          ...tableHeaders,
          ...["Access Key", "Secret Access Key"],
        ];
      }

      const table = new Table({
        head: tableHeaders,
        style: {
          border: ["white"],
          head: ["blue"],
        },
      });

      for (const profile of profiles) {
        let expiration = chalk.yellow("NA");
        if (profile.source_profile) {
          const sourceProfile = _.find(
            profiles,
            (p) => p.name === profile.source_profile
          );
          if (sourceProfile && sourceProfile.expiration) {
            if (moment().diff(moment(sourceProfile.expiration)) < 0) {
              expiration = chalk.green(
                moment(sourceProfile.expiration).fromNow()
              );
            } else {
              expiration = chalk.red("Expired");
            }
          }
        } else if (profile.expiration) {
          if (moment().diff(moment(profile.expiration)) < 0) {
            expiration = chalk.green(moment(profile.expiration).fromNow());
          } else {
            expiration = chalk.red("Expired");
          }
        }

        let tableRow = [
          profile.name,
          profile.role_arn ? "Assumed" : "Normal",
          profile.mfa_serial ? "Y" : "N",
          expiration,
        ];

        if (flags.wide && !flags.keys) {
          tableRow = [
            ...tableRow,
            ...[
              profile.region,
              profile.output,
              profile.mfa_serial ? profile.mfa_serial : "NA",
              profile.role_arn ? profile.role_arn : "NA",
              profile.source_profile ? profile.source_profile : "NA",
            ],
          ];
        }

        if (flags.keys) {
          tableRow = [
            ...tableRow,
            ...[
              profile.aws_access_key_id || "NA",
              profile.aws_secret_access_key || "NA",
            ],
          ];
        }

        table.push(tableRow);
      }

      console.log(table.toString());

      resolve();
    } catch (error) {
      displayBox(error.message ? error.message : error, "danger");
    }
  });
};

// Delete Profile
export const deleteProfile = async (
  homePath: string,
  profileName: string,
  force: boolean
) => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      let profiles = await getProfiles(homePath);

      if (force) {
        profiles = profiles.filter((p) => p.name !== profileName);
        await writeProfiles(homePath, profiles);
        displayBox(`Profile '${profileName}' deleted successfully`, "danger");
        resolve();
      } else {
        inquirer
          .prompt([
            {
              name: "confirmDelete",
              type: "confirm",
              message: `Are you sure you want to delete profile '${profileName}' ?`,
              default: false,
            },
          ])
          .then(async (answers) => {
            if (answers.confirmDelete) {
              profiles = profiles.filter((p) => p.name !== profileName);
              await writeProfiles(homePath, profiles);
              displayBox(
                `Profile '${profileName}' deleted successfully`,
                "danger"
              );
              resolve();
            } else {
              process.exit(1);
            }
          });
      }
    } catch (error) {
      displayBox(error.message ? error.message : error, "danger");
    }
  });
};
