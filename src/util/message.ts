import {
  ERROR_RESPONSE as ERROR,
  SUCCESS_RESPONSE as RESPONSE,
} from '../constants';

export interface BaseResponse {
  field?: Record<string, unknown> | Array<Record<string, unknown>>;
  message?: string;
  code: number;
}

export const ErrorResponse = (type?: string, entity?: string): BaseResponse => {
  if (!type) return {message: ERROR.MESSAGE.GENERIC, code: 500};
  switch (type) {
    case 'unauthorized':
      return {message: ERROR.MESSAGE.UNAUTHORIZED, code: 401};
    case 'expired':
      return {message: ERROR.MESSAGE.EXPIRED, code: 401};
    case 'not_found':
      return {message: ERROR.MESSAGE.NOT_FOUND, code: 400};
    case 'invalid':
      return {message: ERROR.MESSAGE.INVALID, code: 400};
    case 'missing':
      return {message: ERROR.MESSAGE.MISSING, code: 400};
    case 'already_exist':
      return {
        message: ERROR.MESSAGE.ALREADY_EXIST(entity || ''),
        code: 400,
      };
    default:
      return {message: type, code: 500};
  }
};

export const SuccessResponse = (
  field: Record<string, unknown> | Array<Record<string, unknown>>,
  type?: string
): BaseResponse & Record<string, unknown> => {
  return {
    message: RESPONSE.MESSAGE.SUCCESS(type || ''),
    code: 200,
    ...field,
  };
};
