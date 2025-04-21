import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEdit, FaTrash, FaFileWord, FaFilePdf, FaSearch, FaPlus } from 'react-icons/fa';
import { deletePolicy, downloadPolicyFile } from '../../services/policyService';
import useAuth from '../../hooks/useAuth';
import usePolicyContext from '../../hooks/usePolicyContext';
import useToast from '../../hooks/useToast';
import SearchBar from './SearchBar';
import Statistics from '../Dashboard/Statistics';
import PageLayout from '../Layout/PageLayout';
import Button from '../UI/Button';
import Loading from '../UI/Loading';
import ErrorMessage from '../UI/ErrorMessage';
import EmptyState from '../UI/EmptyState';
import StatusBadge from '../UI/StatusBadge';
import './PolicyList.css';

const PolicyList = () => {
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  
  // Get context data
  const { policies, setPolicies, departments, loading, error, refreshPolicies, searchPolicies } = usePolicyContext();
  const { user, isAdmin } = useAuth();
  const { showSuccess, showError } = useToast();

  const handleSearch = async (query) => {
    try {
      if (!query.trim()) {
        // If search is empty, exit search mode
        if (isSearchMode) {
          setIsSearchMode(false);
          setSearchQuery('');
          refreshPolicies();
        }
        return;
      }
      
      console.log('PolicyList: Initiating search for:', query);
      setSearchQuery(query);
      setIsSearchMode(true);
      // Use the search function from context
      const departmentId = selectedDepartment || null;
      await searchPolicies(query, departmentId);
    } catch (err) {
      console.error('Search error:', err);
      showError('حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.');
    }
  };

  const handleDeletePolicy = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذه السياسة؟')) {
      try {
        setDeletingId(id);
        await deletePolicy(id);
        
        // Update policies list immediately without refetching from server
        setPolicies(prevPolicies => prevPolicies.filter(policy => policy._id !== id));
        
        // Show success message
        showSuccess('تم حذف السياسة بنجاح');
      } catch (err) {
        console.error('Error deleting policy:', err);
        showError(`فشل في حذف السياسة: ${err.message || 'خطأ غير معروف'}`);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleDepartmentChange = (e) => {
    const newDepartment = e.target.value;
    setSelectedDepartment(newDepartment);
    
    // If in search mode, we need to re-run search with new department
    if (isSearchMode && searchQuery) {
      searchPolicies(searchQuery, newDepartment || null);
    }
  };

  // In search mode, don't apply additional filtering - the API already filtered by department
  const displayedPolicies = isSearchMode 
    ? policies 
    : selectedDepartment
      ? policies.filter(policy => policy.department && policy.department._id === selectedDepartment)
      : policies;

  const AddPolicyButton = isAdmin ? (
    <Link to="/add-policy">
      <Button variant="primary">
        <FaPlus style={{ marginLeft: '5px' }} /> 
        إضافة سياسة جديدة
      </Button>
    </Link>
  ) : null;

  return (
    <PageLayout 
      title="قائمة السياسات" 
      actions={AddPolicyButton}
    >
      {/* Search component */}
      <SearchBar onSearch={handleSearch} />
      
      {/* Statistics component */}
      <Statistics departmentId={selectedDepartment} />
      
      {/* Department filter */}
      <div className="policy-filters">
        <label htmlFor="department-filter">تصفية حسب الإدارة:</label>
        <select
          id="department-filter"
          value={selectedDepartment}
          onChange={handleDepartmentChange}
          className="department-select"
        >
          <option value="">جميع الإدارات</option>
          {departments.map(dept => (
            <option key={dept._id} value={dept._id}>{dept.name}</option>
          ))}
        </select>
        
        {isSearchMode && (
          <div className="search-info">
            <span>نتائج البحث عن: {searchQuery}</span>
            <Button 
              variant="secondary" 
              size="small" 
              onClick={() => {
                console.log('Clear search clicked');
                setIsSearchMode(false);
                setSearchQuery('');
                refreshPolicies();
              }}
            >
              إلغاء البحث
            </Button>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && <ErrorMessage message={error} onRetry={refreshPolicies} />}
      
      {/* Loading or no data states */}
      {loading ? (
        <Loading />
      ) : displayedPolicies.length === 0 ? (
        <EmptyState 
          message={isSearchMode ? 'لا توجد نتائج مطابقة للبحث.' : 'لا توجد سياسات متاحة.'}
          icon={<FaSearch />}
        />
      ) : (
        <div className="table-responsive">
          <table className="policy-table">
            <thead>
              <tr>
                <th>اسم السياسة</th>
                <th>الإدارة</th>
                <th>تاريخ الاعتماد</th>
                <th>تاريخ انتهاء الصلاحية</th>
                <th>الحالة</th>
                <th>المستندات</th>
                <th className="actions-header">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {displayedPolicies.map(policy => (
                <tr key={policy._id} className={policy.status === 'expired' ? 'expired' : ''}>
                  <td>{policy.name}</td>
                  <td>{policy.department ? policy.department.name : 'غير محدد'}</td>
                  <td>{new Date(policy.approvalDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  })}</td>
                  <td>{new Date(policy.approvalValidity).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  })}</td>
                  <td>
                    <StatusBadge status={policy.status} />
                  </td>
                  <td className="document-actions">
                    {policy.wordFileUrl && (
                      <button 
                        className="doc-button word"
                        onClick={() => downloadPolicyFile(policy._id, 'word')}
                        title="تحميل ملف Word"
                      >
                        <FaFileWord />
                      </button>
                    )}
                  </td>
                  <td className="row-actions">
                    {isAdmin ? (
                      <>
                        <button 
                          className="delete-btn"
                          disabled={deletingId === policy._id}
                          onClick={() => handleDeletePolicy(policy._id)}
                          title="حذف"
                        >
                          {deletingId === policy._id ? '...' : <FaTrash />}
                        </button>
                        <Link to={`/edit-policy/${policy._id}`} className="edit-btn" title="تعديل">
                          <FaEdit />
                        </Link>
                      </>
                    ) : (
                      <span className="no-actions">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
};

export default PolicyList;