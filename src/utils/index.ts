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
  return new Promise<string | null>(async (resolve, reject) => {
    try {
      exec("aws --version", (err, stdout, stderr) => {
        if (err) return resolve(null);
        if (stderr) return resolve(null);
        resolve(stdout.split(" ")[0].split("/")[1]);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Get AWS Version
export const getAWSRegions = async () => {
  return new Promise<IAWSRegion[]>(async (resolve, reject) => {
    try {
      // Get AWS Regions from Data
      const awsRegions: IAWSRegion[] = _.orderBy(
        await fs.readJSONSync(
          path.resolve(__dirname, "../data/awsRegions.json")
        ),
        ["code"],
        ["asc"]
      );
      resolve(awsRegions);
    } catch (error) {
      reject(error);
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
          {
            name: "sessionDuration",
            type: "number",
            message:
              "Please enter your default STS session duration in seconds",
            default: 3600,
            filter: (stsSessionDuration) => {
              return isNaN(stsSessionDuration) ||
                stsSessionDuration < 900 ||
                stsSessionDuration > 129600
                ? ""
                : stsSessionDuration;
            },
            validate: (stsSessionDuration) => {
              if (isNaN(stsSessionDuration)) {
                return "STS session duration must be a number between 900 (15 Min) and 129600 (36 Hours)";
              } else if (
                stsSessionDuration < 900 ||
                stsSessionDuration > 129600
              ) {
                return "STS session duration must be between 900 (15 Min) and 129600 (36 Hours)";
              } else return true;
            },
          },
        ])
        .then((answers) => {
          resolve(answers);
        });
    } catch (error) {
      console.log(error);
      reject(error);
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
      reject(error);
    }
  });
};

// Set MFA base keys
export const setMFABaseKeys = async (
  configPath: string,
  baseKeys: IMFABaseKeys
) => {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const configFile = path.join(configPath, "config.json");
      const config: IDefaultConfig = fs.readJSONSync(configFile);

      if (config.mfaBaseKeys) {
        config.mfaBaseKeys = _.filter(
          config.mfaBaseKeys,
          (k) => k.name !== baseKeys.name
        );
      } else {
        config.mfaBaseKeys = [];
      }

      config.mfaBaseKeys.push(baseKeys);
      fs.outputJSONSync(configFile, config);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

// Set MFA base keys
export const getMFABaseKeys = async (configPath: string, name: string) => {
  return new Promise<IMFABaseKeys>(async (resolve, reject) => {
    try {
      const configFile = path.join(configPath, "config.json");
      const config: IDefaultConfig = fs.readJSONSync(configFile);

      const baseKeys = config.mfaBaseKeys
        ? _.find(config.mfaBaseKeys, (k) => k.name === name)
        : null;
      if (baseKeys) return resolve(baseKeys);
      return reject();
    } catch (error) {
      reject(error);
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
          ...{ name: key.replace("profile ", "") },
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
      resolve(_.orderBy(profiles, ["name"], ["asc"]));
    } catch (error) {
      reject(error);
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
      throw new Error(error.message ? error.message : error);
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
      }

      // Normal profile With MFA
      if (profileData.type === "normal" && profileData.mfa) {
        await setMFABaseKeys(configPath, {
          name: profileData.name,
          aws_access_key_id: profileData.accessKey,
          aws_secret_access_key: profileData.secretAccessKey,
        });
        const stsCredentials = await getSTSCredentials(profileData);
        const newProfile: IAWSProfile = {
          name: profileData.name,
          mfa_serial: profileData.mfaSerial,
          aws_access_key_id: stsCredentials.aws_access_key_id,
          aws_secret_access_key: stsCredentials.aws_secret_access_key,
          aws_session_token: stsCredentials.aws_session_token,
          expiration: stsCredentials.expiration,
          region: profileData.region,
          output: profileData.output,
        };
        profiles.push(newProfile);
      }

      // Assumed profile
      if (profileData.type === "assumed") {
        // Get Source Profile from the list of profiles
        const sourceProfile: IAWSProfile | undefined = _.find(
          profiles,
          (p) => p.name === profileData.name
        );

        if (!sourceProfile)
          return reject(
            `Source profile ${profileData.name} not found. Please try again`
          );
        console.log(profileData);
        // const newProfile: IAWSProfile = {
        //   name: profileData.name,
        //   aws_access_key_id: profileData.accessKey ? profileData.accessKey : "",
        //   aws_secret_access_key: profileData.secretAccessKey
        //     ? profileData.secretAccessKey
        //     : "",
        //   region: profileData.region,
        //   output: profileData.output,
        // };
        // profiles.push(newProfile);
      }

      // Write Profiles
      await writeProfiles(homePath, profiles);

      // Copy AWS Profile command
      if (platform === "win32") {
        clipboard.writeSync(`setx AWS_PROFILE ${profileData.name}`);
      } else {
        clipboard.writeSync(`export AWS_PROFILE=${profileData.name}`);
      }

      // Display Message
      console.log(
        boxen(
          `Profile '${profileData.name}' created succesfully
AWS export command is copied to your clipboard. Please paste (Cmd-V / Ctrl-V) the command to set your profile`,
          successBox
        )
      );
    } catch (error) {
      throw new Error(error.message ? error.message : error);
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

      // Set Session duration
      const stsParams: any = {
        DurationSeconds: profileData.sessionDuration,
      };

      // Set MFA details for MFA profiles
      if (profileData.mfaSerial) {
        stsParams.SerialNumber = profileData.mfaSerial;
        stsParams.TokenCode = profileData.mfaCode;
      }

      const stsRes: any = await sts.getSessionToken(stsParams).promise();
      const stsCredentials: ISTSCredential = {
        aws_access_key_id: stsRes.Credentials.AccessKeyId,
        aws_secret_access_key: stsRes.Credentials.SecretAccessKey,
        aws_session_token: stsRes.Credentials.SessionToken,
        expiration: stsRes.Credentials.Expiration.toString(),
      };
      spinner.succeed();
      return resolve(stsCredentials);
    } catch (error) {
      throw new Error(error.message ? error.message : error);
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
      const configAttributes = ["region", "output", "mfa_serial"];

      const credsObject: any = {};
      const configObject: any = {};

      for (const profile of profiles) {
        const iniSection =
          profile.name === "default" ? "default" : `profile ${profile.name}`;
        credsObject[profile.name] = {};
        configObject[iniSection] = {};
        for (const profileKey in profile) {
          if (_.findIndex(credsAttributes, (x) => x === profileKey) >= 0) {
            credsObject[profile.name][profileKey] = profile[profileKey];
          }
          if (_.findIndex(configAttributes, (x) => x === profileKey) >= 0) {
            configObject[iniSection][profileKey] = profile[profileKey];
          }
        }
      }
      console.log("Credentials");
      console.log(ini.stringify(credsObject));
      console.log("Config");
      console.log(ini.stringify(configObject));
      // fs.writeFileSync(
      //   path.join(homePath, ".aws", "credentials"),
      //   ini.stringify(credsObject)
      // );
      // fs.writeFileSync(
      //   path.join(homePath, ".aws", "config"),
      //   ini.stringify(configObject)
      // );
      resolve();
    } catch (error) {
      throw new Error(error.message ? error.message : error);
    }
  });
};
