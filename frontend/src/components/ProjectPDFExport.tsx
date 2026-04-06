import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate, formatDateTime } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import type { Json, Tables } from '@/integrations/supabase/types';

interface ProjectPDFExportProps {
  project: {
    id: string;
    project_number: string;
    site_name: string;
    site_address: string;
    client: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
  };
  onClose: () => void;
}

type ScopeItem = Tables<'scope_items'>;

type TestPayload = Record<string, Json | undefined>;

interface TaskWithRecord {
  id: string;
  status: string;
  equipment_instance: { label: string; equipment_type: string } | null;
  test_template: { test_name: string; test_code: string; fields: Json } | null;
  record: { payload: TestPayload; instrument_id: string | null; pass_fail: string | null; remarks: string | null } | null;
}

export function ProjectPDFExport({ project, onClose }: ProjectPDFExportProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>([]);
  const [tasksByEquipment, setTasksByEquipment] = useState<Record<string, TaskWithRecord[]>>({});
  const [testStats, setTestStats] = useState({ total: 0, completed: 0, pass: 0, fail: 0 });
  const printRef = useRef<HTMLDivElement>(null);

  const toPayloadObject = (value: Json | null | undefined): TestPayload => {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      return {};
    }

    return value as TestPayload;
  };

  const fetchData = useCallback(async () => {
    try {
      const { data: scope } = await supabase
        .from('scope_items')
        .select('*')
        .eq('project_id', project.id);

      const { data: instances } = await supabase
        .from('equipment_instances')
        .select('id')
        .eq('project_id', project.id);

      if (!instances?.length) {
        setScopeItems(scope || []);
        setLoading(false);
        return;
      }

      const instanceIds = instances.map(i => i.id);

      const { data: tasks } = await supabase
        .from('test_tasks')
        .select(`
          id, status,
          equipment_instance:equipment_instances(label, equipment_type),
          test_template:test_templates(test_name, test_code, fields)
        `)
        .in('equipment_instance_id', instanceIds)
        .order('created_at');

      const taskIds = (tasks || []).map(t => t.id);
      const { data: records } = await supabase
        .from('test_records')
        .select('test_task_id, payload, instrument_id, pass_fail, remarks')
        .in('test_task_id', taskIds);

      const recordMap = Object.fromEntries((records || []).map(r => [r.test_task_id, r]));

      const enriched: TaskWithRecord[] = (tasks || []).map(t => ({
        ...t,
        record: recordMap[t.id]
          ? {
              ...recordMap[t.id],
              payload: toPayloadObject(recordMap[t.id].payload),
            }
          : null,
      }));

      // Group by equipment label
      const grouped: Record<string, TaskWithRecord[]> = {};
      enriched.forEach(t => {
        const label = t.equipment_instance?.label || 'Unknown';
        if (!grouped[label]) grouped[label] = [];
        grouped[label].push(t);
      });

      const pass = (records || []).filter(r => r.pass_fail === 'PASS').length;
      const fail = (records || []).filter(r => r.pass_fail === 'FAIL').length;

      setScopeItems(scope || []);
      setTasksByEquipment(grouped);
      setTestStats({
        total: enriched.length,
        completed: enriched.filter(t => t.status === 'APPROVED').length,
        pass,
        fail,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleDownloadPDF = async () => {
    if (!printRef.current) {
      return;
    }

    setDownloading(true);

    let captureRoot: HTMLDivElement | null = null;

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      captureRoot = document.createElement('div');
      captureRoot.style.position = 'absolute';
      captureRoot.style.left = '0';
      captureRoot.style.top = '0';
      captureRoot.style.width = '1120px';
      captureRoot.style.padding = '32px';
      captureRoot.style.background = '#ffffff';
      captureRoot.style.color = '#0f172a';
      captureRoot.style.fontFamily = 'system-ui, sans-serif';
      captureRoot.style.visibility = 'hidden';
      captureRoot.style.pointerEvents = 'none';

      const reportClone = printRef.current.cloneNode(true) as HTMLDivElement;
      reportClone.style.width = '100%';
      reportClone.style.maxWidth = 'none';
      reportClone.style.overflow = 'visible';
      reportClone.style.height = 'auto';
      captureRoot.appendChild(reportClone);
      document.body.appendChild(captureRoot);

      // Allow layout to compute
      await new Promise(resolve => window.setTimeout(resolve, 300));

      // Temporarily make visible for html2canvas
      captureRoot.style.visibility = 'visible';

      const canvas = await html2canvas(captureRoot, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        width: 1120,
        height: captureRoot.scrollHeight,
        windowWidth: 1120,
        windowHeight: captureRoot.scrollHeight,
        onclone: (doc) => {
          // Ensure CSS variables resolve by setting explicit colours on the clone root
          doc.documentElement.style.setProperty('--foreground', '222 47% 11%');
          doc.documentElement.style.setProperty('--muted-foreground', '215 16% 47%');
          doc.documentElement.style.setProperty('--background', '0 0% 100%');
          doc.documentElement.style.setProperty('--muted', '210 40% 96%');
          doc.documentElement.style.setProperty('--border', '214 32% 91%');
        },
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;
      const imageWidth = contentWidth;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      const imageData = canvas.toDataURL('image/jpeg', 0.95);

      let remainingHeight = imageHeight;
      let position = margin;

      pdf.addImage(imageData, 'JPEG', margin, position, imageWidth, imageHeight, undefined, 'FAST');
      remainingHeight -= contentHeight;

      while (remainingHeight > 0) {
        pdf.addPage();
        position = margin - (imageHeight - remainingHeight);
        pdf.addImage(imageData, 'JPEG', margin, position, imageWidth, imageHeight, undefined, 'FAST');
        remainingHeight -= contentHeight;
      }

      const safeProjectNumber = (project.project_number || 'testflow-report').replace(/[^\w.-]+/g, '_');
      pdf.save(`${safeProjectNumber}.pdf`);

      toast({
        title: 'PDF downloaded',
        description: `Saved ${safeProjectNumber}.pdf`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'PDF download failed',
        description: 'Unable to generate the PDF file right now.',
        variant: 'destructive',
      });
    } finally {
      if (captureRoot && document.body.contains(captureRoot)) {
        document.body.removeChild(captureRoot);
      }
      setDownloading(false);
    }
  };

  const totalEquipment = scopeItems.reduce((sum, item) => sum + item.quantity, 0);

  const PassFailCell = ({ value }: { value: string | null }) => {
    if (!value) return <span style={{ color: '#888' }}>—</span>;
    const color = value === 'PASS' ? '#16a34a' : value === 'FAIL' ? '#dc2626' : '#d97706';
    return <span style={{ color, fontWeight: 600 }}>{value}</span>;
  };

  const formatReadingSummary = (
    payload: Record<string, unknown>,
    fieldDefs: Record<string, { title?: string }>
  ) => {
    const entries = Object.entries(payload);

    if (!entries.length) {
      return '—';
    }

    return entries
      .map(([key, value]) => `${fieldDefs[key]?.title || key}: ${String(value ?? '—')}`)
      .join(' | ');
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:block print:max-w-none print:max-h-none print:overflow-visible print:border-0 print:shadow-none print:translate-x-0 print:translate-y-0 print:left-0 print:top-0">
        <DialogHeader className="print:hidden">
          <DialogTitle>Test Plan Report</DialogTitle>
          <div className="flex gap-2">
            <Button onClick={handleDownloadPDF} variant="outline" disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download PDF
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div ref={printRef} className="space-y-6 print:block print:p-8">
            {/* Cover Page */}
            <div className="text-center space-y-4 pb-8 border-b print:page-break-after-always">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-semibold">TestFlow</div>
                <h1 className="text-3xl font-bold">Electrical Testing Test Plan</h1>
              </div>
              <div className="space-y-1 mt-8">
                <h2 className="text-2xl font-semibold">{project.project_number}</h2>
                <p className="text-lg text-muted-foreground">{project.site_name}</p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <StatusBadge status={project.status} />
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-8">
                Generated: {formatDateTime(new Date().toISOString())}
              </div>
            </div>

            {/* Project Details */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Project Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Project Number:</span>
                  <p className="text-muted-foreground">{project.project_number}</p>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <div className="mt-1">
                    <StatusBadge status={project.status} />
                  </div>
                </div>
                <div>
                  <span className="font-medium">Site Name:</span>
                  <p className="text-muted-foreground">{project.site_name}</p>
                </div>
                <div>
                  <span className="font-medium">Client:</span>
                  <p className="text-muted-foreground">{project.client || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Site Address:</span>
                  <p className="text-muted-foreground">{project.site_address}</p>
                </div>
                <div>
                  <span className="font-medium">Start Date:</span>
                  <p className="text-muted-foreground">
                    {project.start_date ? formatDate(project.start_date) : 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="font-medium">End Date:</span>
                  <p className="text-muted-foreground">
                    {project.end_date ? formatDate(project.end_date) : 'Not set'}
                  </p>
                </div>
              </div>
            </div>

            {/* Equipment Scope */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Equipment Scope</h3>
              <table className="w-full border-collapse border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-2 text-left">Equipment Type</th>
                    <th className="border p-2 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {scopeItems.map((item) => (
                    <tr key={item.id}>
                      <td className="border p-2">{item.equipment_type.replace(/_/g, ' ')}</td>
                      <td className="border p-2 text-right">{item.quantity}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-muted">
                    <td className="border p-2">Total Equipment</td>
                    <td className="border p-2 text-right">{totalEquipment}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Test Results Summary */}
            {testStats.total > 0 && (
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Test Results Summary</h3>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Total Tests', value: testStats.total, color: '' },
                    { label: 'Approved', value: testStats.completed, color: '#16a34a' },
                    { label: 'Pass', value: testStats.pass, color: '#16a34a' },
                    { label: 'Fail', value: testStats.fail, color: '#dc2626' },
                  ].map(s => (
                    <div key={s.label} className="border p-3 rounded text-center">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-2xl font-bold" style={s.color ? { color: s.color } : {}}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Test Results by Equipment */}
            {Object.entries(tasksByEquipment).map(([label, tasks]) => (
              <div key={label} className="space-y-2 print:page-break-inside-avoid">
                <h3 className="text-lg font-semibold border-b pb-1">
                  {label} — {tasks[0]?.equipment_instance?.equipment_type.replace(/_/g, ' ')}
                </h3>
                <table className="w-full border-collapse border text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border p-2 text-left">Test</th>
                      <th className="border p-2 text-left w-24">Code</th>
                      <th className="border p-2 text-left w-32">Instrument ID</th>
                      <th className="border p-2 text-left">Reading</th>
                      <th className="border p-2 text-left w-20">Result</th>
                      <th className="border p-2 text-left w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(task => {
                      const rawFields = task.test_template?.fields;
                      const parsedFields = typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields;
                      const fieldDefs = parsedFields?.properties || {};
                      const payload = task.record?.payload || {};
                      const readingSummary = formatReadingSummary(payload, fieldDefs);

                      return (
                        <React.Fragment key={task.id}>
                          <tr style={{ backgroundColor: task.record ? '' : '#fafafa' }}>
                            <td className="border p-2 font-medium">{task.test_template?.test_name}</td>
                            <td className="border p-2 font-mono text-xs">{task.test_template?.test_code}</td>
                            <td className="border p-2">{task.record?.instrument_id || <span style={{ color: '#888' }}>—</span>}</td>
                            <td className="border p-2 text-xs align-top">
                              <div className="whitespace-normal break-words leading-5">{readingSummary}</div>
                            </td>
                            <td className="border p-2"><PassFailCell value={task.record?.pass_fail || null} /></td>
                            <td className="border p-2">{task.status}</td>
                          </tr>
                          {/* Readings row */}
                          {task.record && Object.keys(payload).length > 0 && (
                            <tr>
                              <td colSpan={6} className="border p-2 bg-gray-50">
                                <div className="grid grid-cols-4 gap-2 text-xs">
                                  {Object.entries(payload).map(([k, v]) => (
                                    <div key={k}>
                                      <span style={{ color: '#666' }}>{fieldDefs[k]?.title || k}: </span>
                                      <span className="font-medium">{String(v ?? '—')}</span>
                                    </div>
                                  ))}
                                  {task.record?.remarks && (
                                    <div className="col-span-4" style={{ color: '#555' }}>
                                      Remarks: {task.record.remarks}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
