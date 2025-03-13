from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import numpy as np
import cv2
import tifffile
import pandas as pd
import base64
import colorsys
import logging
import rpy2.robjects as ro
from rpy2.robjects import pandas2ri
from rpy2.robjects.packages import importr
from rpy2.robjects import conversion, default_converter
from rpy2.robjects.conversion import localconverter
from cellpose import models
import io
import sys
import time

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create file handler
fh = logging.FileHandler('app.log')
fh.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
fh.setFormatter(formatter)
logger.addHandler(fh)

# Initialize R packages
with localconverter(default_converter + pandas2ri.converter) as cv:
    base = importr('base')
    ggplot2 = importr('ggplot2')
    dplyr = importr('dplyr')
    grdevices = importr('grDevices')

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure upload paths
current_dir = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(current_dir, 'uploads')
RESULTS_FOLDER = os.path.join(current_dir, 'results')
MASK_FOLDER = os.path.join(current_dir, 'masks')
PLOT_FOLDER = os.path.join(current_dir, 'plots')

# Create necessary directories
for folder in [UPLOAD_FOLDER, RESULTS_FOLDER, MASK_FOLDER, PLOT_FOLDER]:
    try:
        os.makedirs(folder, exist_ok=True)
        os.chmod(folder, 0o777)
        logger.info(f"Created directory: {folder}")
    except Exception as e:
        logger.error(f"Error creating directory {folder}: {e}")

logger.info("Application started")
logger.info(f"Upload folder: {UPLOAD_FOLDER}")
logger.info(f"Mask folder: {MASK_FOLDER}")
logger.info(f"Plot folder: {PLOT_FOLDER}")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    try:
        # Test directory access
        for folder in [UPLOAD_FOLDER, RESULTS_FOLDER, MASK_FOLDER, PLOT_FOLDER]:
            if not os.path.exists(folder):
                raise Exception(f"Directory not found: {folder}")
            if not os.access(folder, os.W_OK):
                raise Exception(f"Directory not writable: {folder}")
        
        return jsonify({
            'status': 'healthy',
            'message': 'Server is running and directories are accessible'
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

@app.route('/upload', methods=['POST', 'OPTIONS'])
def upload_file():
    if request.method == 'OPTIONS':
        return handle_preflight()
        
    logger.info("Received file upload request")
    
    try:
        if 'video' not in request.files:
            raise ValueError("No video file in request")
            
        video_file = request.files['video']
        if not video_file.filename:
            raise ValueError("No selected file")
            
        # Create upload directory if it doesn't exist
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        # Save the file
        filename = secure_filename(video_file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        video_file.save(file_path)
        logger.info(f"Saved video to: {file_path}")
        
        # Process video to get frames
        frames = process_video(file_path)
        logger.info(f"Processed video, shape: {frames.shape}")
        
        # Convert frames to base64 for preview
        encoded_frames = []
        for frame in frames:
            # Ensure frame is uint8
            if frame.dtype != np.uint8:
                if frame.max() > 1:
                    frame = (frame / frame.max() * 255).astype(np.uint8)
                else:
                    frame = (frame * 255).astype(np.uint8)
            
            # Convert to RGB if needed
            if len(frame.shape) == 2:
                frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2RGB)
            elif frame.shape[-1] == 4:
                frame = frame[..., :3]
            
            # Encode frame
            _, buffer = cv2.imencode('.png', frame)
            encoded_frame = base64.b64encode(buffer).decode('utf-8')
            encoded_frames.append(encoded_frame)
        
        logger.info(f"Encoded {len(encoded_frames)} frames")
        
        return jsonify({
            'message': 'File uploaded successfully',
            'path': file_path,
            'frames': encoded_frames
        })
        
    except Exception as e:
        logger.exception("Error in upload_file")
        return jsonify({'error': str(e)}), 400

@app.route('/upload-mask', methods=['POST'])
def upload_mask():
    """Handle mask file upload."""
    logger.info("Received mask upload request")
    logger.debug(f"Files in request: {request.files.keys()}")
    logger.debug(f"Request headers: {dict(request.headers)}")
    
    try:
        if 'file' not in request.files:
            logger.error("No file in request")
            return jsonify({'error': 'No file provided'}), 400
            
        file = request.files['file']
        logger.info(f"Received file: {file.filename}")
        
        if not file.filename:
            logger.error("No filename")
            return jsonify({'error': 'No file selected'}), 400
            
        # Create upload directory if it doesn't exist
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        # Save the uploaded file
        mask_path = os.path.join(UPLOAD_FOLDER, secure_filename(file.filename))
        logger.info(f"Saving mask to: {mask_path}")
        file.save(mask_path)
        logger.info(f"File saved successfully. Size: {os.path.getsize(mask_path)} bytes")
        
        # Process the mask
        logger.info("Processing mask")
        result = process_mask(mask_path)
        logger.info("Mask processed successfully")
        logger.debug(f"Number of cells detected: {len(result['cell_ids'])}")
        
        response_data = {
            'message': 'Mask uploaded successfully',
            'mask_path': mask_path,
            'mask_image': result['mask_image'],
            'cell_ids': result['cell_ids']
        }
        logger.info("Sending response")
        logger.debug(f"Response data keys: {response_data.keys()}")
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.exception("Error in upload_mask")
        return jsonify({'error': str(e)}), 400

@app.route('/analyze', methods=['POST'])
def analyze_video():
    logger.info(f"Received {request.method} request to /analyze")
    
    try:
        data = request.get_json()
        if not data or 'video_path' not in data:
            raise ValueError("No video path provided")
            
        video_path = data['video_path']
        if not os.path.exists(video_path):
            raise ValueError(f"Video file not found: {video_path}")
            
        mask_path = data.get('mask_path')
        if mask_path and not os.path.exists(mask_path):
            raise ValueError(f"Mask file not found: {mask_path}")
        
        logger.info(f"Analyzing video: {video_path}")
        
        # Process video and get frames
        frames = process_video(video_path)
        logger.info(f"Loaded video with shape: {frames.shape}")
        
        if mask_path:
            # Use uploaded mask
            logger.info(f"Using provided mask: {mask_path}")
            masks = tifffile.imread(mask_path)
            if len(masks.shape) > 2:
                if masks.shape[-1] == 3:  # RGB mask
                    masks = masks[..., 1]  # Use green channel
                else:
                    masks = masks[0] if len(masks.shape) == 3 else masks[0, 0]
            logger.info(f"Loaded mask with shape: {masks.shape}")
        else:
            # Get first frame for segmentation
            first_frame = frames[0]
            logger.info(f"First frame shape: {first_frame.shape}")
            
            # Prepare frame for segmentation
            segment_channel = prepare_for_segmentation(first_frame)
            logger.info(f"Prepared segment channel shape: {segment_channel.shape}")
            
            # Initialize and run Cellpose
            try:
                model = initialize_cellpose()
                masks, flows, styles, diams = model.eval(segment_channel, 
                                                       diameter=30,
                                                       flow_threshold=0.4,
                                                       cellprob_threshold=0.0,
                                                       channels=[0,0])
                logger.info(f"Generated mask with shape: {masks.shape}")
                
                # Ensure mask is 2D
                if len(masks.shape) > 2:
                    if masks.shape[-1] == 3:  # RGB mask
                        masks = masks[..., 1]  # Use green channel
                    else:
                        masks = masks[0] if len(masks.shape) == 3 else masks[0, 0]
                    logger.info(f"Reshaped mask to: {masks.shape}")
                
            except Exception as e:
                logger.exception("Error in Cellpose segmentation")
                raise ValueError(f"Cellpose segmentation failed: {str(e)}")
        
        # Verify mask dimensions
        if masks.shape != (frames.shape[1], frames.shape[2]):
            raise ValueError(f"Mask shape {masks.shape} does not match frame dimensions {(frames.shape[1], frames.shape[2])}")
        
        logger.info(f"Final mask shape: {masks.shape}")
        
        # Get unique cell IDs (excluding background which is 0)
        unique_cells = np.unique(masks)
        unique_cells = unique_cells[unique_cells != 0]
        n_cells = len(unique_cells)
        
        if n_cells == 0:
            raise ValueError("No cells detected in the image")
        
        logger.info(f"Found {n_cells} unique cells")
        
        # Create mask preview with cell labels
        mask_rgb = np.zeros((*masks.shape, 3), dtype=np.uint8)
        
        # Generate distinct colors for each cell
        colors = []
        for i in range(n_cells):
            hue = i / max(n_cells, 1)
            rgb = tuple(int(x * 255) for x in colorsys.hsv_to_rgb(hue, 0.8, 0.9))
            colors.append(rgb)
        
        # Color each cell
        for i, cell_id in enumerate(unique_cells):
            cell_mask = masks == cell_id
            mask_rgb[cell_mask] = colors[i]
        
        # Add cell numbers
        mask_with_labels = mask_rgb.copy()
        for i, cell_id in enumerate(unique_cells):
            cell_mask = masks == cell_id
            y, x = np.where(cell_mask)
            if len(y) > 0 and len(x) > 0:
                center_y = int(np.mean(y))
                center_x = int(np.mean(x))
                label = str(int(cell_id))
                # Add black outline
                cv2.putText(mask_with_labels, label, (center_x, center_y),
                          cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 2)
                # Add white text
                cv2.putText(mask_with_labels, label, (center_x, center_y),
                          cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        
        # Save mask
        os.makedirs(MASK_FOLDER, exist_ok=True)
        mask_path = os.path.join(MASK_FOLDER, 'latest_mask.tiff')
        tifffile.imwrite(mask_path, masks)
        logger.info(f"Saved mask to: {mask_path}")
        
        # Analyze calcium intensity
        try:
            intensity_df = analyze_calcium_intensity(frames, masks)
            
            # Save results
            os.makedirs(RESULTS_FOLDER, exist_ok=True)
            results_path = os.path.join(RESULTS_FOLDER, 'intensity_data.csv')
            intensity_df.to_csv(results_path, index=False)
            logger.info(f"Saved results to: {results_path}")
            
            # Generate plot
            try:
                plot_response = create_plot_from_data(intensity_df)
                plot_b64 = plot_response.get('plot')
                logger.info("Generated plot successfully")
            except Exception as e:
                logger.exception("Error generating plot")
                plot_b64 = None
            
        except Exception as e:
            logger.exception("Error in calcium intensity analysis")
            raise ValueError(f"Calcium intensity analysis failed: {str(e)}")
        
        # Convert mask preview to base64
        _, buffer = cv2.imencode('.png', mask_with_labels)
        mask_preview_b64 = base64.b64encode(buffer).decode('utf-8')
        logger.info("Generated mask preview with cell labels")
        
        return jsonify({
            'message': 'Analysis complete',
            'results_path': results_path,
            'mask_path': mask_path,
            'mask_preview': mask_preview_b64,
            'plot': plot_b64,
            'n_cells': n_cells
        })
    except Exception as e:
        logger.exception("Error in analyze_video")
        error_msg = str(e)
        if "dimension is" in error_msg and "but corresponding boolean dimension is" in error_msg:
            error_msg = "Mask dimensions do not match video dimensions. Please check your input files."
        return jsonify({'error': error_msg}), 500

@app.route('/get-csv-data', methods=['GET'])
def get_csv_data():
    """Get CSV data for display in table."""
    try:
        path = request.args.get('path')
        if not path or not os.path.exists(path):
            raise ValueError(f"CSV file not found: {path}")

        # Read CSV file
        df = pd.read_csv(path)
        
        # Convert DataFrame to list of dictionaries
        data = df.to_dict('records')
        columns = list(df.columns)

        return jsonify({
            'data': data,
            'columns': columns
        })

    except Exception as e:
        logger.exception("Error getting CSV data")
        return jsonify({'error': str(e)}), 500

@app.route('/plot', methods=['POST'])
def generate_plot():
    """Generate plot for selected cells using ggplot2."""
    try:
        data = request.get_json()
        if not data:
            raise ValueError("No data received")

        cells = data.get('cells', [])
        results_path = data.get('results_path')
        plot_options = data.get('plot_options', {})
        
        # Get plot preferences
        y_axis = plot_options.get('y_axis', 'intensity')
        x_axis = plot_options.get('x_axis', 'frame')
        
        # Get style options
        style_options = plot_options.get('style', {})
        theme = style_options.get('theme', 'minimal')
        line_size = style_options.get('line_size', 1)
        show_points = style_options.get('show_points', False)
        point_size = style_options.get('point_size', 2)
        fill_alpha = style_options.get('fill_alpha', 0)
        color_palette = style_options.get('color_palette', 'Set1')
        background_color = style_options.get('background', None)
        grid_color = style_options.get('grid_color', 'grey80')
        grid_style = style_options.get('grid_style', 'both')
        y_scale = style_options.get('y_scale', 'regular')
        axis_text_size = style_options.get('axis_text_size', 10)
        legend_position = style_options.get('legend_position', 'right')
        smooth_lines = style_options.get('smooth_lines', False)
        smooth_span = style_options.get('smooth_span', 0.75)
        show_error_bands = style_options.get('show_error_bands', False)

        if not cells:
            raise ValueError("No cells selected")
        if not results_path or not os.path.exists(results_path):
            raise ValueError(f"Results file not found: {results_path}")

        # Read the CSV data
        df = pd.read_csv(results_path)
        
        # Filter data for selected cells
        df_filtered = df[df['cell_id'].isin(cells)].copy()
        df_filtered['cell_id'] = 'Cell ' + df_filtered['cell_id'].astype(str)
        
        # Create temporary file for plot
        temp_plot = os.path.join(PLOT_FOLDER, f'plot_{int(time.time())}.png')
        
        # Generate colors using HSV color space
        n_cells = len(cells)
        logger.info(f"Generating colors for {n_cells} cells")
        
        # Create R color vector
        if n_cells > 9:  # If more than 9 cells, generate custom colors
            hsv_colors = np.zeros((n_cells, 3))
            hsv_colors[:, 0] = np.linspace(0, 1, n_cells, endpoint=False)  # Hue
            hsv_colors[:, 1] = 0.8  # Saturation
            hsv_colors[:, 2] = 0.9  # Value
            
            # Convert to RGB
            rgb_colors = cv2.cvtColor(
                (hsv_colors.reshape(1, -1, 3) * 255).astype(np.uint8),
                cv2.COLOR_HSV2RGB
            )[0]
            
            # Convert to R color strings
            r_colors = [f'"#{r:02x}{g:02x}{b:02x}"' for r, g, b in rgb_colors]
            color_scale = f'scale_color_manual(values=c({",".join(r_colors)}))'
            if fill_alpha > 0:
                fill_scale = f'scale_fill_manual(values=c({",".join(r_colors)}))'
            else:
                fill_scale = ''
        else:
            # Use RColorBrewer palette for 9 or fewer cells
            color_scale = f'scale_color_brewer(palette="{color_palette}")'
            fill_scale = f'scale_fill_brewer(palette="{color_palette}")' if fill_alpha > 0 else ''
        
        # Use localconverter for R operations
        with localconverter(default_converter + pandas2ri.converter) as cv:
            # Convert to R dataframe
            r_df = pandas2ri.py2rpy(df_filtered)
            
            # Create the R environment and assign data
            r_env = ro.Environment()
            r_env['df'] = r_df
            
            # Prepare plot options
            y_label = 'ΔF/F' if y_axis == 'dF' else y_axis.replace('_', ' ').title()
            x_label = 'Time (seconds)' if x_axis == 'time_seconds' else 'Frame Number'
            
            # Create R plotting commands with dynamic options
            r_code = f"""
                function(df) {{
                    library(ggplot2)
                    library(scales)
                    
                    # Base plot
                    p <- ggplot(df, aes(x={x_axis}, y={y_axis}, color=cell_id)) +
                        {color_scale}
                    
                    # Add geom based on smoothing option
                    {f'''
                    if ({str(smooth_lines).upper()}) {{
                        p <- p + geom_smooth(
                            method="loess",
                            span={smooth_span},
                            se={str(show_error_bands).upper()},
                            size={line_size}
                        )
                    }} else {{
                        p <- p + geom_line(size={line_size})
                    }}
                    ''' if smooth_lines else f'p <- p + geom_line(size={line_size})'}
                    
                    # Add points if requested
                    {f'p <- p + geom_point(size={point_size})' if show_points else ''}
                    
                    # Add fill if requested
                    {f'''
                    p <- p + geom_ribbon(
                        aes(ymin=min({y_axis}), ymax={y_axis}, fill=cell_id),
                        alpha={fill_alpha}
                    ) +
                    {fill_scale}
                    ''' if fill_alpha > 0 else ''}
                    
                    # Scale options
                    {f'p <- p + scale_y_log10()' if y_scale == 'log' else ''}
                    
                    # Theme selection
                    p <- p + theme_{theme}()
                    
                    # Grid style
                    {'''
                    if (grid_style == "none") {
                        p <- p + theme(panel.grid = element_blank())
                    } else if (grid_style == "major") {
                        p <- p + theme(panel.grid.minor = element_blank())
                    }
                    ''' if grid_style != 'both' else ''}
                    
                    # Labels
                    p <- p + labs(
                        title='Calcium Imaging Analysis',
                        x='{x_label}',
                        y='{y_label}',
                        color='Cell ID',
                        fill='Cell ID'
                    )
                    
                    # Custom theme elements
                    p <- p + theme(
                        plot.title = element_text(size=14, face="bold", hjust=0.5),
                        axis.title = element_text(size=12),
                        axis.text = element_text(size={axis_text_size}),
                        legend.position = "{legend_position}",
                        legend.title = element_text(size=12),
                        legend.text = element_text(size=10),
                        panel.grid.major = element_line(color="{grid_color}"),
                        panel.grid.minor = element_line(color="{grid_color}", linetype="dotted"),
                        {f'plot.background = element_rect(fill="{background_color}")' if background_color else ''}
                    )
                    
                    # Save plot with high resolution
                    ggsave('{temp_plot}', p, width=10, height=6, dpi=300)
                }}
            """
            
            # Execute R code
            ro.r(r_code)(r_df)
        
        # Read and encode plot
        with open(temp_plot, 'rb') as f:
            plot_data = base64.b64encode(f.read()).decode('utf-8')
        
        # Clean up
        os.remove(temp_plot)
        
        return jsonify({
            'plot': plot_data
        })

    except Exception as e:
        logger.exception("Error generating plot")
        return jsonify({'error': str(e)}), 400

@app.route('/export-csv', methods=['POST'])
def export_csv():
    """Export analysis results to CSV."""
    logger.info("Received CSV export request")
    
    try:
        data = request.get_json()
        logger.debug(f"Export request data: {data}")
        
        if not data or 'results_path' not in data:
            logger.error("No results path provided")
            return jsonify({'error': 'No results path provided'}), 400
            
        results_path = data['results_path']
        if not os.path.exists(results_path):
            logger.error(f"Results file not found: {results_path}")
            return jsonify({'error': 'Results file not found'}), 400
        
        # Get selected cells
        selected_cells = data.get('cells', [])
        if not selected_cells:
            logger.error("No cells selected for export")
            return jsonify({'error': 'No cells selected for export'}), 400
            
        # Read the original CSV
        df = pd.read_csv(results_path)
        
        # Filter for selected cells
        df = df[df['cell_id'].isin(selected_cells)]
        
        # Calculate dF/F for each cell
        cells = df['cell_id'].unique()
        df_list = []
        
        for cell in cells:
            cell_data = df[df['cell_id'] == cell].copy()
            intensities = cell_data['intensity'].values
            cell_data['dF'] = calculate_df(intensities)
            cell_data['time_seconds'] = cell_data['frame'] / 30  # Assuming 30fps
            df_list.append(cell_data)
            
        final_df = pd.concat(df_list) if df_list else pd.DataFrame()
        
        # Save to new file with timestamp
        timestamp = int(time.time())
        filename = f'selected_cells_{timestamp}.csv'
        export_path = os.path.join(RESULTS_FOLDER, filename)
        final_df.to_csv(export_path, index=False)
        
        logger.info(f"Exported CSV to: {export_path}")
        
        return jsonify({
            'success': True,
            'path': export_path
        })
        
    except Exception as e:
        logger.exception("Error exporting CSV")
        return jsonify({'error': str(e)}), 400

@app.route('/import-csv', methods=['POST'])
def import_csv():
    """Import CSV file for analysis."""
    try:
        if 'file' not in request.files:
            raise ValueError("No file provided")
            
        file = request.files['file']
        if file.filename == '':
            raise ValueError("No file selected")
            
        if not file.filename.endswith('.csv'):
            raise ValueError("File must be a CSV")
            
        # Save the uploaded file
        filename = secure_filename(file.filename)
        import_path = os.path.join(RESULTS_FOLDER, filename)
        file.save(import_path)
        
        # Validate CSV format
        df = pd.read_csv(import_path)
        required_columns = ['cell_id', 'frame', 'intensity']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            os.remove(import_path)
            raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")
            
        # Calculate dF if not present
        if 'dF' not in df.columns:
            cells = df['cell_id'].unique()
            df_list = []
            
            for cell in cells:
                cell_data = df[df['cell_id'] == cell].copy()
                intensities = cell_data['intensity'].values
                cell_data['dF'] = calculate_df(intensities)
                cell_data['time_seconds'] = cell_data['frame'] / 30  # Assuming 30fps
                df_list.append(cell_data)
                
            df = pd.concat(df_list)
            df.to_csv(import_path, index=False)
        
        return jsonify({
            'success': True,
            'path': import_path,
            'cells': df['cell_id'].unique().tolist()
        })
        
    except Exception as e:
        logger.exception("Error importing CSV")
        return jsonify({'error': str(e)}), 400

@app.route('/results/<path:filename>')
def serve_results(filename):
    """Serve files from the results folder."""
    return send_from_directory(RESULTS_FOLDER, filename)

@app.route('/generate-plot', methods=['POST'])
def generate_plot_endpoint():
    """Generate plot for selected cells."""
    try:
        data = request.get_json()
        if not data:
            raise ValueError("No data received")

        cells = data.get('cells', [])
        results_path = data.get('path')
        options = data.get('options', {})
        
        if not cells:
            raise ValueError("No cells selected")
        if not results_path or not os.path.exists(results_path):
            raise ValueError(f"Results file not found: {results_path}")

        # Read the CSV data
        df = pd.read_csv(results_path)
        
        # Filter data for selected cells
        df_filtered = df[df['cell_id'].isin(cells)].copy()
        
        # Generate plot
        plot_response = create_plot_from_data(df_filtered, options)
        
        return jsonify({
            'plot_image': plot_response.get('plot')
        })

    except Exception as e:
        logger.exception("Error generating plot")
        return jsonify({'error': str(e)}), 400

@app.route('/export-all-csv', methods=['POST'])
def export_all_csv():
    """Export all cells to CSV."""
    try:
        data = request.get_json()
        if not data or 'path' not in data:
            raise ValueError("No results path provided")
            
        results_path = data.get('path')
        if not os.path.exists(results_path):
            raise ValueError(f"Results file not found: {results_path}")
        
        # Read the original CSV
        df = pd.read_csv(results_path)
        
        # Calculate dF/F for each cell if not already present
        if 'dF' not in df.columns:
            cells = df['cell_id'].unique()
            df_list = []
            
            for cell in cells:
                cell_data = df[df['cell_id'] == cell].copy()
                intensities = cell_data['intensity'].values
                cell_data['dF'] = calculate_df(intensities)
                cell_data['time_seconds'] = cell_data['frame'] / 30  # Assuming 30fps
                df_list.append(cell_data)
                
            df = pd.concat(df_list)
        
        # Save to new file with timestamp
        timestamp = int(time.time())
        filename = f'all_cells_{timestamp}.csv'
        export_path = os.path.join(RESULTS_FOLDER, filename)
        df.to_csv(export_path, index=False)
        
        logger.info(f"Exported all cells to CSV: {export_path}")
        
        return jsonify({
            'success': True,
            'path': export_path
        })
        
    except Exception as e:
        logger.exception("Error exporting all cells to CSV")
        return jsonify({'error': str(e)}), 400

@app.route('/download', methods=['GET'])
def download_file():
    """Download a file from the server."""
    try:
        path = request.args.get('path')
        if not path or not os.path.exists(path):
            raise ValueError(f"File not found: {path}")
        
        # Get filename from path
        filename = os.path.basename(path)
        directory = os.path.dirname(path)
        
        return send_from_directory(
            directory,
            filename,
            as_attachment=True
        )
        
    except Exception as e:
        logger.exception("Error downloading file")
        return jsonify({'error': str(e)}), 400

@app.errorhandler(Exception)
def handle_error(error):
    """Global error handler."""
    logger.exception("An error occurred:")
    response = jsonify({
        'error': str(error),
        'type': error.__class__.__name__
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 500

def analyze_calcium_intensity(frames, masks):
    """Analyze calcium intensity for each cell in the video."""
    logger.info(f"Analyzing calcium intensity for frames shape: {frames.shape}, masks shape: {masks.shape}")
    
    try:
        # Get unique cell IDs (excluding background which is 0)
        unique_cells = np.unique(masks)
        unique_cells = unique_cells[unique_cells != 0]
        
        # Ensure cells are labeled sequentially from 1 to N
        if not np.array_equal(unique_cells, np.arange(1, len(unique_cells) + 1)):
            logger.info("Cell IDs are not sequential, relabeling...")
            relabeled_mask = np.zeros_like(masks)
            for new_id, original_id in enumerate(unique_cells, 1):
                relabeled_mask[masks == original_id] = new_id
            masks = relabeled_mask
            unique_cells = np.arange(1, len(unique_cells) + 1)
            logger.info(f"Relabeled mask cells to be sequential from 1 to {len(unique_cells)}")
        
        # Initialize list to store results
        results = []
        
        # For each frame
        for frame_idx, frame in enumerate(frames):
            # Convert frame to grayscale if it's RGB
            if len(frame.shape) == 3:
                frame = frame[..., 1]  # Use green channel for fluorescence
            
            # For each cell
            for cell_id in unique_cells:
                # Get cell mask
                cell_mask = masks == cell_id
                
                # Calculate mean intensity for the cell in this frame
                mean_intensity = np.mean(frame[cell_mask])
                
                # Store results
                results.append({
                    'frame': frame_idx,
                    'cell_id': int(cell_id),
                    'intensity': float(mean_intensity)
                })
        
        # Convert to DataFrame
        df = pd.DataFrame(results)
        
        # Calculate baseline for each cell (first frame intensity)
        baselines = {}
        for cell_id in unique_cells:
            first_frame_data = df[(df['cell_id'] == cell_id) & (df['frame'] == 0)]
            if not first_frame_data.empty:
                baselines[cell_id] = first_frame_data['intensity'].values[0]
            else:
                # Fallback to mean of first few frames if first frame is missing
                baselines[cell_id] = df[df['cell_id'] == cell_id].nsmallest(min(10, len(df[df['cell_id'] == cell_id])), 'intensity')['intensity'].mean()
        
        # Add normalized intensity (as a percentage of baseline)
        df['normalized_intensity'] = df.apply(
            lambda row: (row['intensity'] / baselines[row['cell_id']]),
            axis=1
        )
        
        logger.info(f"Generated intensity data with shape: {df.shape}")
        return df
        
    except Exception as e:
        logger.exception("Error in calcium intensity analysis")
        raise

def create_plot_from_data(df, options={}):
    """Create plot directly from DataFrame."""
    logger.info(f"Creating plot from DataFrame with shape: {df.shape}")
    
    try:
        # Extract plot options
        y_axis = options.get('y_axis', 'intensity')
        x_axis = options.get('x_axis', 'frame')
        style = options.get('style', {})
        
        # Style options
        theme = style.get('theme', 'minimal')
        line_size = style.get('line_size', 1)
        show_points = style.get('show_points', False)
        point_size = style.get('point_size', 2)
        fill_alpha = style.get('fill_alpha', 0)
        color_palette = style.get('color_palette', 'Set1')
        background_color = style.get('background', None)
        grid_color = style.get('grid_color', 'grey80')
        grid_style = style.get('grid_style', 'both')
        y_scale = style.get('y_scale', 'regular')
        axis_text_size = style.get('axis_text_size', 10)
        legend_position = style.get('legend_position', 'right')
        smooth_lines = style.get('smooth_lines', False)
        smooth_span = style.get('smooth_span', 0.75)
        show_error_bands = style.get('show_error_bands', False)
        
        # Ensure cell_id is a string for better labels
        df['cell_id'] = 'Cell ' + df['cell_id'].astype(str)
        
        # Create temporary file for plot
        os.makedirs(PLOT_FOLDER, exist_ok=True)
        temp_plot = os.path.join(PLOT_FOLDER, f'plot_{int(time.time())}.png')
        
        # Generate colors using HSV color space
        n_cells = len(df['cell_id'].unique())
        logger.info(f"Generating colors for {n_cells} cells")
        
        # Create R color vector
        if n_cells > 9:  # If more than 9 cells, generate custom colors
            hsv_colors = np.zeros((n_cells, 3))
            hsv_colors[:, 0] = np.linspace(0, 1, n_cells, endpoint=False)  # Hue
            hsv_colors[:, 1] = 0.8  # Saturation
            hsv_colors[:, 2] = 0.9  # Value
            
            # Convert to RGB
            rgb_colors = cv2.cvtColor(
                (hsv_colors.reshape(1, -1, 3) * 255).astype(np.uint8),
                cv2.COLOR_HSV2RGB
            )[0]
            
            # Convert to R color strings
            r_colors = [f'"#{r:02x}{g:02x}{b:02x}"' for r, g, b in rgb_colors]
            color_scale = f'scale_color_manual(values=c({",".join(r_colors)}))'            
            if fill_alpha > 0:
                fill_scale = f'scale_fill_manual(values=c({",".join(r_colors)}))'            
            else:
                fill_scale = ''
        else:
            # Use RColorBrewer palette for 9 or fewer cells
            color_scale = f'scale_color_brewer(palette="{color_palette}")'
            fill_scale = f'scale_fill_brewer(palette="{color_palette}")' if fill_alpha > 0 else ''
        
        # Use localconverter for R operations
        with localconverter(default_converter + pandas2ri.converter) as cv:
            # Convert to R dataframe
            r_df = pandas2ri.py2rpy(df)
            
            # Create the R environment and assign data
            r_env = ro.Environment()
            r_env['df'] = r_df
            
            # Prepare plot options
            y_label = 'ΔF/F' if y_axis == 'dF' else y_axis.replace('_', ' ').title()
            x_label = 'Time (seconds)' if x_axis == 'time_seconds' else 'Frame Number'
            
            # Create R plotting commands with dynamic options
            r_code = f"""
                function(df) {{
                    library(ggplot2)
                    library(scales)
                    
                    # Base plot
                    p <- ggplot(df, aes(x={x_axis}, y={y_axis}, color=cell_id)) +
                        {color_scale}
                    
                    # Add geom based on smoothing option
                    {f'''
                    if ({str(smooth_lines).upper()}) {{
                        p <- p + geom_smooth(
                            method="loess",
                            span={smooth_span},
                            se={str(show_error_bands).upper()},
                            size={line_size}
                        )
                    }} else {{
                        p <- p + geom_line(size={line_size})
                    }}
                    ''' if smooth_lines else f'p <- p + geom_line(size={line_size})'}
                    
                    # Add points if requested
                    {f'p <- p + geom_point(size={point_size})' if show_points else ''}
                    
                    # Add fill if requested
                    {f'''
                    p <- p + geom_ribbon(
                        aes(ymin=min({y_axis}), ymax={y_axis}, fill=cell_id),
                        alpha={fill_alpha}
                    ) +
                    {fill_scale}
                    ''' if fill_alpha > 0 else ''}
                    
                    # Scale options
                    {f'p <- p + scale_y_log10()' if y_scale == 'log' else ''}
                    
                    # Theme selection
                    p <- p + theme_{theme}()
                    
                    # Grid style
                    {'''
                    if (grid_style == "none") {
                        p <- p + theme(panel.grid = element_blank())
                    } else if (grid_style == "major") {
                        p <- p + theme(panel.grid.minor = element_blank())
                    }
                    ''' if grid_style != 'both' else ''}
                    
                    # Labels
                    p <- p + labs(
                        title='Calcium Imaging Analysis',
                        x='{x_label}',
                        y='{y_label}',
                        color='Cell ID',
                        fill='Cell ID'
                    )
                    
                    # Custom theme elements
                    p <- p + theme(
                        plot.title = element_text(size=14, face="bold", hjust=0.5),
                        axis.title = element_text(size=12),
                        axis.text = element_text(size={axis_text_size}),
                        legend.position = "{legend_position}",
                        legend.title = element_text(size=12),
                        legend.text = element_text(size=10),
                        panel.grid.major = element_line(color="{grid_color}"),
                        panel.grid.minor = element_line(color="{grid_color}", linetype="dotted"),
                        {f'plot.background = element_rect(fill="{background_color}")' if background_color else ''}
                    )
                    
                    # Save plot with high resolution
                    ggsave('{temp_plot}', p, width=10, height=6, dpi=300)
                }}
            """
            
            # Execute R code
            ro.r(r_code)(r_df)
        
        # Read and encode plot
        with open(temp_plot, 'rb') as f:
            plot_data = base64.b64encode(f.read()).decode('utf-8')
        
        # Clean up
        os.remove(temp_plot)
        
        return {
            'plot': plot_data
        }
        
    except Exception as e:
        logger.exception("Error creating plot from data")
        raise

def process_video(video_path):
    logger.info(f"Processing video: {video_path}")
    
    try:
        if video_path.endswith(('.tiff', '.tif', '.ome.tiff')):
            frames = tifffile.imread(video_path)
            logger.info(f"Loaded TIFF file with shape: {frames.shape}")
        else:
            cap = cv2.VideoCapture(video_path)
            frames = []
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                frames.append(frame)
            cap.release()
            frames = np.array(frames)
            logger.info(f"Loaded video file with shape: {frames.shape}")
        
        # Ensure frames are in the correct format (N, H, W, C)
        if len(frames.shape) == 2:  # Single frame, grayscale
            frames = frames[np.newaxis, ..., np.newaxis]
        elif len(frames.shape) == 3:
            if frames.shape[-1] in [1, 3, 4]:  # Single frame with channels
                frames = frames[np.newaxis, ...]
            else:  # Multiple frames without channels
                frames = frames[..., np.newaxis]
        
        # Convert to RGB if necessary
        if frames.shape[-1] == 1:
            frames = np.repeat(frames, 3, axis=-1)
        elif frames.shape[-1] == 4:
            frames = frames[..., :3]
        
        logger.info(f"Processed frames shape: {frames.shape}")
        return frames
    
    except Exception as e:
        logger.exception(f"Error processing video: {str(e)}")
        raise

def prepare_for_segmentation(frame):
    """Prepare a frame for Cellpose segmentation."""
    logger.info(f"Preparing frame for segmentation, input shape: {frame.shape}")
    
    try:
        # Convert to grayscale if needed
        if len(frame.shape) == 3 and frame.shape[-1] >= 3:
            # Use green channel for fluorescence
            img = frame[..., 1]
        else:
            img = frame[..., 0] if len(frame.shape) == 3 else frame
        
        logger.info(f"After channel selection shape: {img.shape}")
        
        # Ensure 2D
        if len(img.shape) > 2:
            img = img.reshape(img.shape[:2])
        
        # Normalize to uint8
        if img.dtype != np.uint8:
            if img.max() > 1:
                img = (img / img.max() * 255).astype(np.uint8)
            else:
                img = (img * 255).astype(np.uint8)
        
        logger.info(f"Final segmentation input shape: {img.shape}")
        return img
    
    except Exception as e:
        logger.exception("Error preparing frame for segmentation")
        raise

def initialize_cellpose():
    logger.info("Initializing Cellpose")
    try:
        model = models.Cellpose(gpu=False, model_type='cyto')
        logger.info("Cellpose initialized successfully")
        return model
    except Exception as e:
        logger.exception("Error initializing Cellpose")
        raise

def get_video_preview(video_path):
    logger.info(f"Generating preview for: {video_path}")
    
    try:
        # Load all frames
        frames = process_video(video_path)
        logger.info(f"Loaded frames with shape: {frames.shape}")
        
        # Convert frames to base64
        encoded_frames = []
        for i, frame in enumerate(frames):
            # Ensure frame is uint8
            if frame.dtype != np.uint8:
                if frame.max() > 1:
                    frame = (frame / frame.max() * 255).astype(np.uint8)
                else:
                    frame = (frame * 255).astype(np.uint8)
            
            # Convert to RGB if necessary
            if len(frame.shape) == 2:
                frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2RGB)
            elif frame.shape[-1] == 4:
                frame = frame[..., :3]
            
            # Encode frame
            _, buffer = cv2.imencode('.png', frame)
            encoded_frame = base64.b64encode(buffer).decode('utf-8')
            encoded_frames.append(encoded_frame)
            logger.debug(f"Encoded frame {i+1}/{len(frames)}")
        
        logger.info(f"Successfully encoded {len(encoded_frames)} frames")
        return encoded_frames
        
    except Exception as e:
        logger.exception(f"Error generating preview: {str(e)}")
        raise

def handle_preflight():
    """Handle CORS preflight requests."""
    response = app.make_default_options_response()
    response.headers.update({
        'Access-Control-Allow-Origin': 'http://localhost:3000',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    })
    return response

def calculate_df(intensities, baseline_frames=10):
    """Calculate change in fluorescence (dF/F)."""
    baseline = np.mean(intensities[:baseline_frames])
    df = (intensities - baseline) / baseline
    return df

def process_mask(mask_path):
    """Process the mask file and return the processed image with cell IDs with sequential labeling."""
    logger.info(f"Processing mask from path: {mask_path}")
    try:
        # Read the mask file
        logger.info("Reading mask file...")
        mask = tifffile.imread(mask_path)
        if mask is None:
            raise ValueError("Failed to read mask file")

        logger.info(f"Mask shape: {mask.shape}, dtype: {mask.dtype}")
        logger.info(f"Mask min: {mask.min()}, max: {mask.max()}")

        # Ensure mask is 2D
        if len(mask.shape) > 2:
            logger.info(f"Converting {len(mask.shape)}D mask to 2D")
            if len(mask.shape) == 3 and mask.shape[2] == 3:  # RGB mask
                mask = mask[:, :, 0]  # Take first channel
            else:
                mask = mask[0] if len(mask.shape) == 3 else mask[0, 0]
            logger.info(f"Converted mask shape: {mask.shape}")

        unique_original_cell_ids = np.unique(mask) # Get original unique IDs
        unique_original_cell_ids = unique_original_cell_ids[unique_original_cell_ids != 0]  # Remove background
        logger.info(f"Found {len(unique_original_cell_ids)} unique original cell IDs: {unique_original_cell_ids}")

        # Create a mapping from original IDs to sequential IDs
        original_to_sequential_id_map = {original_id: sequential_id for sequential_id, original_id in enumerate(unique_original_cell_ids, 1)}

        # Relabel the mask with sequential IDs
        relabeled_mask = np.zeros_like(mask)
        for original_id, sequential_id in original_to_sequential_id_map.items():
            relabeled_mask[mask == original_id] = sequential_id
        mask = relabeled_mask # Use the relabeled mask from now on

        unique_cells = np.unique(mask) # unique_cells will now be sequential (1, 2, 3...)
        unique_cells = unique_cells[unique_cells != 0] # remove background (should already be removed but just in case)
        logger.info(f"Found {len(unique_cells)} unique cells after relabeling (sequential IDs): {unique_cells}")


        # Create RGB image for visualization
        mask_rgb = np.zeros((*mask.shape, 3), dtype=np.uint8)

        # Generate colors using HSV color space for better distinction
        n_colors = len(unique_cells)
        hsv_colors = np.zeros((n_colors, 3))
        hsv_colors[:, 0] = np.linspace(0, 1, n_colors, endpoint=False)  # Hue
        hsv_colors[:, 1] = 0.8  # Saturation
        hsv_colors[:, 2] = 0.9  # Value

        # Convert to RGB
        colors = (cv2.cvtColor(
            (hsv_colors.reshape(1, -1, 3) * 255).astype(np.uint8),
            cv2.COLOR_HSV2RGB
        )[0] * 0.7).astype(np.uint8)  # Multiply by 0.7 to make colors less bright

        logger.info(f"Generated {len(colors)} distinct colors")

        # Create mask with colors
        for i, cell_id in enumerate(unique_cells):
            cell_mask = mask == cell_id
            for c in range(3):
                mask_rgb[:, :, c][cell_mask] = colors[i, c]

        # Add cell IDs as text
        text_img = np.zeros_like(mask_rgb)
        font_scale = max(0.3, min(0.7, 400 / max(mask.shape)))  # Adjust font size based on image size
        logger.info(f"Using font scale: {font_scale}")

        for cell_id in unique_cells:
            cell_mask = mask == cell_id
            y_coords, x_coords = np.where(cell_mask)
            if len(y_coords) > 0:
                # Calculate weighted centroid for better text placement
                weights = cell_mask[y_coords, x_coords].astype(float)
                center_y = int(np.average(y_coords, weights=weights))
                center_x = int(np.average(x_coords, weights=weights))

                # Add black outline
                for dx, dy in [(-1,-1), (-1,1), (1,-1), (1,1), (-2,0), (2,0), (0,-2), (0,2)]:
                    cv2.putText(text_img, str(cell_id),
                              (center_x + dx, center_y + dy),
                              cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), 2)

                # Add white text
                cv2.putText(text_img, str(cell_id),
                          (center_x, center_y),
                          cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255, 255, 255), 1)

        # Blend text with mask
        mask_with_ids = cv2.addWeighted(mask_rgb, 1, text_img, 1, 0)

        # Convert to base64
        logger.info("Converting mask to PNG and base64")
        _, buffer = cv2.imencode('.png', mask_with_ids)
        mask_base64 = base64.b64encode(buffer).decode('utf-8')

        logger.info("Mask processing completed successfully")
        return {
            'mask_image': mask_base64,
            'cell_ids': list(original_to_sequential_id_map.values()) # Return sequential IDs
        }

    except Exception as e:
        logger.exception("Error in process_mask")
        raise ValueError(f"Error processing mask: {str(e)}")

if __name__ == '__main__':
    try:
        port = 5001
        logger.info(f"Starting Flask server on port {port}")
        app.run(host='localhost', port=port, debug=True, threaded=True)
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)