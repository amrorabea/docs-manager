import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import Button from '../UI/Button';
import Card from '../UI/Card';
import './SearchBar.css';

const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      console.log('SearchBar: Submitting search query:', query);
      onSearch(query);
    }
  };

  return (
    <Card className="search-bar-container">
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="search-input"
          placeholder="ابحث عن سياسة..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" variant="primary">
          <FaSearch />
          <span>بحث</span>
        </Button>
      </form>
    </Card>
  );
};

export default SearchBar; 