import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const Filter = ({ filters, setFilters }) => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      // Fetch distinct categories from questions table
      const { data, error } = await supabase
        .from('questions')
        .select('category')
        .not('category', 'is', null)
        .eq('is_open', true); // Only get categories from public questions

      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }

      // Get unique categories and remove any null/empty values
      const uniqueCategories = [...new Set(data
        .map(q => q.category)
        .filter(category => category && category.trim())
      )].sort();

      setCategories(uniqueCategories);
    };

    fetchCategories();
  }, []);

  return (
    <div className="mb-6">
      <FormControl variant="outlined" className="w-1/3">
        <InputLabel id="category-filter-label">Filter by Category</InputLabel>
        <Select
          labelId="category-filter-label"
          id="category-filter"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          label="Filter by Category"
        >
          <MenuItem value="">
            <em>All Categories</em>
          </MenuItem>
          {categories.map((category) => (
            <MenuItem key={category} value={category}>
              {category}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
};

export default Filter;
