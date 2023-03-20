import path from 'path';
import Template from './template';
import User from './user';
import {STATUS, AWS_HOSTED_ZONE_ID} from '../constants';
import {UserType, WebsiteType} from '../types';
import {
  acm,
  cloudfront,
  route53domains,
  route53,
  s3,
  config,
  getFileType,
  isDirectory,
  isLocal,
} from '../util/helper';
import {ErrorResponse, SuccessResponse} from '../util/message';
import WebsiteDB from '../models/website';
import BaseService from './base';
const fse = require('fs-extra');

interface Response {
  message?: string;
  website?: WebsiteType;
  code: number;
}
class WebsiteService extends BaseService<'WebsiteService'> {
  async get(userId: string): Promise<Response> {
    const user = await User.get(userId);
    if (!user.user) return ErrorResponse(user.message);
    const website = await WebsiteDB.getByUserId(userId);
    return this.response({website: website});
  }
  async getAll(): Promise<Response> {
    const websites = await WebsiteDB.getAll();
    return this.response({website: websites});
  }
  async create(args: Omit<WebsiteType, 'id'>): Promise<Response> {
    const user = await User.get(args.userId);
    if (!user.user) return ErrorResponse(user.message);

    const website = await WebsiteDB.getByUserId(args.userId);
    if (!website) {
      const oldWebsite = await buildWebApp(args, {
        id: args.userId,
        firstName: user.user.firstName,
        lastName: user.user.lastName || '',
        email: user.user.email,
        profilePicture: user.user.profilePicture,
        externalId: user.user.externalId,
        lastLogin: user.user.lastLogin,
        type: user.user.type,
      });
      if (oldWebsite.code !== 200) return ErrorResponse(oldWebsite.message);
      return this.response({website: oldWebsite.website});
    }
    const newWebsite = await buildWebApp(
      {...args, id: website.id},
      {
        id: args.userId,
        firstName: user.user.firstName,
        lastName: user.user.lastName,
        email: user.user.email,
        profilePicture: user.user.profilePicture,
        externalId: user.user.externalId,
        lastLogin: user.user.lastLogin,
        type: user.user.type,
      }
    );
    if (newWebsite.code !== 200) return ErrorResponse(newWebsite.message);
    return this.response({website: newWebsite.website});
  }
  async delete(userId: string): Promise<Response> {
    const user = await User.get(userId);
    if (!user.user) return ErrorResponse(user.message);
    const website = await WebsiteDB.delete(userId);
    if (!website) return ErrorResponse();
    return this.response({website: website});
  }
  async getDomainStatus(domain: string) {
    const getDomainAvailability = async (domain: string) => {
      const domainAvailability = await route53domains
        .checkDomainAvailability({
          DomainName: domain,
        })
        .promise();
      return domainAvailability.Availability === 'AVAILABLE';
    };
    const status = await getDomainAvailability(domain).catch((err: any) => {
      return ErrorResponse(err.message);
    });
    return this.response({field: status});
  }
}

const Website = new WebsiteService();
export default Website;

class Builder {
  user: UserType;
  status = STATUS.PENDING;
  constructor(user: UserType) {
    this.user = user;
  }
  userInfo = () => {
    return {...this.user, folder: `../tmp/${this.user.id}`};
  };
  userWebsite = () => {
    return {
      name: `${this.userInfo().firstName}-${this.userInfo().lastName}${
        isLocal ? '.local' : ''
      }.resumed.website`,
      bucket: `${this.userInfo().firstName}-${this.userInfo().lastName}${
        isLocal ? '.local' : ''
      }.resumed.website.s3-website.${config.region}.amazonaws.com`,
      url: `http://${this.userInfo().firstName}-${this.userInfo().lastName}${
        isLocal ? '.local' : ''
      }.resumed.website.s3-website.${config.region}.amazonaws.com`,
    };
  };
  deleteTempFolder = async () => {
    await fse.remove(path.join(__dirname, this.userInfo().folder));
  };
  newS3Website = async () => {
    const params = {
      Bucket: this.userWebsite().name,
      ACL: 'public-read',
      CreateBucketConfiguration: {
        LocationConstraint: config.region,
      },
    };
    await s3
      .createBucket(params)
      .promise()
      .catch((err: any) => {
        if (err.code === 'BucketAlreadyOwnedByYou') {
          return this.userWebsite().url;
        }
      });
    // if bucket return already own message then return url
    await s3.waitFor('bucketExists', {Bucket: `${params.Bucket}`}).promise();
    const policy = await s3
      .putBucketPolicy({
        Bucket: `${params.Bucket}`,
        Policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'PublicReadGetObject',
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${params.Bucket}/*`],
            },
          ],
        }),
      })
      .promise()
      .catch((err: any) => {
        return null;
      });
    if (!policy) {
      return null;
    }
    const website = await s3
      .putBucketWebsite({
        Bucket: this.userWebsite().name,
        WebsiteConfiguration: {
          ErrorDocument: {
            Key: 'error.html',
          },
          IndexDocument: {
            Suffix: 'index.html',
          },
        },
      })
      .promise()
      .catch((err: any) => {
        return null;
      });
    if (!website) {
      return null;
    }
    return this.userWebsite().url;
  };
  templateToS3 = async () => {
    const userTempFolder = path.join(__dirname, this.userInfo().folder);
    const indexFile = await fse.pathExists(
      path.join(userTempFolder, 'index.html')
    );
    if (!indexFile) {
      const buildFolder = path.join(userTempFolder, 'build');
      if (!buildFolder) {
        return null;
      }
      const upload = await this.uploadDir(buildFolder, '');
      if (!upload) {
        return null;
      }
      this.status = STATUS.COMPLETED;
      return true;
    }
    const upload = await this.uploadDir(userTempFolder, '');
    if (!upload) {
      return null;
    }
    this.status = STATUS.COMPLETED;
    return true;
  };
  uploadDir = async (dir: string, s3Dir: string) => {
    const files = await fse.readdir(dir);
    const promises = files.map(async (file: any) => {
      const filePath = path.join(dir, file);
      const s3FilePath = path.join(s3Dir, file);
      if (await isDirectory(filePath)) {
        await s3
          .putObject({
            Bucket: this.userWebsite().name,
            Key: s3FilePath + '/',
          })
          .promise()
          .catch((err: any) => {
            return null;
          });
        return this.uploadDir(filePath, s3FilePath);
      }
      const fileType = await getFileType(filePath);
      return s3
        .putObject({
          Bucket: this.userWebsite().name,
          Key: s3FilePath,
          Body: await fse.readFile(filePath),
          ContentType: fileType,
        })
        .promise()
        .catch((err: any) => {
          return null;
        });
    });
    return Promise.all(promises);
  };
  newTemplate = async (templateName: string, colors: string) => {
    const template = new Template(templateName, colors, this.user);
    const userTemplate = template.create();
    if (!userTemplate) {
      return null;
    }
    return await userTemplate;
  };
  newSubDomain = async (domain: string) => {
    const params = {
      HostedZoneId: AWS_HOSTED_ZONE_ID, // our Id from the first call
      ChangeBatch: {
        Changes: [
          {
            Action: 'CREATE',
            ResourceRecordSet: {
              Name: domain,
              Type: 'CNAME',
              TTL: 86400,
              ResourceRecords: [
                {
                  Value: this.userWebsite().bucket,
                },
              ],
            },
          },
        ],
      },
    };
    const domainName = `http://${this.userWebsite().name}`;
    const subDomain = await route53
      .changeResourceRecordSets(params)
      .promise()
      .catch((err: any) => {
        if (
          err.code === 'InvalidChangeBatch' &&
          err.message.includes('it already exists')
        ) {
          return domainName;
        }
        return null;
      });
    if (!subDomain) {
      return null;
    }
    return domainName;
  };
  newDistribution = async () => {
    return await cloudfront
      .createDistribution({
        DistributionConfig: {
          CallerReference: this.userWebsite().bucket,
          Comment: this.userWebsite().bucket,
          DefaultCacheBehavior: {
            ForwardedValues: {
              Cookies: {
                Forward: 'none',
              },
              QueryString: false,
            },
            TargetOriginId: this.userWebsite().name,
            TrustedSigners: {
              Enabled: false,
              Quantity: 0,
            },
            ViewerProtocolPolicy: 'allow-all',
          },
          DefaultRootObject: 'index.html',
          Enabled: true,
          Origins: {
            Items: [
              {
                DomainName: this.userWebsite().bucket,
                Id: this.userWebsite().name,
                S3OriginConfig: {
                  OriginAccessIdentity: '',
                },
              },
            ],
            Quantity: 1,
          },
        },
      })
      .promise();
  };
  newCertificate = async (domain: string) => {
    return await acm
      .requestCertificate({
        DomainName: domain,
        ValidationMethod: 'DNS',
      })
      .promise();
  };
  registerDomain = async (domain: string, autoRenew: boolean) => {
    return await route53domains
      .registerDomain({
        DomainName: domain,
        DurationInYears: 1,
        AutoRenew: autoRenew,
        AdminContact: {
          FirstName: 'string',
          LastName: 'string',
          Email: 'string',
          PhoneNumber: 'string',
          AddressLine1: 'string',
          AddressLine2: 'string',
          City: 'string',
          State: 'string',
          CountryCode: 'string',
          ZipCode: 'string',
          Fax: 'string',
        },
        RegistrantContact: {
          FirstName: 'string',
          LastName: 'string',
          Email: 'string',
          PhoneNumber: 'string',
          AddressLine1: 'string',
          AddressLine2: 'string',
          City: 'string',
          State: 'string',
          CountryCode: 'string',
          ZipCode: 'string',
          Fax: 'string',
        },
        TechContact: {
          FirstName: 'string',
          LastName: 'string',
          Email: 'string',
          PhoneNumber: 'string',
          AddressLine1: 'string',
          AddressLine2: 'string',
          City: 'string',
          State: 'string',
          CountryCode: 'string',
          ZipCode: 'string',
          Fax: 'string',
        },
      })
      .promise();
  };
  mapCertificateToDistribution = async (domain: string) => {
    const certificate = await this.newCertificate(domain);
    const distribution = await this.newDistribution();
    if (!distribution) {
      return null;
    }
    const params = {
      DistributionConfig: {
        CallerReference: this.userWebsite().bucket,
        Comment: this.userWebsite().bucket,
        DefaultCacheBehavior: {
          ForwardedValues: {
            Cookies: {
              Forward: 'none',
            },
            QueryString: false,
          },
          TargetOriginId: this.userWebsite().name,
          TrustedSigners: {
            Enabled: false,
            Quantity: 0,
          },
          ViewerProtocolPolicy: 'allow-all',
        },
        DefaultRootObject: 'index.html',
        Enabled: true,
        Origins: {
          Items: [
            {
              DomainName: this.userWebsite().bucket,
              Id: this.userWebsite().name,
              S3OriginConfig: {
                OriginAccessIdentity: '',
              },
            },
          ],
          Quantity: 1,
        },
        ViewerCertificate: {
          ACMCertificateArn: certificate.CertificateArn,
          Certificate: certificate.CertificateArn,
          CertificateSource: 'acm',
          MinimumProtocolVersion: 'TLSv1',
          SSLSupportMethod: 'sni-only',
        },
      },
      Id: (distribution.Distribution && distribution.Distribution.Id) || '',
      IfMatch: distribution.ETag,
    };
    return await cloudfront.updateDistribution(params).promise();
  };
}

export const buildWebApp = async (
  website: WebsiteType,
  user: UserType
): Promise<Response> => {
  const startBuilding = new Builder(user);
  if (!startBuilding) {
    const newWebsite = await WebsiteDB.create({
      userId: website.userId,
      templateName: website.templateName,
      url: '',
      status: STATUS.ERROR,
      alias: null,
      color: null,
    });
    if (!newWebsite) return ErrorResponse();
  }
  if (website.id) {
    await WebsiteDB.update(website.id, {
      ...website,
      status: startBuilding.status,
      alias: website.alias || null,
      color: website.colors || null,
    });
  } else {
    await WebsiteDB.create({
      userId: website.userId,
      templateName: website.templateName,
      url: '',
      status: startBuilding.status,
      alias: website.alias || null,
      color: website.colors || null,
    });
  }

  const bucket = await startBuilding.newS3Website();
  if (!bucket) {
    // update status to error
    await WebsiteDB.update(website.userId, {
      ...website,
      status: STATUS.ERROR,
      color: website.colors || null,
      alias: website.alias || null,
    });
    console.log('Step 1/5: Could not create S3 bucket');
    return ErrorResponse('Step 1/5: Could not create S3 bucket');
  }
  website.url = bucket;

  const domain = await startBuilding.newSubDomain(
    `${user.firstName}-${user.lastName}${
      isLocal ? '.local' : ''
    }.resumed.website`
  );
  if (!domain) {
    await WebsiteDB.update(website.userId, {
      ...website,
      status: STATUS.ERROR,
      color: website.colors || null,
      alias: website.alias || null,
    });
    console.log('Step 2/5: Could not create Route53 subdomain');
    return ErrorResponse('Step 2/5: Could not create Route53 domain');
  }
  website.alias = domain;

  const buildWebsite = await startBuilding.newTemplate(
    website.templateName,
    website.colors
  );
  if (!buildWebsite) {
    await WebsiteDB.update(website.userId, {
      ...website,
      status: website.status,
      color: website.colors || null,
      alias: website.alias || null,
    });
    console.log('Step 3/5: Could not build template');
    return ErrorResponse('Step 3/5: Template could not be built');
  }

  const uploadWebsite = await startBuilding.templateToS3();
  if (!uploadWebsite) {
    await WebsiteDB.update(website.userId, {
      ...website,
      status: website.status,
      color: website.colors || null,
      alias: website.alias || null,
    });
    console.log('Step 4/5: Could not upload template to S3');
    return ErrorResponse('Step 4/5: Template could not be uploaded to S3');
  }
  await startBuilding.deleteTempFolder();
  const updateWebsite = await WebsiteDB.update(website.userId, {
    ...website,
    status: STATUS.COMPLETED,
    color: website.colors || null,
    alias: website.alias || null,
  });
  if (!updateWebsite) {
    console.log('Step 5/5: Could not update website');
    return ErrorResponse('Step 5/5: Could not update website');
  }
  return SuccessResponse({website: updateWebsite});
};