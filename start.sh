#!/bin/bash

# Setup directories for Flask
echo "Setting up directories for Flask backend..."
python setup_dirs.py

# Start Flask backend
echo "Starting Flask backend..."
python app.py &
FLASK_PID=$!

# Wait for Flask to start
echo "Waiting for Flask server to start..."
sleep 3

# Start React frontend
echo "Starting React frontend..."
npm start

# When React is stopped, also stop Flask
kill $FLASK_PID
echo "Application stopped."
