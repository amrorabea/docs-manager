import React, { useState, useEffect } from 'react';
import axios from '../../services/api';
import { Link } from 'react-router-dom';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('/api/users/all');
        setUsers(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch users');
        setLoading(false);
        console.error('Error fetching users:', err);
      }
    };

    fetchUsers(); 
  }, []);

  if (loading) return <div className="loading">جاري التحميل...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="users-container">
      <h1 className="users-title">إدارة المستخدمين</h1>
      
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
                    <Link to={`/users/${user.email}`} className="view-btn">عرض</Link>
                    <button className="edit-btn">تعديل</button>
                    <button className="delete-btn">حذف</button>
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