require('dotenv').config();

import AuthRoute from './routes/rest/auth';
import http from 'http';
import express from 'express';
import { Middleware } from './services/auth';
import { SERVER_URL, SUCCESS_RESPONSE } from './constants';

const expressServer = async () => {
  const app = express();
  
  app.use(express.json());
  app.use(express.urlencoded({extended: true}));

  app.get('/', (req, res) => {
    res.redirect(SERVER_URL+'/graphql');
  });
  app.get('/health-check', (req, res) => {
    res.status(200).send('OK');
  });

  
  app.use(AuthRoute.webhook);

  app.use(Middleware.checkAuth);
  setInterval(Middleware.removeInvalidSessions, 1000 * 60 * 1);
  // start express server on port 5000
  const server = http.createServer(app);
  server.listen(5500, () => {
    console.log(SUCCESS_RESPONSE.MESSAGE.RUNNING(`🚀http://localhost:5500/`));
  })
  return server;
};

expressServer();
