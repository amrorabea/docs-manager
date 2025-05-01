import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEdit, FaTrash, FaFileWord, FaFilePdf, FaSearch, FaPlus } from 'react-icons/fa';
import { deletePolicy, downloadPolicyFile } from '../../services/policyService';
import useAuth from '../../hooks/useAuth';
import usePolicyContext from '../../hooks/usePolicyContext';
import useToast from '../../hooks/useToast';
import SearchBar from './SearchBar';
import ContentSearchBar from '../Search/ContentSearchBar';
import Statistics from '../Dashboard/Statistics';
import PageLayout from '../Layout/PageLayout';
import Button from '../UI/Button';
import Loading from '../UI/Loading';
import ErrorMessage from '../UI/ErrorMessage';
import EmptyState from '../UI/EmptyState';
import StatusBadge from '../UI/StatusBadge';
import { searchPolicyContent } from '../../services/policyService';
import './PolicyList.css';

const PolicyList = () => {
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [isContentSearching, setIsContentSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  
  // Get context data
  const { policies, setPolicies, departments, loading, error, refreshPolicies, searchPolicies } = usePolicyContext();
  const { user, isAdmin, logout } = useAuth(); // Add logout to destructuring
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

  const handleContentSearch = async (query) => {
    try {
      setIsContentSearching(true);
      const results = await searchPolicyContent(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Content search error:', error);
      showError('فشل في البحث في المحتوى');
    } finally {
      setIsContentSearching(false);
    }
  };

  const handleClearContentSearch = () => {
    setSearchResults(null);
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

  const handleLogout = () => {
    logout();
  };

  const handleDownload = async (policy, fileType) => {
    try {
      await downloadPolicyFile(policy._id, fileType === 'pdf' ? 'pdf' : 'word');
    } catch (error) {
      console.error('Download error:', error);
      showError('فشل في تحميل الملف');
    }
  };

  const handleClearSearch = () => {
    console.log('Clear search clicked');
    setIsSearchMode(false);
    setSearchQuery('');
    refreshPolicies();
  };

  // Create actions component that includes both add policy and logout buttons
  const Actions = () => (
    <div className="header-actions">
      {isAdmin ? (
        <Link to="/add-policy">
          <Button variant="primary">
            <FaPlus style={{ marginLeft: '5px' }} /> 
            إضافة سياسة جديدة
          </Button>
        </Link>
      ) : (
        <Button 
          variant="secondary" 
          onClick={handleLogout}
          className="logout-button"
        >
          تسجيل خروج
        </Button>
      )}
    </div>
  );

  // In search mode, don't apply additional filtering - the API already filtered by department
  const displayedPolicies = isSearchMode 
    ? policies 
    : selectedDepartment
      ? policies.filter(policy => policy.department && policy.department._id === selectedDepartment)
      : policies;

  return (
    <PageLayout 
      title="قائمة السياسات" 
      actions={<Actions />}
    >
      {/* Content search bar */}
      <ContentSearchBar 
        onSearch={handleContentSearch}
        isLoading={isContentSearching}
        onClear={handleClearContentSearch}
      />

      {/* Show search results if available */}
      {searchResults && (
        <div className="search-results">
          <h3>نتائج البحث في المحتوى ({searchResults.length} سياسة)</h3>
          {searchResults.length === 0 ? (
            <p>لا توجد نتائج مطابقة للبحث</p>
          ) : (
            <div className="content-results">
              {searchResults.map((result) => (
                <div key={result.policy._id} className="result-item">
                  <div className="result-header">
                    <h4>{result.policy.name}</h4>
                    <span className="file-name">{result.policy.fileName}</span>
                    <span className="department-name">{result.policy.department}</span>
                    <span className="occurrence-count">
                      عدد مرات الظهور: {result.totalOccurrences}
                    </span>
                  </div>
                  <div className="matches-container">
                    {result.matches.map((match, index) => (
                      <div key={index} className="match-item">
                        <div className="location-info">
                          {match.occurrences > 1 && (
                            <span className="line-occurrences">
                              ({match.occurrences} مرات في هذا السطر)
                            </span>
                          )}
                        </div>
                        <p className="excerpt" dangerouslySetInnerHTML={{
                          __html: match.excerpt.length > 500 
                            ? match.excerpt.substring(0, 500).replace(
                                new RegExp(`(${match.highlight})`, 'gi'),
                                '<span class="highlight">$1</span>'
                              ) + '...'
                            : match.excerpt.replace(
                                new RegExp(`(${match.highlight})`, 'gi'),
                                '<span class="highlight">$1</span>'
                              )
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Statistics component */}
      <Statistics policies={policies} />
      
      {/* Department filter */}
      <div className="policy-filters">
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
        
        <div className="filters-group">
          <SearchBar onSearch={handleSearch} />
          
          {isSearchMode && (
            <div className="search-info">
              <span>نتائج البحث عن: {searchQuery}</span>
              <Button 
                variant="secondary" 
                size="small" 
                onClick={handleClearSearch}
              >
                إلغاء البحث
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Error message for failed fetch/search */}
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
                {isAdmin && <th className="actions-header">الإجراءات</th>}
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
                      <>
                        <button 
                          className="doc-button word"
                          onClick={() => handleDownload(policy, 'docx')}
                          title="تحميل ملف Word"
                        >
                          <FaFileWord />
                        </button>
                        {policy.pdfFileUrl && (
                          <button 
                            className="doc-button pdf"
                            onClick={() => handleDownload(policy, 'pdf')}
                            title="تحميل ملف PDF"
                          >
                            <FaFilePdf />
                          </button>
                        )}
                      </>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="row-actions">
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
                    </td>
                  )}
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