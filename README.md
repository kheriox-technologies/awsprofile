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
* [`awsprofile hello [FILE]`](#awsprofile-hello-file)
* [`awsprofile help [COMMAND]`](#awsprofile-help-command)

## `awsprofile hello [FILE]`

describe the command here

```
USAGE
  $ awsprofile hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ awsprofile hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/kheriox-technologies/awsprofile/blob/v2.0.0/src/commands/hello.ts)_

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
<!-- commandsstop -->
