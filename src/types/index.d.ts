export interface IAWSRegion {
  name: string;
  fullName: string;
  code: string;
}
export interface IConfig {
  region: string;
  output: string;
  mfaSerial: string;
  mfaBaseKeys?: IMFABaseKeys[];
  assumedProfiles?: IAssumedProfileConfig[];
}
export interface IProfileData {
  name: string;
  type: string;
  region: string;
  accessKey?: string;
  secretAccessKey?: string;
  mfa?: boolean;
  mfaSerial?: string;
  mfaCode?: string;
  sourceProfile?: string;
  roleArn?: string;
  output?: string;
}
export interface IAWSProfile {
  name?: string;
  aws_access_key_id?: string;
  aws_secret_access_key?: string;
  aws_session_token?: string;
  mfa_serial?: string;
  output?: string;
  region?: string;
  role_arn?: string;
  role_session_name?: string;
  source_profile?: string;
  expiration?: string;
  [key: string]: string | undefined;
}
export interface ISTSCredential {
  aws_access_key_id: string;
  aws_secret_access_key: string;
  aws_session_token?: string;
  expiration?: string;
}
export interface IMFABaseKeys {
  name: string;
  aws_access_key_id: string | undefined;
  aws_secret_access_key: string | undefined;
}
export interface IAssumedProfileConfig {
  name: string;
  sourceProfile?: string;
  roleArn?: string;
}
