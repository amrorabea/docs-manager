import React, { useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import Card from '../UI/Card';
import Loading from '../UI/Loading';
import ErrorMessage from '../UI/ErrorMessage';
import Button from '../UI/Button';
import './Statistics.css';

const Statistics = ({ departmentId }) => {
  const { data: stats, loading, error, refetch } = useApi('/api/policies/stats', {
    params: departmentId ? { departmentId } : null
  });
  
  // Refresh stats when departmentId changes
  useEffect(() => {
    refetch();
  }, [departmentId, refetch]);
  
  if (loading) return <Loading message="جاري تحميل الإحصائيات..." size="small" />;
  
  if (error) {
    return <ErrorMessage message="حدث خطأ في تحميل الإحصائيات" onRetry={refetch} />;
  }
  
  if (!stats) return null;
  
  return (
    <Card className="statistics-container">
      <h3 className="statistics-title">إحصائيات السياسات</h3>
      
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">إجمالي السياسات</div>
        </div>
        
        <div className="stat-card valid">
          <div className="stat-value">{stats.valid}</div>
          <div className="stat-label">السياسات السارية</div>
        </div>
        
        <div className="stat-card expired">
          <div className="stat-value">{stats.expired}</div>
          <div className="stat-label">السياسات المنتهية</div>
        </div>
        
        <div className="stat-card draft">
          <div className="stat-value">{stats.draft}</div>
          <div className="stat-label">مسودات السياسات</div>
        </div>
      </div>
    </Card>
  );
};

export default Statistics; 