import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import PolicyContext from '../../context/PolicyContext';
import { deletePolicy } from '../../services/policyService';
import AuthContext from '../../context/AuthContext';
import './Policy.css';

const PolicyList = () => {
  const { policies, departments, loading, error, stats, refreshPolicies } = useContext(PolicyContext);
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [filteredPolicies, setFilteredPolicies] = useState([]);
  const [expandedDepartments, setExpandedDepartments] = useState({});
  
  // Filter policies based on search term and selected department
  useEffect(() => {
    if (!policies) return;
    
    let filtered = [...policies];
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(policy => 
        policy.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by department
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(policy => 
        policy.department._id === selectedDepartment
      );
    }
    
    setFilteredPolicies(filtered);
  }, [policies, searchTerm, selectedDepartment]);
  
  // Group policies by department
  const groupedPolicies = () => {
    const grouped = {};
    
    if (!filteredPolicies) return grouped;
    
    filteredPolicies.forEach(policy => {
      const deptId = policy.department._id;
      const deptName = policy.department.name;
      
      if (!grouped[deptId]) {
        grouped[deptId] = {
          name: deptName,
          policies: []
        };
      }
      
      grouped[deptId].policies.push(policy);
    });
    
    return grouped;
  };
  
  const toggleDepartment = (deptId) => {
    setExpandedDepartments(prev => ({
      ...prev,
      [deptId]: !prev[deptId]
    }));
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    // The filtering is already handled by the useEffect
  };
  
  const handleAddPolicy = () => {
    navigate('/add-policy');
  };
  
  const handleEditPolicy = (id) => {
    navigate(`/edit-policy/${id}`);
  };
  
  const handleViewPolicy = (id) => {
    navigate(`/view-policy/${id}`);
  };
  
  const handleDeletePolicy = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذه السياسة؟')) {
      try {
        await deletePolicy(id);
        refreshPolicies();
      } catch (err) {
        console.error('Error deleting policy:', err);
        alert(`فشل في حذف السياسة: ${err.message || 'خطأ غير معروف'}`);
      }
    }
  };
  
  const isPolicyExpired = (reviewDate) => {
    const today = new Date();
    const review = new Date(reviewDate);
    return review < today;
  };
  
  if (loading) {
    return <div className="loading">جاري تحميل البيانات...</div>;
  }
  
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  const groupedData = groupedPolicies();
  
  return (
    <div className="policy-list-container">
      {/* Header */}
      <header className="header">
        <h1>السياسات و الإجراءات</h1>
        <div className="user-menu">
          <span className="user-name">{auth?.user?.name || 'المستخدم'}</span>
          <button onClick={() => auth.logout()} className="logout-btn">تسجيل خروج</button>
        </div>
      </header>
      
      {/* Stats Cards */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-title">عدد السياسات</div>
          <div className="stat-value">{stats?.total || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">السياسات السارية</div>
          <div className="stat-value">{stats?.active || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">سياسات تحتاج تحديث</div>
          <div className="stat-value">{stats?.needsUpdate || 0}</div>
        </div>
      </div>
      
      {/* Search and Filter */}
      <div className="search-filter-container">
        <form className="search-box" onSubmit={handleSearch}>
          <input 
            type="text" 
            className="search-input" 
            placeholder="كلمة البحث" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="search-button">
            بحث
          </button>
        </form>
        
        <select 
          className="department-select"
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
        >
          <option value="all">جميع الإدارات</option>
          {departments && departments.map(dept => (
            <option key={dept._id} value={dept._id}>
              {dept.name}
            </option>
          ))}
        </select>
        
        <button className="add-button" onClick={handleAddPolicy}>
          إضافة سياسة
        </button>
      </div>
      
      {/* Policy Table */}
      {filteredPolicies.length === 0 ? (
        <div className="no-policies">
          لا توجد سياسات متطابقة مع معايير البحث
        </div>
      ) : (
        <div className="policy-table-container">
          <table className="policy-table">
            <thead>
              <tr>
                <th>اسم السياسة</th>
                <th>تاريخ الاعتماد</th>
                <th>صلاحية الاعتماد</th>
                <th>تاريخ المراجعة</th>
                <th>سريان</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedData).map(deptId => (
                <React.Fragment key={deptId}>
                  {/* Department Row */}
                  <tr 
                    className={`department-row ${expandedDepartments[deptId] ? 'expanded' : ''}`}
                    onClick={() => toggleDepartment(deptId)}
                  >
                    <td colSpan="6">
                      <div className="department-header">
                        <span className="department-name">{groupedData[deptId].name}</span>
                        <span className="expand-icon">{expandedDepartments[deptId] ? '▼' : '►'}</span>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Policy Rows */}
                  {expandedDepartments[deptId] && groupedData[deptId].policies.map(policy => {
                    const isExpired = isPolicyExpired(policy.reviewDate);
                    
                    return (
                      <tr key={policy._id} className={`policy-row ${isExpired ? 'expired' : ''}`}>
                        <td className="policy-name">{policy.name}</td>
                        <td>{new Date(policy.approvalDate).toLocaleDateString('ar-SA')}</td>
                        <td>{policy.approvalAuthority}</td>
                        <td className={isExpired ? 'expired-date' : ''}>
                          {new Date(policy.reviewDate).toLocaleDateString('ar-SA')}
                          {isExpired && <span className="expired-tag">منتهي</span>}
                        </td>
                        <td>
                          <span className={`status-badge ${policy.isActive ? 'active' : 'inactive'}`}>
                            {policy.isActive ? 'ساري' : 'غير ساري'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="view-btn" 
                              onClick={() => handleViewPolicy(policy._id)}
                              title="عرض السياسة"
                            >
                              <i className="fa fa-eye"></i>
                            </button>
                            <button 
                              className="edit-btn" 
                              onClick={() => handleEditPolicy(policy._id)}
                              title="تعديل السياسة"
                            >
                              <i className="fa fa-edit"></i>
                            </button>
                            <button 
                              className="delete-btn"
                              onClick={() => handleDeletePolicy(policy._id)}
                              title="حذف السياسة"
                            >
                              <i className="fa fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Watermark */}
      <div className="watermark">
        <img src="/masar-logo.png" alt="Masar" />
      </div>
    </div>
  );
};

export default PolicyList;