// hooks/useAuth.js - React Router version
import { useState, useEffect } from 'react';
import { apiCall } from '../api/config';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
        if (!token) {
          setLoading(false);
          return;
        }

        const userData = await apiCall('/auth/me');
        setUser(userData.user || userData);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        sessionStorage.removeItem('auth_token');
        localStorage.removeItem('auth_token');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await apiCall('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      sessionStorage.removeItem('auth_token');
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  return { user, loading, logout };
};