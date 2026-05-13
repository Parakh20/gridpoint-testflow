import * as XLSX from 'xlsx';

export interface ReportExportGroup {
  label: string;
  equipmentType: string;
  tasks: Array<{
    testName: string;
    testCode: string;
    instrumentId: string | null;
    passFail: string | null;
    status: string;
    assignedEngineerName: string;
    remarks: string | null;
  }>;
}

export function exportReportExcel(
  projectNumber: string,
  siteName: string,
  groups: ReportExportGroup[],
): void {
  const aoa: (string | number | null)[][] = [
    ['Equipment', 'Test Name', 'Code', 'Instrument ID', 'Result', 'Status', 'Assigned Engineer', 'Remarks'],
  ];

  for (const group of groups) {
    aoa.push([`--- ${group.label}  (${group.equipmentType.replace(/_/g, ' ')}) ---`, '', '', '', '', '', '', '']);
    for (const task of group.tasks) {
      aoa.push([
        group.label,
        task.testName,
        task.testCode,
        task.instrumentId ?? '',
        task.passFail ?? '',
        task.status,
        task.assignedEngineerName,
        task.remarks ?? '',
      ]);
    }
    aoa.push([]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 10 },
    { wch: 14 },
    { wch: 22 },
    { wch: 32 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Test Report');
  XLSX.writeFile(wb, `${projectNumber}_${siteName.replace(/[^a-zA-Z0-9]/g, '_')}_Report.xlsx`);
}
