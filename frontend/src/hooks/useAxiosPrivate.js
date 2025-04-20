import { useEffect } from 'react';
import { axiosPrivate } from '../services/api';
import useAuth from './useAuth';

const useAxiosPrivate = () => {
  const { auth, setAuth } = useAuth();

  useEffect(() => {
    const requestIntercept = axiosPrivate.interceptors.request.use(
      config => {
        if (!config.headers['Authorization']) {
          config.headers['Authorization'] = `Bearer ${auth?.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseIntercept = axiosPrivate.interceptors.response.use(
      response => response,
      async (error) => {
        const prevRequest = error?.config;
        if (error?.response?.status === 403 && !prevRequest?.sent) {
          prevRequest.sent = true;
          try {
            const response = await axiosPrivate.get('/refresh');
            setAuth(prev => ({
              ...prev,
              accessToken: response.data.accessToken
            }));
            prevRequest.headers['Authorization'] = `Bearer ${response.data.accessToken}`;
            return axiosPrivate(prevRequest);
          } catch (err) {
            return Promise.reject(err);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axiosPrivate.interceptors.request.eject(requestIntercept);
      axiosPrivate.interceptors.response.eject(responseIntercept);
    };
  }, [auth, setAuth]);

  return axiosPrivate;
};

export default useAxiosPrivate;