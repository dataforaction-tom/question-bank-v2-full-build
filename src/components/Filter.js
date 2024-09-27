import React from 'react';

const Filter = ({ filters, setFilters }) => {
  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="mb-4 flex flex-wrap gap-4">
      <select
        name="category"
        value={filters.category}
        onChange={handleChange}
        className="p-2 border rounded"
      >
        <option value="">All Categories</option>
        <option value="Poverty">Poverty</option>
        <option value="Health">Health</option>
        <option value="Education">Education</option>
        <option value="Environment">Environment</option>
        <option value="Advice">Advice</option>
      </select>
      <select
        name="is_open"
        value={filters.is_open}
        onChange={handleChange}
        className="p-2 border rounded"
      >
        <option value="">All Statuses</option>
        <option value="true">Open</option>
        <option value="false">Closed</option>
      </select>
    </div>
  );
};

export default Filter;
