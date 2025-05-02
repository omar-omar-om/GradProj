import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import axios from 'axios';
import { FileOutlined, CalendarOutlined, TableOutlined, HistoryOutlined } from '@ant-design/icons';
import '../styles/HistoryButton.css';

const HistoryButton = () => {
  const { currentUser } = useAuth();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistoryData = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:8000/api/user/prediction-files?user_id=${currentUser.uid}`);
      setHistoryData(response.data || []);
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setLoading(false);
    }
  };

  const openPopup = () => {
    fetchHistoryData();
    setIsPopupOpen(true);
  };

  const closePopup = () => {
    setIsPopupOpen(false);
  };

  // Format date for better display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="history-container">
      <button className="history-button" onClick={openPopup}>
        <HistoryOutlined />
        <span>View Past Uploads</span>
      </button>

      {isPopupOpen && (
        <div className="history-popup-overlay" onClick={closePopup}>
          <div className="history-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>Upload History</h2>
              <button className="close-button" onClick={closePopup}>×</button>
            </div>
            
            <div className="popup-content">
              {loading ? (
                <div className="loading-message">Loading history...</div>
              ) : historyData.length === 0 ? (
                <div className="empty-message">
                  <div className="empty-icon">📄</div>
                  <p>No upload history found</p>
                  <p className="empty-subtext">Upload a CSV file to see your history here</p>
                </div>
              ) : (
                <div className="history-list">
                  {historyData.map((item, index) => (
                    <div className="history-item" key={index}>
                      <div className="item-header">
                        <FileOutlined className="item-icon" />
                        <span className="item-filename">{item.filename}</span>
                        <span className="item-badge">#{item.upload_number}</span>
                      </div>
                      <div className="item-details">
                        <div><TableOutlined /> {item.columns} columns × {item.rows} rows</div>
                        <div><CalendarOutlined /> {formatDate(item.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryButton; 