import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  MapPin,
  ClipboardList,
  FileBarChart,
  Users,
  Bell,
  Settings,
  User,
  LogOut,
  Menu,
  Shield,
  ChevronDown,
  Activity
} from 'lucide-react';

// Role-based navigation items
const getNavigationItems = (userRole) => {
  const baseItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Activity,
      href: '/dashboard',
      description: 'Overview and analytics',
      roles: ['admin', 'supervisor', 'guard']
    },
    {
      id: 'patrols',
      label: 'Patrol Logs',
      icon: ClipboardList,
      href: '/patrol-logs',
      description: 'View and manage patrol activities',
      roles: ['admin', 'supervisor', 'guard']
    }
  ];

  const adminItems = [
    {
      id: 'checkpoints',
      label: 'Checkpoints',
      icon: MapPin,
      href: '/checkpoints',
      description: 'Manage security checkpoints',
      roles: ['admin', 'supervisor']
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: FileBarChart,
      href: '/reports',
      description: 'Generate and view reports',
      roles: ['admin', 'supervisor']
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      href: '/users',
      description: 'Manage system users',
      roles: ['admin']
    }
  ];

  const allItems = [...baseItems, ...adminItems];
  return allItems.filter(item => item.roles.includes(userRole));
};

const Navbar = ({ activeTab, setActiveTab, user, logout }) => {
  const [unreadCount] = useState(0); // You can connect this to real notifications later

  const navigationItems = user ? getNavigationItems(user.role) : [];

  const handleNavClick = (itemId) => {
    setActiveTab(itemId);
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900">SecureWatch</h1>
              <p className="text-xs text-gray-500">Security Management</p>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={`flex items-center space-x-2 px-3 py-2 ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => handleNavClick(item.id)}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </div>

        {/* User Actions */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="p-3 text-gray-500">
                No new notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                My Account
                <div className="text-xs text-gray-500 font-normal">
                  Role: {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-600" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="flex items-center space-x-2">
                    <Shield className="h-6 w-6 text-blue-600" />
                    <span>SecureWatch</span>
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-2">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    
                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? "default" : "ghost"}
                        className={`w-full justify-start space-x-3 ${
                          isActive ? 'bg-blue-600 text-white' : 'text-gray-600'
                        }`}
                        onClick={() => handleNavClick(item.id)}
                      >
                        <Icon className="h-4 w-4" />
                        <div className="text-left">
                          <div>{item.label}</div>
                          <div className="text-xs opacity-70">{item.description}</div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;