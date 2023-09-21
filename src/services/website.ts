import User from './user';
import {
  STATUS,
  AWS_HOSTED_ZONE_ID,
  DOMAIN_NAME,
  SERVER_URL,
  ENVIRONMENT,
  AWS_ACM_NAME,
  AWS_ACM_VALUE,
  TEMPLATE,
  TEMPLATE_TYPE,
} from '../constants';
import {UserType, WebsiteType} from '../types';
import {acm, route53domains, route53, generateCode} from '../util/helper';
import {ErrorResponse, SuccessResponse} from '../util/message';
import WebsiteDB from '../models/website';
import BaseService from './base';

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
    template: (typeof TEMPLATE)[TEMPLATE_TYPE];
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
  const domain = await startBuilding.newSubDomain(
    `${user.userName}${
      ENVIRONMENT !== 'prod' ? `.${ENVIRONMENT}` : ''
    }.${DOMAIN_NAME}`
  );
  if (!domain) {
    await WebsiteDB.update(website.userId, {
      ...website,
      status: STATUS.ERROR,
      alias: website.alias || null,
    });
    console.log('Step 1/3: Could not create Route53 subdomain');
    return ErrorResponse('Step 1/3: Could not create Route53 domain');
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
    console.log('Step 2/3: Failed to issue SSL certificate');
    return ErrorResponse('Step 2/3: Failed to issue SSL certificate');
  }

  const updateWebsite = await WebsiteDB.update(website.userId, {
    ...website,
    status: STATUS.COMPLETED,
    alias: website.alias || null,
  });
  if (!updateWebsite) {
    console.log('Step 3/3: Could not update website');
    return ErrorResponse('Step 3/3: Could not update website');
  }
  return SuccessResponse({website: updateWebsite});
};
