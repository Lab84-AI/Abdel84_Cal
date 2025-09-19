'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ModelSummary, PredictionRecord } from '@/types/performance';

function downloadFile(content: BlobPart, filename: string, type: string) {
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

export function exportPredictionsToCSV(predictions: PredictionRecord[], filename = 'predictions.csv') {
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
    .map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

export function exportModelSummaryPdf(models: ModelSummary[], filename = 'model-report.pdf') {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(18);
  doc.text('Model Performance Summary', 14, 20);
  doc.setFontSize(11);
  doc.setTextColor('#606f7a');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  const body = models.map(model => [
    model.name,
    model.type,
    model.version,
    model.dataset,
    (model.metrics.accuracy * 100).toFixed(2) + ' %',
    (model.metrics.precision * 100).toFixed(2) + ' %',
    (model.metrics.recall * 100).toFixed(2) + ' %',
    (model.metrics.f1Score * 100).toFixed(2) + ' %',
    (model.metrics.rocAuc * 100).toFixed(2) + ' %'
  ]);

  autoTable(doc, {
    startY: 36,
    head: [
      ['Model', 'Type', 'Version', 'Dataset', 'Accuracy', 'Precision', 'Recall', 'F1 Score', 'ROC AUC']
    ],
    body,
    styles: {
      font: 'Inter',
      fontSize: 10
    },
    headStyles: {
      fillColor: [17, 115, 212],
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 32 },
      2: { halign: 'center' },
      3: { cellWidth: 36 },
      4: { halign: 'center' }
    }
  });

  doc.save(filename);
}
