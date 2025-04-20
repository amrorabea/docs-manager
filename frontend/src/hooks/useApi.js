import { useState, useEffect, useCallback, useRef } from 'react';
import { axiosPrivate, clearCache } from '../services/api';

/**
 * Custom hook for making API requests with built-in caching, loading states,
 * error handling, and automatic retry capabilities.
 */
export const useApi = (initialUrl = null, initialOptions = {}) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState(initialUrl);
  const [options, setOptions] = useState(initialOptions);
  const controller = useRef(null);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  const fetchData = useCallback(async (fetchUrl = url, fetchOptions = options) => {
    // Don't fetch if no URL is provided
    if (!fetchUrl) {
      return;
    }

    // Cancel any ongoing requests
    if (controller.current) {
      controller.current.abort();
    }
    controller.current = new AbortController();
    
    const {
      method = 'get',
      body = null,
      params = null,
      headers = {},
      useCache = true,
      cacheKey = '',
      debounce = false,
      onSuccess = null,
      onError = null
    } = fetchOptions;

    setLoading(true);
    setError(null);

    try {
      const response = await axiosPrivate({
        url: fetchUrl,
        method,
        data: body,
        params,
        headers,
        signal: controller.current.signal,
        cache: useCache,
        debounce,
        _cacheKey: cacheKey // Custom property for identifying cache
      });

      const responseData = response.data;
      setData(responseData);
      
      // Reset retry count on success
      retryCount.current = 0;
      
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(responseData);
      }
      
      return responseData;
    } catch (err) {
      // Don't handle aborted requests as errors
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        return;
      }

      // Implement retry logic for network errors or 5xx server errors
      if (
        (err.message === 'Network Error' || (err.response && err.response.status >= 500)) &&
        retryCount.current < MAX_RETRIES
      ) {
        retryCount.current += 1;
        const retryDelay = 1000 * Math.pow(2, retryCount.current - 1); // Exponential backoff
        
        console.warn(`API call failed, retrying in ${retryDelay}ms (${retryCount.current}/${MAX_RETRIES})`);
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetchData(fetchUrl, fetchOptions);
      }

      // Set error state if max retries reached or other error
      setError(err);
      
      if (onError && typeof onError === 'function') {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  // Refetch data
  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  // Update request parameters
  const updateRequest = useCallback((newUrl = null, newOptions = {}) => {
    if (newUrl !== null) {
      setUrl(newUrl);
    }
    
    setOptions(prevOptions => ({
      ...prevOptions,
      ...newOptions
    }));
  }, []);

  // Clear related cache
  const invalidateCache = useCallback((cachePattern = null) => {
    clearCache(cachePattern || url);
  }, [url]);

  // Fetch data automatically when URL or options change
  useEffect(() => {
    if (url) {
      fetchData();
    }
    
    return () => {
      // Cancel request on unmount
      if (controller.current) {
        controller.current.abort();
      }
    };
  }, [url, fetchData]);

  return {
    data,
    error,
    loading,
    fetchData,
    refetch,
    updateRequest,
    invalidateCache
  };
};

export default useApi; 