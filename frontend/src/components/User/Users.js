import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    isAdmin: false
  });
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();

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
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin
    });
  };

  // Function to handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Function to save edited user
  const handleSaveUser = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await axiosPrivate.put(`/api/users/update/${editingUser._id}`, formData);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      alert('فشل في تحديث المستخدم. الرجاء المحاولة مرة أخرى.');
      setLoading(false);
    }
  };

  // Function to cancel editing
  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const retryFetch = () => {
    fetchUsers();
  };

  if (loading && !editingUser) return <div className="loading">جاري التحميل...</div>;
  
  if (error) return (
    <div className="error-container">
      <div className="error">{error}</div>
      <button className="retry-btn" onClick={retryFetch}>إعادة المحاولة</button>
    </div>
  );

  // If we're editing a user, show the edit form
  if (editingUser) {
    return (
      <div className="edit-user-container">
        <h1 className="edit-user-title">تعديل المستخدم</h1>
        
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
          
          <div className="form-group checkbox-group">
            <label htmlFor="isAdmin">مدير النظام</label>
            <input
              type="checkbox"
              id="isAdmin"
              name="isAdmin"
              checked={formData.isAdmin}
              onChange={handleInputChange}
              className="form-checkbox"
            />
          </div>
          
          <div className="form-actions">
            <button 
              type="submit" 
              className="save-btn"
              disabled={loading}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={handleCancelEdit}
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
        <Link to="/users/new" className="add-user-btn">إضافة مستخدم جديد</Link>
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
                  <td>{user.isAdmin ? 'مدير' : 'مستخدم'}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString('ar-SA')}</td>
                  <td className="actions">
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
    </div>
  );
};

export default Users;