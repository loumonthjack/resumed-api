import {ApolloServer} from 'apollo-server-express';
import {rateLimitDirective} from 'graphql-rate-limit-directive';
import depthLimit from 'graphql-depth-limit';
import {makeExecutableSchema} from '@graphql-tools/schema';
import {
  ApolloServerPluginDrainHttpServer,
  ApolloServerPluginLandingPageLocalDefault,
} from 'apollo-server-core';
require('dotenv').config();
import express from 'express';
import http from 'http';
import cors from 'cors';

import {PORT, ALLOWED_ORIGINS, SUCCESS_RESPONSE, SERVER_URL} from './constants';
import {Middleware, authorizeSession} from './services/auth';
import AuthRoute from './routes/rest/auth';
import resolvers from './routes/graphql/index';
import typeDefs from './routes/graphql/types';

const expressServer = async () => {
  const app = express();
  const whitelist = ALLOWED_ORIGINS;
  const corsOptions = {
    origin: function (origin: any, callback: any) {
      if (!origin || whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  };
  if (process.env.NODE_ENV !== 'local') app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({extended: true}));

  app.get('/', (req, res) => {
    res.status(200).send('Hello World!');
  });

  app.use(AuthRoute.login);
  app.use(AuthRoute.register);
  app.use(AuthRoute.verify);
  app.use(AuthRoute.check);
  app.use(AuthRoute.webhook);
  app.use(AuthRoute.logout);

  app.use(Middleware.checkAuth);
  setInterval(Middleware.removeInvalidSessions, 1000 * 60 * 1);
  return app;
};

async function apolloServer(app: any, typeDefs: any, resolvers: any) {
  const httpServer = http.createServer(app);
  const {rateLimitDirectiveTypeDefs, rateLimitDirectiveTransformer} =
    rateLimitDirective();
  const schema = makeExecutableSchema({
    typeDefs: [typeDefs, rateLimitDirectiveTypeDefs],
    resolvers: resolvers,
  });
  const graphQLServer = new ApolloServer({
    schema: rateLimitDirectiveTransformer(schema),
    validationRules: [depthLimit(10)],
    csrfPrevention: true,
    cache: 'bounded',
    context: async ({req}) => {
      const {authorization} = req.headers;
      return authorization
        ? await authorizeSession(authorization)
        : await authorizeSession('');
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({httpServer}),
      ApolloServerPluginLandingPageLocalDefault({embed: true}),
    ],
  });

  await graphQLServer.start();
  graphQLServer.applyMiddleware({app: app, path: '/graphql'});
  await new Promise<void>(resolve => httpServer.listen({port: PORT}, resolve));

  console.log(SUCCESS_RESPONSE.MESSAGE.RUNNING(`🚀${SERVER_URL}/`));
}

async function startApolloServer(typeDefs: any, resolvers: any) {
  await apolloServer(await expressServer(), typeDefs, resolvers);
}
startApolloServer(typeDefs, resolvers);
