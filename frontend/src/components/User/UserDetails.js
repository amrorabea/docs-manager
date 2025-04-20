import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getUserById, deleteUser } from '../../services/userService';
import './Users.css';

const UserDetails = () => {
  const { email } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, [email]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const userData = await getUserById(email);
      setUser(userData);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch user details');
      setLoading(false);
      console.error('Error fetching user:', err);
    }
  };

  const handleDeleteUser = async () => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا المستخدم؟')) {
      try {
        await deleteUser(user._id);
        navigate('/users');
      } catch (err) {
        console.error(`Error deleting user ${user._id}:`, err);
        alert('فشل في حذف المستخدم. الرجاء المحاولة مرة أخرى.');
      }
    }
  };

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
        <Link to={`/users/edit/${user._id}`} className="edit-btn">تعديل</Link>
        <button className="delete-btn" onClick={handleDeleteUser}>حذف</button>
      </div>
    </div>
  );
};

export default UserDetails;