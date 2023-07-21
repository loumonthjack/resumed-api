import Login from './login';
import Webhook from './webhook';
import Logout from './logout';
import Check from './middleware';
import Register from './register';
import Verify from './verify';

const AuthRouteName = (endpoint: string): string => `/auth${endpoint}`;

const AuthRoutes = {
  webhook: Webhook('/payments'),
  check: Check(AuthRouteName('/check')),
};

export default AuthRoutes;
