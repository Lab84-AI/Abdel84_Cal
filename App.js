import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Activity, Upload, Play, Pause, SkipForward, SkipBack, BarChart, FileVideo, FileCheck } from 'lucide-react';
import axios from 'axios';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Paper, Button, FormControl, InputLabel, MenuItem, Select, Switch, FormControlLabel,
  Slider, Box, Typography, Grid, Accordion, AccordionSummary, AccordionDetails,
  Tooltip, IconButton, CircularProgress, Autocomplete, TextField, Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalFrames, setTotalFrames] = useState(0);
  const [fps, setFps] = useState(30);
  const playbackInterval = useRef(null);
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
      theme: 'minimal',
      line_size: 1,
      show_points: false,
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

  // Check server status on component mount
  useEffect(() => {
    checkServerStatus();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      playbackInterval.current = setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % totalFrames);
      }, 1000 / fps);
    } else {
      clearInterval(playbackInterval.current);
    }
    return () => clearInterval(playbackInterval.current);
  }, [isPlaying, totalFrames, fps]);

  const checkServerStatus = useCallback(async () => {
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
  useEffect(() => {
    const interval = setInterval(checkServerStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [checkServerStatus]);

  useEffect(() => {
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
  }, [csvData]);

  const onMaskDrop = useCallback(async (acceptedFiles) => {
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

  const VideoDisplay = ({ currentFrame, frameCount, brightness }) => (
    <Box sx={{ 
      width: '100%',  
      margin: '0 auto',
      position: 'relative',
      '& img': {
        width: '100%',
        height: 'auto',
        display: 'block',
        filter: `brightness(${brightness}%)`
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

  const handleVideoUpload = useCallback(async (videoFile) => {
    setError(null);
    const formData = new FormData();
    formData.append('video', videoFile);

    try {
      const response = await api.post('/upload', formData);
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
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'video/*': ['.mp4', '.avi', '.mov'],
      'image/tiff': ['.tiff', '.tif']
    },
    onDrop: useCallback(acceptedFiles => {
      if (serverStatus !== 'running') {
        checkServerStatus(); // Recheck server status before showing error
        setError('Cannot upload: Server is not running. Please wait for the server to start.');
        return;
      }
      const videoFile = acceptedFiles[0];
      setFile(videoFile);
      handleVideoUpload(videoFile);
    }, [serverStatus, handleVideoUpload])
  });

  const handleAnalysis = useCallback(async () => {
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
  }, [uploadedVideoPath, maskPath]);

  const togglePlayback = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const nextFrame = useCallback(() => {
    setCurrentFrame(prev => (prev + 1) % totalFrames);
  }, [totalFrames]);

  const previousFrame = useCallback(() => {
    setCurrentFrame(prev => (prev - 1 + totalFrames) % totalFrames);
  }, [totalFrames]);

  const handleFrameSlider = useCallback((event) => {
    setCurrentFrame(parseInt(event.target.value));
  }, []);

  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const CellSelector = ({ availableCells, selectedCells, onSelectionChange }) => {
    const [inputValue, setInputValue] = useState('');

    const handleInputChange = (event, newValue, reason) => {
      if (reason === 'input') {
        setInputValue(newValue);
      }
    };

    const handleChange = (event, newValue) => {
      // Handle both string input and option selection
      let newCells = newValue;
      
      // If it's a string input, parse it
      if (typeof newValue === 'string') {
        const cellIds = newValue.split(',')
          .map(id => id.trim())
          .filter(id => !isNaN(id) && id !== '')
          .map(id => parseInt(id, 10));
        
        // Filter out invalid cell IDs
        newCells = cellIds.filter(id => availableCells.includes(id));
      }
      
      onSelectionChange(newCells);
    };

    return (
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Select Cells to Plot</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Autocomplete
            multiple
            options={availableCells}
            value={selectedCells}
            onChange={handleChange}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                placeholder="Type cell IDs or select from list"
                helperText="Enter cell IDs separated by commas or select from the dropdown"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((cell, index) => (
                <Chip
                  label={`Cell ${cell}`}
                  {...getTagProps({ index })}
                  color="primary"
                  variant="outlined"
                />
              ))
            }
            renderOption={(props, option) => (
              <li {...props}>
                Cell {option}
              </li>
            )}
            freeSolo
            fullWidth
          />
        </AccordionDetails>
      </Accordion>
    );
  };

  const handleCellSelection = useCallback((event) => {
    const cellId = parseInt(event.target.value);
    setSelectedCells(prev => {
      if (prev.includes(cellId)) {
        return prev.filter(id => id !== cellId);
      } else {
        return [...prev, cellId];
      }
    });
  }, []);

  const generatePlot = useCallback(async () => {
    if (!results || selectedCells.length === 0) {
      setError('Please select at least one cell to plot');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      setPlotData(null);
      
      console.log('Generating plot for cells:', selectedCells);
      console.log('Using results path:', results.results_path);
      console.log('Plot options:', plotOptions);
      
      const requestData = {
        cells: selectedCells,
        results_path: results.results_path,
        plot_options: plotOptions
      };
      
      console.log('Sending request with data:', JSON.stringify(requestData));
      
      const response = await api.post('/plot', requestData);
      
      console.log('Plot response status:', response.status);
      console.log('Plot response data:', response.data);
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      if (!response.data.plot) {
        throw new Error('No plot data returned from server');
      }
      
      setPlotData(response.data.plot);
      console.log('Plot data set successfully, length:', response.data.plot.length);
    } catch (error) {
      console.error('Plot generation error:', error);
      setError('Error generating plot: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  }, [results, selectedCells, plotOptions]);

  const handleExportCSV = useCallback(async () => {
    if (!results?.results_path) {
      setError('No analysis results available to export');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/export-csv`, {
        selected_cells: selectedCells,
        results_path: results.results_path
      }, {
        responseType: 'blob'  // Important for file download
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `calcium_imaging_data_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setError(null);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      setError(error.response?.data?.error || 'Error exporting CSV');
    } finally {
      setLoading(false);
    }
  }, [selectedCells, results]);

  const handleExportAllCSV = useCallback(async () => {
    if (!results?.results_path) {
      setError('No analysis results available to export');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/export-csv`, {
        results_path: results.results_path
      }, {
        responseType: 'blob'  // Important for file download
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `calcium_imaging_all_data_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setError(null);
    } catch (error) {
      console.error('Error exporting all CSV data:', error);
      setError(error.response?.data?.error || 'Error exporting all CSV data');
    } finally {
      setLoading(false);
    }
  }, [results]);

  const importCSV = useCallback(async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/import-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setResults(response.data);
      setSelectedCells(response.data.cells);
    } catch (error) {
      console.error('Error importing CSV:', error);
      setError(error.response?.data?.error || 'Error importing CSV');
    }
  }, []);

  const savePlot = useCallback(() => {
    if (plotData) {
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${plotData}`;
      link.download = `calcium_plot_${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [plotData]);

  const columns = [
    { id: 'cell_id', label: 'Cell ID', minWidth: 100 },
    { id: 'frame', label: 'Frame', minWidth: 100 },
    { id: 'intensity', label: 'Intensity', minWidth: 100 },
    { id: 'normalized_intensity', label: 'Normalized Intensity (%)', minWidth: 150 }
  ];

  const TooltipLabel = ({ title, children }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {children}
      <Tooltip title={title}>
        <IconButton size="small">
          <InfoIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const PlotOptions = ({ options, setOptions, availableColumns = [] }) => {
    const [localOptions, setLocalOptions] = useState(options);

    useEffect(() => {
      setLocalOptions(options);
    }, [options]);

    const handleChange = useCallback((changes) => {
      const newOptions = { 
        ...localOptions, 
        ...(typeof changes === 'function' ? changes(localOptions) : changes)
      };
      setLocalOptions(newOptions);
      setOptions(newOptions);
    }, [localOptions, setOptions]);

    const numericalColumns = useMemo(() => 
      availableColumns.filter(col => 
        ['intensity', 'normalized_intensity', 'frame'].includes(col)
      ),
      [availableColumns]
    );

    return (
      <Box sx={{ marginBottom: 2 }}>
        <Typography variant="h6" gutterBottom>Plot Options</Typography>
        
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Data Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Y-Axis Data</InputLabel>
                  <Select
                    value={localOptions.y_axis}
                    label="Y-Axis Data"
                    onChange={(e) => handleChange({ y_axis: e.target.value })}
                  >
                    {numericalColumns.map(col => (
                      <MenuItem key={col} value={col}>
                        {col === 'normalized_intensity' ? 'Normalized Intensity (%)' : col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Y-Axis Scale</InputLabel>
                  <Select
                    value={localOptions.style.y_scale}
                    label="Y-Axis Scale"
                    onChange={(e) => handleChange(prev => ({
                      style: { ...prev.style, y_scale: e.target.value }
                    }))}
                  >
                    <MenuItem value="regular">Regular</MenuItem>
                    <MenuItem value="log">Logarithmic</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>X-Axis Data</InputLabel>
                  <Select
                    value={localOptions.x_axis}
                    label="X-Axis Data"
                    onChange={(e) => handleChange({ x_axis: e.target.value })}
                  >
                    <MenuItem value="frame">Frame Number</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Line Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TooltipLabel title="Apply LOESS smoothing to the lines">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localOptions.style.smooth_lines}
                        onChange={(e) => handleChange(prev => ({
                          style: { ...prev.style, smooth_lines: e.target.checked }
                        }))}
                      />
                    }
                    label="Smooth Lines"
                  />
                </TooltipLabel>
              </Grid>

              {localOptions.style.smooth_lines && (
                <>
                  <Grid item xs={12}>
                    <TooltipLabel title="Show confidence intervals around smoothed lines">
                      <FormControlLabel
                        control={
                          <Switch
                            checked={localOptions.style.show_error_bands}
                            onChange={(e) => handleChange(prev => ({
                              style: { ...prev.style, show_error_bands: e.target.checked }
                            }))}
                          />
                        }
                        label="Show Error Bands"
                      />
                    </TooltipLabel>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography gutterBottom variant="body2">Smoothing Span</Typography>
                    <Slider
                      value={localOptions.style.smooth_span}
                      onChange={(_, value) => handleChange(prev => ({
                        style: { ...prev.style, smooth_span: value }
                      }))}
                      min={0.2}
                      max={1}
                      step={0.05}
                      marks={[
                        { value: 0.2, label: '0.2' },
                        { value: 0.5, label: '0.5' },
                        { value: 1, label: '1.0' }
                      ]}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Typography gutterBottom variant="body2">Line Size</Typography>
                <Slider
                  value={localOptions.style.line_size}
                  onChange={(_, value) => handleChange(prev => ({
                    style: { ...prev.style, line_size: value }
                  }))}
                  min={0.5}
                  max={3}
                  step={0.1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Point Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TooltipLabel title="Show data points on the plot">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localOptions.style.show_points}
                        onChange={(e) => handleChange(prev => ({
                          style: { ...prev.style, show_points: e.target.checked }
                        }))}
                      />
                    }
                    label="Show Points"
                  />
                </TooltipLabel>
              </Grid>

              {localOptions.style.show_points && (
                <Grid item xs={12}>
                  <Typography gutterBottom variant="body2">Point Size</Typography>
                  <Slider
                    value={localOptions.style.point_size}
                    onChange={(_, value) => handleChange(prev => ({
                      style: { ...prev.style, point_size: value }
                    }))}
                    min={1}
                    max={5}
                    step={0.5}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Grid>
              )}
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Color Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Color Palette</InputLabel>
                  <Select
                    value={localOptions.style.color_palette}
                    label="Color Palette"
                    onChange={(e) => handleChange(prev => ({
                      style: { ...prev.style, color_palette: e.target.value }
                    }))}
                  >
                    <MenuItem value="Set1">Set 1</MenuItem>
                    <MenuItem value="Set2">Set 2</MenuItem>
                    <MenuItem value="Set3">Set 3</MenuItem>
                    <MenuItem value="Dark2">Dark 2</MenuItem>
                    <MenuItem value="Paired">Paired</MenuItem>
                    <MenuItem value="Spectral">Spectral</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom variant="body2">Fill Opacity</Typography>
                <Slider
                  value={localOptions.style.fill_alpha}
                  onChange={(_, value) => handleChange(prev => ({
                    style: { ...prev.style, fill_alpha: value }
                  }))}
                  min={0}
                  max={1}
                  step={0.1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Grid & Theme Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Theme</InputLabel>
                  <Select
                    value={localOptions.style.theme}
                    label="Theme"
                    onChange={(e) => handleChange(prev => ({
                      style: { ...prev.style, theme: e.target.value }
                    }))}
                  >
                    <MenuItem value="minimal">Minimal</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="classic">Classic</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Grid Style</InputLabel>
                  <Select
                    value={localOptions.style.grid_style}
                    label="Grid Style"
                    onChange={(e) => handleChange(prev => ({
                      style: { ...prev.style, grid_style: e.target.value }
                    }))}
                  >
                    <MenuItem value="both">Major and Minor</MenuItem>
                    <MenuItem value="major">Major Only</MenuItem>
                    <MenuItem value="none">No Grid</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Legend Position</InputLabel>
                  <Select
                    value={localOptions.style.legend_position}
                    label="Legend Position"
                    onChange={(e) => handleChange(prev => ({
                      style: { ...prev.style, legend_position: e.target.value }
                    }))}
                  >
                    <MenuItem value="right">Right</MenuItem>
                    <MenuItem value="left">Left</MenuItem>
                    <MenuItem value="top">Top</MenuItem>
                    <MenuItem value="bottom">Bottom</MenuItem>
                    <MenuItem value="none">None</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography gutterBottom variant="body2">Axis Text Size</Typography>
                <Slider
                  value={localOptions.style.axis_text_size}
                  onChange={(_, value) => handleChange(prev => ({
                    style: { ...prev.style, axis_text_size: value }
                  }))}
                  min={8}
                  max={16}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Box>
    );
  };

  const handlePlotOptionsChange = useCallback((newOptions) => {
    // Clear plot data when options change
    setPlotData(null);
    setPlotOptions(newOptions);
  }, []);

  const handleGeneratePlot = useCallback(() => {
    console.log('Generate Plot button clicked');
    console.log('Selected cells:', selectedCells);
    console.log('Results available:', !!results);
    
    if (selectedCells.length === 0) {
      setError('Please select at least one cell to plot');
      return;
    }
    
    if (!results) {
      setError('No analysis results available');
      return;
    }
    
    // Call the generatePlot function
    generatePlot();
  }, [selectedCells, results]);

  const PlotDisplay = ({ plotData }) => {
    if (!plotData) return null;
    
    console.log('Rendering plot with data length:', plotData.length);
    
    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Intensity Plot</h3>
        <div className="border rounded p-2 bg-white">
          <img 
            src={`data:image/png;base64,${plotData}`} 
            alt="Intensity Plot" 
            className="max-w-full h-auto"
            onError={(e) => {
              console.error('Error loading plot image:', e);
              e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFeAJ5jfZixgAAAABJRU5ErkJggg==';
              e.target.style.width = '400px';
              e.target.style.height = '300px';
              e.target.style.backgroundColor = '#f0f0f0';
              e.target.alt = 'Error loading plot';
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Calcium Imaging Analysis Suite</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Video Upload Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Upload Video</h2>
            <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500">
              <input {...getInputProps()} />
              <FileVideo className="mx-auto mb-2" />
              <p>Drag & drop a video file here, or click to select</p>
              <p className="text-sm text-gray-500">Supported formats: .tiff, .tif, .ome.tiff, .mp4, .avi</p>
            </div>
          </div>

          {/* Mask Upload Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Upload Mask (Optional)</h2>
            <MaskDropzone onMaskUpload={onMaskDrop} />
            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 2 }}>
                <CircularProgress size={20} />
                <Typography>Processing mask...</Typography>
              </Box>
            )}
            {error && (
              <Typography color="error" sx={{ my: 2 }}>
                {error}
              </Typography>
            )}
            <MaskDisplay maskImage={maskImage} cellIds={cellIds} />
          </div>
        </div>

        {/* Video Player Section */}
        {frames.length > 0 && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Video and Mask</h2>
            <div className="flex flex-wrap md:flex-nowrap gap-4">
              <div className="w-full md:w-1/2">
                <Typography variant="h6" gutterBottom>Video</Typography>
                <VideoDisplay currentFrame={`data:image/png;base64,${frames[currentFrame]}`} frameCount={currentFrame} brightness={brightness} />
                <div className="flex items-center justify-center space-x-4 mb-4 mt-2">
                  <button onClick={previousFrame} className="p-2 rounded-full hover:bg-gray-200">
                    <SkipBack className="w-6 h-6" />
                  </button>
                  <button onClick={togglePlayback} className="p-2 rounded-full hover:bg-gray-200">
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>
                  <button onClick={nextFrame} className="p-2 rounded-full hover:bg-gray-200">
                    <SkipForward className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm">{currentFrame + 1}</span>
                  <input
                    type="range"
                    min="0"
                    max={totalFrames - 1}
                    value={currentFrame}
                    onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-sm">{totalFrames}</span>
                </div>
                <div className="mt-4">
                  <Typography variant="subtitle2" gutterBottom>Playback Speed (FPS)</Typography>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">1</span>
                    <Slider
                      min={1}
                      max={60}
                      value={fps}
                      onChange={(e, newValue) => setFps(newValue)}
                      valueLabelDisplay="auto"
                      className="w-full"
                    />
                    <span className="text-sm">60</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Typography variant="subtitle2" gutterBottom>Brightness</Typography>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">0%</span>
                    <Slider
                      min={0}
                      max={200}
                      value={brightness}
                      onChange={(e, newValue) => setBrightness(newValue)}
                      valueLabelDisplay="auto"
                      className="w-full"
                    />
                    <span className="text-sm">200%</span>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2">
                {maskImage ? (
                  <>
                    <Typography variant="h6" gutterBottom>Cell Mask</Typography>
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
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Typography variant="body1" color="text.secondary">
                      No mask uploaded yet. Please upload a mask to see it here.
                    </Typography>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analysis Section */}
        <div className="mt-8 space-y-4">
          <button
            onClick={handleAnalysis}
            disabled={!uploadedVideoPath || analyzing}
            className={`w-full py-3 rounded-lg flex items-center justify-center space-x-2 ${
              !uploadedVideoPath || analyzing
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <Activity className={analyzing ? 'animate-spin' : ''} />
            <span>{analyzing ? 'Analyzing...' : 'Analyze Video'}</span>
          </button>

          {results && (
            <div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
                
                {/* Cell Selection */}
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <CellSelector
                      availableCells={cellIds}
                      selectedCells={selectedCells}
                      onSelectionChange={setSelectedCells}
                    />
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleExportCSV}
                        disabled={!selectedCells.length || loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <FileCheck />}
                      >
                        Export Selected Cells to CSV
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleExportAllCSV}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <FileCheck />}
                      >
                        Export All Cells to CSV
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
                
                {/* CSV Data Table */}
                {csvData.rows.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-2">Intensity Data</h3>
                    <TableContainer component={Paper} sx={{ maxHeight: 440 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            {columns.map((column) => (
                              <TableCell key={column.id}>
                                {column.label}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {csvData.rows
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((row, rowIndex) => (
                              <TableRow 
                                key={rowIndex}
                                sx={{ '&:nth-of-type(odd)': { backgroundColor: 'rgba(0, 0, 0, 0.04)' } }}
                              >
                                {columns.map((column) => (
                                  <TableCell key={`${rowIndex}-${column.id}`}>
                                    {typeof row[column.id] === 'number' 
                                      ? Number(row[column.id]).toFixed(2)
                                      : row[column.id]}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                      <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={csvData.rows.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                      />
                    </TableContainer>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '20px' }}>
                <Typography variant="h6" gutterBottom>
                  Plot
                </Typography>
                
                {/* Plot options */}
                <PlotOptions 
                  options={plotOptions} 
                  setOptions={handlePlotOptionsChange}
                  availableColumns={csvData.columns || []}
                />
                
                {/* Plot display */}
                {plotData && (
                  <PlotDisplay plotData={plotData} />
                )}
                
                {/* Plot controls */}
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    onClick={handleGeneratePlot}
                    disabled={!selectedCells.length || loading}
                  >
                    {loading ? <CircularProgress size={20} color="inherit" /> : <BarChart className="w-5 h-5" />}
                    <span>{loading ? 'Generating Plot...' : 'Generate Plot'}</span>
                  </Button>
                  
                  {plotData && (
                    <Button
                      variant="contained"
                      onClick={savePlot}
                    >
                      Save Plot
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '20px' }}>
          <Button
            variant="contained"
            component="label"
            style={{ marginRight: '10px' }}
          >
            Import CSV
            <input
              type="file"
              hidden
              accept=".csv"
              onChange={importCSV}
            />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default App;