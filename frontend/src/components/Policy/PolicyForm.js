import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPolicy, createPolicy, updatePolicy } from '../../services/policyService';
import PolicyContext from '../../context/PolicyContext';
import { formatDateForInput } from '../../utils/dateFormatter';
import './Policy.css';

const PolicyForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { departments, refreshPolicies } = useContext(PolicyContext);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    approvalAuthority: '',
    approvalDate: '',
    reviewDate: '',
    wordFile: null,
    pdfFile: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingFiles, setExistingFiles] = useState({
    wordUrl: '',
    pdfUrl: ''
  });

  useEffect(() => {
    if (id) {
      const fetchPolicy = async () => {
        try {
          setLoading(true);
          const data = await getPolicy(id);
          setFormData({
            name: data.name,
            department: data.department._id,
            approvalAuthority: data.approvalAuthority,
            approvalDate: formatDateForInput(data.approvalDate),
            reviewDate: formatDateForInput(data.reviewDate),
            wordFile: null,
            pdfFile: null
          });
          setExistingFiles({
            wordUrl: data.wordUrl || '',
            pdfUrl: data.pdfUrl || ''
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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files[0]
    }));
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
      formDataToSend.append('approvalAuthority', formData.approvalAuthority);
      formDataToSend.append('approvalDate', formData.approvalDate);
      formDataToSend.append('reviewDate', formData.reviewDate);
      
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
      setError('فشل حفظ السياسة. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && id) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <div className="policy-form-container">
      <h2 className="form-title">{id ? 'تعديل سياسة' : 'إضافة سياسية'}</h2>
      
      {error && <div className="error-message">{error}</div>}
      
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
        
        <div className="form-group">
          <label htmlFor="approvalAuthority">صلاحية الاعتماد</label>
          <input
            type="text"
            id="approvalAuthority"
            name="approvalAuthority"
            value={formData.approvalAuthority}
            onChange={handleChange}
            required
            className="form-control"
          />
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
            <label htmlFor="reviewDate">تاريخ المراجعة</label>
            <input
              type="date"
              id="reviewDate"
              name="reviewDate"
              value={formData.reviewDate}
              onChange={handleChange}
              required
              className="form-control"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="wordFile">ملف Word الـ</label>
          <div className="file-input-container">
            <input
              type="file"
              id="wordFile"
              name="wordFile"
              onChange={handleFileChange}
              accept=".doc,.docx"
              className="file-input"
            />
            {existingFiles.wordUrl && (
              <div className="existing-file">
                <span>الملف الحالي: </span>
                <a href={existingFiles.wordUrl} target="_blank" rel="noopener noreferrer" className="file-link word">
                  عرض الملف
                </a>
              </div>
            )}
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="pdfFile">ملف Pdf الـ</label>
          <div className="file-input-container">
            <input
              type="file"
              id="pdfFile"
              name="pdfFile"
              onChange={handleFileChange}
              accept=".pdf"
              className="file-input"
            />
            {existingFiles.pdfUrl && (
              <div className="existing-file">
                <span>الملف الحالي: </span>
                <a href={existingFiles.pdfUrl} target="_blank" rel="noopener noreferrer" className="file-link pdf">
                  عرض الملف
                </a>
              </div>
            )}
          </div>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="save-btn" disabled={loading}>
            {loading ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button 
            type="button" 
            className="cancel-btn" 
            onClick={() => navigate('/')}
            disabled={loading}
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
};

export default PolicyForm;