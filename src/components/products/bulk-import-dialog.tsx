'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseCsv } from '@/lib/csv';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types/database';

interface BulkImportDialogProps {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (products: Product[]) => void;
}

interface ParsedRow {
  name: string;
  price: number;
  description: string | null;
  valid: boolean;
}

export function BulkImportDialog({ businessId, open, onOpenChange, onImported }: BulkImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const raw = parseCsv(text);
    if (raw.length === 0) return;

    const looksLikeHeader = /name/i.test(raw[0][0] ?? '') && /price/i.test(raw[0][1] ?? '');
    const dataRows = looksLikeHeader ? raw.slice(1) : raw;

    const parsed: ParsedRow[] = dataRows.map(([name, price, description]) => {
      const priceNum = parseFloat((price ?? '').replace(/[^0-9.-]/g, ''));
      return {
        name: (name ?? '').trim(),
        price: priceNum,
        description: description?.trim() || null,
        valid: !!name?.trim() && !Number.isNaN(priceNum),
      };
    });

    setRows(parsed);
  };

  const validRows = rows.filter((r) => r.valid);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .insert(
        validRows.map((r) => ({
          business_id: businessId,
          name: r.name,
          unit_price: r.price,
          description: r.description,
        }))
      )
      .select();
    setImporting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Imported ${data?.length ?? 0} products`);
    onImported(data ?? []);
    setRows([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setRows([]); }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk import products</DialogTitle>
          <DialogDescription>CSV with columns: name, price, description (header row optional).</DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-10 text-center text-muted-foreground hover:bg-muted/40"
          >
            <Upload className="h-6 w-6" />
            <span className="text-sm">Click to choose a .csv file</span>
          </button>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="max-w-40 truncate">{row.name || '—'}</TableCell>
                    <TableCell>{Number.isNaN(row.price) ? '—' : row.price}</TableCell>
                    <TableCell className={row.valid ? 'text-green-600' : 'text-destructive'}>{row.valid ? 'OK' : 'Invalid'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        <DialogFooter>
          {rows.length > 0 && (
            <Button type="button" variant="outline" onClick={() => setRows([])}>
              Choose different file
            </Button>
          )}
          <Button onClick={handleImport} disabled={validRows.length === 0 || importing}>
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
            Import {validRows.length > 0 ? `${validRows.length} products` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
