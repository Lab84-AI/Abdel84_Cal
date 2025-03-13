#!/usr/bin/env python3
import os

# Create necessary directories for the Flask backend
directories = [
    'uploads',
    'results',
    'masks',
    'plots'
]

# Get the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))

# Create directories
for directory in directories:
    dir_path = os.path.join(current_dir, directory)
    os.makedirs(dir_path, exist_ok=True)
    print(f"Created directory: {dir_path}")

print("Directory setup complete!")
