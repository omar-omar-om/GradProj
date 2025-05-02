import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import '../styles/Home.css';

const Home = () => {
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="home-container">
      <div className="hero-background"></div>
      
      {/* Floating Elements */}
      <div className="floating-element float-1"></div>
      <div className="floating-element float-2"></div>
      <div className="floating-element float-3"></div>
      
      {/* Geometric Elements */}
      <div className="geometric-element geometric-1"></div>
      <div className="geometric-element geometric-2"></div>
      <div className="geometric-element geometric-3"></div>
      <div className="geometric-element geometric-4"></div>
      
      {/* Shared Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section className="hero-section">
        {/* Dashboard Mockup */}
        <div className="dashboard-mockup">
          <div className="dashboard-panel dashboard-style-1">
            <div className="dashboard-header">
              <h2 className="dashboard-title">Security Analytics Dashboard</h2>
              <div className="status-indicators">
                <div className="status-dot"></div>
                <div className="status-dot"></div>
                <div className="status-dot"></div>
              </div>
            </div>
            <div className="visualization-area">
              <div className="graph-container">
                <h3 className="graph-header">Threat Detection</h3>
                <div className="graph-content">
                  <div className="graph-line"></div>
                  <div className="data-points">
                    <div className="data-point" style={{ left: '20%', top: '30%' }}></div>
                    <div className="data-point" style={{ left: '40%', top: '60%' }}></div>
                    <div className="data-point" style={{ left: '60%', top: '40%' }}></div>
                    <div className="data-point" style={{ left: '80%', top: '70%' }}></div>
                  </div>
                </div>
              </div>
              <div className="graph-container">
                <h3 className="graph-header">ML Model Performance</h3>
                <div className="graph-content">
                  <div className="graph-line"></div>
                  <div className="data-points">
                    <div className="data-point" style={{ left: '20%', top: '70%' }}></div>
                    <div className="data-point" style={{ left: '40%', top: '40%' }}></div>
                    <div className="data-point" style={{ left: '60%', top: '60%' }}></div>
                    <div className="data-point" style={{ left: '80%', top: '30%' }}></div>
                  </div>
                </div>
              </div>
              <div className="security-metrics">
                <div className="metric-item">
                  <div className="metric-value">High Accuracy</div>
                  <div className="metric-label">Detection Rate</div>
                </div>
                <div className="metric-item">
                  <div className="metric-value">Fast Response</div>
                  <div className="metric-label">Processing Time</div>
                </div>
                <div className="metric-item">
                  <div className="metric-value">24/7</div>
                  <div className="metric-label">Monitoring</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="hero-content">
          <h1 className="hero-title">Next-Gen Security with AI</h1>
          <p className="hero-subtitle">
            Revolutionizing cybersecurity with advanced machine learning algorithms. 
            Real-time threat detection, predictive analytics, and automated response systems.
          </p>
          <div className="hero-buttons">
            <span onClick={() => scrollToSection('contact')} className="nav-button" style={{ background: 'transparent', border: '1px solid rgba(0, 255, 255, 0.4)', marginLeft: 'auto' }}>Contact Us</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <div id="features" className="features-grid">
        {/* Feature 1: Upload & Predict */}
        <div className="feature-card">
          <div className="feature-content">
            <div className="feature-icon">📊</div>
            <h3 className="feature-title">Upload & Predict</h3>
            <p className="feature-description">
              Easily upload a CSV file, and our AI-powered model will validate and predict results in seconds.
              Quick and efficient data processing with real-time validation feedback.
            </p>
          </div>
          <div className="feature-mockup">
            <div className="mockup-window">
              <div className="window-header">
                <div className="window-dots">
                  <span></span><span></span><span></span>
                </div>
                <div className="window-title">Data Upload & Prediction</div>
              </div>
              <div className="window-content">
                <div className="upload-interface">
                  <div className="upload-area">
                    <div className="upload-icon">⬆️</div>
                    <div className="upload-text">Drop your CSV file here</div>
                    <div className="upload-progress">
                      <div className="progress-bar">
                        <div className="progress-fill"></div>
                      </div>
                      <div className="progress-text">Processing...</div>
                    </div>
                  </div>
                  <div className="prediction-results">
                    <div className="result-header">Prediction Results</div>
                    <div className="result-stats">
                      <div className="stat-item">
                        <div className="stat-value">98%</div>
                        <div className="stat-label">Accuracy</div>
                      </div>
                      <div className="stat-item">
                        <div className="stat-value">0.5s</div>
                        <div className="stat-label">Process Time</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2: Live Updates & Integration */}
        <div className="feature-card">
          <div className="feature-mockup">
            <div className="mockup-window">
              <div className="window-header">
                <div className="window-dots">
                  <span></span><span></span><span></span>
                </div>
                <div className="window-title">Real-time Integration</div>
              </div>
              <div className="window-content">
                <div className="integration-dashboard">
                  <div className="sheets-preview">
                    <div className="sheet-header">
                      <div className="sheet-icon">📊</div>
                      <div className="sheet-title">Predictions Sheet</div>
                    </div>
                    <div className="sheet-content">
                      <div className="sheet-row header">
                        <div className="cell">ID</div>
                        <div className="cell">Prediction</div>
                        <div className="cell">Confidence</div>
                      </div>
                      <div className="sheet-row">
                        <div className="cell">001</div>
                        <div className="cell">Class A</div>
                        <div className="cell">98%</div>
                      </div>
                      <div className="sheet-row updating">
                        <div className="cell">002</div>
                        <div className="cell">Processing...</div>
                        <div className="cell">--</div>
                      </div>
                    </div>
                  </div>
                  <div className="integration-status">
                    <div className="status-item connected">
                      <div className="status-icon">✓</div>
                      <div className="status-text">Google Sheets Connected</div>
                    </div>
                    <div className="status-item syncing">
                      <div className="status-icon">↻</div>
                      <div className="status-text">Tableau Sync Active</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="feature-content">
            <div className="feature-icon">🔗</div>
            <h3 className="feature-title">Live Updates & Integration</h3>
            <p className="feature-description">
              Your predictions are automatically stored in Google Sheets, enabling real-time updates and seamless Tableau visualization.
              Stay connected with live data synchronization.
            </p>
          </div>
        </div>

        {/* Feature 3: Smart Search & Insights */}
        <div className="feature-card">
          <div className="feature-content">
            <div className="feature-icon">🔍</div>
            <h3 className="feature-title">Smart Search & Insights</h3>
            <p className="feature-description">
              Use our interactive search to check for columns and values in the dataset, ensuring data accuracy before processing.
              Advanced filtering and validation tools at your fingertips.
            </p>
          </div>
          <div className="feature-mockup">
            <div className="mockup-window">
              <div className="window-header">
                <div className="window-dots">
                  <span></span><span></span><span></span>
                </div>
                <div className="window-title">Data Search & Analysis</div>
              </div>
              <div className="window-content">
                <div className="search-interface">
                  <div className="search-results">
                    <div className="result-item">
                      <div className="result-header">Column: prediction_score</div>
                      <div className="result-preview">
                        <div className="preview-chart">
                          <div className="chart-bar" style={{height: '80%'}}></div>
                          <div className="chart-bar" style={{height: '60%'}}></div>
                          <div className="chart-bar" style={{height: '90%'}}></div>
                        </div>
                        <div className="preview-stats">
                          <div>Min: 0.75</div>
                          <div>Max: 0.98</div>
                          <div>Avg: 0.89</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="contact-container">
          <h2 className="contact-title">Get in Touch</h2>
          <form className="contact-form">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input type="text" className="form-input" placeholder="Your name" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" placeholder="your@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea className="form-input" placeholder="Your message..." rows="4"></textarea>
            </div>
            <button type="submit" className="submit-button">Send Message</button>
          </form>
          <div className="contact-info">
            <div className="info-item">
              <span className="info-icon">📍</span>
              <span className="info-text">123 AI Street, Tech City</span>
            </div>
            <div className="info-item">
              <span className="info-icon">📧</span>
              <span className="info-text">contact@secureml.ai</span>
            </div>
            <div className="info-item">
              <span className="info-icon">📱</span>
              <span className="info-text">+1 (555) 123-4567</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
