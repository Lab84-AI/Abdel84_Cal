export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number;
  logLoss: number;
  mae?: number;
  rmse?: number;
}

export interface ConfusionMatrix {
  labels: string[];
  values: number[][];
}

export interface RocPoint {
  threshold: number;
  tpr: number;
  fpr: number;
}

export interface PerformanceRun {
  id: string;
  modelId: string;
  metrics: ModelMetrics;
  confusionMatrix: ConfusionMatrix;
  roc: RocPoint[];
  createdAt: string;
  dataset: string;
  notes?: string;
}

export interface ModelSummary {
  id: string;
  name: string;
  type: string;
  version: string;
  status: 'training' | 'completed' | 'failed' | 'deployed';
  metrics: ModelMetrics;
  dataset: string;
  createdAt: string;
  updatedAt: string;
}

export interface PredictionRecord {
  id: string;
  modelId: string;
  actual: string;
  predicted: string;
  probability: number;
  features: Record<string, number | string>;
  timestamp: string;
}

export interface OptimizationResult {
  strategy: string;
  metric: string;
  bestScore: number;
  bestParams: Record<string, number | string>;
}

export interface ModelPerformanceResponse {
  models: ModelSummary[];
  performanceRuns: PerformanceRun[];
  predictions: PredictionRecord[];
  optimizationResults: OptimizationResult[];
}
