import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../../services/api';
import './Users.css';

const UserDetails = () => {
  const { email } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`/api/users/user/${email}`);
        setUser(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch user details');
        setLoading(false);
        console.error('Error fetching user:', err);
      }
    };

    fetchUser();
  }, [email]);

  if (loading) return <div className="loading">جاري التحميل...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!user) return <div className="error">لم يتم العثور على المستخدم</div>;

  return (
    <div className="user-details-container">
      <h1 className="user-details-title">تفاصيل المستخدم</h1>
      <div className="user-details-card">
        <div className="user-detail">
          <span className="detail-label">الاسم:</span>
          <span className="detail-value">{user.name}</span>
        </div>
        <div className="user-detail">
          <span className="detail-label">البريد الإلكتروني:</span>
          <span className="detail-value">{user.email}</span>
        </div>
        <div className="user-detail">
          <span className="detail-label">نوع المستخدم:</span>
          <span className="detail-value">{user.isAdmin ? 'مدير' : 'مستخدم'}</span>
        </div>
        <div className="user-detail">
          <span className="detail-label">تاريخ التسجيل:</span>
          <span className="detail-value">{new Date(user.createdAt).toLocaleDateString('ar-SA')}</span>
        </div>
      </div>
      <div className="user-actions">
        <Link to="/users" className="back-btn">العودة للقائمة</Link>
        <button className="edit-btn">تعديل</button>
        <button className="delete-btn">حذف</button>
      </div>
    </div>
  );
};

export default UserDetails;