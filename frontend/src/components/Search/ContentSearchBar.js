import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import Button from '../UI/Button';
import Card from '../UI/Card';
import './ContentSearchBar.css';

const ContentSearchBar = ({ onSearch, isLoading, onClear }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hasResults, setHasResults] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      try {
        await onSearch(searchQuery.trim());
        setHasResults(true);
      } catch (error) {
        console.error('Search error:', error);
      }
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setHasResults(false);
    onClear();
  };

  return (
    <Card className="search-bar-container">
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="search-input"
          placeholder="البحث في محتوى السياسات..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button 
          type="submit" 
          variant="primary"
          disabled={isLoading}
        >
          <FaSearch />
          <span>{isLoading ? 'جاري البحث...' : 'بحث'}</span>
        </Button>
        {hasResults && (
          <Button 
            type="button"
            variant="secondary"
            onClick={handleClear}
          >
            إلغاء البحث
          </Button>
        )}
      </form>
    </Card>
  );
};

export default ContentSearchBar;