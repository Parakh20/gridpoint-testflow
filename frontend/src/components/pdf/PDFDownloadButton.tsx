import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ProjectReportPDF, type ProjectReportPDFProps } from './ProjectReportPDF';
import { Download, Loader2, AlertCircle } from 'lucide-react';

interface PDFDownloadButtonProps {
  pdfProps: ProjectReportPDFProps;
  fileName: string;
}

export function PDFDownloadButton({ pdfProps, fileName }: PDFDownloadButtonProps) {
  return (
    <PDFDownloadLink
      document={<ProjectReportPDF {...pdfProps} />}
      fileName={fileName}
      style={{ textDecoration: 'none' }}
    >
      {({ loading, error }) => {
        if (error) {
          return (
            <span className="inline-flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive cursor-not-allowed">
              <AlertCircle className="h-4 w-4" />
              PDF error
            </span>
          );
        }
        return (
          <span
            className={`inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none ${loading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />
            }
            {loading ? 'Preparing PDF…' : 'Download PDF'}
          </span>
        );
      }}
    </PDFDownloadLink>
  );
}
