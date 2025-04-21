import React, { useState, useEffect } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import useAuth from '../../hooks/useAuth';
import Button from '../UI/Button';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    password: '' // Added for new user creation
  });
  const axiosPrivate = useAxiosPrivate();
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosPrivate.get('/api/users/all');
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
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
      } else {
        console.error('Request setup error:', err.message);
        errorMessage = `Request error: ${err.message}`;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا المستخدم؟')) {
      try {
        await axiosPrivate.delete(`/api/users/delete/${userId}`);
        fetchUsers();
      } catch (err) {
        console.error(`Error deleting user ${userId}:`, err);
        alert('فشل في حذف المستخدم. الرجاء المحاولة مرة أخرى.');
      }
    }
  };

  // Function to start editing a user
  const handleEditUser = (user) => {
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
    setEditingUser(null);
    setIsAddingUser(true);
    setFormData({
      name: '',
      email: '',
      role: 'user',
      password: ''
    });
  };

  // Function to handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Function to save edited user
  const handleSaveUser = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Prepare user data
      const userData = {
        ...formData,
        isAdmin: formData.role === 'admin'
      };
      
      if (isAddingUser) {
        // Create new user
        if (!userData.password) {
          alert('كلمة المرور مطلوبة لإنشاء مستخدم جديد');
          setLoading(false);
          return;
        }
        
        await axiosPrivate.post('/api/users/register', userData);
        setIsAddingUser(false);
      } else if (editingUser) {
        // Update existing user
        // If password is empty, remove it from the request
        if (!userData.password) {
          delete userData.password;
        }
        
        await axiosPrivate.put(`/api/users/update/${editingUser._id}`, userData);
        setEditingUser(null);
      }
      
      fetchUsers();
    } catch (err) {
      console.error('Error saving user:', err);
      
      let errorMessage = 'فشل في حفظ المستخدم. الرجاء المحاولة مرة أخرى.';
      
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      } else if (err.response && err.response.status === 409) {
        errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
      }
      
      alert(errorMessage);
      setLoading(false);
    }
  };

  // Function to cancel editing/adding
  const handleCancel = () => {
    setEditingUser(null);
    setIsAddingUser(false);
  };

  const retryFetch = () => {
    fetchUsers();
  };

  if (loading && !editingUser && !isAddingUser) return <div className="loading">جاري التحميل...</div>;
  
  if (error) return (
    <div className="error-container">
      <div className="error">{error}</div>
      <button className="retry-btn" onClick={retryFetch}>إعادة المحاولة</button>
    </div>
  );

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
              required={isAddingUser} // Only required when adding a new user
              className="form-control"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="role">نوع المستخدم</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="form-control"
            >
              <option value="user">مستخدم</option>
              <option value="admin">مدير</option>
            </select>
          </div>
          
          <div className="form-actions">
            <button 
              type="submit" 
              className="save-btn"
              disabled={loading}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={handleCancel}
              disabled={loading}
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
          >
            إضافة مستخدم جديد
          </Button>
        )}
      </div>
      
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
              users.map(user => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role === 'admin' || user.isAdmin ? 'مدير' : 'مستخدم'}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString('ar-SA')}</td>
                  <td className="actions">
                    {isAdmin ? (
                      <>
                        <button 
                          className="edit-btn" 
                          onClick={() => handleEditUser(user)}
                        >
                          تعديل
                        </button>
                        <button 
                          className="delete-btn" 
                          onClick={() => handleDeleteUser(user._id)}
                        >
                          حذف
                        </button>
                      </>
                    ) : (
                      <span className="user-info-text">للإدارة فقط</span>
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