/* ==========================================================================
   Login Component
   ========================================================================== */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import "../styles/Auth.css";
import Notification from "./Notification";
import SecurityBackground from "./SecurityBackground";
import toast from 'react-hot-toast';

const Login = () => {
  // State Management
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  // Navigation Hook
  const navigate = useNavigate();

  // Notification Handler
  const showNotification = (message, type = "error") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 5000);
  };

  // Input Change Handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Form Validation
  const validateForm = () => {
    // Check for required fields
    if (!formData.email || !formData.password) {
      setError("Please enter both email and password");
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    return true;
  };

  // Form Submission Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    // Validate form before submission
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      
      // Show success toast but not error toast (we'll use the error div instead)
      toast.success('Login successful!');

      // Wait for 2 seconds before redirecting
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific Firebase errors with user-friendly messages
      switch (error.code) {
        case 'auth/wrong-password':
          setError("Incorrect password. Please try again.");
          break;
        case 'auth/user-not-found':
          setError("No account found with this email. Please check your email or sign up.");
          break;
        case 'auth/invalid-email':
          setError("Please enter a valid email address.");
          break;
        case 'auth/user-disabled':
          setError("This account has been disabled. Please contact support for assistance.");
          break;
        case 'auth/too-many-requests':
          setError("Too many failed login attempts. Please try again later or reset your password.");
          break;
        case 'auth/network-request-failed':
          setError("Network connection issue. Please check your internet and try again.");
          break;
        case 'auth/invalid-credential':
          setError("Invalid credentials. Please check your email and password.");
          break;
        default:
          setError("Unable to sign in at this time. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Render Component
  return (
    <div className="auth-root">
      {/* 3D Security Background */}
      <SecurityBackground />
      
      {/* Main Container */}
      <div className="auth-container">
        <h2>Login</h2>
        
        {/* Login Form */}
        <form onSubmit={handleLogin}>
          {/* Email Input */}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loading}
          />

          {/* Password Input */}
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={loading}
          />

          {/* Error Message */}
          {error && <div className="error">{error}</div>}

          {/* Submit Button */}
          <button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Login"}
          </button>
        </form>

        {/* Navigation Link */}
        <div className="auth-switch">
          Don't have an account?{" "}
          <a href="/signup">Sign up</a>
        </div>
      </div>

      {/* Notification Component */}
      {notification.show && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification({ show: false, message: "", type: "" })}
        />
      )}
    </div>
  );
};

export default Login;
