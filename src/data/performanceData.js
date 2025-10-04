const modelPerformanceMock = {
  models: [
    {
      id: 'model-001',
      name: 'ChurnGuard XGBoost',
      type: 'Gradient Boosted Trees',
      version: 'v4.2.1',
      status: 'deployed',
      dataset: 'Telco Churn v7',
      createdAt: '2024-05-10T08:00:00Z',
      updatedAt: '2024-05-18T14:22:00Z',
      metrics: {
        accuracy: 0.934,
        precision: 0.912,
        recall: 0.889,
        f1Score: 0.9,
        rocAuc: 0.971,
        logLoss: 0.302
      }
    },
    {
      id: 'model-002',
      name: 'Churn Neural Net',
      type: 'Neural Network',
      version: 'v2.1.0',
      status: 'completed',
      dataset: 'Telco Churn v7',
      createdAt: '2024-05-01T09:30:00Z',
      updatedAt: '2024-05-17T20:15:00Z',
      metrics: {
        accuracy: 0.918,
        precision: 0.902,
        recall: 0.861,
        f1Score: 0.881,
        rocAuc: 0.956,
        logLoss: 0.341
      }
    },
    {
      id: 'model-003',
      name: 'Random Forest Baseline',
      type: 'Random Forest',
      version: 'v1.4.3',
      status: 'completed',
      dataset: 'Telco Churn v7',
      createdAt: '2024-04-22T11:05:00Z',
      updatedAt: '2024-05-12T16:40:00Z',
      metrics: {
        accuracy: 0.901,
        precision: 0.876,
        recall: 0.842,
        f1Score: 0.858,
        rocAuc: 0.938,
        logLoss: 0.412
      }
    }
  ],
  performanceRuns: [
    {
      id: 'run-001',
      modelId: 'model-001',
      createdAt: '2024-05-18T14:20:00Z',
      dataset: 'Telco Churn v7',
      metrics: {
        accuracy: 0.934,
        precision: 0.912,
        recall: 0.889,
        f1Score: 0.9,
        rocAuc: 0.971,
        logLoss: 0.302
      },
      confusionMatrix: {
        labels: ['Retained', 'Churned'],
        values: [
          [812, 34],
          [48, 302]
        ]
      },
      roc: [
        { threshold: 0.9, tpr: 0.51, fpr: 0.03 },
        { threshold: 0.8, tpr: 0.69, fpr: 0.07 },
        { threshold: 0.7, tpr: 0.81, fpr: 0.11 },
        { threshold: 0.6, tpr: 0.87, fpr: 0.16 },
        { threshold: 0.5, tpr: 0.91, fpr: 0.21 },
        { threshold: 0.4, tpr: 0.95, fpr: 0.28 },
        { threshold: 0.3, tpr: 0.97, fpr: 0.35 }
      ]
    },
    {
      id: 'run-002',
      modelId: 'model-002',
      createdAt: '2024-05-17T20:10:00Z',
      dataset: 'Telco Churn v7',
      metrics: {
        accuracy: 0.918,
        precision: 0.902,
        recall: 0.861,
        f1Score: 0.881,
        rocAuc: 0.956,
        logLoss: 0.341
      },
      confusionMatrix: {
        labels: ['Retained', 'Churned'],
        values: [
          [796, 50],
          [61, 289]
        ]
      },
      roc: [
        { threshold: 0.9, tpr: 0.44, fpr: 0.04 },
        { threshold: 0.8, tpr: 0.64, fpr: 0.09 },
        { threshold: 0.7, tpr: 0.77, fpr: 0.15 },
        { threshold: 0.6, tpr: 0.84, fpr: 0.2 },
        { threshold: 0.5, tpr: 0.89, fpr: 0.27 },
        { threshold: 0.4, tpr: 0.93, fpr: 0.34 },
        { threshold: 0.3, tpr: 0.96, fpr: 0.41 }
      ]
    },
    {
      id: 'run-003',
      modelId: 'model-003',
      createdAt: '2024-05-12T16:30:00Z',
      dataset: 'Telco Churn v7',
      metrics: {
        accuracy: 0.901,
        precision: 0.876,
        recall: 0.842,
        f1Score: 0.858,
        rocAuc: 0.938,
        logLoss: 0.412
      },
      confusionMatrix: {
        labels: ['Retained', 'Churned'],
        values: [
          [781, 65],
          [72, 278]
        ]
      },
      roc: [
        { threshold: 0.9, tpr: 0.39, fpr: 0.05 },
        { threshold: 0.8, tpr: 0.57, fpr: 0.1 },
        { threshold: 0.7, tpr: 0.71, fpr: 0.18 },
        { threshold: 0.6, tpr: 0.79, fpr: 0.24 },
        { threshold: 0.5, tpr: 0.84, fpr: 0.31 },
        { threshold: 0.4, tpr: 0.9, fpr: 0.39 },
        { threshold: 0.3, tpr: 0.93, fpr: 0.46 }
      ]
    }
  ],
  predictions: Array.from({ length: 40 }).map((_, index) => {
    const modelId = index % 3 === 0 ? 'model-001' : index % 3 === 1 ? 'model-002' : 'model-003';
    const actual = index % 4 === 0 ? 'Churned' : 'Retained';
    const predicted = index % 5 === 0 ? 'Churned' : actual;
    return {
      id: `pred-${index + 1}`,
      modelId,
      actual,
      predicted,
      probability: Number((Math.random() * 0.4 + 0.5).toFixed(2)),
      timestamp: new Date(Date.now() - index * 60000).toISOString(),
      features: {
        tenureMonths: Math.floor(Math.random() * 24) + 1,
        monthlyCharges: Number((Math.random() * 80 + 20).toFixed(2)),
        supportTickets: Math.floor(Math.random() * 5),
        contractType: index % 2 === 0 ? 'Two year' : 'Month-to-month'
      }
    };
  }),
  optimizationResults: [
    {
      strategy: 'Bayesian Optimization',
      metric: 'AUC',
      bestScore: 0.971,
      bestParams: {
        learning_rate: 0.08,
        max_depth: 5,
        subsample: 0.9,
        colsample_bytree: 0.85
      }
    },
    {
      strategy: 'Random Search',
      metric: 'F1 Score',
      bestScore: 0.9,
      bestParams: {
        n_estimators: 500,
        max_depth: 7,
        min_child_weight: 3
      }
    }
  ]
};

export async function fetchModelPerformance() {
  await new Promise(resolve => setTimeout(resolve, 400));
  return modelPerformanceMock;
}
