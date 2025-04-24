import React, { useState, useEffect, useCallback } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAuth from '../../hooks/useAuth';
import useAdminProtection from '../../hooks/useAdminProtection';
import Button from '../UI/Button';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    password: '' // Added for new user creation
  });
  const axiosPrivate = useAxiosPrivate();
  const { isAdmin } = useAuth();
  // Add admin protection to prevent direct URL access
  const { hasAccess } = useAdminProtection();

  // Use useCallback to prevent unnecessary re-renders
  const fetchUsers = useCallback(async () => {
    // Don't attempt to fetch if not admin
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await axiosPrivate.get('/api/users/all');
      
      // Validate response data
      if (Array.isArray(response.data)) {
        setUsers(response.data);
      } else {
        throw new Error('Invalid response format');
      }
      
      setLoading(false);
    } catch (err) {
      // Skip error handling for canceled requests
      if (err.isCanceled) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('User fetch request was canceled');
        }
        // Just stop loading without setting an error
        setLoading(false);
        return;
      }
      
      console.error('Error fetching users:', err);
      
      let errorMessage = 'Failed to fetch users';
      
      if (err.response) {
        console.error('Server response error:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
        
        if (err.response.status === 401) {
          errorMessage = 'Unauthorized: Please log in again';
        } else if (err.response.status === 403) {
          errorMessage = 'Forbidden: You do not have permission to view users';
        } else if (err.response.status === 404) {
          errorMessage = 'API endpoint not found';
        } else if (err.response.status >= 500) {
          errorMessage = 'Server error: Please try again later';
        }
      } else if (err.request) {
        console.error('No response received:', err.request);
        errorMessage = 'No response from server. Please check your connection.';
      } else if (err.message) {
        // Only log setup errors that aren't cancellations
        if (!err.message.includes('canceled') && !err.message.includes('abort')) {
          console.error('Request setup error:', err.message);
          errorMessage = `Request error: ${err.message}`;
        } else {
          // For cancellation, just return without setting an error
          setLoading(false);
          return;
        }
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  }, [axiosPrivate, isAdmin]);

  // Extra security check to ensure admin rights on the page load
  useEffect(() => {
    if (!isAdmin) {
      setError('Unauthorized: Admin access required');
      return; // Don't fetch users if not admin
    }
    
    fetchUsers();
    
    // Cleanup function for canceling requests
    return () => {
      // Any cleanup if needed
    };
  }, [isAdmin, fetchUsers]);

  const handleDeleteUser = async (userId) => {
    // Prevent deleting if already in progress
    if (actionInProgress) return;
    
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا المستخدم؟')) {
      try {
        setActionInProgress(true);
        setLoading(true); // Show loading state
        
        const response = await axiosPrivate.delete(`/api/users/delete/${userId}`);
        
        // Verify deletion was successful
        if (response.status >= 200 && response.status < 300) {
          // Update the users list by filtering out the deleted user
          setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
          // Show success message
          alert('تم حذف المستخدم بنجاح');
        } else {
          throw new Error('Failed to delete user');
        }
      } catch (err) {
        // Skip error handling for canceled requests
        if (err.isCanceled) {
          setLoading(false);
          setActionInProgress(false);
          return;
        }
        
        console.error(`Error deleting user ${userId}:`, err);
        
        let errorMessage = 'فشل في حذف المستخدم. الرجاء المحاولة مرة أخرى.';
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message;
        }
        
        alert(errorMessage);
      } finally {
        setLoading(false);
        setActionInProgress(false);
      }
    }
  };

  // Function to start editing a user
  const handleEditUser = (user) => {
    if (actionInProgress) return;
    
    setIsAddingUser(false);
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role || (user.isAdmin ? 'admin' : 'user'),
      password: '' // Clear password field when editing
    });
  };

  // Function to start adding a new user
  const handleAddUser = () => {
    if (actionInProgress) return;
    
    setEditingUser(null);
    setIsAddingUser(true);
    setFormData({
      name: '',
      email: '',
      role: 'user', // Set default role
      password: ''
    });
  };

  // Function to handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  // Modify the handleSaveUser function
  const handleSaveUser = async (e) => {
    e.preventDefault();
    
    // Prevent submitting if already in progress
    if (actionInProgress) return;
    
    // Basic validation
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('الرجاء إدخال بريد إلكتروني صحيح');
      return;
    }
    
    try {
      setActionInProgress(true);
      setLoading(true);
      
      // Prepare user data - always set role as 'user' for both new and existing users
      const userData = {
        ...formData,
        role: 'user',
        isAdmin: false // Ensure isAdmin is always false
      };
      
      if (isAddingUser) {
        // Create new user
        if (!userData.password) {
          alert('كلمة المرور مطلوبة لإنشاء مستخدم جديد');
          setLoading(false);
          setActionInProgress(false);
          return;
        }
        
        // Password validation
        if (userData.password.length < 8) {
          alert('يجب أن تكون كلمة المرور 8 أحرف على الأقل');
          setLoading(false);
          setActionInProgress(false);
          return;
        }
        
        const response = await axiosPrivate.post('/api/users/register', userData);
        
        // Verify creation was successful
        if (response.status >= 200 && response.status < 300) {
          setIsAddingUser(false);
        } else {
          throw new Error('Failed to create user');
        }
      } else if (editingUser) {
        // Update existing user - remove role from update
        delete userData.role; // Remove role from update data
        delete userData.isAdmin; // Remove isAdmin from update data
        
        // If password is empty, remove it from the request
        if (!userData.password) {
          delete userData.password;
        } else if (userData.password.length < 8) {
          // Password validation if provided
          alert('يجب أن تكون كلمة المرور 8 أحرف على الأقل');
          setLoading(false);
          setActionInProgress(false);
          return;
        }
        
        const response = await axiosPrivate.put(`/api/users/update/${editingUser._id}`, userData);
        
        // Verify update was successful
        if (response.status >= 200 && response.status < 300) {
          setEditingUser(null);
        } else {
          throw new Error('Failed to update user');
        }
      }
      
      fetchUsers();
    } catch (err) {
      // Skip error handling for canceled requests
      if (err.isCanceled) {
        setLoading(false);
        setActionInProgress(false);
        return;
      }
      
      console.error('Error saving user:', err);
      
      let errorMessage = 'فشل في حفظ المستخدم. الرجاء المحاولة مرة أخرى.';
      
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      } else if (err.response && err.response.status === 409) {
        errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
      setActionInProgress(false);
    }
  };

  // Function to cancel editing/adding
  const handleCancel = () => {
    if (actionInProgress) return;
    
    setEditingUser(null);
    setIsAddingUser(false);
  };

  const retryFetch = () => {
    fetchUsers();
  };

  // Show loading only when initially loading users, not during other operations
  if (loading && !editingUser && !isAddingUser && !actionInProgress) {
    return <div className="loading">جاري التحميل...</div>;
  }
  
  if (error) {
    return (
      <div className="error-container">
        <div className="error">{error}</div>
        <button className="retry-btn" onClick={retryFetch}>إعادة المحاولة</button>
      </div>
    );
  }

  // If we're editing or adding a user, show the form
  if (editingUser || isAddingUser) {
    return (
      <div className="edit-user-container">
        <h1 className="edit-user-title">
          {isAddingUser ? 'إضافة مستخدم جديد' : 'تعديل المستخدم'}
        </h1>
        
        <form onSubmit={handleSaveUser} className="user-form">
          <div className="form-group">
            <label htmlFor="name">الاسم</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="form-control"
              disabled={actionInProgress}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">البريد الإلكتروني</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="form-control"
              disabled={actionInProgress}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">
              كلمة المرور {!isAddingUser && '(اتركها فارغة إذا لم ترغب في تغييرها)'}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required={isAddingUser}
              className="form-control"
              disabled={actionInProgress}
              minLength={8}
            />
          </div>
          
          {/* Remove the role selection completely */}
          <input type="hidden" name="role" value="user" />
          
          <div className="form-actions">
            <button 
              type="submit" 
              className="save-btn"
              disabled={actionInProgress || loading}
            >
              {actionInProgress ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={handleCancel}
              disabled={actionInProgress || loading}
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="users-container">
      <h1 className="users-title">إدارة المستخدمين</h1>
      
      <div className="users-actions">
        {isAdmin && (
          <Button 
            onClick={handleAddUser} 
            variant="primary"
            disabled={actionInProgress}
          >
            إضافة مستخدم جديد
          </Button>
        )}
      </div>
      
      {/* Show loading indicator during operations */}
      {actionInProgress && <div className="action-loading">جاري تنفيذ العملية...</div>}
      
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد الإلكتروني</th>
              <th>نوع المستخدم</th>
              <th>تاريخ التسجيل</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users
                .filter(user => !user.isAdmin && user.role !== 'admin')
                .map(user => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className="role-badge user">
                        مستخدم
                      </span>
                    </td>
                    <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    }) : 'N/A'}</td>
                    <td className="actions">
                      {isAdmin && (
                        <>
                          <button 
                            className="edit-btn" 
                            onClick={() => handleEditUser(user)}
                            disabled={actionInProgress}
                          >
                            تعديل
                          </button>
                          <button 
                            className="delete-btn" 
                            onClick={() => handleDeleteUser(user._id)}
                            disabled={actionInProgress}
                          >
                            حذف
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="no-users">لا يوجد مستخدمين</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {!isAdmin && !users.length && (
        <div className="admin-notice">
          <p>فقط المسؤولون يمكنهم إضافة أو تعديل أو حذف المستخدمين.</p>
        </div>
      )}
    </div>
  );
};

export default Users;