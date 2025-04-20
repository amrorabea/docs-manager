import React, { createContext, useState, useEffect } from 'react';
import { login, logout, refresh } from '../services/authService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyRefreshToken = async () => {
      try {
        const response = await refresh();
        setAuth(response);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    !auth?.accessToken ? verifyRefreshToken() : setLoading(false);
  }, [auth?.accessToken]);

  const handleLogin = async (credentials) => {
    const response = await login(credentials);
    setAuth(response);
    return response;
  };

  const handleLogout = async () => {
    await logout();
    setAuth({});
  };

  return (
    <AuthContext.Provider value={{ auth, setAuth, login: handleLogin, logout: handleLogout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;