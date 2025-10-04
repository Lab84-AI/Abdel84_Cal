function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportPredictionsToCSV(predictions, filename = 'predictions.csv') {
  if (!predictions.length) return;

  const headers = ['ID', 'Model', 'Actual', 'Predicted', 'Probability', 'Timestamp'];
  const featureKeys = Array.from(
    new Set(predictions.flatMap(pred => Object.keys(pred.features ?? {})))
  );

  const rows = predictions.map(pred => [
    pred.id,
    pred.modelId,
    pred.actual,
    pred.predicted,
    pred.probability.toString(),
    pred.timestamp,
    ...featureKeys.map(key => String(pred.features?.[key] ?? ''))
  ]);

  const csvContent = [headers.concat(featureKeys), ...rows]
    .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportModelSummaryPdf(models, filename = 'model-performance-report.txt') {
  if (!models.length) return;

  const header = 'Model Performance Summary\n';
  const generated = `Generated: ${new Date().toLocaleString()}\n\n`;
  const columns = ['Model', 'Type', 'Version', 'Dataset', 'Accuracy', 'Precision', 'Recall', 'F1 Score', 'ROC AUC'];
  const table = [columns.join('\t')]
    .concat(
      models.map(model =>
        [
          model.name,
          model.type,
          model.version,
          model.dataset,
          (model.metrics.accuracy * 100).toFixed(2) + ' %',
          (model.metrics.precision * 100).toFixed(2) + ' %',
          (model.metrics.recall * 100).toFixed(2) + ' %',
          (model.metrics.f1Score * 100).toFixed(2) + ' %',
          (model.metrics.rocAuc * 100).toFixed(2) + ' %'
        ].join('\t')
      )
    )
    .join('\n');

  downloadFile(header + generated + table, filename, 'text/plain;charset=utf-8;');
}
