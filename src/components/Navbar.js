import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth'; 
import NotificationSystem from './NotificationSystem';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const [isMemberOfGroup, setIsMemberOfGroup] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/signin');
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const checkGroupMembership = async () => {
      if (session?.user) {
        const { data, error } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', session.user.id)
          .single();
        
        setIsMemberOfGroup(!!data);
      }
    };

    checkGroupMembership();
  }, [session]);

  return (
    <header className="bg-gradient-to-r from-slate-950 to-sky-900 text-white py-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center px-4">
        <h1 className="text-2xl sm:text-4xl font-bold">Question Bank V2</h1>
        <div className="sm:hidden">
          <button onClick={toggleMenu} className="text-2xl focus:outline-none">
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
        <nav className={`sm:flex sm:items-center ${menuOpen ? 'block' : 'hidden'} w-full sm:w-auto`}>
          <Link to="/question-overview" className="block sm:inline-block mt-2 sm:mt-0 sm:ml-4 px-4 py-2 text-lg font-bold text-[#f4f4f4] hover:text-yellow-300 rounded transition">
            Questions
          </Link>
          {session ? (
            <>
              <Link to="/submit-question" className="block sm:inline-block mt-2 sm:mt-0 sm:ml-4 px-4 py-2 text-lg font-bold text-[#f4f4f4] hover:text-yellow-300 rounded transition">
                Submit Question
              </Link>
              <Link to="/create-group" className="block sm:inline-block mt-2 sm:mt-0 sm:ml-4 px-4 py-2 text-lg font-bold text-[#f4f4f4] hover:text-yellow-300 rounded transition">
                Create Group
              </Link>
              {isMemberOfGroup && (
                <Link to="/group-dashboard" className="block sm:inline-block mt-2 sm:mt-0 sm:ml-4 px-4 py-2 text-lg font-bold text-[#f4f4f4] hover:text-yellow-300 rounded transition">
                  Group Dashboard
                </Link>
              )}
              <Link to="/profile" className="block sm:inline-block mt-2 sm:mt-0 sm:ml-4 px-4 py-2 text-lg font-bold text-[#f4f4f4] hover:text-yellow-300 rounded transition flex items-center">
                Profile
                
              </Link>
              <button onClick={handleLogout} className="block sm:inline-block mt-2 sm:mt-0 sm:ml-4 px-4 py-2 text-lg font-bold text-[#f4f4f4] hover:text-yellow-300 rounded transition">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/signin" className="block sm:inline-block mt-2 sm:mt-0 sm:ml-4 px-4 py-2 text-lg font-bold text-[#f4f4f4] hover:text-yellow-300 rounded transition">
                Sign In
              </Link>
              <Link to="/signup" className="block sm:inline-block mt-2 sm:mt-0 sm:ml-4 px-4 py-2 text-lg font-bold text-[#f4f4f4] hover:text-yellow-300 rounded transition">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
