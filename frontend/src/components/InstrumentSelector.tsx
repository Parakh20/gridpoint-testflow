import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronsUpDown, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface Instrument {
  id: string;
  serial_number: string;
  type: string;
  make: string | null;
  model: string | null;
  last_calibrated_at: string | null;
  calibration_due_at: string | null;
}

interface Props {
  value: string;           // free-text instrument_id stored in test_records
  onChange: (value: string) => void;
  disabled?: boolean;
}

function isCalibrationExpired(due: string | null): boolean {
  if (!due) return false;
  return new Date(due) < new Date();
}

function isCalibrationSoon(due: string | null): boolean {
  if (!due) return false;
  const d = new Date(due);
  const now = new Date();
  const thirtyDays = new Date();
  thirtyDays.setDate(now.getDate() + 30);
  return d >= now && d <= thirtyDays;
}

export function InstrumentSelector({ value, onChange, disabled }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newInstrument, setNewInstrument] = useState({
    serial_number: '',
    type: '',
    make: '',
    model: '',
    last_calibrated_at: '',
    calibration_due_at: '',
  });

  const fetchInstruments = async () => {
    const { data } = await supabase
      .from('instruments')
      .select('*')
      .order('serial_number');
    setInstruments(data ?? []);
  };

  useEffect(() => {
    fetchInstruments();
  }, []);

  const filtered = instruments.filter(i =>
    !search ||
    i.serial_number.toLowerCase().includes(search.toLowerCase()) ||
    i.type.toLowerCase().includes(search.toLowerCase()) ||
    (i.make ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const selectedInstrument = instruments.find(i => i.serial_number === value);

  const handleSelect = (instrument: Instrument) => {
    onChange(instrument.serial_number);
    setOpen(false);
    setSearch('');
  };

  const handleAddInstrument = async () => {
    if (!newInstrument.serial_number || !newInstrument.type) {
      toast({ title: 'Serial number and type are required', variant: 'destructive' });
      return;
    }
    setAdding(true);
    try {
      const { data, error } = await supabase
        .from('instruments')
        .insert({
          serial_number: newInstrument.serial_number.trim(),
          type: newInstrument.type.trim(),
          make: newInstrument.make.trim() || null,
          model: newInstrument.model.trim() || null,
          last_calibrated_at: newInstrument.last_calibrated_at || null,
          calibration_due_at: newInstrument.calibration_due_at || null,
          owned_by: user?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchInstruments();
      if (data) onChange(data.serial_number);
      setShowAdd(false);
      setNewInstrument({ serial_number: '', type: '', make: '', model: '', last_calibrated_at: '', calibration_due_at: '' });
      toast({ title: 'Instrument added' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Failed to add instrument', description: err.message, variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const expired = selectedInstrument ? isCalibrationExpired(selectedInstrument.calibration_due_at) : false;
  const soon = selectedInstrument ? isCalibrationSoon(selectedInstrument.calibration_due_at) : false;

  return (
    <div className="space-y-1">
      <Popover open={open && !disabled} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal',
              !value && 'text-muted-foreground',
              expired && 'border-destructive text-destructive',
              soon && 'border-warning',
            )}
          >
            <span className="truncate">{value || 'Select or type instrument ID…'}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-2 border-b border-border">
            <Input
              placeholder="Search by serial / type / make…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">No instruments found</p>
            ) : (
              filtered.map(inst => {
                const exp = isCalibrationExpired(inst.calibration_due_at);
                const sn = isCalibrationSoon(inst.calibration_due_at);
                return (
                  <button
                    key={inst.id}
                    className="flex w-full items-start gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => handleSelect(inst)}
                  >
                    <Check className={cn('mt-0.5 h-4 w-4 shrink-0', value === inst.serial_number ? 'opacity-100 text-primary' : 'opacity-0')} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inst.serial_number}</p>
                      <p className="text-xs text-muted-foreground">{inst.type}{inst.make ? ` · ${inst.make}` : ''}{inst.model ? ` ${inst.model}` : ''}</p>
                      {inst.calibration_due_at && (
                        <p className={cn('text-[10px]', exp ? 'text-destructive' : sn ? 'text-warning' : 'text-muted-foreground')}>
                          {exp ? 'Calibration EXPIRED' : sn ? 'Calibration due soon' : 'Cal. due:'} {formatDate(inst.calibration_due_at)}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-xs"
              onClick={() => { setOpen(false); setShowAdd(true); }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add new instrument
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Calibration warning under the field */}
      {selectedInstrument && (expired || soon) && (
        <div className={cn('flex items-center gap-1.5 text-[10px]', expired ? 'text-destructive' : 'text-warning')}>
          <AlertTriangle className="h-3 w-3" />
          {expired
            ? `Calibration expired ${formatDate(selectedInstrument.calibration_due_at)}`
            : `Calibration due ${formatDate(selectedInstrument.calibration_due_at)}`}
        </div>
      )}

      {/* Free-text fallback — lets engineer type any ID directly */}
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Or type instrument ID manually"
        disabled={disabled}
        className="text-xs h-7"
      />

      {/* Add instrument dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Instrument</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Serial Number <span className="text-destructive">*</span></Label>
                <Input value={newInstrument.serial_number} onChange={e => setNewInstrument(p => ({ ...p, serial_number: e.target.value }))} placeholder="e.g. OMICRON-001" />
              </div>
              <div className="space-y-1">
                <Label>Type <span className="text-destructive">*</span></Label>
                <Input value={newInstrument.type} onChange={e => setNewInstrument(p => ({ ...p, type: e.target.value }))} placeholder="e.g. Megger, TTR" />
              </div>
              <div className="space-y-1">
                <Label>Make</Label>
                <Input value={newInstrument.make} onChange={e => setNewInstrument(p => ({ ...p, make: e.target.value }))} placeholder="Manufacturer" />
              </div>
              <div className="space-y-1">
                <Label>Model</Label>
                <Input value={newInstrument.model} onChange={e => setNewInstrument(p => ({ ...p, model: e.target.value }))} placeholder="Model number" />
              </div>
              <div className="space-y-1">
                <Label>Last Calibrated</Label>
                <Input type="date" value={newInstrument.last_calibrated_at} onChange={e => setNewInstrument(p => ({ ...p, last_calibrated_at: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Calibration Due</Label>
                <Input type="date" value={newInstrument.calibration_due_at} onChange={e => setNewInstrument(p => ({ ...p, calibration_due_at: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAddInstrument} disabled={adding}>Add Instrument</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
