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
          .from('organization_users')
          .select('organization_id')
          .eq('user_id', session.user.id)
          .single();
        
        setIsMemberOfGroup(!!data);
      }
    };

    checkGroupMembership();
  }, [session]);

  return (
    <header className="bg-gradient-to-r from-slate-950 to-sky-900 text-white py-4 shadow-md">
      <div className="container mx-auto px-4 max-w-full">
        <div className="flex justify-between items-center sm:hidden">
          <Link to="/question-overview" className="hover:opacity-80 transition-opacity">
            <h1 className="text-2xl sm:text-4xl font-bold">Impact Questions</h1>
            <span className="text-xs">
              by <span className="inline-block relative">
                <span className="relative z-10 text-white">Data For Action</span>
                <span className="absolute bottom-0 left-0 w-full h-1.5 bg-pink-500/50"></span>
              </span>
            </span>
          </Link>
          <div>
            <button onClick={toggleMenu} className="text-2xl focus:outline-none">
              {menuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>

        <div className="hidden sm:flex flex-col lg:flex-row justify-between items-center">
          <Link to="/question-overview" className="hover:opacity-80 transition-opacity">
            <h1 className="text-4xl font-bold mb-1 lg:mb-0">Impact Questions</h1>
            <span className="text-sm">
              by <span className="inline-block relative">
                <span className="relative z-10 text-white">Data For Action</span>
                <span className="absolute bottom-0 left-0 w-full h-1.5 bg-pink-500/50"></span>
              </span>
            </span>
          </Link>
          
          <nav className="flex items-center flex-wrap justify-center gap-2">
            <Link to="/question-overview" className="block px-3 py-2 text-lg font-bold text-[#f4f4f4] hover:text-pink-300 rounded transition">
              Questions
            </Link>
            {session ? (
              <>
                <Link to="/submit-question" className="block px-3 py-2 text-lg font-bold text-[#f4f4f4] hover:text-pink-300 rounded transition">
                  Submit Question
                </Link>
                <Link to="/create-group" className="block px-3 py-2 text-lg font-bold text-[#f4f4f4] hover:text-pink-300 rounded transition">
                  Create Group
                </Link>
                {isMemberOfGroup && (
                  <Link to="/group-dashboard" className="block px-3 py-2 text-lg font-bold text-[#f4f4f4] hover:text-pink-300 rounded transition">
                    Group Dashboard
                  </Link>
                )}
                <Link to="/profile" className="block px-3 py-2 text-lg font-bold text-[#f4f4f4] hover:text-pink-300 rounded transition">
                  Profile
                </Link>
                <button onClick={handleLogout} className="block px-3 py-2 text-lg font-bold text-[#f4f4f4] hover:text-pink-300 rounded transition">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/signin" className="block px-3 py-2 text-lg font-bold text-[#f4f4f4] hover:text-pink-300 rounded transition">
                  Sign In
                </Link>
                <Link to="/signup" className="block px-3 py-2 text-lg font-bold text-[#f4f4f4] hover:text-pink-300 rounded transition">
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>

        {menuOpen && (
          <div className="sm:hidden">
            <nav className={`block w-full sm:w-auto`}>
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
        )}
      </div>
    </header>
  );
};

export default Navbar;
