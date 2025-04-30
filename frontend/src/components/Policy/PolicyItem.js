import React from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/dateFormatter';
import './Policy.css';

const PolicyItem = ({ policy, onDelete }) => {
  return (
    <div className="policy-item">
      <div className="policy-name">{policy.name}</div>
      <div className="policy-dates">
        <div className="policy-date-label">تاريخ الاعتماد:</div>
        <div className="policy-date">{formatDate(policy.approvalDate)}</div>
        <div className="policy-date-label">تاريخ انتهاء الصلاحية:</div>
        <div className="policy-review-date">{formatDate(policy.approvalValidity)}</div>
      </div>
      <div className="policy-authority">{policy.approvalAuthority}</div>
      <div className="policy-status">
        <span className={`status-badge ${policy.status === 'ساري' ? 'active' : 'inactive'}`}>
          {policy.status}
        </span>
      </div>
      <div className="policy-files">
        {policy.pdfFileUrl && (
          <a href={process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}${policy.pdfFileUrl}` : policy.pdfFileUrl} className="file-link pdf" target="_blank" rel="noopener noreferrer">PDF</a>
        )}
        {policy.wordFileUrl && (
          <a href={process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}${policy.wordFileUrl}` : policy.wordFileUrl} className="file-link word" target="_blank" rel="noopener noreferrer">Word</a>
        )}
      </div>
      <div className="policy-actions">
        <Link to={`/edit-policy/${policy._id}`} className="edit-btn">تعديل</Link>
        <button onClick={() => onDelete(policy._id)} className="delete-btn">حذف</button>
      </div>
    </div>
  );
};

export default PolicyItem;