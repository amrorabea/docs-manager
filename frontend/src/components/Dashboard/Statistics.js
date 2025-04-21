import React, { useMemo } from 'react';
import { usePolicyContext } from '../../hooks/usePolicyContext';
import './Statistics.css';

const Statistics = ({ departmentId }) => {
  const { policies } = usePolicyContext();

  const stats = useMemo(() => {
    const filteredPolicies = departmentId
      ? policies.filter(policy => policy.department?._id === departmentId)
      : policies;

    return {
      total: filteredPolicies.length,
      active: filteredPolicies.filter(policy => policy.status === 'active').length,
      expired: filteredPolicies.filter(policy => policy.status === 'expired').length
    };
  }, [policies, departmentId]);

  return (
    <div className="stats-container">
      <div className="stat-card total">
        <span className="stat-number">{stats.total}</span>
        <span className="stat-label">إجمالي السياسات</span>
      </div>
      
      <div className="stat-card active">
        <span className="stat-number">{stats.active}</span>
        <span className="stat-label">السياسات السارية</span>
      </div>
      
      <div className="stat-card expired">
        <span className="stat-number">{stats.expired}</span>
        <span className="stat-label">السياسات المنتهية</span>
      </div>
    </div>
  );
};

export default Statistics;