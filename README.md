# GradProj
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: auto; padding: 20px;">

  <h1>🛡️ Real-Time Malware Detection System using Machine Learning</h1>

  <p>This project is a full-stack AI-powered malware detection platform that predicts the presence of malware in Windows devices using telemetry data. Built as my graduation project at <strong>Coventry University (School of Computing, BSc Computer Science)</strong>, it combines data science, backend APIs, frontend interaction, and real-time visualization into one robust cybersecurity tool.</p>

  <h2>📌 Features</h2>
  <ul>
    <li><strong>Machine Learning Models</strong><br>
      - Trained on Microsoft Malware Prediction dataset (Kaggle 2019)<br>
      - Evaluated XGBoost, LightGBM, Decision Tree, and Neural Network models<br>
      - Best model: XGBoost with Label Encoding (AUC 0.7318, ~5.2s eval time)
    </li>
    <li><strong>Data Pipeline & Preprocessing</strong><br>
      - Over 3M rows processed<br>
      - Feature cleaning, encoding, dimensionality reduction, and split<br>
      - Compared Label, Frequency, and Target Encoding
    </li>
    <li><strong>Web Application</strong><br>
      - <strong>Backend:</strong> FastAPI<br>
      - <strong>Frontend:</strong> Node.js with Firebase Authentication<br>
      - Upload CSV → Get predictions → Download result with confidence scores
    </li>
    <li><strong>Visualization</strong><br>
      - Custom Tableau Dashboard for result analysis<br>
      - Includes malware summaries, system settings, and antivirus comparison
    </li>
  </ul>

  <h2>🔧 Technologies Used</h2>
  <ul>
    <li><strong>Python</strong> – Model training and backend API</li>
    <li><strong>FastAPI</strong> – REST API for predictions</li>
    <li><strong>Node.js</strong> – Web frontend</li>
    <li><strong>Firebase</strong> – Auth and logging</li>
    <li><strong>Google Colab (T4 GPU)</strong> – Model training</li>
    <li><strong>Tableau</strong> – Visualization</li>
  </ul>

  <h2>🚀 How to Use</h2>
  <ol>
    <li>Upload a Windows telemetry CSV file (sample structure provided).</li>
    <li>The system returns a CSV with:<br>
      - Malware label (Safe/Unsafe)<br>
      - Confidence score (%)
    </li>
    <li>Import the output into Tableau for interactive analysis.</li>
  </ol>

  <h2>📂 Colab Notebooks (ML & Preprocessing)</h2>
  <p>
    All Jupyter notebooks related to data preprocessing, encoding strategies, and model evaluation are available here:<br><br>
    🔗 <a href="https://github.com/omar-omar-om/gradProject-notebooks" target="_blank">
      GitHub – gradProject-notebooks
    </a>
  </p>

  <h2>🏁 Project Outcome</h2>
  <p>
    This project demonstrated how real-time machine learning can enhance malware detection using telemetry data.
    It balances high accuracy with efficient evaluation time and includes end-to-end deployment with visualization.
  </p>

  <h2>📬 Contact</h2>
  <p>
    Created by <strong>ME</strong><br>
    Graduate, Coventry University – School of Computing<br>
    📧 <a href="mailto:omrmoh1234@gmail.com">omrmoh1234@gmail.com</a><br>
    🌐 <a href="https://www.linkedin.com/in/omar-ibrahim-4a0b382b9/">https://www.linkedin.com/in/omar-ibrahim-4a0b382b9/</a>
  </p>
  > ⚠️ Note: The Firebase API key shown here is a placeholder and **not the real production key**. Proper restrictions and environment variables are used in the deployed version.

</body>
</html>
