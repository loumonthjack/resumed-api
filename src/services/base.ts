import {SuccessResponse} from '../util/message';

// Used for Services that do not need generateId method
export class BaseExternal<T extends string> {
  name!: T;
  response = (
    field: Record<string, unknown> | Array<Record<string, unknown>>
  ): ReturnType<typeof SuccessResponse> => {
    return SuccessResponse(field, this.name);
  };
}

class BaseService<T extends string> extends BaseExternal<T> {
  constructor() {
    super();
  }
}

export default BaseService;
