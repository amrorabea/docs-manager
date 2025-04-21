import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import './ContentSearchBar.css';

const ContentSearchBar = ({ onSearch, isLoading }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      try {
        onSearch(searchQuery.trim());
      } catch (error) {
        console.error('Search error:', error);
      }
    }
  };

  return (
    <div className="content-search-container">
      <form onSubmit={handleSubmit} className="content-search-form">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="البحث في محتوى السياسات..."
          className="content-search-input"
        />
        <button 
          type="submit" 
          className="content-search-button"
          disabled={isLoading || !searchQuery.trim()}
          title="بحث"
        >
          {isLoading ? (
            <span className="loading-spinner"></span>
          ) : (
            <FaSearch size={16} />
          )}
        </button>
      </form>
    </div>
  );
};

export default ContentSearchBar;