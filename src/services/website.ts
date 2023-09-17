import path from 'path';
import User from './user';
import {
  STATUS,
  AWS_HOSTED_ZONE_ID,
  DOMAIN_NAME,
  SERVER_URL,
  ENVIRONMENT,
  AWS_ACM_NAME,
  AWS_ACM_VALUE,
} from '../constants';
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
  generateCode,
} from '../util/helper';
import {ErrorResponse, SuccessResponse} from '../util/message';
import WebsiteDB from '../models/website';
import BaseService from './base';
import {
  createWebsite,
  setBucketPolicy,
  setBucketPublicAccess,
} from './external/aws';
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
  async create(args: {
    theme: 'DARK' | 'LIGHT';
    template: 'BASIC' | 'MODERN' | 'PROFESSIONAL';
    userId: UserType['id'];
  }): Promise<Response> {
    const userResponse = await User.get(args.userId);
    if (!userResponse.user) return ErrorResponse(userResponse.message);

    const website = await WebsiteDB.getByUserId(args.userId);
    if (!website) {
      const oldWebsite = await buildWebApp(
        {...args, status: 'pending', url: ''},
        userResponse.user
      );
      if (oldWebsite.code !== 200) return ErrorResponse(oldWebsite.message);
      return this.response({website: oldWebsite.website});
    }

    const newWebsite = await buildWebApp(
      {...args, id: website.id, status: 'pending', url: ''},
      userResponse.user
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
  getDomainAvailability = async (domain: string) => {
    const domainAvailability = await route53domains
      .checkDomainAvailability({
        DomainName: domain,
      })
      .promise();
    //get domain pricing
    if (
      !(
        domain.endsWith('.com') ||
        domain.endsWith('.net') ||
        domain.endsWith('.org') ||
        domain.endsWith('.co') ||
        domain.endsWith('.me') ||
        domain.endsWith('.website')
      )
    ) {
      return false;
    }
    return domainAvailability.Availability === 'AVAILABLE';
  };
  createCustomDomain = async (
    domain: string,
    userId: string
  ): Promise<Response> => {
    const user = await User.get(userId);
    if (!user.user) return ErrorResponse(user.message);
    const website = await WebsiteDB.getByUserId(userId);
    if (!website) return ErrorResponse('Website not found');
    const startBuilding = new Builder(user.user);
    if (!startBuilding) return ErrorResponse('Website not found');
    const domainAvailability = await this.getDomainAvailability(domain);
    if (!domainAvailability) return ErrorResponse('Domain not available');
    const registeredDomain = await startBuilding.registerDomain(domain);
    if (registeredDomain === false)
      return ErrorResponse('Domain not registered');
    const domainResponse = await WebsiteDB.update(website.userId, {
      ...website,
      alias: domain,
    });
    if (!domainResponse) return ErrorResponse('Domain not updated');
    return this.response({website: domainResponse});
  };
}

const Website = new WebsiteService();
export default Website;

export class Builder {
  user: UserType;
  status = STATUS.PENDING;
  constructor(user: UserType) {
    this.user = user;
  }
  userInfo = () => {
    return {...this.user};
  };
  userWebsite = () => {
    return {
      name: `${this.userInfo().firstName}-${this.userInfo().lastName}${
        ENVIRONMENT !== 'prod' ? `.${ENVIRONMENT}` : ''
      }.${DOMAIN_NAME}`,
      bucket: `${this.userInfo().firstName}-${this.userInfo().lastName}${
        ENVIRONMENT !== 'prod' ? `.${ENVIRONMENT}` : ''
      }.${DOMAIN_NAME}.s3-website.${config.region}.amazonaws.com`,
      url: `http://${this.userInfo().firstName}-${this.userInfo().lastName}${
        ENVIRONMENT !== 'prod' ? `.${ENVIRONMENT}` : ''
      }.${DOMAIN_NAME}.s3-website.${config.region}.amazonaws.com`,
    };
  };
  newS3Website = async () => {
    const params = {
      Bucket: this.userWebsite().name,
      CreateBucketConfiguration: {
        LocationConstraint: config.region,
      },
      ObjectOwnership: 'ObjectWriter',
    };
    await s3
      .createBucket(params)
      .promise()
      .catch((err: any) => {
        console.log(err);
        if (err.code === 'BucketAlreadyOwnedByYou') {
          return;
        }
      });
    // if bucket return already own message then return url
    await s3
      .waitFor('bucketExists', {Bucket: `${params.Bucket}`})
      .promise()
      .catch((err: any) => {
        return null;
      });

    await setBucketPublicAccess(this.userWebsite().name);

    await setBucketPolicy(this.userWebsite().name);

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
  templateToS3 = async (folder: string) => {
    const userTempFolder = path.join(__dirname, folder);
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
              TTL: 300,
              ResourceRecords: [
                {
                  Value: SERVER_URL,
                },
              ],
            },
          },
        ],
      },
    };
    const subDomain = await route53
      .changeResourceRecordSets(params)
      .promise()
      .catch((err: any) => {
        if (
          err.code === 'InvalidChangeBatch' &&
          err.message.includes('it already exists')
        ) {
          return domain;
        }
        return null;
      });
    if (!subDomain) {
      return null;
    }
    return domain;
  };
  handleRecords = async (domain: string) => {
    // get hosted zone for domain
    const hostedZoneId = await route53
      .listHostedZonesByName({
        DNSName: domain,
      })
      .promise()
      .catch((err: any) => {
        console.log(err);
        return null;
      });
    // if hosted zone HostZones array is empty, then we create a hosted zone for the domain
    if (!hostedZoneId?.HostedZones?.[0]?.Id) {
      // this should create an hosted zone for subdomain or alias, if it is subdomain, we add a dns record for *.resumed.website to the records, and for alias we create an ssl with acm, then add the values to newly alias hosted zone dns record
      const hostedZone = await route53
        .createHostedZone({
          CallerReference: String(generateCode() + new Date().getTime()),
          Name: domain,
          HostedZoneConfig: {
            Comment: 'Auto generated by Resumed',
          },
        })
        .promise()
        .catch(async (err: any) => {
          // if error is HostedZoneAlreadyExists, then we get the hosted zone
          console.log(err);
          return null;
        });
      if (!hostedZone) {
        return null;
      }
      if (domain.includes(DOMAIN_NAME)) {
        // create dns record
        const dnsRecord = await route53
          .changeResourceRecordSets({
            HostedZoneId: hostedZone.HostedZone.Id,
            ChangeBatch: {
              Changes: [
                {
                  Action: 'CREATE',
                  ResourceRecordSet: {
                    Name: AWS_ACM_NAME + domain,
                    Type: 'CNAME',
                    TTL: 300,
                    ResourceRecords: [
                      {
                        Value: AWS_ACM_VALUE,
                      },
                    ],
                  },
                },
              ],
            },
          })
          .promise()
          .catch((err: any) => {
            console.log(err);
            return null;
          });
        if (!dnsRecord) {
          return null;
        }
        await route53
          .waitFor('resourceRecordSetsChanged', {
            Id: hostedZone.ChangeInfo.Id,
          })
          .promise()
          .catch((err: any) => {
            console.log(err);
            return null;
          });
        return domain;
      }

      // create certificate
      const certificate = await this.newCertificate(domain);
      if (!certificate) {
        return null;
      }
      // get certificate dns validation values
      const certificateValidation = await acm
        .describeCertificate({
          CertificateArn: certificate.CertificateArn?.toString() || '',
        })
        .promise()
        .catch((err: any) => {
          console.log(err);
          return null;
        });
      if (!certificateValidation) {
        return null;
      }

      // create dns record with certificate values
      const dnsRecord = await route53
        .changeResourceRecordSets({
          HostedZoneId: hostedZone.HostedZone.Id,
          ChangeBatch: {
            Changes: [
              {
                Action: 'CREATE',
                ResourceRecordSet: {
                  Name: String(
                    certificateValidation.Certificate
                      ?.DomainValidationOptions?.[0]?.ResourceRecord?.Name
                  ),
                  Type: 'CNAME',
                  TTL: 300,
                  ResourceRecords: [
                    {
                      Value: String(
                        certificateValidation.Certificate
                          ?.DomainValidationOptions?.[0]?.ResourceRecord?.Value
                      ),
                    },
                  ],
                },
              },
            ],
          },
        })
        .promise()
        .catch((err: any) => {
          console.log(err);
          return null;
        });
      if (!dnsRecord) {
        return null;
      }
      // wait for dns record to be created
      await route53
        .waitFor('resourceRecordSetsChanged', {
          Id: hostedZone.ChangeInfo.Id,
        })
        .promise()
        .catch((err: any) => {
          console.log(err);
          return null;
        });
      return domain;
    }
    return domain;
  };

  newDistribution = async () => {
    const origin =
      this.userWebsite().bucket ||
      `${this.userWebsite().name}.s3.amazonaws.com`;
    return await cloudfront
      .createDistribution({
        DistributionConfig: {
          CallerReference: origin,
          Comment: origin,
          DefaultCacheBehavior: {
            ForwardedValues: {
              Cookies: {
                Forward: 'none',
              },
              QueryString: false,
            },
            TargetOriginId: origin,
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
                DomainName: origin,
                Id: origin,
                S3OriginConfig: {
                  OriginAccessIdentity: '',
                },
              },
            ],
            Quantity: 1,
          },
        },
      })
      .promise()
      .catch((err: any) => {
        console.log(err);
        return null;
      });
  };
  newCertificate = async (domain: string) => {
    return await acm
      .requestCertificate({
        DomainName: domain,
        ValidationMethod: 'DNS',
      })
      .promise();
  };
  registerDomain = async (
    domain: string,
    autoRenew = false
  ): Promise<boolean> => {
    const domainRegistry = await route53domains
      .registerDomain({
        DomainName: domain,
        DurationInYears: 1,
        AutoRenew: autoRenew,
        AdminContact: {
          ContactType: 'PERSON',
          FirstName: 'Loumonth',
          LastName: 'Jack',
          Email: 'Loumonth.Jack.Jr@gmail.com',
          PhoneNumber: '+1.2253336402',
          AddressLine1: '5883 Highway 18',
          AddressLine2: undefined,
          City: 'Vacherie',
          State: 'LA',
          CountryCode: 'US',
          ZipCode: '70090',
          Fax: undefined,
        },
        RegistrantContact: {
          ContactType: 'PERSON',
          FirstName: 'Loumonth',
          LastName: 'Jack',
          Email: 'Loumonth.Jack.Jr@gmail.com',
          PhoneNumber: '+1.2223336402',
          AddressLine1: '5883 Highway 18',
          AddressLine2: undefined,
          City: 'Vacherie',
          State: 'LA',
          CountryCode: 'US',
          ZipCode: '70090',
          Fax: undefined,
        },
        TechContact: {
          ContactType: 'PERSON',
          FirstName: 'Loumonth',
          LastName: 'Jack',
          Email: 'Loumonth.Jack.Jr@gmail.com',
          PhoneNumber: '+1.2223336402',
          AddressLine1: '5883 Highway 18',
          AddressLine2: undefined,
          City: 'Vacherie',
          State: 'LA',
          CountryCode: 'US',
          ZipCode: '70090',
          Fax: undefined,
        },
      })
      .promise()
      .catch((err: any) => {
        console.log(err);
        return null;
      });
    if (!domainRegistry?.OperationId) {
      return false;
    }
    // check domain status
    const domainStatus = await route53domains
      .getOperationDetail({
        OperationId: domainRegistry.OperationId,
      })
      .promise();
    console.log(domainStatus);
    if (domainStatus?.Status !== 'SUCCESSFUL') {
      if (domainStatus?.Status === 'IN_PROGRESS') {
        await new Promise(resolve => setTimeout(resolve, 10000));
        const status = await route53domains
          .getOperationDetail({
            OperationId: domainRegistry.OperationId,
          })
          .promise();
        if (status?.Status === 'SUCCESSFUL') {
          return true;
        }
        return false;
      }
      return false;
    }
    return true;
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
        // for redirect to https
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
      template: website.template,
      url: '',
      status: STATUS.ERROR,
      alias: null,
      theme: website.theme,
    });
    if (!newWebsite) return ErrorResponse();
  }
  if (website.id) {
    await WebsiteDB.update(user.id, {
      userId: website.userId,
      template: website.template,
      url: '',
      status: startBuilding.status,
      alias: website.alias || null,
      theme: website.theme,
    });
  } else {
    await WebsiteDB.create({
      userId: website.userId,
      template: website.template,
      url: '',
      status: startBuilding.status,
      alias: website.alias || null,
      theme: website.theme,
    });
  }
  /*
  const bucket = await startBuilding.newS3Website();
  if (!bucket) {
    // update status to error
    await WebsiteDB.update(website.userId, {
      ...website,
      status: STATUS.ERROR,
      alias: website.alias || null,
    });
    console.log('Step 1/5: Could not create S3 bucket');
    return ErrorResponse('Step 1/5: Could not create S3 bucket');
  }
  website.url = bucket;
*/
  const domain = await startBuilding.newSubDomain(
    `${user.firstName}-${user.lastName}${
      ENVIRONMENT !== 'prod' ? `.${ENVIRONMENT}` : ''
    }.${DOMAIN_NAME}`
  );
  if (!domain) {
    await WebsiteDB.update(website.userId, {
      ...website,
      status: STATUS.ERROR,
      alias: website.alias || null,
    });
    console.log('Step 2/5: Could not create Route53 subdomain');
    return ErrorResponse('Step 2/5: Could not create Route53 domain');
  }
  website.url = domain;
  // this should create an hosted zone for subdomain or alias, if it is subdomain, we add a dns record for *.resumed.website to the records, and for alias we create an ssl with acm, then add the values to newly alias hosted zone dns record
  const buildWebsite = await startBuilding.handleRecords(
    website.alias || website.url
  );
  console.log(buildWebsite);
  if (!buildWebsite) {
    await WebsiteDB.update(website.userId, {
      ...website,
      status: website.status,
      alias: website.alias || null,
    });
    console.log('Step 3/5: Failed to issue SSL certificate');
    return ErrorResponse('Step 3/5: Failed to issue SSL certificate');
  }
  /*
  const uploadWebsite = await startBuilding.templateToS3();
  if (!uploadWebsite) {
    await WebsiteDB.update(website.userId, {
      ...website,
      status: website.status,
      alias: website.alias || null,
    });
    console.log('Step 4/5: Could not upload template to S3');
    return ErrorResponse('Step 4/5: Template could not be uploaded to S3');
  }
  await startBuilding.deleteTempFolder();*/
  const updateWebsite = await WebsiteDB.update(website.userId, {
    ...website,
    status: STATUS.COMPLETED,
    alias: website.alias || null,
  });
  if (!updateWebsite) {
    console.log('Step 5/5: Could not update website');
    return ErrorResponse('Step 5/5: Could not update website');
  }
  return SuccessResponse({website: updateWebsite});
};
