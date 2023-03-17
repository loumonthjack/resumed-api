import {ErrorResponse, SuccessResponse, BaseResponse} from '../util/message';
import {cloudwatch} from '../util/helper';
import {NODE_ENV} from '../constants';
import {LOG_STATUSES, SERVICE_NAMES} from '../types';
import {Request} from 'express';

class LogService {
  name = 'LogService';
  response = (
    field: Record<string, unknown> | Array<Record<string, unknown>>
  ): ReturnType<typeof SuccessResponse> => {
    return SuccessResponse(field, this.name);
  };
  async create(args: {
    message: string | {[key: string]: any};
    service: SERVICE_NAMES;
    level: LOG_STATUSES;
    stack?: {
      request?: any;
      response?: any;
    };
  }): Promise<BaseResponse> {
    const groupName = `RESUMED_LOGS/${NODE_ENV.toUpperCase()}`;
    const today = new Date();
    const streamName = `${
      today.getMonth() + 1
    }/${today.getDate()}/${today.getFullYear()}`;

    const logGroupExists = await cloudwatch
      .describeLogGroups({
        logGroupNamePrefix: groupName,
      })
      .promise();
    if (!logGroupExists.logGroups) return ErrorResponse();
    if (logGroupExists.logGroups.length === 0) {
      await cloudwatch
        .createLogGroup({
          logGroupName: groupName,
        })
        .promise()
        .catch(err => {
          return;
        });
    }

    const logStreamExists = await cloudwatch
      .describeLogStreams({
        logGroupName: groupName,
        logStreamNamePrefix: streamName,
      })
      .promise();
    if (!logStreamExists.logStreams) return ErrorResponse();
    if (logStreamExists.logStreams.length === 0) {
      await cloudwatch
        .createLogStream({
          logGroupName: groupName,
          logStreamName: streamName,
        })
        .promise()
        .catch(err => {
          return;
        });
    }

    const sequenceToken = await cloudwatch
      .describeLogStreams({
        logGroupName: groupName,
        logStreamNamePrefix: streamName,
      })
      .promise();
    if (!sequenceToken.logStreams) return ErrorResponse();
    const sequenceTokenValue = sequenceToken.logStreams[0].uploadSequenceToken;
    if (!sequenceTokenValue) {
      await cloudwatch
        .putLogEvents({
          logGroupName: groupName,
          logStreamName: streamName,
          logEvents: [
            {
              message: `${JSON.stringify({
                message: args.message,
                level: args.level,
                request: {
                  method: args.stack?.request?.method,
                  body: args.stack?.request?.body,
                  headers: args.stack?.request?.headers,
                  params: args.stack?.request?.params,
                  query: args.stack?.request?.query,
                  originalUrl: args.stack?.request?.originalUrl,
                },
              })}`,
              timestamp: Date.now(),
            },
          ],
        })
        .promise()
        .catch(err => {
          return;
        });
    } else {
      await cloudwatch
        .putLogEvents({
          logGroupName: groupName,
          logStreamName: streamName,
          logEvents: [
            {
              message: `${JSON.stringify({
                message: args.message,
                level: args.level,
                request: args.stack?.request?.method
                  ? {
                      method: args.stack?.request?.method,
                      body: args.stack?.request?.body,
                      headers: args.stack?.request?.headers,
                      params: args.stack?.request?.params,
                      query: args.stack?.request?.query,
                      originalUrl: args.stack?.request?.originalUrl,
                    }
                  : args.stack?.request,
                response: {
                  code: args.stack?.response?.code,
                },
              })}`,
              timestamp: Date.now(),
            },
          ],
          sequenceToken: sequenceToken.logStreams[0].uploadSequenceToken,
        })
        .promise()
        .catch(err => {
          return;
        });
    }
    return this.response({success: true});
  }
}

const Logger = new LogService();

export const LogEvent = async (
  code: number,
  serviceName: SERVICE_NAMES,
  service: BaseResponse,
  request: Request
): Promise<BaseResponse | undefined> => {
  const log = {
    message: service,
    service: serviceName,
    stack: {
      request: request,
    },
  };
  if (code === 200) {
    return await Logger.create({
      ...log,
      level: 'INFO',
    });
  }
  if (code >= 400 && code < 500) {
    return await Logger.create({
      ...log,
      level: 'WARN',
    });
  }
  if (code === 500) {
    return await Logger.create({
      ...log,
      level: 'ERROR',
    });
  }
};
