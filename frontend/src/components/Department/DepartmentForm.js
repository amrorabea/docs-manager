import React, { useState } from 'react';
import { createDepartment } from '../../services/departmentService';
import './Department.css';
import useToast from '../../hooks/useToast';

const DepartmentForm = ({ onDepartmentAdded, onCancel }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { showError } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('اسم الإدارة مطلوب');
      showError('اسم الإدارة مطلوب');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const newDepartment = await createDepartment({ name });
      setName('');
      onDepartmentAdded(newDepartment);
    } catch (err) {
      console.error('Error creating department:', err);
      setError('فشل إنشاء الإدارة. يرجى المحاولة مرة أخرى.');
      showError('فشل إنشاء الإدارة. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="department-form-wrapper">
      <h3>إضافة إدارة جديدة</h3>
      
      {error && <div className="form-error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="department-form">
        <div className="form-group">
          <label htmlFor="departmentName">اسم الإدارة</label>
          <input
            type="text"
            id="departmentName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="أدخل اسم الإدارة"
            className="form-control"
            disabled={loading}
          />
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
            onClick={onCancel}
            disabled={loading}
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
};

export default DepartmentForm;