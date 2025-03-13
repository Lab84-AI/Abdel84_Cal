# Calcium Imaging Analysis Suite

A web application for analyzing calcium imaging data from microscopy videos. This application allows users to:

1. Upload and visualize calcium imaging videos
2. Upload cell masks for segmentation
3. Analyze calcium intensity over time for individual cells
4. Generate plots of calcium activity
5. Export data to CSV for further analysis

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 14+
- R with required packages

### Installation

1. Clone this repository
2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Install R dependencies:
   ```R
   install.packages(c("ggplot2", "dplyr", "grDevices"))
   ```
4. Install Node.js dependencies:
   ```
   npm install
   ```
5. Set up the required directories:
   ```
   python setup_dirs.py
   ```

### Running the Application

#### Option 1: Using the start script
```
chmod +x start.sh
./start.sh
```

#### Option 2: Manual startup
1. Start the Flask backend:
   ```
   python app.py
   ```
2. In a separate terminal, start the React frontend:
   ```
   npm start
   ```
3. Open your browser and navigate to http://localhost:3000

## Application Components

### Frontend (React + Tailwind CSS + Material UI)
- **Video Upload Section**: Drag-and-drop video upload with frame-by-frame playback controls
- **Mask Upload Section**: Optional drag-and-drop mask upload for cell segmentation
- **Analysis Section**: Analyze button to process uploaded video and mask
- **Results Table**: Paginated table showing cell intensity data
- **Plot Section**: Customizable intensity plots for selected cells
- **Export/Import**: Export analysis results to CSV or import existing CSV data

### Backend (Flask + Python + R)
- **Video Processing**: Extract frames from uploaded videos
- **Cell Segmentation**: Process cell masks for calcium imaging analysis
- **Data Analysis**: Calculate calcium intensity over time for each cell
- **Plot Generation**: Create customizable plots using R's ggplot2
- **Data Export**: Export analysis results to CSV format

## Troubleshooting

If you encounter any issues:

1. Check that all required Python packages are installed
2. Ensure R is installed with the required packages
3. Verify that the Flask backend is running on port 5001
4. Check the app.log file for backend errors

## Features

- Video upload and frame-by-frame playback
- Cell mask processing and visualization
- Calcium intensity analysis for individual cells
- Interactive plotting with customizable options
- Data export to CSV
