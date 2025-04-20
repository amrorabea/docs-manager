import React from 'react';
import './Policy.css';

const PolicyStats = ({ totalPolicies, activePolicies, needsUpdatePolicies }) => {
  return (
    <div className="policy-stats">
      <div className="stat-card">
        <h3>عدد السياسات</h3>
        <div className="stat-value">{totalPolicies}</div>
      </div>
      
      <div className="stat-card">
        <h3>السياسات السارية</h3>
        <div className="stat-value">{activePolicies}</div>
      </div>
      
      <div className="stat-card">
        <h3>سياسات تحتاج تحديث</h3>
        <div className="stat-value">{needsUpdatePolicies}</div>
      </div>
    </div>
  );
};

export default PolicyStats;