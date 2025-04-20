import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import PolicyContext from '../../context/PolicyContext';
import { deletePolicy } from '../../services/policyService';
import PolicyStats from './PolicyStats';
import PolicyItem from './PolicyItem';
import { formatDate } from '../../utils/dateFormatter';
import './Policy.css';

const PolicyList = () => {
  const { policies, loading, error, stats, refreshPolicies } = useContext(PolicyContext);
  const [filteredPolicies, setFilteredPolicies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('جميع الإدارات');
  const [expandedDepartments, setExpandedDepartments] = useState({});

  useEffect(() => {
    let result = policies;
    
    if (selectedDepartment !== 'جميع الإدارات') {
      result = result.filter(policy => policy.department.name === selectedDepartment);
    }
    
    if (searchTerm) {
      result = result.filter(policy => 
        policy.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredPolicies(result);
  }, [searchTerm, selectedDepartment, policies]);

  const toggleDepartment = (department) => {
    setExpandedDepartments(prev => ({
      ...prev,
      [department]: !prev[department]
    }));
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذه السياسة؟')) {
      try {
        await deletePolicy(id);
        refreshPolicies();
      } catch (error) {
        console.error('Error deleting policy:', error);
      }
    }
  };

  // Group policies by department
  const policyByDepartment = {};
  filteredPolicies.forEach(policy => {
    const deptName = policy.department.name;
    if (!policyByDepartment[deptName]) {
      policyByDepartment[deptName] = [];
    }
    policyByDepartment[deptName].push(policy);
  });

  // Get unique department names for filter
  const departmentNames = ['جميع الإدارات', ...new Set(policies.map(p => p.department.name))];

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="policy-container">
      <h1 className="page-title">السياسات و الإجراءات</h1>
      
      <PolicyStats 
        totalPolicies={stats.total} 
        activePolicies={stats.active} 
        needsUpdatePolicies={stats.needsUpdate} 
      />
      
      <div className="search-filter-container">
        <div className="search-box">
          <input
            type="text"
            placeholder="كلمة البحث"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button className="search-btn">ابحث</button>
        </div>
        
        <div className="department-filter">
          <select 
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="department-select"
          >
            {departmentNames.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        
        <Link to="/add-policy" className="add-policy-btn">إضافة سياسة</Link>
      </div>
      
      <div className="policies-list">
        <div className="policy-header">
          <div className="policy-name">اسم السياسة</div>
          <div className="policy-date">تاريخ الاعتماد</div>
          <div className="policy-authority">صلاحية الاعتماد</div>
          <div className="policy-review-date">تاريخ المراجعة</div>
          <div className="policy-status">سريان</div>
          <div className="policy-files">رفع ملفات</div>
          <div className="policy-actions-header">الإجراءات</div>
        </div>
        
        {Object.entries(policyByDepartment).map(([department, departmentPolicies]) => (
          <div key={department} className="department-section">
            <div 
              className="department-header" 
              onClick={() => toggleDepartment(department)}
            >
              <h3>{department}</h3>
              <span className={`expand-icon ${expandedDepartments[department] ? 'expanded' : ''}`}>▼</span>
            </div>
            
            {expandedDepartments[department] && departmentPolicies.map(policy => (
              <PolicyItem 
                key={policy._id} 
                policy={policy} 
                onDelete={handleDelete} 
              />
            ))}
          </div>
        ))}
        
        {filteredPolicies.length === 0 && (
          <div className="no-policies">لا توجد سياسات متطابقة مع معايير البحث</div>
        )}
      </div>
    </div>
  );
};

export default PolicyList;