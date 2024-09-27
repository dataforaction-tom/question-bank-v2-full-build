import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import { supabase } from '../supabaseClient';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  return (
    <header className="bg-gradient-to-r from-blue-900 to-purple-800 text-white py-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center px-4">
        <h1 className="text-2xl sm:text-4xl font-bold">Question Bank V2</h1>
        <div className="sm:hidden">
          <button onClick={toggleMenu} className="text-2xl focus:outline-none">
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
        <nav className={`sm:flex sm:items-center ${menuOpen ? 'block' : 'hidden'} w-full sm:w-auto`}>
          <Link to="/" className="block sm:inline-block mt-2 sm:mt-0 sm:ml-4 px-4 py-2 text-lg font-bold text-[#f4f4f4] hover:text-yellow-300 rounded transition">
            Dashboard
          </Link>
          <Link to="/questions" className="block sm:inline-block mt-2 sm:mt-0 sm:ml-4 px-4 py-2 text-lg font-bold text-[#f4f4f4] hover:text-yellow-300 rounded transition">
            Questions
          </Link>
          <Link to="/submit-question" className="block sm:inline-block mt-2 sm:mt-0 sm:ml-4 px-4 py-2 text-lg font-bold text-[#f4f4f4] hover:text-yellow-300 rounded transition">
            Submit Question
          </Link>
          <Link to="/rank-questions" className="block sm:inline-block mt-2 sm:mt-0 sm:ml-4 px-4 py-2 text-lg font-bold text-[#f4f4f4] hover:text-yellow-300 rounded transition">
            Rank Questions
          </Link>
          <Link to="/create-organization" className="block sm:inline-block mt-2 sm:mt-0 sm:ml-4 px-4 py-2 text-lg font-bold text-[#f4f4f4] hover:text-yellow-300 rounded transition">
            Create Organization
          </Link>
          <Link to="/organization-dashboard" className="block sm:inline-block mt-2 sm:mt-0 sm:ml-4 px-4 py-2 text-lg font-bold text-[#f4f4f4] hover:text-yellow-300 rounded transition">
            Organization Dashboard
          </Link>
          <Link to="/profile" className="block sm:inline-block mt-2 sm:mt-0 sm:ml-4 px-4 py-2 text-lg font-bold text-[#f4f4f4] hover:text-yellow-300 rounded transition">
            Profile
          </Link>
          <button onClick={handleLogout} className="block sm:inline-block mt-2 sm:mt-0 sm:ml-4 px-4 py-2 text-lg font-bold text-[#f4f4f4] hover:text-yellow-300 rounded transition">
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
