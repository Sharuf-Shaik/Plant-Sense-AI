# 🌱 PlantSense AI - Precision Agriculture Monitoring System

PlantSense AI is a full-stack prototype for smart agriculture monitoring that combines **Flask backend** with a **modern responsive dashboard UI**. It demonstrates how AI and data analytics can be used in precision farming for plant health analysis, risk detection, and predictive insights.

---

## 🚀 Project Overview

This system integrates image processing, sensor data analysis, and predictive modeling to simulate an intelligent farming assistant. It helps in identifying plant health status, analyzing environmental conditions, and generating risk-based alerts.

---

## ✨ Key Features

### 📸 Plant Image Analysis
- Upload plant leaf images
- Simulated NDVI-like heatmap visualization
- Healthy vs Diseased classification (dummy CNN model)

### 📊 Sensor Data Monitoring
- Upload CSV sensor data (temperature, humidity, soil moisture, etc.)
- Interactive graphs using Chart.js
- Trend analysis and statistical summary

### 🌾 AI-Based Forecasting
- LSTM-like plant stress prediction (prototype model)
- Future stress level estimation based on trends

### 🔗 Data Fusion Engine
- Combines image + sensor insights
- Generates overall plant risk score
- Color-coded alerts (Low / Medium / High risk)
- Auto-generated summary report

---

## 🧠 Tech Stack

- **Backend:** Flask (Python)
- **Frontend:** HTML, CSS, JavaScript
- **Visualization:** Chart.js
- **ML Prototype:** Dummy CNN + LSTM logic (upgrade-ready)
- **Data Handling:** CSV processing

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository
git clone https://github.com/your-username/plantsense-ai.git
cd plantsense-ai


git clone https://github.com/your-username/plantsense-ai.git
cd plantsense-ai

python3 -m pip install -r requirements.txt

python3 -m backend.app

http://127.0.0.1:5000/


PlantSense AI
│
├── backend/
│   └── app.py
│
├── templates/
│   └── dashboard.html
│
├── static/
│   ├── css/
│   ├── js/
│   └── images/
│
├── uploads/
├── requirements.txt
└── README.md
