import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEdit, FaTrash, FaFileWord, FaFilePdf, FaSearch, FaPlus, FaEye } from 'react-icons/fa';
import { deletePolicy } from '../../services/policyService';
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
import DocumentViewer from './DocumentViewer';
import { searchPolicyContent } from '../../services/policyService';
import './PolicyList.css';

const PolicyList = () => {
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
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
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setIsContentSearching(true);
      const results = await searchPolicyContent(query);
      setSearchResults(results);
    } catch (error) {
      showError('حدث خطأ أثناء البحث في المحتوى');
      console.error('Content search error:', error);
    } finally {
      setIsContentSearching(false);
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

  const handleLogout = () => {
    logout();
  };

  const handleViewDocument = (policy) => {
    setSelectedDocument(policy.wordFileUrl);
    setViewerOpen(true);
  };

  const handleDownload = async (policy, fileType) => {
    try {
      const url = fileType === 'pdf' ? policy.pdfFileUrl : policy.wordFileUrl;
      
      // Create a GET request with responseType blob
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Create a blob URL for the file
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${policy.name}.${fileType}`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

    } catch (error) {
      console.error('Download error:', error);
      showError('فشل في تحميل الملف');
    }
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
      {/* Search component */}
      <SearchBar onSearch={handleSearch} />
      
      {/* Content search bar */}
      <ContentSearchBar 
        onSearch={handleContentSearch}
        isLoading={isContentSearching}
      />

      {/* Show search results if available */}
      {searchResults && (
        <div className="search-results">
          <h3>نتائج البحث في المحتوى:</h3>
          {searchResults.length === 0 ? (
            <p>لا توجد نتائج مطابقة للبحث</p>
          ) : (
            <ul className="content-results-list">
              {searchResults.map(result => (
                <li key={result._id} className="content-result-item">
                  <h4>{result.policy.name}</h4>
                  <p>{result.excerpt}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
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
                      <>
                        <button 
                          className="doc-button view"
                          onClick={() => handleViewDocument(policy)}
                          title="عرض المستند"
                        >
                          <FaEye />
                        </button>
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
      {viewerOpen && selectedDocument && (
        <DocumentViewer
          fileUrl={selectedDocument}
          onClose={() => {
            setViewerOpen(false);
            setSelectedDocument(null);
          }}
        />
      )}
    </PageLayout>
  );
};

export default PolicyList;