import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPolicy, createPolicy, updatePolicy } from '../../services/policyService';
import { formatDateForInput } from '../../utils/dateFormatter';
import PageLayout from '../Layout/PageLayout';
import Button from '../UI/Button';
import Loading from '../UI/Loading';
import ErrorMessage from '../UI/ErrorMessage';
import usePolicyContext from '../../hooks/usePolicyContext';
import './Policy.css';

const PolicyForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { departments, refreshPolicies } = usePolicyContext();
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    approvalDate: '',
    reviewCycleYears: 2,
    approvalValidity: '',
    wordFile: null,
    pdfFile: null,
    status: 'valid'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingFiles, setExistingFiles] = useState({
    wordFileUrl: '',
    pdfFileUrl: ''
  });

  useEffect(() => {
    if (id) {
      const fetchPolicy = async () => {
        try {
          setLoading(true);
          const data = await getPolicy(id);
          console.log('Fetched policy data:', data);
          
          setFormData({
            name: data.name,
            department: data.department._id,
            approvalDate: formatDateForInput(data.approvalDate),
            reviewCycleYears: data.reviewCycleYears || 2,
            approvalValidity: formatDateForInput(data.approvalValidity),
            wordFile: null,
            pdfFile: null,
            status: data.status || 'valid'
          });
          
          setExistingFiles({
            wordFileUrl: data.wordFileUrl || '',
            pdfFileUrl: data.pdfFileUrl || ''
          });
        } catch (err) {
          console.error('Error fetching policy:', err);
          setError('فشل تحميل بيانات السياسة');
        } finally {
          setLoading(false);
        }
      };

      fetchPolicy();
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files.length > 0) {
      console.log(`Selected ${name}:`, files[0].name);
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formDataToSend = new FormData();
      
      // Add text fields
      formDataToSend.append('name', formData.name);
      formDataToSend.append('department', formData.department);
      formDataToSend.append('approvalDate', formData.approvalDate);
      formDataToSend.append('reviewCycleYears', formData.reviewCycleYears);
      formDataToSend.append('approvalValidity', formData.approvalValidity);
      formDataToSend.append('status', formData.status);
      
      // Add files only if they are selected
      if (formData.wordFile) {
        formDataToSend.append('wordFile', formData.wordFile);
      }
      
      if (formData.pdfFile) {
        formDataToSend.append('pdfFile', formData.pdfFile);
      }

      if (id) {
        await updatePolicy(id, formDataToSend);
      } else {
        await createPolicy(formDataToSend);
      }
      
      refreshPolicies();
      navigate('/');
    } catch (err) {
      console.error('Error saving policy:', err);
      
      if (err.response) {
        if (err.response.data && err.response.data.message) {
          setError(err.response.data.message);
        } else if (err.response.status === 400) {
          setError('بيانات السياسة غير صالحة');
        } else if (err.response.status === 401) {
          setError('يجب تسجيل الدخول لإجراء هذه العملية');
        } else if (err.response.status === 403) {
          setError('ليس لديك صلاحية لإجراء هذه العملية');
        } else if (err.response.status === 404) {
          setError('السياسة غير موجودة');
        } else if (err.response.status === 500) {
          setError('حدث خطأ في الخادم. يرجى المحاولة لاحقاً');
        } else {
          setError('فشل حفظ السياسة. يرجى المحاولة مرة أخرى.');
        }
      } else if (err.request) {
        setError('لم يتم تلقي استجابة من الخادم. تحقق من اتصالك بالإنترنت.');
      } else {
        setError(`خطأ في الطلب: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && id && !formData.name) {
    return <Loading />;
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
              required
              className="form-control"
            />
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
          
          <div className="form-group">
            <label htmlFor="status">الحالة</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="form-control"
            >
              <option value="valid">ساري</option>
              <option value="expired">منتهي</option>
              <option value="draft">مسودة</option>
            </select>
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