import express from 'express';
import { UserRoutes } from '../modules/User/user.route';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/users',
    route: UserRoutes,
  },
  // {
  //   path: '/auth',
  //   route: AuthRoutes,
  // },
  // {
  //   path: '/restaurants',
  //   route: RestaurantRoutes,
  // },
  // ... other modules
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
