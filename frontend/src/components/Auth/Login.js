import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { loginRequest } from '../../services/api';
import './Auth.css';

const Login = () => {
  const { auth, login } = useAuth();  // Destructure auth from useAuth
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the page user was trying to access before being redirected to login
  const from = location.state?.from?.pathname || '/';
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear error when inputs change
  useEffect(() => {
    if (error) setError('');
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.email || !formData.password) {
        throw new Error('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      }

      // Use the loginRequest function to get token
      const loginData = await loginRequest({
        email: formData.email.trim(),
        password: formData.password
      });

      // Use the login function from useAuth
      if (loginData?.accessToken) {
        await login(loginData);  // Changed from auth.login to login
        navigate(from, { replace: true });
      } else {
        throw new Error('فشل تسجيل الدخول');
      }
    } catch (err) {
      console.error('Login error:', err);
      // Handle specific error types
      if (err.response?.status === 401) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else if (err.response?.status === 429) {
        setError('محاولات كثيرة للدخول. الرجاء المحاولة لاحقاً');
      } else {
        setError(err.message || 'حدث خطأ أثناء تسجيل الدخول');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">تسجيل الدخول</h2>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">البريد الإلكتروني</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="form-control"
              placeholder="أدخل بريدك الإلكتروني"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">كلمة المرور</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="form-control"
              placeholder="أدخل كلمة المرور"
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button" 
            disabled={loading}
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;