const fs = require('fs');
const path = require('path');

// Read the original App.js file
const appJsPath = path.join(__dirname, 'src', 'App.js');
let appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Find the video controls section and replace it
const videoSectionStart = appJsContent.indexOf('<div className="w-full md:w-1/2">\n                <Typography variant="h6" gutterBottom');
const videoSectionEnd = appJsContent.indexOf('<div className="w-full md:w-1/2">\n                <Typography variant="h6" gutterBottom className={theme === \'dark\' ? \'text-gray-200\' : \'\'}>Cell Mask');

// The updated video controls section
const updatedVideoControls = `<div className="w-full md:w-1/2">
  <Typography variant="h6" gutterBottom className={theme === 'dark' ? 'text-gray-200' : ''}>
    Video
  </Typography>
  <VideoDisplay 
    currentFrame={`data:image/png;base64,\${frames[currentFrame]}`} 
    frameCount={currentFrame} 
    brightness={brightness} 
    contrast={contrast} 
  />
  
  {/* Video controls in a more organized layout */}
  <div className="mt-2">
    {/* Frame navigation slider labeled as "Play" */}
    <div className="mb-2">
      <Typography variant="caption" display="block" className={theme === 'dark' ? 'text-gray-300' : ''}>
        Play
      </Typography>
      <Slider
        min={0}
        max={totalFrames - 1}
        value={currentFrame}
        onChange={(e, newValue) => setCurrentFrame(parseInt(newValue))}
        valueLabelDisplay="auto"
        size="small"
        sx={{
          color: theme === 'dark' ? '#fff' : '#333',
          height: 4,
          '& .MuiSlider-thumb': {
            width: 14,
            height: 14,
            backgroundColor: '#fff',
            border: theme === 'dark' ? 'none' : '1px solid #999',
            '&:hover, &.Mui-focusVisible': {
              boxShadow: '0px 0px 0px 8px rgba(0, 0, 0, 0.16)'
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
    
    {/* Playback controls directly under the slider */}
    <div className="flex items-center justify-center space-x-4 mb-3">
      <button onClick={previousFrame} className={`p-1 rounded-full \${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
        <SkipBack className={`w-5 h-5 \${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`} />
      </button>
      <button onClick={togglePlayback} className={`p-1 rounded-full \${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
        {isPlaying ? 
          <Pause className={`w-5 h-5 \${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`} /> : 
          <Play className={`w-5 h-5 \${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`} />
        }
      </button>
      <button onClick={nextFrame} className={`p-1 rounded-full \${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}>
        <SkipForward className={`w-5 h-5 \${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`} />
      </button>
    </div>
    
    {/* Controls in a single column */}
    <div className="space-y-3">
      {/* Playback Speed */}
      <div>
        <Typography variant="caption" display="block" className={theme === 'dark' ? 'text-gray-300' : ''}>
          Speed (FPS)
        </Typography>
        <div className="flex items-center space-x-2">
          <span className={`text-xs \${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>1</span>
          <Slider
            min={1}
            max={60}
            value={fps}
            onChange={(e, newValue) => setFps(newValue)}
            valueLabelDisplay="auto"
            size="small"
            sx={{
              color: theme === 'dark' ? '#fff' : '#333',
              height: 4,
              '& .MuiSlider-thumb': {
                width: 14,
                height: 14,
                backgroundColor: '#fff',
                border: theme === 'dark' ? 'none' : '1px solid #999',
                '&:hover, &.Mui-focusVisible': {
                  boxShadow: '0px 0px 0px 8px rgba(0, 0, 0, 0.16)'
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
          <span className={`text-xs \${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>60</span>
        </div>
      </div>
      
      {/* Brightness */}
      <div>
        <Typography variant="caption" display="block" className={theme === 'dark' ? 'text-gray-300' : ''}>
          Brightness
        </Typography>
        <div className="flex items-center space-x-2">
          <span className={`text-xs \${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>0%</span>
          <Slider
            min={0}
            max={200}
            value={brightness}
            onChange={(e, newValue) => setBrightness(newValue)}
            valueLabelDisplay="auto"
            size="small"
            sx={{
              color: theme === 'dark' ? '#fff' : '#333',
              height: 4,
              '& .MuiSlider-thumb': {
                width: 14,
                height: 14,
                backgroundColor: '#fff',
                border: theme === 'dark' ? 'none' : '1px solid #999',
                '&:hover, &.Mui-focusVisible': {
                  boxShadow: '0px 0px 0px 8px rgba(0, 0, 0, 0.16)'
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
          <span className={`text-xs \${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>200%</span>
        </div>
      </div>
      
      {/* Contrast - half width, placed under brightness */}
      <div className="w-1/2">
        <Typography variant="caption" display="block" className={theme === 'dark' ? 'text-gray-300' : ''}>
          Contrast
        </Typography>
        <div className="flex items-center space-x-2">
          <span className={`text-xs \${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>0%</span>
          <Slider
            min={0}
            max={200}
            value={contrast}
            onChange={(e, newValue) => setContrast(newValue)}
            valueLabelDisplay="auto"
            size="small"
            sx={{
              color: theme === 'dark' ? '#fff' : '#333',
              height: 4,
              '& .MuiSlider-thumb': {
                width: 14,
                height: 14,
                backgroundColor: '#fff',
                border: theme === 'dark' ? 'none' : '1px solid #999',
                '&:hover, &.Mui-focusVisible': {
                  boxShadow: '0px 0px 0px 8px rgba(0, 0, 0, 0.16)'
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
          <span className={`text-xs \${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>200%</span>
        </div>
      </div>
    </div>
  </div>
</div>`;

// Replace the video section with the updated one
if (videoSectionStart !== -1 && videoSectionEnd !== -1) {
  const updatedAppJsContent = appJsContent.substring(0, videoSectionStart) + updatedVideoControls + appJsContent.substring(videoSectionEnd);
  fs.writeFileSync(appJsPath, updatedAppJsContent, 'utf8');
  console.log('Successfully updated App.js with the new video controls!');
} else {
  console.error('Could not find the video controls section in App.js');
}
