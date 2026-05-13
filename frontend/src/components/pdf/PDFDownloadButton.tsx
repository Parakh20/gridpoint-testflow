import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ProjectReportPDF, type ProjectReportPDFProps } from './ProjectReportPDF';
import { Download, Loader2 } from 'lucide-react';

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
      {({ loading }) => (
        <span
          className={`inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none ${loading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Download className="h-4 w-4" />
          }
          {loading ? 'Preparing PDF…' : 'Download PDF'}
        </span>
      )}
    </PDFDownloadLink>
  );
}
