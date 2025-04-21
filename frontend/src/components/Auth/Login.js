import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './Auth.css';

const Login = () => {
  const { login, error: authError, loading: authLoading } = useAuth();
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

    // Simple validation
    if (!formData.email || !formData.password) {
      setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting to login with:', formData.email);
      await login(formData);
      // Navigate to the page they were trying to access, or home
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      
      // Set error message based on error response
      let errorMessage = 'فشل تسجيل الدخول. يرجى التحقق من البريد الإلكتروني وكلمة المرور.';
      
      if (err.response) {
        // If we have a server response with a message
        if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.status === 401) {
          errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        } else if (err.response.status === 403) {
          errorMessage = 'حسابك غير مفعل. الرجاء التواصل مع الإدارة.';
        }
      } else if (err.request) {
        // If no response was received
        errorMessage = 'لا يمكن الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">تسجيل الدخول</h2>
        
        {error && <div className="auth-error">{error}</div>}
        {authError && !error && <div className="auth-error">{authError}</div>}
        
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
              disabled={loading || authLoading}
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
              disabled={loading || authLoading}
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button" 
            disabled={loading || authLoading}
          >
            {loading || authLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
        
        <div className="auth-links">
          <p>ليس لديك حساب؟ <Link to="/register">إنشاء حساب جديد</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;