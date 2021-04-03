awsprofile
==========

CLI to manage AWS profiles and renew STS tokens

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/awsprofile.svg)](https://npmjs.org/package/awsprofile)
[![Downloads/week](https://img.shields.io/npm/dw/awsprofile.svg)](https://npmjs.org/package/awsprofile)
[![License](https://img.shields.io/npm/l/awsprofile.svg)](https://github.com/kheriox-technologies/awsprofile/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g awsprofile
$ awsprofile COMMAND
running command...
$ awsprofile (-v|--version|version)
awsprofile/2.0.0 darwin-x64 node-v15.10.0
$ awsprofile --help [COMMAND]
USAGE
  $ awsprofile COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`awsprofile create`](#awsprofile-create)
* [`awsprofile delete PROFILE`](#awsprofile-delete-profile)
* [`awsprofile help [COMMAND]`](#awsprofile-help-command)
* [`awsprofile list`](#awsprofile-list)
* [`awsprofile renew [PROFILE] [MFACODE]`](#awsprofile-renew-profile-mfacode)

## `awsprofile create`

Create new AWS profile

```
USAGE
  $ awsprofile create

OPTIONS
  -a, --accessKey=accessKey              AWS Access Key
  -c, --mfaCode=mfaCode                  MFA code from the authenticator app
  -h, --help                             show CLI help
  -m, --mfaSerial=mfaSerial              MFA serial (ARN)
  -n, --name=name                        Profile name
  -p, --sourceProfile=sourceProfile      Source profile for assumed profile types
  -r, --roleArn=roleArn                  IAM role ARN for assumed profile types
  -s, --secretAccessKey=secretAccessKey  AWS Secret Access Key
  -t, --type=normal|assumed              Profile type
  --mfa                                  Is MFA profile ?
  --region=region                        AWS region
```

_See code: [src/commands/create.ts](https://github.com/kheriox-technologies/awsprofile/blob/v2.0.0/src/commands/create.ts)_

## `awsprofile delete PROFILE`

Delete profile

```
USAGE
  $ awsprofile delete PROFILE

ARGUMENTS
  PROFILE  Profile name to delete

OPTIONS
  -f, --force
  -h, --help   show CLI help
```

_See code: [src/commands/delete.ts](https://github.com/kheriox-technologies/awsprofile/blob/v2.0.0/src/commands/delete.ts)_

## `awsprofile help [COMMAND]`

display help for awsprofile

```
USAGE
  $ awsprofile help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.2/src/commands/help.ts)_

## `awsprofile list`

List AWS profiles

```
USAGE
  $ awsprofile list

OPTIONS
  -h, --help  show CLI help
  -k, --keys  Display keys
  -w, --wide  Wider display (All details except keys)
```

_See code: [src/commands/list.ts](https://github.com/kheriox-technologies/awsprofile/blob/v2.0.0/src/commands/list.ts)_

## `awsprofile renew [PROFILE] [MFACODE]`

Renew MFA / Assumed profile

```
USAGE
  $ awsprofile renew [PROFILE] [MFACODE]

ARGUMENTS
  PROFILE  Profile name to renew
  MFACODE  MFA code

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/renew.ts](https://github.com/kheriox-technologies/awsprofile/blob/v2.0.0/src/commands/renew.ts)_
<!-- commandsstop -->
