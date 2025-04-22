import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import Button from '../UI/Button';
import Card from '../UI/Card';
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
      </form>
    </Card>
  );
};

export default ContentSearchBar;