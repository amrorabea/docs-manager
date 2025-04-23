import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPolicy, createPolicy, updatePolicy } from '../../services/policyService';
import { formatDateForInput } from '../../utils/dateFormatter';
import PageLayout from '../Layout/PageLayout';
import Button from '../UI/Button';
import Loading from '../UI/Loading';
import ErrorMessage from '../UI/ErrorMessage';
import usePolicyContext from '../../hooks/usePolicyContext';
import useToast from '../../hooks/useToast';
import './Policy.css';

const PolicyForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { departments, refreshPolicies } = usePolicyContext();
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    approvalDate: '',
    reviewCycleYears: 2,
    approvalValidity: '',
    wordFile: null,
    pdfFile: null
    // Status will be determined automatically based on dates
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [existingFiles, setExistingFiles] = useState({
    wordFileUrl: '',
    pdfFileUrl: ''
  });

  useEffect(() => {
    if (id) {
      const fetchPolicy = async () => {
        try {
          setLoading(true);
          setError('');
          console.log(`Fetching policy (attempt ${retryCount + 1})`);
          
          const data = await getPolicy(id);
          console.log('Fetched policy data:', data);
          
          // Format dates properly - handle both ISO strings and date objects
          const formatDate = (dateValue) => {
            if (!dateValue) return '';
            let date;
            if (typeof dateValue === 'string') {
              date = new Date(dateValue);
            } else {
              date = dateValue;
            }
            return formatDateForInput(date);
          };
          
          setFormData({
            name: data.name || '',
            department: data.department?._id || '',
            approvalDate: formatDate(data.approvalDate),
            reviewCycleYears: data.reviewCycleYears || 2,
            approvalValidity: formatDate(data.approvalValidity),
            wordFile: null,
            pdfFile: null
            // Status will be determined automatically
          });
          
          setExistingFiles({
            wordFileUrl: data.wordFileUrl || '',
            pdfFileUrl: data.pdfFileUrl || ''
          });
          
          // Reset retry count on success
          setRetryCount(0);
        } catch (err) {
          console.error('Error fetching policy:', err);
          
          // Set appropriate error message
          let errorMsg = 'فشل تحميل بيانات السياسة';
          
          // Check if it's a cancellation error
          const isCancelled = 
            err.isCanceled || 
            err.name === 'CanceledError' || 
            err.code === 'ERR_CANCELED' ||
            (err.message && err.message.toLowerCase().includes('cancel'));
            
          if (isCancelled) {
            errorMsg = 'تم إلغاء طلب تحميل البيانات. جاري إعادة المحاولة...';
            
            // Auto-retry for cancellation errors, up to 3 times
            if (retryCount < 3) {
              console.log(`Request was canceled. Retrying... (${retryCount + 1}/3)`);
              setRetryCount(prevCount => prevCount + 1);
              
              // Retry after a short delay
              setTimeout(() => {
                // This will trigger the useEffect again
                setRetryCount(prevCount => prevCount);
              }, 1000);
            } else {
              errorMsg = 'فشل تحميل بيانات السياسة بعد عدة محاولات. يرجى تحديث الصفحة.';
              showError(errorMsg);
            }
          } else {
            // For other errors, show the error right away
            setError(errorMsg);
            showError(errorMsg);
          }
        } finally {
          setLoading(false);
        }
      };

      fetchPolicy();
    }
  }, [id, showError, retryCount]);
  
  // Add a manual retry function
  const handleRetry = () => {
    setRetryCount(prevCount => prevCount + 1);
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    // Clear error highlighting when user starts typing
    if (e.target.classList.contains('error-field')) {
      e.target.classList.remove('error-field');
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    
    // Clear error highlighting
    if (e.target.classList.contains('error-field')) {
      e.target.classList.remove('error-field');
    }
    
    if (files.length > 0) {
      console.log(`Selected ${name}:`, files[0].name);
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    }
  };

  // Function to determine status based on dates
  const determineStatus = () => {
    // If the expiration date is in the future, status is 'valid' (ساري)
    // Otherwise status is 'expired' (منتهي)
    const today = new Date();
    const expirationDate = new Date(formData.approvalValidity);
    
    return expirationDate > today ? 'valid' : 'expired';
  };

  // Modify the isFutureDate function to handle existing policies
  const isFutureDate = (dateString) => {
    const inputDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of today
    return inputDate > today;
  };

  // Determine max date for date inputs (today)
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  // Modified handleSubmit function to allow editing policies with future dates
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Client-side validation
    const requiredFields = {
      name: 'اسم السياسة',
      department: 'الإدارة',
      approvalDate: 'تاريخ الاعتماد',
      reviewCycleYears: 'دورة المراجعة',
      approvalValidity: 'تاريخ انتهاء الصلاحية'
    };
    
    // Check required fields
    for (const [field, label] of Object.entries(requiredFields)) {
      if (!formData[field]) {
        const fieldElement = document.getElementById(field);
        if (fieldElement) {
          fieldElement.classList.add('error-field');
          fieldElement.focus();
        }
        setError(`يرجى ملء حقل "${label}"`);
        showError(`يرجى ملء حقل "${label}"`);
        setLoading(false);
        return;
      }
    }
    
    // Check approval date is not in the future - but only for NEW policies
    // For existing policies (when id exists), we allow future dates that were already set
    if (!id && isFutureDate(formData.approvalDate)) {
      const fieldElement = document.getElementById('approvalDate');
      if (fieldElement) {
        fieldElement.classList.add('error-field');
        fieldElement.focus();
      }
      setError('تاريخ الاعتماد لا يمكن أن يكون في المستقبل');
      showError('تاريخ الاعتماد لا يمكن أن يكون في المستقبل');
      setLoading(false);
      return;
    }
    
    // Continue with the rest of the form submission...
    try {
      const formDataToSend = new FormData();
      
      // Log the authorization header to check if it's set correctly
      const headers = document.cookie.split(';').reduce((obj, cookie) => {
        const [key, value] = cookie.trim().split('=');
        obj[key] = value;
        return obj;
      }, {});
      console.log('Cookies available:', headers);
      console.log('Access token exists:', !!localStorage.getItem('accessToken'));
      
      // Add text fields
      formDataToSend.append('name', formData.name);
      formDataToSend.append('department', formData.department);
      formDataToSend.append('approvalDate', formData.approvalDate);
      formDataToSend.append('reviewCycleYears', formData.reviewCycleYears);
      formDataToSend.append('approvalValidity', formData.approvalValidity);
      
      // Determine status automatically based on dates
      const status = determineStatus();
      formDataToSend.append('status', status);
      
      // Log form data for debugging
      console.log('Form data being sent:', {
        name: formData.name,
        department: formData.department,
        approvalDate: formData.approvalDate,
        reviewCycleYears: formData.reviewCycleYears,
        approvalValidity: formData.approvalValidity,
        status,
        hasWordFile: !!formData.wordFile,
        hasPdfFile: !!formData.pdfFile
      });
      
      // Add files only if they are selected
      if (formData.wordFile) {
        formDataToSend.append('wordFile', formData.wordFile);
      }
      
      if (formData.pdfFile) {
        formDataToSend.append('pdfFile', formData.pdfFile);
      }

      if (id) {
        await updatePolicy(id, formDataToSend);
        showSuccess('تم تحديث السياسة بنجاح');
      } else {
        await createPolicy(formDataToSend);
        showSuccess('تم إنشاء السياسة بنجاح');
      }
      
      refreshPolicies();
      navigate('/');
    } catch (err) {
      console.error('Error saving policy:', err);
      
      let errorMessage = 'فشل حفظ السياسة. يرجى المحاولة مرة أخرى.';
      
      if (err.response) {
        console.log('Error response data:', err.response.data);
        console.log('Error response status:', err.response.status);
        
        // Check for specific validation errors
        if (err.response.data && err.response.data.error) {
          // Look for common validation patterns
          if (err.response.data.error.includes('approval') && err.response.data.error.includes('future')) {
            errorMessage = 'تاريخ الاعتماد لا يمكن أن يكون في المستقبل';
            const fieldElement = document.getElementById('approvalDate');
            if (fieldElement) {
              fieldElement.classList.add('error-field');
              fieldElement.focus();
            }
          } else {
            errorMessage = err.response.data.error;
          }
        } else if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
          
          // Check for known error messages
          if (err.response.data.message.includes('validation failed')) {
            // Extract field name from the error message if possible
            const fieldMatch = err.response.data.error?.match(/([a-zA-Z]+):/);
            if (fieldMatch && fieldMatch[1]) {
              const fieldName = fieldMatch[1];
              const fieldElement = document.getElementById(fieldName);
              if (fieldElement) {
                fieldElement.classList.add('error-field');
                fieldElement.focus();
              }
            }
          }
          
          // If the server provided a specific field error, highlight it
          if (err.response.data.field) {
            const fieldElement = document.getElementById(err.response.data.field);
            if (fieldElement) {
              fieldElement.classList.add('error-field');
              fieldElement.focus();
            }
          }
        } else if (err.response.status === 400) {
          errorMessage = 'بيانات السياسة غير صالحة. تأكد من ملء جميع الحقول المطلوبة وتحديد الإدارة.';
        } else if (err.response.status === 401) {
          errorMessage = 'جلسة العمل انتهت، يرجى تسجيل الدخول مرة أخرى';
          // Redirect to login page
          setTimeout(() => {
            localStorage.removeItem('accessToken');
            window.location.href = '/login';
          }, 2000);
        } else if (err.response.status === 403) {
          errorMessage = 'ليس لديك صلاحية لإجراء هذه العملية. يجب أن تكون مديرًا للنظام';
        } else if (err.response.status === 404) {
          errorMessage = 'السياسة غير موجودة';
        } else if (err.response.status === 500) {
          errorMessage = 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً';
          
          // Check for validation error in 500 response
          if (err.response.data.error && err.response.data.error.includes('validation failed')) {
            const approvalDateError = err.response.data.error.includes('approvalDate');
            if (approvalDateError) {
              errorMessage = 'تاريخ الاعتماد لا يمكن أن يكون في المستقبل';
              const fieldElement = document.getElementById('approvalDate');
              if (fieldElement) {
                fieldElement.classList.add('error-field');
                fieldElement.focus();
              }
            }
          }
        }
      } else if (err.request) {
        errorMessage = 'لم يتم تلقي استجابة من الخادم. تحقق من اتصالك بالإنترنت.';
      } else {
        errorMessage = `خطأ في الطلب: ${err.message}`;
      }
      
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && id && !formData.name) {
    return <Loading />;
  }

  if (error && id && !formData.name) {
    return (
      <div className="error-container">
        <h3>خطأ في تحميل السياسة</h3>
        <p>{error}</p>
        <button 
          onClick={handleRetry} 
          className="retry-button"
          disabled={loading}
        >
          {loading ? 'جاري إعادة المحاولة...' : 'إعادة المحاولة'}
        </button>
        <button 
          onClick={() => navigate('/')} 
          className="back-button"
        >
          العودة للصفحة الرئيسية
        </button>
      </div>
    );
  }

  const formActions = (
    <div className="form-actions">
      <Button 
        type="button" 
        variant="secondary" 
        onClick={() => navigate('/')}
      >
        العودة
      </Button>
    </div>
  );

  return (
    <PageLayout 
      title={id ? 'تعديل سياسة' : 'إضافة سياسة'}
      actions={formActions}
    >
      {error && <ErrorMessage message={error} />}
      
      <form onSubmit={handleSubmit} className="policy-form">
        <div className="form-group">
          <label htmlFor="name">اسم السياسة</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="form-control"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="department">الإدارة</label>
          <select
            id="department"
            name="department"
            value={formData.department}
            onChange={handleChange}
            required
            className="form-control"
          >
            <option value="">اختر الإدارة</option>
            {departments.map(dept => (
              <option key={dept._id} value={dept._id}>{dept.name}</option>
            ))}
          </select>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="approvalDate">تاريخ الاعتماد</label>
            <input
              type="date"
              id="approvalDate"
              name="approvalDate"
              value={formData.approvalDate}
              onChange={handleChange}
              max={id ? undefined : getTodayString()} // Only limit date for new policies
              required
              className="form-control"
            />
            <small className="form-text text-muted">
              {id ? 'تاريخ اعتماد السياسة' : 'لا يمكن أن يكون تاريخ الاعتماد في المستقبل'}
            </small>
          </div>
          
          <div className="form-group">
            <label htmlFor="approvalValidity">تاريخ انتهاء الصلاحية</label>
            <input
              type="date"
              id="approvalValidity"
              name="approvalValidity"
              value={formData.approvalValidity}
              onChange={handleChange}
              required
              className="form-control"
            />
            <small className="form-text text-muted">
              سيتم تحديد حالة السياسة تلقائياً: ساري إذا كان تاريخ الانتهاء في المستقبل، ومنتهي إذا كان في الماضي.
            </small>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="reviewCycleYears">دورة المراجعة (بالسنوات)</label>
            <input
              type="number"
              id="reviewCycleYears"
              name="reviewCycleYears"
              value={formData.reviewCycleYears}
              onChange={handleChange}
              min="1"
              max="3"
              required
              className="form-control"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="wordFile">ملف Word</label>
          <input
            type="file"
            id="wordFile"
            name="wordFile"
            onChange={handleFileChange}
            accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="form-control file-input"
          />
          {existingFiles.wordFileUrl && (
            <div className="existing-file">
              <span>الملف الحالي: </span>
              <a href={existingFiles.wordFileUrl} target="_blank" rel="noopener noreferrer">
                عرض الملف الحالي
              </a>
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="pdfFile">ملف PDF</label>
          <input
            type="file"
            id="pdfFile"
            name="pdfFile"
            onChange={handleFileChange}
            accept=".pdf,application/pdf"
            className="form-control file-input"
          />
          {existingFiles.pdfFileUrl && (
            <div className="existing-file">
              <span>الملف الحالي: </span>
              <a href={existingFiles.pdfFileUrl} target="_blank" rel="noopener noreferrer">
                عرض الملف الحالي
              </a>
            </div>
          )}
        </div>
        
        <div className="form-actions">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'جاري الحفظ...' : id ? 'حفظ التعديلات' : 'إضافة السياسة'}
          </Button>
        </div>
      </form>
    </PageLayout>
  );
};

export default PolicyForm;