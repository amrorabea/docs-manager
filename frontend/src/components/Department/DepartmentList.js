import React, { useState, useEffect, useContext } from 'react';
import PolicyContext from '../../context/PolicyContext';
import { createDepartment, updateDepartment, deleteDepartment } from '../../services/departmentService';
import './Department.css';

const DepartmentList = () => {
  const { departments, refreshDepartments, loading, error } = useContext(PolicyContext);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '' });
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');

  const handleChange = (e) => {
    setFormData({ name: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!formData.name.trim()) {
      setFormError('اسم الإدارة مطلوب');
      return;
    }

    try {
      if (editingId) {
        await updateDepartment(editingId, formData);
      } else {
        await createDepartment(formData);
      }
      
      setFormData({ name: '' });
      setEditingId(null);
      setShowForm(false);
      refreshDepartments();
    } catch (err) {
      console.error('Error saving department:', err);
      setFormError('فشل حفظ الإدارة. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleEdit = (department) => {
    setFormData({ name: department.name });
    setEditingId(department._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الإدارة؟')) {
      try {
        await deleteDepartment(id);
        refreshDepartments();
      } catch (err) {
        console.error('Error deleting department:', err);
        alert('فشل حذف الإدارة. قد تكون هناك سياسات مرتبطة بها.');
      }
    }
  };

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <div className="department-container">
      <h1 className="page-title">الإدارات</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="department-actions">
        <button 
          className="add-department-btn" 
          onClick={() => {
            setFormData({ name: '' });
            setEditingId(null);
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'إلغاء' : 'إضافة إدارة'}
        </button>
      </div>
      
      {showForm && (
        <div className="department-form-container">
          <h3 className="form-subtitle">{editingId ? 'تعديل إدارة' : 'إضافة إدارة جديدة'}</h3>
          
          {formError && <div className="form-error">{formError}</div>}
          
          <form onSubmit={handleSubmit} className="department-form">
            <div className="form-group">
              <label htmlFor="name">اسم الإدارة</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={handleChange}
                className="form-control"
                placeholder="أدخل اسم الإدارة"
              />
            </div>
            
            <div className="form-actions">
              <button type="submit" className="save-btn">حفظ</button>
              <button 
                type="button" 
                className="cancel-btn" 
                onClick={() => {
                  setShowForm(false);
                  setFormData({ name: '' });
                  setEditingId(null);
                }}
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="departments-list">
        <div className="department-header-row">
          <div className="department-name-header">اسم الإدارة</div>
          <div className="department-actions-header">الإجراءات</div>
        </div>
        
        {departments.length === 0 ? (
          <div className="no-departments">لا توجد إدارات. أضف إدارة جديدة.</div>
        ) : (
          departments.map(department => (
            <div key={department._id} className="department-row">
              <div className="department-name">{department.name}</div>
              <div className="department-row-actions">
                <button 
                  className="edit-btn" 
                  onClick={() => handleEdit(department)}
                >
                  تعديل
                </button>
                <button 
                  className="delete-btn" 
                  onClick={() => handleDelete(department._id)}
                >
                  حذف
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DepartmentList;