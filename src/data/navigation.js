import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import ScatterPlotOutlinedIcon from '@mui/icons-material/ScatterPlotOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import LeaderboardOutlinedIcon from '@mui/icons-material/LeaderboardOutlined';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import SettingsSuggestOutlinedIcon from '@mui/icons-material/SettingsSuggestOutlined';

export const navSections = [
  {
    title: 'Overview',
    items: [
      { title: 'Dashboard', path: '/dashboard', icon: <DashboardOutlinedIcon /> },
      { title: 'Data Upload', path: '/data/upload', icon: <CloudUploadOutlinedIcon /> },
      { title: 'Exploration & EDA', path: '/data/exploration', icon: <InsightsOutlinedIcon /> },
      { title: 'Dataset Splits', path: '/data/splitting', icon: <ScatterPlotOutlinedIcon /> }
    ]
  },
  {
    title: 'Models',
    items: [
      { title: 'Model Training', path: '/models/training', icon: <ScienceOutlinedIcon /> },
      { title: 'Hyperparameter Optimization', path: '/models/optimization', icon: <TuneOutlinedIcon /> },
      {
        title: 'Performance & Comparison',
        path: '/models/performance',
        icon: <LeaderboardOutlinedIcon />,
        badge: 'New'
      },
      { title: 'Interpretability', path: '/models/interpretability', icon: <LightbulbOutlinedIcon /> }
    ]
  },
  {
    title: 'Operations',
    items: [
      { title: 'Deployments', path: '/deployments', icon: <CloudOutlinedIcon /> },
      { title: 'Projects', path: '/projects', icon: <GroupOutlinedIcon /> },
      { title: 'Experiment Tracking', path: '/experiments', icon: <AssessmentOutlinedIcon /> },
      { title: 'Workflows', path: '/workflows', icon: <SettingsSuggestOutlinedIcon /> }
    ]
  }
];
