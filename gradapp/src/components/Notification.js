/* ==========================================================================
   Notification Component
   ========================================================================== */

import React from "react";
import "../styles/Notification.css";

const Notification = ({ message, type, onClose }) => {
  // Determine notification style based on type
  const getNotificationStyle = () => {
    switch (type) {
      case "success":
        return "notification-success";
      case "error":
        return "notification-error";
      case "warning":
        return "notification-warning";
      case "info":
        return "notification-info";
      default:
        return "notification-default";
    }
  };

  // Determine icon based on type
  const getIcon = () => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "info":
        return "ℹ";
      default:
        return "•";
    }
  };

  // Render Component
  return (
    <div className={`notification ${getNotificationStyle()}`}>
      {/* Icon */}
      <span className="notification-icon">{getIcon()}</span>

      {/* Message */}
      <span className="notification-message">{message}</span>

      {/* Close Button */}
      <button className="notification-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
};

export default Notification; 