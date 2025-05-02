import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import axios from 'axios';
import { FileOutlined, CalendarOutlined, TableOutlined, NumberOutlined } from '@ant-design/icons';
import '../styles/PredictionFiles.css';

const PredictionFiles = () => {
  const { currentUser } = useAuth();
  const [predictionFiles, setPredictionFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPredictionFiles = async () => {
      if (!currentUser?.uid) {
        console.log("No user ID available");
        setLoading(false);
        return;
      }
      
      console.log("Fetching prediction files for user:", currentUser.uid);
      
      try {
        setLoading(true);
        // Use the full URL to the backend
        const apiUrl = `http://localhost:8001/api/user/prediction-files?user_id=${currentUser.uid}`;
        console.log("API request to:", apiUrl);
        
        const response = await axios.get(apiUrl);
        console.log("API response:", response.data);
        
        setPredictionFiles(response.data || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching prediction files:", err);
        console.error("Error details:", err.response?.data || err.message);
        setError("Failed to load prediction files");
        setPredictionFiles([]);
      } finally {
        setLoading(false);
        console.log("Finished loading prediction files");
      }
    };

    fetchPredictionFiles();
  }, [currentUser]);

  // Format date for better display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="prediction-files-container">
        <h2>Prediction History</h2>
        <div className="loading-container">Loading... (Check console for details)</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prediction-files-container">
        <h2>Prediction History</h2>
        <div className="error-message">{error} - Check browser console for details</div>
      </div>
    );
  }

  return (
    <div className="prediction-files-container">
      <h2>Prediction History</h2>
      
      {predictionFiles.length === 0 ? (
        <div className="no-history">No history</div>
      ) : (
        <div className="prediction-files-list">
          {predictionFiles.map((file, index) => (
            <div className="prediction-file-card" key={index}>
              <div className="file-info">
                <div className="file-name">
                  <FileOutlined className="icon" /> {file.filename}
                </div>
                <div className="file-meta">
                  <span><TableOutlined className="icon" /> {file.columns} cols</span>
                  <span><NumberOutlined className="icon" /> {file.rows} rows</span>
                  <span><CalendarOutlined className="icon" /> {formatDate(file.timestamp)}</span>
                </div>
                <div className="upload-number">Upload #{file.upload_number}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PredictionFiles; 