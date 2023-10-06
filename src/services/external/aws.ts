import {
  AWS_ACCESS_KEY_ID,
  AWS_BUCKET_NAME,
  AWS_REGION,
  AWS_SECRET_ACCESS_KEY,
  DOMAIN_NAME,
} from '../../constants';
import {UserType} from '../../types';
import {getFileType} from '../../util/helper';
const fse = require('fs-extra');
import AWS from 'aws-sdk';
import {ACM} from '@aws-sdk/client-acm';
import {CloudFront} from '@aws-sdk/client-cloudfront';
import {CloudWatchLogs} from '@aws-sdk/client-cloudwatch-logs';
import {Route53} from '@aws-sdk/client-route-53';
import {Route53Domains} from '@aws-sdk/client-route-53-domains';
import {
  PutBucketPolicyCommand,
  S3Client,
  CreateBucketCommand,
  PutPublicAccessBlockCommand,
} from '@aws-sdk/client-s3';
import path from 'path';
import User from '../user';
import Website from '../website';

export const config = {
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
};

export const s3 = new AWS.S3(config);
const client = new S3Client(config);
//export const s3Client = new S3(config);
export const route53 = new Route53(config);
export const cloudfront = new CloudFront(config);
export const cloudwatch = new CloudWatchLogs(config);
export const acm = new ACM(config);
export const route53domains = new Route53Domains(config);

export const getBucketName = async (
  userId: UserType['id']
): Promise<string | null> => {
  const userResponse = await User.get(userId);
  if (!userResponse.user) {
    return null;
  }
  const websiteResponse = await Website.get(userId);
  let s3Url = '';
  if (websiteResponse.website) {
    const url = websiteResponse.website.url;
    // remove http:// and .s3-website.us-east-2.amazonaws.com
    s3Url = url
      .replace('http://', '')
      .replace('.s3-website.us-east-2.amazonaws.com', '');
  }
  const checkIfInfoExist = await User.getByFirstAndLastName(
    userResponse.user.firstName,
    userResponse.user.lastName
  );
  if (!websiteResponse.website && checkIfInfoExist.users) {
    if (checkIfInfoExist.users.length >= 2) {
      s3Url = `${userResponse.user.firstName}-${userResponse.user.lastName}-${checkIfInfoExist.users.length}.${DOMAIN_NAME}`;
    } else if (checkIfInfoExist.users.length === 1) {
      s3Url = `${userResponse.user.firstName}-${userResponse.user.lastName}.${DOMAIN_NAME}`;
    }
  }
  return s3Url;
};
export const createWebsite = async (userId: UserType['id']) => {
  const userResponse = await User.get(userId);
  if (!userResponse.user) {
    return null;
  }
  const websiteResponse = await Website.get(userId);
  let s3Url = '';
  if (websiteResponse.website) {
    return websiteResponse.website.url;
  }
  const checkIfInfoExist = await User.getByFirstAndLastName(
    userResponse.user.firstName,
    userResponse.user.lastName
  );
  if (!websiteResponse.website && checkIfInfoExist.users) {
    if (checkIfInfoExist.users.length >= 2) {
      s3Url = `${userResponse.user.firstName}-${userResponse.user.lastName}-${checkIfInfoExist.users.length}.${DOMAIN_NAME}`;
    } else if (checkIfInfoExist.users.length === 1) {
      s3Url = `${userResponse.user.firstName}-${userResponse.user.lastName}.${DOMAIN_NAME}`;
    }
  }

  const input = {
    // CreateBucketRequest
    ACL: 'public-read',
    Bucket: s3Url, // required
    CreateBucketConfiguration: {
      // CreateBucketConfiguration
      LocationConstraint: AWS_REGION,
    },
    ObjectLockEnabledForBucket: false,
    ObjectOwnership: 'ObjectWriter',
  };
  const command = new CreateBucketCommand(input);
  const response = await client.send(command);
  return response.Location;
};

export const setBucketPublicAccess = async (bucketName: string) => {
  const input = {
    // PutPublicAccessBlockRequest
    Bucket: bucketName, // required
    PublicAccessBlockConfiguration: {
      // PublicAccessBlockConfiguration
      BlockPublicAcls: false,
      IgnorePublicAcls: false,
      BlockPublicPolicy: false,
      RestrictPublicBuckets: false,
    },
  };
  const command = new PutPublicAccessBlockCommand(input);
  const response = await client.send(command);
  if (response.$metadata.httpStatusCode !== 200) {
    return null;
  }
  return response;
};

export const setBucketPolicy = async (bucketName: string) => {
  const input = {
    Bucket: bucketName,
    Policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`],
        },
      ],
    }),
  };
  const command = new PutBucketPolicyCommand(input);
  const response = await client.send(command);
  if (response.$metadata.httpStatusCode !== 200) {
    return null;
  }
  return response;
};

export const uploadToUserBucket = async (
  bucketName: UserType['id'],
  file: string,
  key: string,
  filePath: string
): Promise<string> => {
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: key.includes('index.html')
      ? file
      : await fse.readFile(
          path.join(__dirname, `../../templates/${filePath}/${key}`)
        ),
    ContentEncoding: 'base64',
    ContentType: await getFileType(key),
  };
  const response = await s3.upload(params).promise();
  return response.Location;
};
export const uploadResume = async (
  userId: UserType['id'],
  file: string
): Promise<string> => {
  // parse the base64 string
  const base64Data = Buffer.from(
    file.replace(/^data:application\/\w+;base64,/, ''),
    'base64'
  );
  // get the file type
  const type = file.split(';')[0].split('/')[1];
  const params = {
    Bucket: AWS_BUCKET_NAME,
    Key: `resumes/${userId}.pdf`,
    Body: base64Data,
    ContentEncoding: 'base64',
    ContentType: `application/pdf`,
  };

  const response = await s3.upload(params).promise();
  return response.Location;
};

export const uploadImage = async (file: string, userId: UserType['id']) => {
  const base64Data = Buffer.from(
    file.replace(/^data:image\/\w+;base64,/, ''),
    'base64'
  );
  const type = file.split(';')[0].split('/')[1];
  const params = {
    Bucket: AWS_BUCKET_NAME,
    Key: `profile_pics/${userId}.${type}`,
    ContentType: `image/${type}`,
    ContentEncoding: 'base64',
    Body: base64Data,
  };
  const response = await s3.upload(params).promise();
  return response.Location;
};

export const uploadEventLogo = async (
  file: string | Buffer,
  type: string,
  eventName: string
) => {
  const params = {
    Bucket: AWS_BUCKET_NAME,
    Key: `events/${eventName}.${type.split('/')[1]}`,
    ContentType: type,
    ContentEncoding: 'base64',
    Body: file,
  };
  const response = await s3.upload(params).promise();
  return response.Location;
};
