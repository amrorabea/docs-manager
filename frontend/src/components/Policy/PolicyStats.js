import React from 'react';
import './Policy.css';

const PolicyStats = ({ policies }) => {
  // Calculate statistics
  const totalPolicies = policies?.length || 0;
  const activePolicies = policies?.filter(policy => 
    new Date(policy.approvalValidity) > new Date() && 
    policy.status !== 'expired'
  ).length || 0;
  const needsUpdatePolicies = policies?.filter(policy => 
    new Date(policy.approvalValidity) < new Date(new Date().setMonth(new Date().getMonth() + 3))
  ).length || 0;

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