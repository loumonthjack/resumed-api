import Login from './login';
import Webhook from './webhook';
import Logout from './logout';
import Check from './middleware';
import Register from './register';
import Verify from './verify';

const AuthRouteName = (endpoint: string): string => `/auth${endpoint}`;

const AuthRoutes = {
  login: Login(AuthRouteName('/login')),
  webhook: Webhook(AuthRouteName('/payment/webhook')),
  logout: Logout(AuthRouteName('/logout')),
  check: Check(AuthRouteName('/check')),
  register: Register(AuthRouteName('/register')),
  verify: Verify(AuthRouteName('/verify')),
};

export default AuthRoutes;
