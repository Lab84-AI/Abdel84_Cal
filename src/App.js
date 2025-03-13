import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Activity, Upload, Play, Pause, SkipForward, SkipBack, BarChart, FileVideo, FileCheck, Moon, Sun, Palette } from 'lucide-react';
import axios from 'axios';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Paper, Button, FormControl, InputLabel, MenuItem, Select, Switch, FormControlLabel,
  Slider, Box, Typography, Grid, Accordion, AccordionSummary, AccordionDetails,
  Tooltip, IconButton, CircularProgress, Autocomplete, TextField, Chip, Snackbar, Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ColorLensIcon from '@mui/icons-material/ColorLens';

const API_URL = 'http://localhost:5001';

const api = axios.create({
  baseURL: API_URL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for multipart/form-data
api.interceptors.request.use(config => {
  if (config.data instanceof FormData) {
    config.headers['Content-Type'] = 'multipart/form-data';
  }
  return config;
});

function App() {
  const [file, setFile] = useState(null);
  const [maskFile, setMaskFile] = useState(null);
  const [frames, setFrames] = useState([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [maskPreview, setMaskPreview] = useState(null);
  const [serverStatus, setServerStatus] = useState('checking');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalFrames, setTotalFrames] = useState(0);
  const [fps, setFps] = useState(30);
  const playbackInterval = React.useRef(null);
  const [csvData, setCsvData] = useState({ rows: [], columns: [] });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [uploadedVideoPath, setUploadedVideoPath] = useState(null);
  const [selectedCells, setSelectedCells] = useState([]);
  const [plotData, setPlotData] = useState(null);
  const [plotOptions, setPlotOptions] = useState({
    y_axis: 'intensity',
    x_axis: 'frame',
    style: {
      theme: 'bw',
      line_size: 1,
      show_points: true,
      point_size: 2,
      fill_alpha: 0,
      color_palette: 'Set1',
      background: null,
      grid_color: 'grey80',
      grid_style: 'both',
      y_scale: 'regular',
      axis_text_size: 10,
      legend_position: 'right',
      smooth_lines: false,
      smooth_span: 0.75,
      show_error_bands: false
    }
  });
  const [loading, setLoading] = useState(false);
  const [maskImage, setMaskImage] = useState(null);
  const [cellIds, setCellIds] = useState([]);
  const [maskPath, setMaskPath] = useState(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [theme, setTheme] = useState('light'); // 'light', 'dark', or 'colorful'

  // Check server status on component mount
  React.useEffect(() => {
    checkServerStatus();
  }, []);

  React.useEffect(() => {
    if (isPlaying) {
      playbackInterval.current = setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % totalFrames);
      }, 1000 / fps);
    } else {
      clearInterval(playbackInterval.current);
    }
    return () => clearInterval(playbackInterval.current);
  }, [isPlaying, totalFrames, fps]);

  const checkServerStatus = React.useCallback(async () => {
    try {
      await api.get('/health');
      setServerStatus('running');
      setError(null);
    } catch (error) {
      console.error('Server status check error:', error);
      setServerStatus('error');
      setError('Cannot connect to server. Please ensure the Flask backend is running.');
    }
  }, []);

  // Add periodic health check
  React.useEffect(() => {
    const interval = setInterval(checkServerStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [checkServerStatus]);

  React.useEffect(() => {
    if (csvData?.columns?.length > 0) {
      // Update y_axis if current selection is not available
      const numericalColumns = csvData.columns.filter(col => 
        ['intensity', 'normalized_intensity', 'frame'].includes(col)
      );
      
      if (numericalColumns.length > 0 && !numericalColumns.includes(plotOptions.y_axis)) {
        setPlotOptions(prev => ({
          ...prev,
          y_axis: numericalColumns[0]
        }));
      }
    }
  }, [csvData, plotOptions.y_axis]);

  const onMaskDrop = React.useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    console.log('Uploading mask file:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Sending mask upload request...');
      const response = await axios.post(`${API_URL}/upload-mask`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Mask upload response:', response.data);
      
      if (response.data.mask_image) {
        setMaskImage(`data:image/png;base64,${response.data.mask_image}`);
        setCellIds(response.data.cell_ids || []);
        setMaskPath(response.data.mask_path);
        console.log('Mask processed successfully');
      } else {
        throw new Error('No mask image in response');
      }
    } catch (error) {
      console.error('Error uploading mask:', error);
      setError(error.response?.data?.error || 'Error uploading mask');
    } finally {
      setLoading(false);
    }
  }, []);

  const MaskDropzone = ({ onMaskUpload }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      accept: {
        'image/tiff': ['.tif', '.tiff'],
      },
      maxFiles: 1,
      onDrop: onMaskUpload
    });

    return (
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed #ccc',
          borderRadius: 2,
          p: 2,
          textAlign: 'center',
          cursor: 'pointer',
          mb: 2,
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <Typography>Drop the mask file here...</Typography>
        ) : (
          <Typography>Drag and drop a mask file here, or click to select</Typography>
        )}
      </Box>
    );
  };

  const MaskDisplay = ({ maskImage, cellIds }) => {
    // Only show this component when not in the side-by-side view
    if (!maskImage || frames.length > 0) return null;
    
    return (
      <Box sx={{ position: 'relative', mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Cell Mask
        </Typography>
        <Box
          sx={{
            border: '1px solid #ddd',
            borderRadius: 1,
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <img
            src={maskImage}
            alt="Cell Mask"
            style={{
              width: '100%',
              height: 'auto',
              display: 'block'
            }}
          />
        </Box>
        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
          {cellIds.length} cells detected
        </Typography>
      </Box>
    );
  };

  const VideoDisplay = ({ currentFrame, frameCount, brightness, contrast }) => (
    <Box sx={{ 
      width: '100%',  
      margin: '0 auto',
      position: 'relative',
      '& img': {
        width: '100%',
        height: 'auto',
        display: 'block',
        filter: `brightness(${brightness}%) contrast(${contrast}%)`
      }
    }}>
      <img
        src={currentFrame}
        alt={`Frame ${frameCount}`}
        style={{
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}
      />
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          bgcolor: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          padding: '2px 6px',
          borderRadius: 1
        }}
      >
        Frame: {frameCount}
      </Typography>
    </Box>
  );

  const handleVideoUpload = React.useCallback(async (videoFile) => {
    setError(null);
    const formData = new FormData();
    formData.append('video', videoFile);

    try {
      console.log('Uploading video file:', videoFile.name);
      setLoading(true);
      const response = await api.post('/upload', formData);
      console.log('Video upload response:', response.data);
      setUploadedVideoPath(response.data.path);
      setFrames(response.data.frames);
      setTotalFrames(response.data.frames.length);
      setCurrentFrame(0);
    } catch (error) {
      console.error('Video upload error:', error);
      if (!error.response) {
        setError('Cannot connect to server. Please ensure the Flask backend is running and try again.');
        checkServerStatus();
      } else {
        setError('Error uploading video: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setLoading(false);
    }
  }, [checkServerStatus]);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'video/*': ['.mp4', '.avi', '.mov'],
      'image/tiff': ['.tiff', '.tif']
    },
    onDrop: React.useCallback(acceptedFiles => {
      if (serverStatus !== 'running') {
        checkServerStatus(); // Recheck server status before showing error
        setError('Cannot upload: Server is not running. Please wait for the server to start.');
        return;
      }
      const videoFile = acceptedFiles[0];
      setFile(videoFile);
      handleVideoUpload(videoFile);
    }, [serverStatus, handleVideoUpload, checkServerStatus])
  });

  const handleAnalysis = React.useCallback(async () => {
    if (!uploadedVideoPath) {
      setError('Please upload a video first');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const response = await api.post('/analyze', {
        video_path: uploadedVideoPath,
        mask_path: maskPath || null
      });
      
      setResults(response.data);
      setMaskPreview(response.data.mask_preview);
      
      // Load CSV data
      if (response.data.results_path) {
        const csvResponse = await api.get('/get-csv-data', {
          params: { path: response.data.results_path }
        });
        setCsvData({
          rows: csvResponse.data.data,
          columns: csvResponse.data.columns
        });
      }
    } catch (error) {
      console.error('Analysis error:', error);
      if (!error.response) {
        setError('Cannot connect to server. Please ensure the Flask backend is running and try again.');
        checkServerStatus();
      } else {
        setError('Error during analysis: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setAnalyzing(false);
    }
  }, [uploadedVideoPath, maskPath, checkServerStatus]);

  const togglePlayback = React.useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const nextFrame = React.useCallback(() => {
    setCurrentFrame(prev => (prev + 1) % totalFrames);
  }, [totalFrames]);

  const previousFrame = React.useCallback(() => {
    setCurrentFrame(prev => (prev - 1 + totalFrames) % totalFrames);
  }, [totalFrames]);

  return (
    <div className={`min-h-screen p-8 ${theme === 'dark' ? 'bg-[#1a1e2e] text-white' : theme === 'colorful' ? 'bg-blue-50' : 'bg-gray-100'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Calcium Imaging Analysis Suite</h1>
          <div className="flex space-x-2">
            <button 
              onClick={() => setTheme('light')} 
              className={`p-2 rounded-full ${theme === 'light' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
              title="Light Theme"
            >
              <Sun size={20} />
            </button>
            <button 
              onClick={() => setTheme('dark')} 
              className={`p-2 rounded-full ${theme === 'dark' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
              title="Dark Theme"
            >
              <Moon size={20} />
            </button>
            <button 
              onClick={() => setTheme('colorful')} 
              className={`p-2 rounded-full ${theme === 'colorful' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
              title="Colorful Theme"
            >
              <Palette size={20} />
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <Snackbar
            open={!!success}
            autoHideDuration={6000}
            onClose={() => setSuccess(null)}
          >
            <Alert severity="success" sx={{ width: '100%' }}>
              {success}
            </Alert>
          </Snackbar>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Video Upload Section */}
          <div className={`p-6 rounded-lg shadow-md ${theme === 'dark' ? 'bg-[#242a3d]' : 'bg-white'}`}>
            <h2 className="text-xl font-semibold mb-4">Upload Video</h2>
            <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500">
              <input {...getInputProps()} />
              <FileVideo className="mx-auto mb-2" />
              <p>Drag & drop a video file here, or click to select</p>
              <p className="text-sm text-gray-500">Supported formats: .tiff, .tif, .ome.tiff, .mp4, .avi</p>
            </div>
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 2 }}>
                <CircularProgress size={20} />
                <Typography>Processing video...</Typography>
              </Box>
            )}
          </div>

          {/* Mask Upload Section */}
          <div className={`p-6 rounded-lg shadow-md ${theme === 'dark' ? 'bg-[#242a3d]' : 'bg-white'}`}>
            <h2 className="text-xl font-semibold mb-4">Upload Mask</h2>
            <MaskDropzone onMaskUpload={onMaskDrop} />
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 2 }}>
                <CircularProgress size={20} />
                <Typography>Processing mask...</Typography>
              </Box>
            )}
            <MaskDisplay maskImage={maskImage} cellIds={cellIds} />
          </div>
        </div>

        {/* Video Player Section */}
        {frames.length > 0 && (
          <div className={`mt-8 p-6 rounded-lg shadow-md ${theme === 'dark' ? 'bg-[#242a3d]' : 'bg-white'}`}>
            <h2 className="text-xl font-semibold mb-4">Video and Mask</h2>
            <div className="flex flex-wrap md:flex-nowrap gap-4">
              <div className="w-full md:w-1/2">
                <Typography variant="h6" gutterBottom className={theme === 'dark' ? 'text-gray-200' : ''}>Video</Typography>
                <VideoDisplay 
                  currentFrame={`data:image/png;base64,${frames[currentFrame]}`} 
                  frameCount={currentFrame} 
                  brightness={brightness} 
                  contrast={contrast} 
                />
                <div className="mb-2">
                  <Slider
                    min={0}
                    max={totalFrames - 1}
                    value={currentFrame}
                    onChange={(e, newValue) => setCurrentFrame(parseInt(newValue))}
                    valueLabelDisplay="auto"
                    size="small"
                    sx={{
                      color: theme === 'dark' ? '#fff' : '#1976d2',
                      height: 4,
                      '& .MuiSlider-thumb': {
                        width: 14,
                        height: 14,
                        backgroundColor: '#fff',
                        '&:hover, &.Mui-focusVisible': {
                          boxShadow: '0px 0px 0px 8px rgba(255, 255, 255, 0.16)'
                        }
                      },
                      '& .MuiSlider-rail': {
                        opacity: 0.5,
                        backgroundColor: theme === 'dark' ? '#4d5566' : '#bfbfbf',
                      },
                      '& .MuiSlider-track': {
                        border: 'none',
                      }
                    }}
                  />
                </div>
                
                {/* Controls in a 2-column grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {/* Playback Speed */}
                  <div>
                    <Typography variant="caption" display="block" className={theme === 'dark' ? 'text-gray-300' : ''}>Speed (FPS)</Typography>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>1</span>
                      <Slider
                        min={1}
                        max={60}
                        value={fps}
                        onChange={(e, newValue) => setFps(newValue)}
                        valueLabelDisplay="auto"
                        size="small"
                        sx={{
                          color: theme === 'dark' ? '#fff' : '#1976d2',
                          height: 4,
                          '& .MuiSlider-thumb': {
                            width: 14,
                            height: 14,
                            backgroundColor: '#fff',
                            '&:hover, &.Mui-focusVisible': {
                              boxShadow: '0px 0px 0px 8px rgba(255, 255, 255, 0.16)'
                            }
                          },
                          '& .MuiSlider-rail': {
                            opacity: 0.5,
                            backgroundColor: theme === 'dark' ? '#4d5566' : '#bfbfbf',
                          },
                          '& .MuiSlider-track': {
                            border: 'none',
                          }
                        }}
                      />
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>60</span>
                    </div>
                  </div>
                  
                  {/* Brightness */}
                  <div>
                    <Typography variant="caption" display="block" className={theme === 'dark' ? 'text-gray-300' : ''}>Brightness</Typography>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>0%</span>
                      <Slider
                        min={0}
                        max={200}
                        value={brightness}
                        onChange={(e, newValue) => setBrightness(newValue)}
                        valueLabelDisplay="auto"
                        size="small"
                        sx={{
                          color: theme === 'dark' ? '#fff' : '#1976d2',
                          height: 4,
                          '& .MuiSlider-thumb': {
                            width: 14,
                            height: 14,
                            backgroundColor: '#fff',
                            '&:hover, &.Mui-focusVisible': {
                              boxShadow: '0px 0px 0px 8px rgba(255, 255, 255, 0.16)'
                            }
                          },
                          '& .MuiSlider-rail': {
                            opacity: 0.5,
                            backgroundColor: theme === 'dark' ? '#4d5566' : '#bfbfbf',
                          },
                          '& .MuiSlider-track': {
                            border: 'none',
                          }
                        }}
                      />
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>200%</span>
                    </div>
                  </div>
                  
                  {/* Contrast */}
                  <div className="col-span-2">
                    <Typography variant="caption" display="block" className={theme === 'dark' ? 'text-gray-300' : ''}>Contrast</Typography>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>0%</span>
                      <Slider
                        min={0}
                        max={200}
                        value={contrast}
                        onChange={(e, newValue) => setContrast(newValue)}
                        valueLabelDisplay="auto"
                        size="small"
                        sx={{
                          color: theme === 'dark' ? '#fff' : '#1976d2',
                          height: 4,
                          '& .MuiSlider-thumb': {
                            width: 14,
                            height: 14,
                            backgroundColor: '#fff',
                            '&:hover, &.Mui-focusVisible': {
                              boxShadow: '0px 0px 0px 8px rgba(255, 255, 255, 0.16)'
                            }
                          },
                          '& .MuiSlider-rail': {
                            opacity: 0.5,
                            backgroundColor: theme === 'dark' ? '#4d5566' : '#bfbfbf',
                          },
                          '& .MuiSlider-track': {
                            border: 'none',
                          }
                        }}
                      />
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>200%</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <button onClick={previousFrame} className="p-1 rounded-full hover:bg-gray-200">
                      <SkipBack className="w-5 h-5" />
                    </button>
                    <button onClick={togglePlayback} className="p-1 rounded-full hover:bg-gray-200">
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button onClick={nextFrame} className="p-1 rounded-full hover:bg-gray-200">
                      <SkipForward className="w-5 h-5" />
                    </button>
                  </div>
                  <Typography variant="caption">
                    Frame: {currentFrame + 1}/{totalFrames}
                  </Typography>
                </div>
              </div>
              
              <div className="w-full md:w-1/2">
                <Typography variant="h6" gutterBottom className={theme === 'dark' ? 'text-gray-200' : ''}>Cell Mask</Typography>
                {maskImage ? (
                  <>
                    <Box
                      sx={{
                        border: theme === 'dark' ? '1px solid #3a4055' : '1px solid #ddd',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}
                    >
                      <img
                        src={maskImage}
                        alt="Cell Mask"
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block'
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                      {cellIds.length} cells detected
                    </Typography>
                  </>
                ) : (
                  <Typography color="text.secondary">
                    No mask uploaded. You can still analyze the video without a mask.
                  </Typography>
                )}
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <button
                onClick={handleAnalysis}
                disabled={analyzing || !uploadedVideoPath}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? (
                  <>
                    <CircularProgress size={20} sx={{ color: 'white', mr: 1 }} />
                    Analyzing...
                  </>
                ) : (
                  <>Analyze Video</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Analysis Results Section */}
        {results && (
          <div className={`mt-8 p-6 rounded-lg shadow-md ${theme === 'dark' ? 'bg-[#242a3d]' : 'bg-white'}`}>
            <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
            
            {/* Cell Selection */}
            <div className="mb-6">
              <Typography variant="h6" gutterBottom>Select Cells for Analysis</Typography>
              <Autocomplete
                multiple
                options={cellIds}
                value={selectedCells}
                onChange={(event, newValue) => setSelectedCells(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    label="Select Cells"
                    placeholder="Choose cells"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={`Cell ${option}`}
                      {...getTagProps({ index })}
                      color="primary"
                      variant="outlined"
                    />
                  ))
                }
              />
            </div>

            {/* Export Buttons */}
            <div className="flex flex-wrap gap-4 mb-6">
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  if (selectedCells.length === 0) {
                    setError('Please select at least one cell to export');
                    return;
                  }
                  setLoading(true);
                  api.post('/export-csv', { 
                    cells: selectedCells,
                    results_path: results.results_path
                  })
                  .then(response => {
                    // Get the file data
                    return fetch(`${API_URL}/download?path=${encodeURIComponent(response.data.path || response.data.export_path)}`);
                  })
                  .then(response => response.blob())
                  .then(blob => {
                    // Create a file name with timestamp
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const fileName = `selected_cells_${timestamp}.csv`;
                    
                    // Use the File System Access API if available
                    if ('showSaveFilePicker' in window) {
                      const opts = {
                        suggestedName: fileName,
                        types: [{
                          description: 'CSV Files',
                          accept: {'text/csv': ['.csv']},
                        }],
                      };
                      
                      window.showSaveFilePicker(opts)
                        .then(fileHandle => fileHandle.createWritable())
                        .then(writable => {
                          writable.write(blob);
                          return writable.close();
                        })
                        .then(() => {
                          setSuccess('File saved successfully!');
                        })
                        .catch(err => {
                          // If user cancels, don't show error
                          if (err.name !== 'AbortError') {
                            console.error('Save error:', err);
                            setError('Error saving file: ' + err.message);
                            
                            // Fallback to traditional download
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fileName;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }
                        });
                    } else {
                      // Fallback for browsers that don't support File System Access API
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = fileName;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }
                  })
                  .catch(err => {
                    console.error('Export error:', err);
                    setError('Error exporting data: ' + (err.response?.data?.error || err.message));
                  })
                  .finally(() => setLoading(false));
                }}
                disabled={loading || selectedCells.length === 0}
                startIcon={loading ? <CircularProgress size={20} /> : <FileCheck />}
              >
                Export Selected Cells
              </Button>
              
              <Button
                variant="outlined"
                color="primary"
                onClick={() => {
                  setLoading(true);
                  api.post('/export-all-csv', { 
                    path: results.results_path
                  })
                  .then(response => {
                    // Get the file data
                    return fetch(`${API_URL}/download?path=${encodeURIComponent(response.data.path)}`);
                  })
                  .then(response => response.blob())
                  .then(blob => {
                    // Create a file name with timestamp
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const fileName = `all_cells_${timestamp}.csv`;
                    
                    // Use the File System Access API if available
                    if ('showSaveFilePicker' in window) {
                      const opts = {
                        suggestedName: fileName,
                        types: [{
                          description: 'CSV Files',
                          accept: {'text/csv': ['.csv']},
                        }],
                      };
                      
                      window.showSaveFilePicker(opts)
                        .then(fileHandle => fileHandle.createWritable())
                        .then(writable => {
                          writable.write(blob);
                          return writable.close();
                        })
                        .then(() => {
                          setSuccess('File saved successfully!');
                        })
                        .catch(err => {
                          // If user cancels, don't show error
                          if (err.name !== 'AbortError') {
                            console.error('Save error:', err);
                            setError('Error saving file: ' + err.message);
                            
                            // Fallback to traditional download
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = fileName;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }
                        });
                    } else {
                      // Fallback for browsers that don't support File System Access API
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = fileName;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }
                  })
                  .catch(err => {
                    console.error('Export error:', err);
                    setError('Error exporting data: ' + (err.response?.data?.error || err.message));
                  })
                  .finally(() => setLoading(false));
                }}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <FileCheck />}
              >
                Export All Cells
              </Button>
            </div>

            {/* Data Visualization Tabs */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Data Table</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {csvData.rows.length > 0 ? (
                  <>
                    <TableContainer component={Paper} sx={{ maxHeight: 440 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            {csvData.columns.map((column) => (
                              <TableCell key={column}>{column}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {csvData.rows
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                {Object.values(row).map((cell, cellIndex) => (
                                  <TableCell key={cellIndex}>{cell}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      rowsPerPageOptions={[10, 25, 50, 100]}
                      component="div"
                      count={csvData.rows.length}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={(e, newPage) => setPage(newPage)}
                      onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                      }}
                    />
                  </>
                ) : (
                  <Typography color="text.secondary">No data available</Typography>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Plot Section */}
            <Accordion defaultExpanded sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Intensity Plot</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="md:w-1/4">
                    <Typography variant="subtitle1" gutterBottom>Plot Settings</Typography>
                    
                    <FormControl fullWidth margin="normal" size="small">
                      <InputLabel>Y-Axis</InputLabel>
                      <Select
                        value={plotOptions.y_axis}
                        label="Y-Axis"
                        onChange={(e) => setPlotOptions(prev => ({ ...prev, y_axis: e.target.value }))}
                      >
                        <MenuItem value="intensity">Raw Intensity</MenuItem>
                        <MenuItem value="normalized_intensity">Normalized Intensity</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <FormControl fullWidth margin="normal" size="small">
                      <InputLabel>X-Axis</InputLabel>
                      <Select
                        value={plotOptions.x_axis}
                        label="X-Axis"
                        onChange={(e) => setPlotOptions(prev => ({ ...prev, x_axis: e.target.value }))}
                      >
                        <MenuItem value="frame">Frame</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <Accordion sx={{ mt: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Line Options</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={plotOptions.style.smooth_lines}
                              onChange={(e) => setPlotOptions(prev => ({
                                ...prev,
                                style: {
                                  ...prev.style,
                                  smooth_lines: e.target.checked
                                }
                              }))}
                            />
                          }
                          label="Smooth Lines"
                        />
                        
                        {plotOptions.style.smooth_lines && (
                          <FormControl fullWidth margin="normal" size="small">
                            <Typography variant="caption" gutterBottom>Smoothing Span</Typography>
                            <Slider
                              min={0.1}
                              max={1}
                              step={0.05}
                              value={plotOptions.style.smooth_span || 0.75}
                              onChange={(e, newValue) => setPlotOptions(prev => ({
                                ...prev,
                                style: {
                                  ...prev.style,
                                  smooth_span: newValue
                                }
                              }))}
                              valueLabelDisplay="auto"
                              marks={[
                                { value: 0.1, label: '0.1' },
                                { value: 0.5, label: '0.5' },
                                { value: 1, label: '1.0' }
                              ]}
                            />
                          </FormControl>
                        )}
                        
                        <FormControl fullWidth margin="normal" size="small">
                          <Typography variant="caption" gutterBottom>Line Thickness</Typography>
                          <Slider
                            min={0.5}
                            max={3}
                            step={0.5}
                            value={plotOptions.style.line_size || 1}
                            onChange={(e, newValue) => setPlotOptions(prev => ({
                              ...prev,
                              style: {
                                ...prev.style,
                                line_size: newValue
                              }
                            }))}
                            valueLabelDisplay="auto"
                            marks={[
                              { value: 0.5, label: 'Thin' },
                              { value: 1.5, label: 'Medium' },
                              { value: 3, label: 'Thick' }
                            ]}
                          />
                        </FormControl>
                      </AccordionDetails>
                    </Accordion>
                    
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Point Options</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={plotOptions.style.show_points || false}
                              onChange={(e) => setPlotOptions(prev => ({
                                ...prev,
                                style: {
                                  ...prev.style,
                                  show_points: e.target.checked
                                }
                              }))}
                            />
                          }
                          label="Show Data Points"
                        />
                        
                        {plotOptions.style.show_points && (
                          <FormControl fullWidth margin="normal" size="small">
                            <Typography variant="caption" gutterBottom>Point Size</Typography>
                            <Slider
                              min={1}
                              max={5}
                              step={0.5}
                              value={plotOptions.style.point_size || 2}
                              onChange={(e, newValue) => setPlotOptions(prev => ({
                                ...prev,
                                style: {
                                  ...prev.style,
                                  point_size: newValue
                                }
                              }))}
                              valueLabelDisplay="auto"
                              marks={[
                                { value: 1, label: 'Small' },
                                { value: 3, label: 'Medium' },
                                { value: 5, label: 'Large' }
                              ]}
                            />
                          </FormControl>
                        )}
                      </AccordionDetails>
                    </Accordion>
                    
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Color Options</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <FormControl fullWidth margin="normal" size="small">
                          <InputLabel>Color Palette</InputLabel>
                          <Select
                            value={plotOptions.style.color_palette || 'Set1'}
                            label="Color Palette"
                            onChange={(e) => setPlotOptions(prev => ({
                              ...prev,
                              style: {
                                ...prev.style,
                                color_palette: e.target.value
                              }
                            }))}
                          >
                            <MenuItem value="Set1">Set1 (Default)</MenuItem>
                            <MenuItem value="Set2">Set2</MenuItem>
                            <MenuItem value="Set3">Set3</MenuItem>
                            <MenuItem value="Dark2">Dark2</MenuItem>
                            <MenuItem value="Paired">Paired</MenuItem>
                            <MenuItem value="Spectral">Spectral</MenuItem>
                            <MenuItem value="RdYlBu">Red-Yellow-Blue</MenuItem>
                          </Select>
                        </FormControl>
                      </AccordionDetails>
                    </Accordion>
                    
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Grid & Theme</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <FormControl fullWidth margin="normal" size="small">
                          <InputLabel>Theme</InputLabel>
                          <Select
                            value={plotOptions.style.theme || 'minimal'}
                            label="Theme"
                            onChange={(e) => setPlotOptions(prev => ({
                              ...prev,
                              style: {
                                ...prev.style,
                                theme: e.target.value
                              }
                            }))}
                          >
                            <MenuItem value="minimal">Minimal</MenuItem>
                            <MenuItem value="classic">Classic</MenuItem>
                            <MenuItem value="bw">Black & White</MenuItem>
                            <MenuItem value="light">Light</MenuItem>
                            <MenuItem value="dark">Dark</MenuItem>
                          </Select>
                        </FormControl>
                        
                        <FormControl fullWidth margin="normal" size="small">
                          <InputLabel>Grid Style</InputLabel>
                          <Select
                            value={plotOptions.style.grid_style || 'both'}
                            label="Grid Style"
                            onChange={(e) => setPlotOptions(prev => ({
                              ...prev,
                              style: {
                                ...prev.style,
                                grid_style: e.target.value
                              }
                            }))}
                          >
                            <MenuItem value="both">Major & Minor</MenuItem>
                            <MenuItem value="major">Major Only</MenuItem>
                            <MenuItem value="none">No Grid</MenuItem>
                          </Select>
                        </FormControl>
                        
                        <FormControl fullWidth margin="normal" size="small">
                          <InputLabel>Legend Position</InputLabel>
                          <Select
                            value={plotOptions.style.legend_position || 'right'}
                            label="Legend Position"
                            onChange={(e) => setPlotOptions(prev => ({
                              ...prev,
                              style: {
                                ...prev.style,
                                legend_position: e.target.value
                              }
                            }))}
                          >
                            <MenuItem value="right">Right</MenuItem>
                            <MenuItem value="left">Left</MenuItem>
                            <MenuItem value="top">Top</MenuItem>
                            <MenuItem value="bottom">Bottom</MenuItem>
                            <MenuItem value="none">None</MenuItem>
                          </Select>
                        </FormControl>
                      </AccordionDetails>
                    </Accordion>
                    
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      sx={{ mt: 2 }}
                      onClick={() => {
                        if (selectedCells.length === 0) {
                          setError('Please select at least one cell to plot');
                          return;
                        }
                        setLoading(true);
                        api.post('/generate-plot', {
                          cells: selectedCells,
                          path: results.results_path,
                          options: plotOptions
                        })
                        .then(response => {
                          setPlotData(`data:image/png;base64,${response.data.plot_image}`);
                        })
                        .catch(err => {
                          console.error('Plot generation error:', err);
                          setError('Error generating plot: ' + (err.response?.data?.error || err.message));
                        })
                        .finally(() => setLoading(false));
                      }}
                      disabled={loading || selectedCells.length === 0}
                    >
                      Generate Plot
                    </Button>
                    
                    {plotData && (
                      <Button
                        variant="outlined"
                        color="primary"
                        fullWidth
                        sx={{ mt: 1 }}
                        onClick={() => {
                          // Get the image data from the plot
                          fetch(plotData)
                            .then(response => response.blob())
                            .then(blob => {
                              // Create a file name with timestamp
                              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                              const fileName = `intensity_plot_${timestamp}.png`;
                              
                              // Use the File System Access API if available
                              if ('showSaveFilePicker' in window) {
                                const opts = {
                                  suggestedName: fileName,
                                  types: [{
                                    description: 'PNG Images',
                                    accept: {'image/png': ['.png']},
                                  }],
                                };
                                
                                window.showSaveFilePicker(opts)
                                  .then(fileHandle => fileHandle.createWritable())
                                  .then(writable => {
                                    writable.write(blob);
                                    return writable.close();
                                  })
                                  .then(() => {
                                    setSuccess('Plot saved successfully!');
                                  })
                                  .catch(err => {
                                    // If user cancels, don't show error
                                    if (err.name !== 'AbortError') {
                                      console.error('Save error:', err);
                                      setError('Error saving plot: ' + err.message);
                                      
                                      // Fallback to traditional download
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = fileName;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                      URL.revokeObjectURL(url);
                                    }
                                  });
                              } else {
                                // Fallback for browsers that don't support File System Access API
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = fileName;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              }
                            })
                            .catch(err => {
                              console.error('Plot save error:', err);
                              setError('Error saving plot: ' + err.message);
                            });
                        }}
                      >
                        Save Plot
                      </Button>
                    )}
                  </div>
                  
                  <div className="md:w-3/4">
                    {plotData ? (
                      <Box sx={{ 
                        border: '1px solid #ddd', 
                        borderRadius: 1, 
                        p: 1,
                        bgcolor: '#f9f9f9'
                      }}>
                        <img 
                          src={plotData} 
                          alt="Intensity Plot" 
                          style={{ width: '100%', height: 'auto' }}
                        />
                      </Box>
                    ) : (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        border: '1px dashed #ccc',
                        borderRadius: 1,
                        p: 4,
                        minHeight: 300
                      }}>
                        <Typography color="text.secondary">
                          {selectedCells.length === 0 
                            ? 'Select cells and click "Generate Plot" to visualize intensity data' 
                            : 'Click "Generate Plot" to visualize selected cells'}
                        </Typography>
                      </Box>
                    )}
                  </div>
                </div>
              </AccordionDetails>
            </Accordion>
            
            {/* Summary Statistics */}
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Summary Statistics</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {results.stats ? (
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Metric</TableCell>
                          <TableCell>Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(results.stats).map(([key, value]) => (
                          <TableRow key={key}>
                            <TableCell>{key.replace(/_/g, ' ')}</TableCell>
                            <TableCell>{typeof value === 'number' ? value.toFixed(4) : value}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography color="text.secondary">No statistics available</Typography>
                )}
              </AccordionDetails>
            </Accordion>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
