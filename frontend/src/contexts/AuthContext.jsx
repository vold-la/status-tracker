import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { useToast } from '@/hooks/use-toast';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Add this line
  const { toast } = useToast();

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await axiosInstance.get('/api/auth/me');
        setUser(response.data.user);
        setOrganization(response.data.organization);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Auth verification failed:', error);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await axiosInstance.post('/api/auth/login', credentials);
      const { access_token, refresh_token, user: userData, organization } = response.data;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('refreshToken', refresh_token);
      
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setIsAuthenticated(true);
      setUser(userData);
      setOrganization(organization);
      
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Invalid email or password';
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    
    delete axiosInstance.defaults.headers.common['Authorization'];
    
    setUser(null);
    setOrganization(null);
    setIsAuthenticated(false);
  };

  const register = async (userData) => {
    try {
      const response = await axiosInstance.post('/api/auth/register', userData);
      toast({
        title: "Success",
        description: "Registration successful! Please login.",
        variant: "default",
      });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateOrganization = async (orgData) => {
    try {
      const response = await axiosInstance.put(`/api/organizations/${organization.id}`, orgData);
      setOrganization(response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const inviteTeamMember = async (email, role) => {
    try {
      const response = await axiosInstance.post(`/api/organizations/${organization.id}/invite`, {
        email,
        role
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{
        user,
        organization,
        loading,
        isAuthenticated,
        login,
        logout,
        register,
        updateOrganization,
        inviteTeamMember
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};