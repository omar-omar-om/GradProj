import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import toast from 'react-hot-toast';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Successfully logged out!');
      navigate('/');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  const scrollToContact = (e) => {
    e.preventDefault();
    
    // If not on home page, navigate to home page first
    if (location.pathname !== '/') {
      navigate('/');
      // Set a small timeout to allow navigation to complete before scrolling
      setTimeout(() => {
        const contactSection = document.getElementById('contact');
        if (contactSection) {
          contactSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      // Already on home page, just scroll
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className="main-nav">
      <div className="nav-content">
        <Link to="/" className="nav-logo">Secure Insights</Link>
        <div className="nav-links">
          {user ? (
            // Links for logged-in users
            <>
              <Link 
                to="/" 
                className="nav-link"
              >
                Home
              </Link>
              <Link 
                to="/dashboard" 
                className="nav-link"
              >
                Dashboard
              </Link>
              <Link 
                to="#" 
                onClick={handleLogout} 
                className="nav-link"
              >
                Logout
              </Link>
            </>
          ) : (
            // Links for non-logged-in users
            <>
              <Link 
                to="/#contact" 
                onClick={scrollToContact} 
                className="nav-link"
              >
                Contact
              </Link>
              <Link to="/login" className="nav-link">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 