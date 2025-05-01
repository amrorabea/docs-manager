import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPolicy, downloadPolicyFile } from '../../services/policyService';
import { formatDate } from '../../utils/dateFormatter';
import './Policy.css';

const PolicyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        setLoading(true);
        const data = await getPolicy(id);
        setPolicy(data);
      } catch (err) {
        console.error('Error fetching policy:', err);
        setError('فشل تحميل بيانات السياسة');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, [id]);

  const handleDownload = async (fileType) => {
    if (policy) {
      try {
        await downloadPolicyFile(policy._id, fileType === 'pdf' ? 'pdf' : 'word');
      } catch (error) {
        console.error(`Error downloading ${fileType} file:`, error);
      }
    }
  };

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!policy) {
    return <div className="error">لم يتم العثور على السياسة</div>;
  }

  return (
    <div className="policy-details-container">
      <div className="policy-details-header">
        <h2 className="policy-details-title">{policy.name}</h2>
        <div className="policy-details-status">
          <span className={`status-badge ${policy.status === 'ساري' ? 'active' : 'inactive'}`}>
            {policy.status}
          </span>
        </div>
      </div>
      
      <div className="policy-details-content">
        <div className="policy-details-section">
          <h3 className="section-title">معلومات السياسة</h3>
          <div className="policy-details-grid">
            <div className="details-item">
              <span className="details-label">الإدارة:</span>
              <span className="details-value">{policy.department.name}</span>
            </div>
            <div className="details-item">
              <span className="details-label">صلاحية الاعتماد:</span>
              <span className="details-value">{policy.approvalAuthority}</span>
            </div>
            <div className="details-group">
              <span className="details-label">تاريخ الاعتماد:</span>
              <span className="details-value">
                {new Date(policy.approvalDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                })}
              </span>
            </div>
            <div className="details-group">
              <span className="details-label">تاريخ المراجعة:</span>
              <span className="details-value">
                {new Date(policy.approvalValidity).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>
        
        <div className="policy-details-section">
          <h3 className="section-title">الملفات</h3>
          <div className="policy-files-container">
            {policy.pdfFileUrl && (
              <button 
                onClick={() => handleDownload('pdf')} 
                className="file-link-large pdf"
              >
                <span className="file-icon">PDF</span>
                <span className="file-name">تحميل ملف PDF</span>
              </button>
            )}
            {policy.wordFileUrl && (
              <button 
                onClick={() => handleDownload('word')} 
                className="file-link-large word"
              >
                <span className="file-icon">Word</span>
                <span className="file-name">تحميل ملف Word</span>
              </button>
            )}
            {!policy.pdfFileUrl && !policy.wordFileUrl && (
              <div className="no-files">لا توجد ملفات مرفقة</div>
            )}
          </div>
        </div>
      </div>
      
      <div className="policy-details-actions">
        <Link to={`/edit-policy/${policy._id}`} className="edit-policy-btn">تعديل السياسة</Link>
        <button className="back-btn" onClick={() => navigate('/')}>العودة للقائمة</button>
      </div>
    </div>
  );
};

export default PolicyDetails;