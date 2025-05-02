import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { useAuth } from '../AuthContext';
import { db } from '../firebaseConfig'; // Import Firestore
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore'; // Import Firestore functions
import '../styles/Dashboard.css';

const API_BASE_URL = 'http://localhost:8001/api';

const Dashboard = () => {
  const { user } = useAuth();
  const [columnSearch, setColumnSearch] = useState('');
  const [entrySearch, setEntrySearch] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [csvData, setCsvData] = useState(null);
  const [isLoadingCsv, setIsLoadingCsv] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ status: 'Checking database status...', progress: 0 });
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [columnCache, setColumnCache] = useState(new Map());
  const [searchResults, setSearchResults] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // Helper function to save usage data consistently
  const saveUsageData = useCallback((usageData) => {
    // Save to general localStorage as fallback
    localStorage.setItem('dashboardUsage', JSON.stringify(usageData));
    
    // If user is logged in, save to user-specific storage and Firestore
    if (user && user.uid) {
      // Save to local storage
      localStorage.setItem(`dashboardUsage_${user.uid}`, JSON.stringify(usageData));
      
      // Save to Firestore for cross-device sync
      const userStatsRef = doc(db, 'userStats', user.uid);
      updateDoc(userStatsRef, usageData).catch(error => {
        // If document doesn't exist yet, create it
        if (error.code === 'not-found') {
          setDoc(userStatsRef, usageData).catch(err => {
            console.error('Error creating user stats document:', err);
          });
        } else {
          console.error('Error updating Firestore:', error);
        }
      });
    }
    
    console.log('Saved usage data:', usageData);
    return usageData;
  }, [user]);
  
  const [usage, setUsage] = useState(() => {
    // Try to get saved usage data from localStorage first
    const savedUsage = localStorage.getItem('dashboardUsage');
    if (savedUsage) {
      try {
        return JSON.parse(savedUsage);
      } catch (e) {
        console.error('Error parsing saved usage data:', e);
      }
    }
    // Default initial state if nothing in localStorage
    return {
      searchCount: 0,
      uploadCount: 0,
      lastUploadTime: null,
      recentSearches: [],
      dailyStats: Array(7).fill(0).map(() => ({
        searches: 0,
        uploads: 0
      }))
    };
  });

  // Memoize column normalization for better performance
  const normalizeColumns = useCallback((columns) => {
    return columns.map(col => ({
      original: col,
      normalized: col.toLowerCase().trim(),
      // Create a Set of words for partial matching
      words: new Set(col.toLowerCase().trim().split(/\s+/))
    }));
  }, []);

  // Memoize search results
  const memoizedSearch = useCallback((data, column, entry) => {
    if (!data || !data.length) return [];
    
    const searchColumn = column?.toLowerCase().trim() || '';
    const searchEntry = entry?.toLowerCase().trim() || '';
    
    // Get normalized columns if not in cache
    if (!columnCache.has('normalized')) {
      const columns = Object.keys(data[0] || {});
      const normalized = normalizeColumns(columns);
      setColumnCache(new Map([['normalized', normalized]]));
      return normalized;
    }
    
    return columnCache.get('normalized');
  }, [columnCache, normalizeColumns]);

  // Check database status periodically
  useEffect(() => {
    const checkDatabaseStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/status`);
        const data = await response.json();
        setIsDatabaseReady(data.ready);
        if (data.ready) {
          setLoadingProgress({ status: 'Database ready!', progress: 100 });
          setIsLoadingCsv(false);
        } else {
          setLoadingProgress({ status: 'Loading database...', progress: 50 });
          // Check again in 2 seconds
          setTimeout(checkDatabaseStatus, 2000);
        }
      } catch (error) {
        console.error('Error checking database status:', error);
        setLoadingProgress({ status: 'Error connecting to database', progress: 0 });
        // Check again in 2 seconds
        setTimeout(checkDatabaseStatus, 2000);
      }
    };

    checkDatabaseStatus();
  }, []);

  // Load user stats from API and Firestore
  useEffect(() => {
    const loadUserStats = async () => {
      if (!user) {
        console.log('No user logged in, skipping stats load');
        return;
      }
      
      try {
        console.log('Loading stats for user:', user.uid);
        
        // Set up real-time listener for Firestore updates
        const userStatsRef = doc(db, 'userStats', user.uid);
        
        // First check if the document exists
        const docSnap = await getDoc(userStatsRef);
        
        if (docSnap.exists()) {
          // Document exists, update from Firestore
          const firestoreData = docSnap.data();
          console.log('Loaded stats from Firestore:', firestoreData);
          setUsage(firestoreData);
        } else {
          // Document doesn't exist, check localStorage
          const userSpecificKey = `dashboardUsage_${user.uid}`;
          const savedUserUsage = localStorage.getItem(userSpecificKey);
          
          if (savedUserUsage) {
            // Initialize Firestore with localStorage data
            try {
              const parsedUsage = JSON.parse(savedUserUsage);
              console.log('Initializing Firestore with localStorage data:', parsedUsage);
              await setDoc(userStatsRef, parsedUsage);
              setUsage(parsedUsage);
            } catch (e) {
              console.error('Error parsing saved user-specific usage data:', e);
            }
          } else {
            // No data found, create default document in Firestore
            const defaultUsage = {
              searchCount: 0,
              uploadCount: 0,
              lastUploadTime: null,
              recentSearches: [],
              dailyStats: Array(7).fill(0).map(() => ({
                searches: 0,
                uploads: 0
              }))
            };
            await setDoc(userStatsRef, defaultUsage);
            console.log('Created default user stats in Firestore');
          }
        }
        
        // Set up real-time listener for future updates
        const unsubscribe = onSnapshot(userStatsRef, (snapshot) => {
          if (snapshot.exists()) {
            const updatedData = snapshot.data();
            console.log('Real-time update from Firestore:', updatedData);
            setUsage(updatedData);
            // Also update localStorage
            localStorage.setItem('dashboardUsage', JSON.stringify(updatedData));
            localStorage.setItem(`dashboardUsage_${user.uid}`, JSON.stringify(updatedData));
          }
        }, (error) => {
          console.error('Error in Firestore snapshot listener:', error);
        });
        
        // Also fetch from backend API and merge if needed
        try {
          const response = await fetch(`${API_BASE_URL}/user/stats?user_id=${user.uid}`);
          if (response.ok) {
            const stats = await response.json();
            console.log('Received stats from API:', stats);
            
            // If the API has higher counts, update Firestore and local state
            const currentUsage = docSnap.exists() ? docSnap.data() : (JSON.parse(localStorage.getItem(`dashboardUsage_${user.uid}`)) || usage);
            if ((stats.searchCount && stats.searchCount > currentUsage.searchCount) || 
                (stats.uploadCount && stats.uploadCount > currentUsage.uploadCount)) {
              
              const merged = {
                ...currentUsage,
                searchCount: Math.max(currentUsage.searchCount, stats.searchCount || 0),
                uploadCount: Math.max(currentUsage.uploadCount, stats.uploadCount || 0),
              };
              
              console.log('Merging with API data:', merged);
              saveUsageData(merged);
            }
          }
        } catch (apiError) {
          console.error('Error fetching from API:', apiError);
        }
        
        // Clean up the listener when component unmounts or user changes
        return () => unsubscribe();
      } catch (error) {
        console.error('Error in loadUserStats:', error);
      }
    };

    // Execute the function
    const unsubscribe = loadUserStats();
    return () => {
      // Clean up if unsubscribe is a function
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [user, saveUsageData]); // Add saveUsageData as a dependency
  
  // Save usage data when user leaves the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Save current usage state before unload
      localStorage.setItem('dashboardUsage', JSON.stringify(usage));
      if (user && user.uid) {
        localStorage.setItem(`dashboardUsage_${user.uid}`, JSON.stringify(usage));
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [usage, user]);

  // Handle search with improved API integration
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!isDatabaseReady) {
      toast.error('Database is still loading. Please wait...', {
        duration: 3000,
        icon: '⏳'
      });
      return;
    }
    
    // Check search terms
    if (!columnSearch.trim() && !entrySearch.trim()) {
      toast.error('Please enter at least one search term', {
        duration: 2000,
        icon: '❗'
      });
      return;
    }

    setLoading(true);
    try {
      let matches = [];
      // If searching for a column
      if (columnSearch && !entrySearch) {
        const response = await fetch(
          `${API_BASE_URL}/search/column?query=${encodeURIComponent(columnSearch)}`
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || response.statusText);
        }
        
        matches = await response.json();
        
        if (matches.length > 0) {
          setSearchResults(matches.map(column => ({ 
            type: 'column',
            value: column,
            matchType: column.toLowerCase() === columnSearch.toLowerCase() ? 'exact' : 'partial'
          })));
          toast.success(`Found ${matches.length} matching columns`);
        } else {
          setSearchResults([]);
          toast.error(`Column "${columnSearch}" not found`);
        }
      }
      // If searching for an entry in a specific column
      else if (columnSearch && entrySearch) {
        const response = await fetch(
          `${API_BASE_URL}/search/value?` + new URLSearchParams({
            column: columnSearch,
            query: entrySearch,
            limit: 100
          })
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || response.statusText);
        }
        
        matches = await response.json();
        
        if (matches.length > 0) {
          setSearchResults(matches.map(value => ({
            type: 'entry',
            column: columnSearch,
            value: value,
            matchType: 'exact'
          })));
          toast.success(`Found exact match in "${columnSearch}"`);
        } else {
          setSearchResults([]);
          toast.error(`No exact match found for "${entrySearch}" in "${columnSearch}"`);
        }
      }

      // Only update stats if we found matches and user is logged in
      if (matches.length > 0 && user) {
        console.log('Recording search for user:', user.uid);
        const searchResponse = await fetch(`${API_BASE_URL}/user/search?user_id=${user.uid}`, { method: 'POST' });
        if (!searchResponse.ok) {
          console.error('Failed to record search:', searchResponse.statusText);
        } else {
          // Update local state only after successful API call
          setUsage(prev => {
            const updated = {
              ...prev,
              searchCount: prev.searchCount + 1,
              recentSearches: [
                { 
                  column: columnSearch, 
                  entry: entrySearch, 
                  timestamp: new Date().toISOString(),
                  resultCount: matches.length
                },
                ...prev.recentSearches.slice(0, 9)
              ],
              dailyStats: prev.dailyStats.map((day, i) => 
                i === prev.dailyStats.length - 1 
                  ? { ...day, searches: day.searches + 1 }
                  : day
              )
            };
            
            // Use the helper function to save to localStorage
            return saveUsageData(updated);
          });
        }
      } else {
        // No user is logged in but we still want to update local stats
        setUsage(prev => {
          const updated = {
            ...prev,
            searchCount: prev.searchCount + 1,
            recentSearches: [
              { 
                column: columnSearch, 
                entry: entrySearch, 
                timestamp: new Date().toISOString(),
                resultCount: matches.length
              },
              ...prev.recentSearches.slice(0, 9)
            ]
          };
          
          // Save to localStorage even for anonymous users
          return saveUsageData(updated);
        });
      }

    } catch (error) {
      console.error('Search error:', error);
      toast.error(error.message || 'Search failed. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Load user's prediction history from Firestore
  useEffect(() => {
    const loadPredictionHistory = async () => {
      if (!user) return;
      
      setIsLoadingHistory(false);
      // Since we're no longer storing prediction data, just set an empty array
      setPredictionHistory([]);
      console.log('Prediction history is no longer stored in Firestore');
    };
    
    if (user) {
      loadPredictionHistory();
    }
  }, [user]);

  // Function to save prediction results to Firestore
  const savePredictionResults = async (csvData, originalFilename) => {
    if (!user) return;
    
    try {
      console.log('Recording prediction statistics for:', originalFilename);
      
      // Ensure the parent document exists first
      const userDocRef = doc(db, 'userPredictions', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log('Creating userPredictions document for user:', user.uid);
        await setDoc(userDocRef, { 
          created: new Date().toISOString(),
          uploadsCount: 0 
        });
      }
      
      const timestamp = new Date().toISOString();
      
      // Just update the user document counter without storing the actual prediction data
      await updateDoc(userDocRef, {
        uploadsCount: (userDoc.exists() ? (userDoc.data().uploadsCount || 0) : 0) + 1,
        lastUpload: timestamp
      });
      
      console.log('Successfully updated user statistics');
      
      // No need to update prediction history since we're not storing it anymore
      
      return true;
    } catch (error) {
      console.error('Error updating user statistics:', error);
      // Don't show an error toast since this is just stats tracking
      return true; // Return true anyway so the user can still download their results
    }
  };

  // Handle file upload with new API endpoint
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setUploadError('Please upload a CSV file');
      return;
    }

    // Clear any previous errors
    setUploadError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Add user_id if user is logged in
    if (user) {
      console.log('User is logged in, sending user_id:', user.uid);
      formData.append('user_id', user.uid);
    } else {
      console.log('No user logged in, skipping Google Sheets integration');
    }
    
    setFile(file);
    setLoading(true);

    // Show loading toast
    const loadingToast = toast.loading('Processing your CSV file...', {
      duration: Infinity,
      position: 'top-center',
      style: {
        background: '#1a73e8',
        color: 'white',
      },
    });

    try {
      const response = await fetch(`${API_BASE_URL}/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log("Error response:", errorData); // Debug log
        
        // Extract the most detailed error message available
        let errorMessage;
        if (errorData.details) {
          errorMessage = errorData.details;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else {
          errorMessage = 'CSV upload failed';
        }
        
        // Set persistent error, capturing the raw message for better parsing
        setUploadError(errorMessage);
        
        // Dismiss loading toast
        toast.dismiss(loadingToast);
        
        return; // Return early on error
      }

      // Check if the response is CSV (text/csv)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/csv')) {
        console.log('Received CSV response, processing for storage');
        
        // Get the CSV data
        const csvText = await response.text();
        
        // Get the filename from the Content-Disposition header
        const disposition = response.headers.get('content-disposition');
        let filename = 'predictions.csv';
        if (disposition && disposition.includes('filename=')) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
        }
        
        // Save the prediction results to Firestore if user is logged in
        if (user) {
          console.log('User logged in, saving prediction to history');
          await savePredictionResults(csvText, filename);
        } else {
          console.log('User not logged in, skipping prediction history');
        }
        
        // Create and download the CSV file
        const blob = new Blob([csvText], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Dismiss loading toast
        toast.dismiss(loadingToast);
        
        // Show success message
        toast.success(
          <div>
            <p>CSV processed successfully!</p>
            <p>Your file has been downloaded.</p>
          </div>,
          {
            duration: 5000,
            position: 'top-center',
            style: {
              background: '#28a745',
              color: 'white',
            },
          }
        );
      } else {
        // Handle JSON response (as before)
        const data = await response.json();
        console.log('Received JSON response:', data);
        
        // Save the prediction results to Firestore if user is logged in and predictions exist
        if (user && data.predictions) {
          console.log('User logged in with JSON predictions, saving to history');
          await savePredictionResults(data.predictions, file.name);
        }
        
        // Dismiss loading toast
        toast.dismiss(loadingToast);
        
        // Show success message with predictions
        toast.success(
          <div>
            <p>CSV processed successfully!</p>
            <p>Found {data.predictions?.length || 0} predictions</p>
            {data.sheet_url ? (
              <p>
                <a 
                  href={data.sheet_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'white', textDecoration: 'underline' }}
                >
                  View Results in Google Sheets
                </a>
              </p>
            ) : (
              <p style={{ fontSize: '0.9em', opacity: 0.8 }}>
                {user ? 'Error creating Google Sheet' : 'Please log in to save results to Google Sheets'}
              </p>
            )}
          </div>,
          {
            duration: 5000,
            position: 'top-center',
            style: {
              background: '#28a745',
              color: 'white',
            },
          }
        );
      }

      // Update usage statistics
      setUsage(prev => {
        const currentTime = new Date().toISOString();
        const updated = {
          ...prev,
          uploadCount: prev.uploadCount + 1,
          lastUploadTime: currentTime,
          dailyStats: prev.dailyStats.map((day, i) => 
            i === prev.dailyStats.length - 1 
              ? { ...day, uploads: day.uploads + 1 }
              : day
          )
        };
        
        // Use the helper function to save to localStorage
        return saveUsageData(updated);
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast.dismiss(loadingToast);
      
      // Only show toast if we haven't set a persistent error
      if (!uploadError) {
        setUploadError(error.message || 'Failed to process file');
      }
      
      toast.error(error.message || 'Failed to process file', {
        duration: 5000,
        position: 'top-center',
        style: {
          background: '#dc3545',
          color: 'white',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const SearchResults = ({ results }) => {
    if (!results || results.length === 0) return null;

    return (
      <div className="search-results-container">
        <h3>Search Results ({results.length})</h3>
        <div className="results-list">
          {results.map((result, index) => (
            <div key={index} className={`result-item ${result.type}`}>
              {result.type === 'column' ? (
                <div className="column-result">
                  <span className="result-label">Column:</span>
                  <span className="result-value">{result.value}</span>
                  <span className={`match-type ${result.matchType}`}>
                    {result.matchType}
                  </span>
                </div>
              ) : (
                <div className="entry-result">
                  <div className="result-header">
                    <span className="result-label">Match in column:</span>
                    <span className="result-value">{result.column}</span>
                  </div>
                  <div className="result-content">
                    <span className="result-label">Value:</span>
                    <span className="result-value">{result.value}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const parseValidationErrors = (errorMessage) => {
    if (!errorMessage) return null;
    
    console.log("Raw error message:", errorMessage); // Debug log
    
    // Normalize the error message to handle different formats
    let errors = [];
    
    if (Array.isArray(errorMessage)) {
      errors = errorMessage;
    } else if (typeof errorMessage === 'string') {
      // Extract errors from strings like: CSV validation failed: ['Extra columns not allowed: prediction']
      if (errorMessage.includes("CSV validation failed:")) {
        const match = errorMessage.match(/CSV validation failed: \[(.*)\]/);
        if (match && match[1]) {
          // Parse the array-like string inside the brackets
          const innerContent = match[1];
          // Split by commas, but only if they're not inside quotes
          errors = innerContent.split(/,(?=(?:(?:[^']*'){2})*[^']*$)/)
            .map(item => item.trim().replace(/^'|'$/g, ''));
        } else {
          errors = [errorMessage];
        }
      } else {
        errors = errorMessage.split('\n').filter(line => line.trim());
      }
    } else if (errorMessage.details && Array.isArray(errorMessage.details)) {
      errors = errorMessage.details;
    } else {
      errors = [errorMessage.toString()];
    }
    
    console.log("Parsed errors:", errors); // Debug log
    
    // Categories for different error types
    const categorizedErrors = {
      missingColumns: [],
      extraColumns: [],
      invalidValues: [],
      emptyValues: [],
      other: []
    };
    
    // Categorize each error message
    errors.forEach(error => {
      const errorStr = error.toString();
      
      if (errorStr.includes('Missing required columns')) {
        categorizedErrors.missingColumns.push(errorStr);
      } else if (errorStr.includes('Extra columns not allowed')) {
        categorizedErrors.extraColumns.push(errorStr);
      } else if (errorStr.includes('contains invalid values')) {
        categorizedErrors.invalidValues.push(errorStr);
      } else if (errorStr.includes('empty values') || errorStr.includes('missing values')) {
        categorizedErrors.emptyValues.push(errorStr);
      } else {
        categorizedErrors.other.push(errorStr);
      }
    });
    
    console.log("Categorized errors:", categorizedErrors); // Debug log
    return categorizedErrors;
  };

  const renderErrorMessages = (errorMessage) => {
    const categorizedErrors = parseValidationErrors(errorMessage);
    if (!categorizedErrors) return null;
    
    return (
      <div className="error-categories">
        {categorizedErrors.missingColumns.length > 0 && (
          <div className="error-category">
            <h5>Missing Required Columns</h5>
            <ul>
              {categorizedErrors.missingColumns.map((error, index) => (
                <li key={`missing-${index}`}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        {categorizedErrors.extraColumns.length > 0 && (
          <div className="error-category">
            <h5>Extra Columns Not Allowed</h5>
            <ul>
              {categorizedErrors.extraColumns.map((error, index) => (
                <li key={`extra-${index}`}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        {categorizedErrors.invalidValues.length > 0 && (
          <div className="error-category">
            <h5>Invalid Values</h5>
            <ul>
              {categorizedErrors.invalidValues.map((error, index) => (
                <li key={`invalid-${index}`}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        {categorizedErrors.emptyValues.length > 0 && (
          <div className="error-category">
            <h5>Empty or Missing Values</h5>
            <ul>
              {categorizedErrors.emptyValues.map((error, index) => (
                <li key={`empty-${index}`}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        {categorizedErrors.other.length > 0 && (
          <div className="error-category">
            <h5>Other Issues</h5>
            <ul>
              {categorizedErrors.other.map((error, index) => (
                <li key={`other-${index}`}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const handleMergeCSV = async () => {
    if (selectedFiles.length < 2 || loading) return;
    
    setLoading(true);
    
    try {
      console.log('Merging selected CSV files');
      
      // Get the actual File objects from the input
      const fileInput = document.getElementById('merge-file-upload');
      const files = fileInput.files;
      
      if (!files || files.length < 2) {
        toast.error('Please select at least 2 CSV files to merge');
        setLoading(false);
        return;
      }
      
      // Process each file
      const fileReadPromises = Array.from(files).map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          
          reader.onload = (event) => {
            resolve({
              name: file.name,
              content: event.target.result
            });
          };
          
          reader.onerror = (error) => {
            reject(error);
          };
          
          reader.readAsText(file);
        });
      });
      
      // Wait for all files to be read
      const fileContents = await Promise.all(fileReadPromises);
      
      // Process and merge the CSV files
      let allData = [];
      let headers = null;
      
      for (const file of fileContents) {
        const parsedData = Papa.parse(file.content, { header: true });
        
        if (!headers) {
          // Use the first file's headers
          headers = Object.keys(parsedData.data[0]);
          allData.push(headers);
        }
        
        // Add the data rows
        parsedData.data.forEach(row => {
          if (Object.values(row).some(val => val !== "")) {
            const rowArray = headers.map(header => row[header] || "");
            allData.push(rowArray);
          }
        });
      }
      
      // Generate the merged CSV
      const mergedCsv = Papa.unparse(allData);
      
      // Download the merged file
      downloadMergedCSV(mergedCsv);
      
      toast.success('CSV files merged successfully!');
    } catch (error) {
      console.error('Error merging CSV files:', error);
      toast.error('Failed to merge CSV files: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const downloadMergedCSV = (csvContent) => {
    // Create a blob from the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create a download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Set link properties
    link.setAttribute('href', url);
    link.setAttribute('download', `merged_csv_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    // Add to document, click and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Record the merge action in Firebase
    try {
      const mergeData = {
        action: 'merge_csv',
        timestamp: new Date().toISOString(),
        fileCount: selectedFiles.length
      };
      
      // Add to user activity log
      if (user?.uid) {
        const activityRef = collection(db, 'userActivity', user.uid, 'actions');
        addDoc(activityRef, mergeData);
      }
    } catch (error) {
      console.error('Error recording merge action:', error);
    }
  };

  const handleMergeFileSelect = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const selectedFiles = Array.from(files).map(file => ({
      name: file.name,
      size: file.size
    }));

    setSelectedFiles(selectedFiles);
  };

  return (
    <div className="dashboard-root">
      <div className="gradient-background"></div>
      <div className="gradient-overlay"></div>
      <div className="colorful-background"></div>
      
      {/* Professional background elements */}
      <div className="professional-background">
        <div className="grid-lines"></div>
        
        {/* Neural network pattern */}
        <div className="neural-network-pattern">
          {/* Nodes */}
          <div className="nn-node nn-node-1"></div>
          <div className="nn-node nn-node-2"></div>
          <div className="nn-node nn-node-3"></div>
          <div className="nn-node nn-node-4"></div>
          <div className="nn-node nn-node-5"></div>
          <div className="nn-node nn-node-6"></div>
          <div className="nn-node nn-node-7"></div>
          <div className="nn-node nn-node-8"></div>
          <div className="nn-node nn-node-9"></div>
          <div className="nn-node nn-node-10"></div>
          <div className="nn-node nn-node-11"></div>
          <div className="nn-node nn-node-12"></div>
          
          {/* Connections */}
          <div className="nn-connection nn-connection-1"></div>
          <div className="nn-connection nn-connection-2"></div>
          <div className="nn-connection nn-connection-3"></div>
          <div className="nn-connection nn-connection-4"></div>
          <div className="nn-connection nn-connection-5"></div>
          <div className="nn-connection nn-connection-6"></div>
          <div className="nn-connection nn-connection-7"></div>
          <div className="nn-connection nn-connection-8"></div>
          
          {/* Data flows */}
          <div className="data-flow data-flow-1"></div>
          <div className="data-flow data-flow-2"></div>
          <div className="data-flow data-flow-3"></div>
          <div className="data-flow data-flow-4"></div>
        </div>
        
        {/* Abstract data visualization elements */}
        <div className="data-viz data-viz-1">
          <div className="data-circle"></div>
          <div className="data-line data-line-1"></div>
          <div className="data-line data-line-2"></div>
          <div className="data-line data-line-3"></div>
        </div>
        
        <div className="data-viz data-viz-2">
          <div className="data-bar data-bar-1"></div>
          <div className="data-bar data-bar-2"></div>
          <div className="data-bar data-bar-3"></div>
          <div className="data-bar data-bar-4"></div>
        </div>
        
        {/* Machine Learning specific mockups */}
        <div className="ml-mockup decision-tree">
          <div className="tree-node tree-root">
            <div className="tree-connector tree-left"></div>
            <div className="tree-connector tree-right"></div>
          </div>
          <div className="tree-node tree-child-1"></div>
          <div className="tree-node tree-child-2"></div>
          <div className="tree-node tree-leaf-1">
            <div className="tree-result">1</div>
          </div>
          <div className="tree-node tree-leaf-2">
            <div className="tree-result">0</div>
          </div>
          <div className="tree-node tree-leaf-3">
            <div className="tree-result">1</div>
          </div>
        </div>
        
        <div className="ml-mockup confusion-matrix">
          <div className="matrix-cell true-pos">TP</div>
          <div className="matrix-cell false-pos">FP</div>
          <div className="matrix-cell false-neg">FN</div>
          <div className="matrix-cell true-neg">TN</div>
        </div>
        
        <div className="ml-mockup scatter-plot">
          <div className="axis x-axis"></div>
          <div className="axis y-axis"></div>
          <div className="data-point cluster-a point-1"></div>
          <div className="data-point cluster-a point-2"></div>
          <div className="data-point cluster-a point-3"></div>
          <div className="data-point cluster-a point-4"></div>
          <div className="data-point cluster-b point-5"></div>
          <div className="data-point cluster-b point-6"></div>
          <div className="data-point cluster-b point-7"></div>
          <div className="data-point cluster-b point-8"></div>
        </div>
        
        {/* AI-themed decorative elements */}
        <div className="neural-network">
          <div className="node node-1"></div>
          <div className="node node-2"></div>
          <div className="node node-3"></div>
          <div className="node node-4"></div>
          <div className="node node-5"></div>
          <div className="connection connection-1"></div>
          <div className="connection connection-2"></div>
          <div className="connection connection-3"></div>
        </div>
        
        {/* UI mockup elements */}
        <div className="ui-mockup ui-card-1">
          <div className="ui-header"></div>
          <div className="ui-content">
            <div className="ui-line"></div>
            <div className="ui-line"></div>
            <div className="ui-line"></div>
          </div>
        </div>
        
        <div className="ui-mockup ui-card-2">
          <div className="ui-header"></div>
          <div className="ui-content">
            <div className="ui-chart"></div>
          </div>
        </div>
      </div>
      
      <Navbar />
      
      <div className="dashboard-container">
        {!isDatabaseReady ? (
          <div className="loading-overlay">
            <div className="loading-content">
              <div className="loading-message">
                <div className="loading-spinner"></div>
                <h2>Please wait...</h2>
                <p>Initializing the database. This may take up to 5 minutes.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="dashboard-header">
            <div className="header-content">
              <h1>Advanced Search Dashboard</h1>
              <div className="search-section">
                <form onSubmit={handleSearch} className="search-form">
                  <div className="search-fields">
                    <div className="search-field">
                      <label>Column Search</label>
                      <div className="input-wrapper">
                        <span className="search-icon">🔍</span>
                        <input
                          type="text"
                          value={columnSearch}
                          onChange={(e) => setColumnSearch(e.target.value)}
                          placeholder="Search in columns..."
                          className="search-input"
                        />
                      </div>
                    </div>
                    <div className="search-field">
                      <label>Entry Search</label>
                      <div className="input-wrapper">
                        <span className="search-icon">🔍</span>
                        <input
                          type="text"
                          value={entrySearch}
                          onChange={(e) => setEntrySearch(e.target.value)}
                          placeholder="Search in entries..."
                          className="search-input"
                        />
                      </div>
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="search-button" 
                    disabled={loading}
                  >
                    <span className="button-content">
                      {loading ? (
                        <>
                          <span className="loading-spinner"></span>
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <span className="button-icon">🔍</span>
                          <span>Search</span>
                        </>
                      )}
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
        
        {/* Rest of the dashboard content */}
        {isDatabaseReady && (
          <div className="dashboard-content">
            <SearchResults results={searchResults} />

            {/* Usage Statistics */}
            <div className="stats-grid">
              <div className="stat-card searches">
                <div className="stat-icon">🔍</div>
                <div className="stat-info">
                  <span className="stat-value">{usage?.searchCount || 0}</span>
                  <span className="stat-label">Total Searches</span>
                </div>
              </div>
              <div className="stat-card uploads">
                <div className="stat-icon">📤</div>
                <div className="stat-info">
                  <span className="stat-value">{usage.uploadCount}</span>
                  <span className="stat-label">Files Uploaded</span>
                </div>
              </div>
              <div className="stat-card last-upload-time">
                <div className="stat-icon">🕒</div>
                <div className="stat-info">
                  <span className="stat-value">
                    {usage.lastUploadTime ? formatDate(usage.lastUploadTime) : 'Never'}
                  </span>
                  <span className="stat-label">Last Upload Time</span>
                </div>
              </div>
            </div>

            <div className="dashboard-grid">
              {/* File Upload Section */}
              <div className="dashboard-card upload-section">
                {/* Upload header with title only */}
                <div className="upload-header">
                  <h2>Upload CSV File</h2>
                </div>
                
                {/* Upload Guide */}
                <div className="upload-guide">
                  <div className="guide-header">
                    <span className="guide-icon">📋</span>
                    <h3>CSV File Requirements</h3>
                    <div className="pulse-dot"></div>
                  </div>
                  
                  <div className="guide-content">
                    <div className="guide-item">
                      <div className="guide-step">1</div>
                      <div className="guide-text">
                        <strong>Required Columns:</strong> Your CSV must include all columns from our reference datasets.
                        <span className="guide-example">Examples: EngineVersion, AppVersion, AvSigVersion, etc.</span>
                      </div>
                    </div>
                    
                    <div className="guide-item">
                      <div className="guide-step">2</div>
                      <div className="guide-text">
                        <strong>Optional ID Column:</strong> You can include your own "ID" column, which will be preserved in the output.
                        <span className="guide-example">If omitted, we'll add sequential IDs (1, 2, 3...) automatically.</span>
                      </div>
                    </div>
                    
                    <div className="guide-item">
                      <div className="guide-step">3</div>
                      <div className="guide-text">
                        <strong>Valid Values:</strong> Each column must contain values found in our reference data.
                        <span className="guide-example">Invalid entries will cause validation errors.</span>
                      </div>
                    </div>
                    
                    <div className="guide-item">
                      <div className="guide-step">4</div>
                      <div className="guide-text">
                        <strong>Output Format:</strong> You'll receive the original data plus:
                        <ul className="guide-list">
                          <li>ID (your original or our generated)</li>
                          <li>Prediction (numeric result)</li>
                          <li>Confidence (confidence level for each prediction)</li>
                          <li>Timestamp (when prediction was made)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="upload-area">
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileUpload} 
                    className="file-input"
                    id="file-upload"
                    disabled={loading || !isDatabaseReady}
                  />
                  <label htmlFor="file-upload" className={`upload-label ${loading ? 'uploading' : ''}`}>
                    <div className="upload-icon">📤</div>
                    <p>Drag & drop your CSV file here or click to browse</p>
                    {file && <p className="file-name">{file.name}</p>}
                    {loading && <div className="loading-spinner"></div>}
                  </label>
                </div>
                
                {/* Persistent upload error message */}
                {uploadError && (
                  <div className="upload-error">
                    <div className="error-content">
                      <div className="error-message">
                        <h4>CSV Validation Error</h4>
                        {renderErrorMessages(uploadError)}
                      </div>
                      <button 
                        className="error-close" 
                        onClick={() => setUploadError(null)}
                        aria-label="Close error message"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Activity - ensure this section is present */}
              <div className="dashboard-card activity-section">
                <h2>Recent Searches</h2>
                <div className="activity-list">
                  {usage?.recentSearches?.map((search, index) => (
                    <div key={index} className="activity-item">
                      <div className="activity-icon">🔍</div>
                      <div className="activity-details">
                        <div className="activity-text">
                          <span className="search-term">Column: {search?.column || 'Any'}</span>
                          <span className="search-term">Entry: {search?.entry || 'Any'}</span>
                        </div>
                        <span className="activity-time">{formatDate(search?.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                  {(!usage?.recentSearches || usage.recentSearches.length === 0) && (
                    <p className="no-activity">No recent searches</p>
                  )}
                </div>
              </div>
              
              {/* CSV Merge Tool */}
              <div className="dashboard-card merge-section">
                <h2>CSV Merge Tool</h2>
                <p className="card-description">Combine multiple CSV files into a single file</p>
                
                <div className="merge-content">
                  <div className="merge-info">
                    <div className="info-icon">📊</div>
                    <div className="merge-text">
                      <p>Select multiple CSV files from your device to merge them by appending rows.</p>
                      <p>Files should have the same column structure for best results. Column order doesn't matter.</p>
                    </div>
                  </div>
                  
                  <div className="merge-file-input">
                    <input 
                      type="file" 
                      accept=".csv" 
                      multiple
                      onChange={handleMergeFileSelect} 
                      className="file-input"
                      id="merge-file-upload"
                      disabled={loading}
                    />
                    <label htmlFor="merge-file-upload" className={`merge-upload-label ${loading ? 'uploading' : ''}`}>
                      <div className="upload-icon">📤</div>
                      <p>Select CSV files to merge</p>
                      {selectedFiles.length > 0 && (
                        <p className="file-count">{selectedFiles.length} files selected</p>
                      )}
                      {loading && <div className="loading-spinner"></div>}
                    </label>
                  </div>
                  
                  {selectedFiles.length > 0 && (
                    <div className="selected-files">
                      <h4>Selected Files:</h4>
                      <ul className="file-list">
                        {selectedFiles.map((file, index) => (
                          <li key={index} className="file-item">
                            <span className="file-icon">📄</span>
                            <span className="file-name">{file.name}</span>
                            <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <button 
                    className="merge-button" 
                    onClick={handleMergeCSV}
                    disabled={selectedFiles.length < 2 || loading}
                  >
                    <span className="button-content">
                      {loading ? (
                        <>
                          <span className="loading-spinner"></span>
                          <span>Merging...</span>
                        </>
                      ) : (
                        <>
                          <span className="button-icon">🔄</span>
                          <span>Merge and Download</span>
                        </>
                      )}
                    </span>
                  </button>
                  
                  {selectedFiles.length < 2 && (
                    <p className="merge-note">You need to select at least 2 files to merge.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 