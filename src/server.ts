import { ApolloServer } from 'apollo-server';
import { expressMiddleware } from '@apollo/server/express4';
import serverlessExpress from '@vendia/serverless-express';
import { rateLimitDirective } from 'graphql-rate-limit-directive';
import depthLimit from 'graphql-depth-limit';
import { makeExecutableSchema } from '@graphql-tools/schema';
import {
  ApolloServerPluginInlineTrace,
  ApolloServerPluginLandingPageLocalDefault,
} from 'apollo-server-core';
require('dotenv').config();

import { PORT, SUCCESS_RESPONSE, SERVER_URL } from './constants';
import { authorize } from './services/auth';
import AuthRoute from './routes/rest/auth';
import resolvers from './routes/graphql/index';
import typeDefs from './routes/graphql/schema';
import { cookieName, setCookies, isLocal } from './routes/helper';
import { applyMiddleware } from "graphql-middleware";
import shield from './routes/graphql/shield';

async function apolloServer( typeDefs: any, resolvers: any) {
  const { rateLimitDirectiveTypeDefs, rateLimitDirectiveTransformer } =
    rateLimitDirective();
  const schema = makeExecutableSchema({
    typeDefs: [typeDefs, rateLimitDirectiveTypeDefs],
    resolvers: resolvers,
  });
  const graphQLServer = new ApolloServer({
    schema: applyMiddleware(rateLimitDirectiveTransformer(schema), shield),
    validationRules: [depthLimit(3)],
    csrfPrevention: true,
    cache: 'bounded',
    context: async ({ req, res }) => {
      let token: string | undefined;
      const cookieTokenName = cookieName("resumed-token");
      if (req.headers.authorization !== undefined) {
        token = req.headers.authorization.substring("Bearer ".length);
      } else if (req.cookies && req.cookies[cookieTokenName] !== undefined) {
        token = req.cookies[cookieTokenName];
      }
      const session = await authorize(token, req.body.query);
      return {
        req,
        res,
        token,
        session,
        cookies: [],
        setCookies: [], // do not work with multiple cookies
        setHeaders: [],
      };
    },
    formatResponse: (response, requestContext: any) => {
      const cookies = requestContext.context.cookies;
      for (const cookie of cookies) {
        requestContext.context.res.cookie(
          cookie.name,
          cookie.value,
          cookie.options
        );
      }

      return response;
    },
    plugins: [
      ApolloServerPluginLandingPageLocalDefault({ embed: true }),
      ApolloServerPluginInlineTrace(),
    ],
  });

  await graphQLServer.listen({ port: PORT  });
  console.log(SUCCESS_RESPONSE.MESSAGE.RUNNING(`🚀${SERVER_URL}/`));
}

apolloServer(typeDefs, resolvers);