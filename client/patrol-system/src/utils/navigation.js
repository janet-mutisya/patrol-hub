
export const getNavigationItems = (userRole) => {
  const baseItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/',
      roles: ['admin','guard']
    },
    {
      id: 'patrol-logs',
      label: 'Patrol Logs',
      path: '/patrol-logs',
      roles: ['admin','guard']
    }
  ];

  const adminItems = [
    {
      id: 'checkpoints',
      label: 'Checkpoints',
      path: '/checkpoints',
      roles: ['admin']
    },
    {
      id: 'reports',
      label: 'Reports',
      path: '/reports',
      roles: ['admin']
    },
    {
      id: 'users',
      label: 'Users',
      path: '/users',
      roles: ['admin']
    }
  ];

  const allItems = [...baseItems, ...adminItems];
  return allItems.filter(item => item.roles.includes(userRole));
};

// Get active tab from current path
export const getActiveTabFromPath = (pathname) => {
  if (pathname.includes('/checkpoints')) return 'checkpoints';
  if (pathname.includes('/patrol-logs')) return 'patrol-logs';
  if (pathname.includes('/reports')) return 'reports';
  if (pathname.includes('/users')) return 'users';
  return 'dashboard';
};

// Role-based route permissions
export const getRoutePermissions = () => ({
  '/': ['admin', 'guard'],
  '/checkpoints': ['admin'],
  '/patrol-logs': ['admin', 'guard'],
  '/reports': ['admin'],
  '/users': ['admin']
});