'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { useQuery } from '@tanstack/react-query';
import { fetchModelPerformance } from '@/services/mock/performanceData';
import MetricCard from '@/components/common/MetricCard';
import { ModelSummary, PerformanceRun, PredictionRecord } from '@/types/performance';
import { exportModelSummaryPdf, exportPredictionsToCSV } from '@/utils/exportUtils';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from 'recharts';
import { alpha } from '@mui/material/styles';

const metricDescriptors = [
  { key: 'accuracy', label: 'Accuracy', icon: <TrendingUpOutlinedIcon /> },
  { key: 'precision', label: 'Precision', icon: <ScienceOutlinedIcon /> },
  { key: 'recall', label: 'Recall', icon: <TimelineOutlinedIcon /> },
  { key: 'rocAuc', label: 'ROC AUC', icon: <InsightsOutlinedIcon /> }
] as const;

type MetricKey = (typeof metricDescriptors)[number]['key'];

type ConfusionMatrixCell = {
  label: string;
  value: number;
  percentage: number;
};

const rocColors = ['#1173d4', '#4caf50', '#ff9800', '#f44336'];

function formatPercentage(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function buildConfusionCells(run: PerformanceRun): ConfusionMatrixCell[][] {
  const total = run.confusionMatrix.values.flat().reduce((sum, cell) => sum + cell, 0);
  return run.confusionMatrix.values.map((row, rowIndex) =>
    row.map((value, columnIndex) => ({
      label: `${run.confusionMatrix.labels[rowIndex]} → ${run.confusionMatrix.labels[columnIndex]}`,
      value,
      percentage: value / total
    }))
  );
}

function ModelMetricsComparison({ models }: { models: ModelSummary[] }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack spacing={0.5}>
          <Typography variant="h6" color="text.primary" fontWeight={600}>
            Model Comparison
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Evaluate performance metrics across selected models side by side.
          </Typography>
        </Stack>
        <Chip label={`${models.length} models`} color="primary" variant="outlined" />
      </Stack>
      {models.length > 0 ? (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Model</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="center">Accuracy</TableCell>
              <TableCell align="center">Precision</TableCell>
              <TableCell align="center">Recall</TableCell>
              <TableCell align="center">F1 Score</TableCell>
              <TableCell align="center">ROC AUC</TableCell>
              <TableCell align="center">Log Loss</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {models.map(model => (
              <TableRow key={model.id} hover>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" color="text.primary" fontWeight={600}>
                      {model.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Version {model.version} · {new Date(model.updatedAt).toLocaleString()}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>{model.type}</TableCell>
                <TableCell align="center">{formatPercentage(model.metrics.accuracy)}</TableCell>
                <TableCell align="center">{formatPercentage(model.metrics.precision)}</TableCell>
                <TableCell align="center">{formatPercentage(model.metrics.recall)}</TableCell>
                <TableCell align="center">{formatPercentage(model.metrics.f1Score)}</TableCell>
                <TableCell align="center">{formatPercentage(model.metrics.rocAuc)}</TableCell>
                <TableCell align="center">{model.metrics.logLoss.toFixed(3)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Paper
          variant="outlined"
          sx={{ p: 4, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}
        >
          <Typography variant="subtitle1" color="text.primary" fontWeight={600} gutterBottom>
            Select models to compare
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose one or more models from the filters above to unlock the comparison matrix.
          </Typography>
        </Paper>
      )}
    </Paper>
  );
}

function ConfusionMatrixCard({ run }: { run: PerformanceRun }) {
  const cells = buildConfusionCells(run);
  const totals = run.confusionMatrix.values.map(row => row.reduce((sum, value) => sum + value, 0));
  const columnTotals = run.confusionMatrix.values[0].map((_, columnIndex) =>
    run.confusionMatrix.values.reduce((sum, row) => sum + row[columnIndex], 0)
  );

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack spacing={0.5}>
          <Typography variant="h6" fontWeight={600}>
            Confusion Matrix
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Dataset: {run.dataset}
          </Typography>
        </Stack>
        <Chip size="small" label={`Updated ${new Date(run.createdAt).toLocaleString()}`} variant="outlined" />
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Actual / Predicted</TableCell>
            {run.confusionMatrix.labels.map(label => (
              <TableCell key={label} align="center">
                {label}
              </TableCell>
            ))}
            <TableCell align="center">Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {cells.map((row, rowIndex) => (
            <TableRow key={run.confusionMatrix.labels[rowIndex]}>
              <TableCell>{run.confusionMatrix.labels[rowIndex]}</TableCell>
              {row.map((cell, columnIndex) => (
                <TableCell
                  key={cell.label}
                  align="center"
                  sx={{
                    backgroundColor: theme => alpha(theme.palette.primary.main, 0.08 + cell.percentage * 0.5),
                    borderRadius: 1
                  }}
                >
                  <Stack spacing={0.5}>
                    <Typography variant="body2" fontWeight={600}>
                      {cell.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(cell.percentage * 100).toFixed(1)}%
                    </Typography>
                  </Stack>
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                {totals[rowIndex]}
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell>Total</TableCell>
            {columnTotals.map((total, index) => (
              <TableCell key={`col-${index}`} align="center" sx={{ fontWeight: 600 }}>
                {total}
              </TableCell>
            ))}
            <TableCell align="center" sx={{ fontWeight: 700 }}>
              {totals.reduce((sum, value) => sum + value, 0)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
  );
}

interface PredictionTableProps {
  predictions: PredictionRecord[];
  models: ModelSummary[];
  selectedModelId: string;
  onChangeModel: (modelId: string) => void;
  threshold: number;
  onThresholdChange: (value: number) => void;
  onlyMisclassified: boolean;
  onToggleMisclassified: (value: boolean) => void;
}

function PredictionTable({
  predictions,
  models,
  selectedModelId,
  onChangeModel,
  threshold,
  onThresholdChange,
  onlyMisclassified,
  onToggleMisclassified
}: PredictionTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const filteredPredictions = useMemo(() => {
    return predictions
      .filter(pred => pred.modelId === selectedModelId)
      .filter(pred => (onlyMisclassified ? pred.actual !== pred.predicted : true))
      .filter(pred => pred.probability >= threshold)
      .slice(0, 12);
  }, [predictions, selectedModelId, onlyMisclassified, threshold]);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
        <Stack spacing={0.5} flex={1}>
          <Typography variant="h6" fontWeight={600}>
            Prediction Drill-down
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review recent predictions and explore contributing features for transparency.
          </Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="prediction-model-label">Model</InputLabel>
            <Select
              labelId="prediction-model-label"
              value={selectedModelId}
              label="Model"
              onChange={event => onChangeModel(event.target.value)}
            >
              {models.map(model => (
                <MenuItem key={model.id} value={model.id}>
                  {model.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="caption">Show misclassifications</Typography>
            <Switch
              checked={onlyMisclassified}
              onChange={(_, checked) => onToggleMisclassified(checked)}
              inputProps={{ 'aria-label': 'show only misclassified predictions' }}
            />
          </Stack>
        </Stack>
      </Stack>
      <Stack spacing={1.5}>
        <Typography variant="caption" color="text.secondary">
          Probability threshold: {(threshold * 100).toFixed(0)}%
        </Typography>
        <Slider
          value={threshold}
          onChange={(_, value) => onThresholdChange(value as number)}
          min={0.5}
          max={0.95}
          step={0.05}
          valueLabelDisplay="auto"
          valueLabelFormat={value => `${Math.round((value as number) * 100)}%`}
          marks={[
            { value: 0.5, label: '50%' },
            { value: 0.65, label: '65%' },
            { value: 0.8, label: '80%' },
            { value: 0.95, label: '95%' }
          ]}
        />
        <Typography variant="caption" color="text.secondary">
          Drag the slider to focus on high-confidence predictions for error analysis.
        </Typography>
      </Stack>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      <Stack spacing={1}>
        {filteredPredictions.map(prediction => {
          const misclassified = prediction.actual !== prediction.predicted;
          return (
            <Accordion
              key={prediction.id}
              expanded={expanded === prediction.id}
              onChange={(_, isExpanded) => setExpanded(isExpanded ? prediction.id : null)}
              disableGutters
              sx={{
                backgroundColor: 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 2,
                '&:before': { display: 'none' }
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  flex={1}
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" flex={1}>
                    {misclassified && <WarningAmberOutlinedIcon color="warning" fontSize="small" />}
                    <Box>
                      <Typography variant="subtitle2" color="text.primary" fontWeight={600}>
                        Prediction {prediction.id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(prediction.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip
                    label={`Actual: ${prediction.actual}`}
                    color="secondary"
                    variant="outlined"
                    sx={{ minWidth: 120 }}
                  />
                  <Chip
                    label={`Predicted: ${prediction.predicted}`}
                    color={misclassified ? 'warning' : 'success'}
                    variant={misclassified ? 'outlined' : 'filled'}
                    sx={{ minWidth: 140 }}
                  />
                  <Chip
                    label={`Confidence ${(prediction.probability * 100).toFixed(0)}%`}
                    color="primary"
                    variant="outlined"
                    sx={{ minWidth: 160 }}
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {Object.entries(prediction.features).map(([feature, value]) => (
                    <Grid item xs={12} sm={6} md={3} key={feature}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: alpha('#ffffff', 0.02)
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" textTransform="uppercase">
                          {feature}
                        </Typography>
                        <Typography variant="subtitle1" color="text.primary" fontWeight={600}>
                          {value}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })}
        {filteredPredictions.length === 0 && (
          <Paper
            variant="outlined"
            sx={{ p: 4, textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}
          >
            <Typography variant="subtitle1" color="text.primary" fontWeight={600} gutterBottom>
              No predictions match the current filters
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Adjust the confidence threshold or toggle misclassifications to explore more predictions.
            </Typography>
          </Paper>
        )}
      </Stack>
    </Paper>
  );
}

export default function ModelPerformancePage() {
  const { data, isLoading } = useQuery(['model-performance'], fetchModelPerformance);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('accuracy');
  const [predictionModelId, setPredictionModelId] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(0.6);
  const [onlyMisclassified, setOnlyMisclassified] = useState<boolean>(false);

  useEffect(() => {
    if (data && selectedModelIds.length === 0) {
      const initialModels = data.models.slice(0, 2).map(model => model.id);
      setSelectedModelIds(initialModels);
      setPredictionModelId(initialModels[0]);
    }
    if (data && !selectedDataset) {
      setSelectedDataset(data.models[0]?.dataset ?? '');
    }
  }, [data, selectedModelIds.length, selectedDataset]);

  const datasetOptions = useMemo(
    () => Array.from(new Set(data?.models.map(model => model.dataset) ?? [])),
    [data]
  );

  const datasetModels = useMemo(
    () => data?.models.filter(model => !selectedDataset || model.dataset === selectedDataset) ?? [],
    [data, selectedDataset]
  );

  const selectedModels = useMemo(
    () => datasetModels.filter(model => selectedModelIds.includes(model.id)),
    [datasetModels, selectedModelIds]
  );

  const selectedRuns = useMemo(
    () =>
      data?.performanceRuns.filter(run => selectedModelIds.includes(run.modelId) && run.dataset === selectedDataset) ?? [],
    [data, selectedModelIds, selectedDataset]
  );

  const metricLeaders = useMemo(() => {
    if (!datasetModels.length) return [];
    return metricDescriptors.map(descriptor => {
      const leader = [...datasetModels].sort(
        (a, b) => b.metrics[descriptor.key] - a.metrics[descriptor.key]
      )[0];
      return {
        descriptor,
        leader
      };
    });
  }, [datasetModels]);

  const rocSeries = useMemo(() => {
    return selectedRuns.map(run => ({
      name: data?.models.find(model => model.id === run.modelId)?.name ?? run.modelId,
      data: run.roc
    }));
  }, [selectedRuns, data]);

  useEffect(() => {
    if (!datasetModels.length) {
      if (selectedModelIds.length) {
        setSelectedModelIds([]);
      }
      if (predictionModelId) {
        setPredictionModelId('');
      }
      return;
    }

    const intersection = selectedModelIds.filter(id =>
      datasetModels.some(model => model.id === id)
    );

    if (intersection.length === 0) {
      const defaults = datasetModels.slice(0, 2).map(model => model.id);
      if (defaults.length) {
        setSelectedModelIds(defaults);
        setPredictionModelId(defaults[0]);
      }
    } else if (intersection.length !== selectedModelIds.length) {
      setSelectedModelIds(intersection);
    }
  }, [datasetModels, selectedModelIds, predictionModelId]);

  useEffect(() => {
    if (selectedModelIds.length && !selectedModelIds.includes(predictionModelId)) {
      setPredictionModelId(selectedModelIds[0]);
    }
  }, [selectedModelIds, predictionModelId]);

  const diagonalPoints = useMemo(
    () => Array.from({ length: 11 }, (_, index) => ({ fpr: index / 10, tpr: index / 10 })),
    []
  );

  const filteredPredictions = data?.predictions ?? [];

  const handleExportCsv = () => {
    if (!filteredPredictions.length) return;
    exportPredictionsToCSV(filteredPredictions, 'model-predictions.csv');
  };

  const handleExportPdf = () => {
    if (!selectedModels.length) return;
    exportModelSummaryPdf(selectedModels, 'model-performance-report.pdf');
  };

  if (isLoading || !data) {
    return (
      <Paper sx={{ p: 6, display: 'flex', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress color="primary" />
          <Typography variant="body2" color="text.secondary">
            Aggregating performance analytics…
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }}
      >
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', lg: 'center' }}>
          <Stack spacing={0.5} flex={1}>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Model Performance Intelligence
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitor, compare, and explain how your production models behave across datasets, thresholds, and metrics.
            </Typography>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<TableChartOutlinedIcon />}
              onClick={handleExportCsv}
            >
              Export predictions (CSV)
            </Button>
            <Button variant="contained" color="primary" startIcon={<DownloadOutlinedIcon />} onClick={handleExportPdf}>
              Generate PDF Report
            </Button>
          </Stack>
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <FormControl fullWidth size="small">
            <InputLabel id="dataset-select-label">Dataset</InputLabel>
            <Select
              labelId="dataset-select-label"
              value={selectedDataset}
              label="Dataset"
              onChange={event => setSelectedDataset(event.target.value)}
            >
              {datasetOptions.map(dataset => (
                <MenuItem key={dataset} value={dataset}>
                  {dataset}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel id="metric-select-label">Ranking Metric</InputLabel>
            <Select
              labelId="metric-select-label"
              value={selectedMetric}
              label="Ranking Metric"
              onChange={event => setSelectedMetric(event.target.value as MetricKey)}
            >
              {metricDescriptors.map(metric => (
                <MenuItem key={metric.key} value={metric.key}>
                  {metric.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel id="model-select-label">Compare Models</InputLabel>
            <Select
              labelId="model-select-label"
              multiple
              value={selectedModelIds}
              label="Compare Models"
              onChange={event => {
                const value = event.target.value as string[];
                if (!value.length && datasetModels.length) {
                  const defaults = datasetModels.slice(0, 1).map(model => model.id);
                  setSelectedModelIds(defaults);
                  setPredictionModelId(defaults[0]);
                } else {
                  setSelectedModelIds(value);
                  if (value.length && !value.includes(predictionModelId)) {
                    setPredictionModelId(value[0]);
                  }
                }
              }}
              renderValue={selected =>
                selected
                  .map(id => datasetModels.find(model => model.id === id)?.name ?? id)
                  .join(', ')
              }
            >
              {datasetModels.map(model => (
                <MenuItem key={model.id} value={model.id}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" color="text.primary">
                      {model.name}
                    </Typography>
                    <Chip label={model.type} size="small" color="secondary" variant="outlined" />
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        {metricLeaders.map(({ descriptor, leader }) => (
          <Grid item xs={12} sm={6} lg={3} key={descriptor.key}>
            <MetricCard
              title={descriptor.label}
              value={leader ? formatPercentage(leader.metrics[descriptor.key]) : '--'}
              subtitle={leader ? leader.name : 'No data'}
              icon={descriptor.icon}
              color="primary"
              trend={selectedMetric === descriptor.key ? 'up' : 'stable'}
              trendValue={leader ? `${formatPercentage(leader.metrics[descriptor.key])}` : undefined}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {selectedRuns.map(run => (
          <Grid item xs={12} md={6} key={run.id}>
            <ConfusionMatrixCard run={run} />
          </Grid>
        ))}
        <Grid item xs={12} md={selectedRuns.length > 1 ? 12 : 6}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: '1px solid rgba(255,255,255,0.08)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 3
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack spacing={0.5}>
                <Typography variant="h6" fontWeight={600}>
                  ROC Curve
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Compare true positive rates against false positive rates across thresholds.
                </Typography>
              </Stack>
              <Tooltip title="Area under the curve indicates overall model discrimination power.">
                <IconButton color="inherit">
                  <InfoOutlinedIcon />
                </IconButton>
              </Tooltip>
            </Stack>
            <Box sx={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={diagonalPoints} margin={{ left: 16, right: 16, bottom: 8 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="fpr"
                    domain={[0, 1]}
                    tickFormatter={value => (value * 100).toFixed(0) + '%'}
                  />
                  <YAxis type="number" domain={[0, 1]} tickFormatter={value => (value * 100).toFixed(0) + '%'} />
                  <RechartsTooltip formatter={value => (Number(value) * 100).toFixed(1) + '%'} />
                  <Legend />
                  {rocSeries.map((series, index) => (
                    <Line
                      key={series.name}
                      data={series.data}
                      dataKey="tpr"
                      type="monotone"
                      strokeWidth={2}
                      stroke={rocColors[index % rocColors.length]}
                      dot={false}
                      name={series.name}
                    />
                  ))}
                  <Line
                    data={diagonalPoints}
                    dataKey="tpr"
                    type="monotone"
                    strokeDasharray="5 5"
                    stroke="rgba(255,255,255,0.3)"
                    dot={false}
                    isAnimationActive={false}
                    name="Chance"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <ModelMetricsComparison models={selectedModels} />

      <PredictionTable
        predictions={filteredPredictions}
        models={selectedModels.length ? selectedModels : datasetModels.length ? datasetModels : data.models}
        selectedModelId={
          predictionModelId || selectedModels[0]?.id || datasetModels[0]?.id || data.models[0].id
        }
        onChangeModel={setPredictionModelId}
        threshold={threshold}
        onThresholdChange={setThreshold}
        onlyMisclassified={onlyMisclassified}
        onToggleMisclassified={setOnlyMisclassified}
      />
    </Box>
  );
}
