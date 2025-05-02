/* ==========================================================================
   Signup Component
   ========================================================================== */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import "../styles/Auth.css";
import Notification from "./Notification";
import SecurityBackground from "./SecurityBackground";
import toast from 'react-hot-toast';

const Signup = () => {
  // State Management
  const [formData, setFormData] = useState({
    name: "",
    organization: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const { signup } = useAuth();

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
    if (!formData.name || !formData.organization || !formData.email || !formData.password || !formData.confirmPassword) {
      setError("Please fill in all fields to create your account");
      return false;
    }

    // Validate name length
    if (formData.name.length < 2) {
      setError("Name must be at least 2 characters long");
      return false;
    }

    // Validate organization length
    if (formData.organization.length < 2) {
      setError("Organization name must be at least 2 characters long");
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    // Validate password strength
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }

    // Check password match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match. Please try again.");
      return false;
    }

    return true;
  };

  // Form Submission Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      await signup(formData.email, formData.password);
      // Show success message
      toast.success('Account created successfully!');
      // Redirect to login page
      navigate('/login');
    } catch (error) {
      console.error('Signup error:', error);
      
      // Handle specific Firebase errors with user-friendly messages
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError("This email is already registered. Please use a different email or log in.");
          break;
        case 'auth/invalid-email':
          setError("Please enter a valid email address.");
          break;
        case 'auth/weak-password':
          setError("Your password is too weak. Please use at least 6 characters with a mix of letters, numbers, and symbols.");
          break;
        case 'auth/network-request-failed':
          setError("Network connection issue. Please check your internet and try again.");
          break;
        case 'auth/operation-not-allowed':
          setError("Account creation is temporarily unavailable. Please try again later.");
          break;
        default:
          setError("Unable to create your account at this time. Please try again later.");
          // Log the error for debugging but don't show to user
          console.error('Unhandled Firebase error:', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Render Component
  return (
    <div className="auth-root">
      {/* 3D Security Background */}
      <SecurityBackground />
      
      {/* Main Container */}
      <div className="auth-container">
        <h2>Sign Up</h2>
        
        {/* Signup Form */}
        <form onSubmit={handleSubmit}>
          {/* Name Input */}
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={isLoading}
          />

          {/* Organization Input */}
          <input
            type="text"
            name="organization"
            placeholder="Organization"
            value={formData.organization}
            onChange={handleChange}
            required
            disabled={isLoading}
          />

          {/* Email Input */}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isLoading}
          />

          {/* Password Input */}
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isLoading}
          />

          {/* Confirm Password Input */}
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            disabled={isLoading}
          />

          {/* Error Message */}
          {error && <div className="error">{error}</div>}

          {/* Submit Button */}
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        {/* Navigation Link */}
        <div className="auth-switch">
          Already have an account?{" "}
          <a href="/login">Login</a>
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

export default Signup;
