import React from 'react';
import './Policy.css';

const PolicyFilter = ({ 
  searchTerm, 
  setSearchTerm, 
  selectedDepartment, 
  setSelectedDepartment,
  departments 
}) => {
  return (
    <div className="policy-filter">
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
          <option value="جميع الإدارات">جميع الإدارات</option>
          {departments.map(dept => (
            <option key={dept._id} value={dept.name}>{dept.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default PolicyFilter;