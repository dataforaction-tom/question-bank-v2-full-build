import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import CustomButton from './Button';

const Sidebar = ({ 
  sidebarOpen, 
  toggleSidebar, 
  sortBy, 
  toggleSortBy, 
  viewMode, 
  setViewMode, 
  selectedOrganizationId 
}) => {
  const navigate = useNavigate();

  const goToMembersPage = () => {
    if (selectedOrganizationId) {
      navigate(`/group-members/${selectedOrganizationId}`);
    }
  };

  return (
    <div className={`bg-gray-100 h-screen fixed left-0 top-0 overflow-y-auto transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
      <div className="flex justify-between items-center p-4">
        {sidebarOpen && <Typography variant="h6">View Options</Typography>}
        <button onClick={toggleSidebar} className="p-2 rounded-full hover:bg-gray-200">
          {sidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
        </button>
      </div>
      <div className={`flex flex-col space-y-2 ${sidebarOpen ? 'px-4' : 'px-2'}`}>
        <CustomButton 
          type="ChangeView"
          onClick={toggleSortBy}
          className="w-full"
        >
          {sidebarOpen ? (sortBy === 'manual_rank' ? 'Manual Rank' : 'ELO Score') : 'S'}
        </CustomButton>
        <CustomButton 
          type="ChangeView"
          onClick={() => setViewMode('table')}
          active={viewMode === 'table'}
          className="w-full"
        >
          {sidebarOpen ? 'Table View' : 'T'}
        </CustomButton>
        <CustomButton 
          type="ChangeView"
          onClick={() => setViewMode('cards')}
          active={viewMode === 'cards'}
          className="w-full"
        >
          {sidebarOpen ? 'Card View' : 'C'}
        </CustomButton>
        <CustomButton 
          type="ChangeView"
          onClick={() => setViewMode('kanban')}
          active={viewMode === 'kanban'}
          className="w-full"
        >
          {sidebarOpen ? 'Kanban View' : 'K'}
        </CustomButton>
        <CustomButton 
          type="ChangeView"
          onClick={() => setViewMode('elo-ranking')}
          active={viewMode === 'elo-ranking'}
          className="w-full"
        >
          {sidebarOpen ? 'ELO Ranking' : 'E'}
        </CustomButton>
        <CustomButton 
          type="ChangeView"
          onClick={() => setViewMode('manual-ranking')}
          active={viewMode === 'manual-ranking'}
          className="w-full"
        >
          {sidebarOpen ? 'Manual Ranking' : 'M'}
        </CustomButton>
        
        {/* Add a spacer */}
        <div className="flex-grow"></div>
        
        {/* Add the Manage Members button */}
        <CustomButton 
          type="ChangeView"
          onClick={goToMembersPage}
          className="w-full mt-auto"
          disabled={!selectedOrganizationId}
        >
          {sidebarOpen ? (
            <div className="flex items-center">
              <PeopleIcon className="mr-2" />
              Manage Members
            </div>
          ) : (
            <PeopleIcon />
          )}
        </CustomButton>
      </div>
    </div>
  );
};

export default Sidebar;
