import React, { useState, useContext, useEffect, useMemo } from 'react';
import PolicyContext from '../../context/PolicyContext';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { createDepartment, updateDepartment, deleteDepartment } from '../../services/departmentService';
import './Department.css';

const DepartmentList = () => {
  const { departments, setDepartments, loading, error: contextError } = useContext(PolicyContext);
  const { isAdmin } = useAuth();
  const { showSuccess, showError } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  
  // Validated departments with error handling
  const safeDepartments = useMemo(() => {
    if (!departments || !Array.isArray(departments)) {
      console.error('Invalid departments data:', departments);
      return [];
    }
    return departments;
  }, [departments]);

  // Additional security check when component mounts
  useEffect(() => {
    // Log access attempt for security monitoring
    console.log('Department management page accessed, user has admin privileges:', isAdmin);
  }, [isAdmin]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    // Clear error when user types
    if (formError) setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!formData.name.trim()) {
      setFormError('اسم الإدارة مطلوب');
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('Submitting department data:', formData);
      
      if (editingId) {
        console.log(`Updating department with ID: ${editingId}`);
        const updatedDepartment = await updateDepartment(editingId, formData);
        console.log('Update result:', updatedDepartment);
        
        // Update department list in state without refetching
        setDepartments(prevDepartments => 
          prevDepartments.map(dept => 
            dept._id === editingId ? updatedDepartment : dept
          )
        );
        
        showSuccess('تم تحديث الإدارة بنجاح');
      } else {
        console.log('Creating new department');
        const newDepartment = await createDepartment(formData);
        console.log('Creation result:', newDepartment);
        
        // Add new department to state without refetching
        setDepartments(prevDepartments => [...prevDepartments, newDepartment]);
        
        showSuccess('تم إنشاء الإدارة بنجاح');
      }
      
      setFormData({ name: '', description: '' });
      setEditingId(null);
      setShowForm(false);
      
    } catch (err) {
      console.error('Error saving department:', err);
      
      // Enhanced error handling
      let errorMessage = 'فشل حفظ الإدارة. يرجى المحاولة مرة أخرى.';
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Server response error:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
        
        // Use the server's error message if available
        if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.status === 400) {
          errorMessage = 'بيانات الإدارة غير صالحة';
        } else if (err.response.status === 401) {
          errorMessage = 'يجب تسجيل الدخول لإجراء هذه العملية';
        } else if (err.response.status === 403) {
          errorMessage = 'ليس لديك صلاحية لإجراء هذه العملية';
        } else if (err.response.status === 409) {
          errorMessage = 'اسم الإدارة موجود بالفعل';
        } else if (err.response.status === 500) {
          errorMessage = 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً';
        }
      } else if (err.request) {
        // The request was made but no response was received
        console.error('No response received:', err.request);
        errorMessage = 'لم يتم تلقي استجابة من الخادم. تحقق من اتصالك بالإنترنت.';
      } else {
        // Something happened in setting up the request
        console.error('Request setup error:', err.message);
      }
      
      setFormError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (department) => {
    setFormData({ 
      name: department.name,
      description: department.description || ''
    });
    setEditingId(department._id);
    setShowForm(true);
    setFormError(''); // Clear any previous errors
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الإدارة؟')) {
      try {
        setDeletingId(id);
        console.log(`Deleting department with ID: ${id}`);
        await deleteDepartment(id);
        
        // Remove department from state without refetching
        setDepartments(prevDepartments => 
          prevDepartments.filter(dept => dept._id !== id)
        );
        
        showSuccess('تم حذف الإدارة بنجاح');
 
      } catch (err) {
        console.error('Error deleting department:', err);
        
        let errorMessage = 'فشل حذف الإدارة.';
        
        if (err.response && err.response.status === 409) {
          errorMessage = 'لا يمكن حذف هذه الإدارة لأنها مرتبطة بسياسات.';
        }
        
        showError(errorMessage);
      } finally {
        setDeletingId(null);
      }
    }
  };

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <div className="department-container">
      <h1 className="page-title">الإدارات</h1>
      
      {contextError && <div className="error-message">{contextError}</div>}
      
      <div className="department-actions">
        {isAdmin && (
          <button 
            className="add-department-btn" 
            onClick={() => {
              setFormData({ name: '', description: '' });
              setEditingId(null);
              setFormError('');
              setShowForm(!showForm);
            }}
          >
            {showForm ? 'إلغاء' : 'إضافة إدارة'}
          </button>
        )}
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
                className={`form-control ${formError ? 'invalid-input' : ''}`}
                placeholder="أدخل اسم الإدارة"
                disabled={isSubmitting}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">وصف الإدارة</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={handleChange}
                className="form-control"
                placeholder="أدخل وصف الإدارة"
                disabled={isSubmitting}
                rows="3"
              />
            </div>
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="save-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button 
                type="button" 
                className="cancel-btn" 
                onClick={() => {
                  setShowForm(false);
                  setFormData({ name: '', description: '' });
                  setEditingId(null);
                  setFormError('');
                }}
                disabled={isSubmitting}
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
        
        {safeDepartments.length === 0 ? (
          <div className="no-departments">لا توجد إدارات. أضف إدارة جديدة.</div>
        ) : (
          safeDepartments.map(department => (
            <div key={department._id} className="department-row">
              <div className="department-name">{department.name}</div>
              <div className="department-row-actions">
                {isAdmin ? (
                  <>
                    <button 
                      className="edit-btn" 
                      onClick={() => handleEdit(department)}
                    >
                      تعديل
                    </button>
                    <button 
                      className="delete-btn" 
                      onClick={() => handleDelete(department._id)}
                      disabled={deletingId === department._id}
                    >
                      {deletingId === department._id ? 'جاري الحذف...' : 'حذف'}
                    </button>
                  </>
                ) : (
                  <span className="user-info-text">للإدارة فقط</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {!isAdmin && !safeDepartments.length && (
        <div className="admin-notice">
          <p>فقط المسؤولون يمكنهم إضافة أو تعديل أو حذف الإدارات.</p>
        </div>
      )}
    </div>
  );
};

export default DepartmentList;