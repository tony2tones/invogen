'use client';

import { useEffect, useState } from 'react';
import { useBusiness } from '@/lib/contexts/business-context';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toCsv, downloadCsv } from '@/lib/csv';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Invoice, InvoiceItem } from '@/types/database';

export default function IntegrationsPage() {
  const { currentBusiness } = useBusiness();
  const [connected, setConnected] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!currentBusiness) return;
    const supabase = createClient();
    supabase
      .from('integrations')
      .select('id')
      .eq('business_id', currentBusiness.id)
      .eq('provider', 'quickbooks')
      .maybeSingle()
      .then(({ data }) => setConnected(!!data));
  }, [currentBusiness]);

  if (!currentBusiness) return null;

  const handleExport = async () => {
    setExporting(true);
    const supabase = createClient();
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*, clients(name, email), invoice_items(*)')
      .eq('business_id', currentBusiness.id)
      .order('issue_date', { ascending: true });
    setExporting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    type Row = Invoice & { clients: { name: string; email: string | null } | null; invoice_items: InvoiceItem[] };
    const rows = (invoices ?? []) as unknown as Row[];

    if (rows.length === 0) {
      toast.info('No invoices to export yet');
      return;
    }

    const headers = [
      'InvoiceNo',
      'Type',
      'Customer',
      'Email',
      'InvoiceDate',
      'DueDate',
      'Item',
      'Qty',
      'Rate',
      'Amount',
      'VATRate',
      'Total',
      'Status',
    ];

    const csvRows: (string | number)[][] = [];
    for (const invoice of rows) {
      const items = invoice.invoice_items.length > 0 ? invoice.invoice_items : [null];
      for (const item of items) {
        csvRows.push([
          invoice.invoice_number,
          invoice.type,
          invoice.clients?.name ?? '',
          invoice.clients?.email ?? '',
          invoice.issue_date,
          invoice.due_date ?? '',
          item?.description ?? '',
          item?.quantity ?? '',
          item?.unit_price ?? '',
          item?.total ?? '',
          invoice.vat_rate,
          invoice.total,
          invoice.status,
        ]);
      }
    }

    downloadCsv(`${currentBusiness.name.replace(/\s+/g, '_')}_quickbooks_export.csv`, toCsv(headers, csvRows));
    toast.success('CSV exported');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 lg:p-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>QuickBooks</CardTitle>
            <CardDescription>Sync invoices, clients and products with QuickBooks Online.</CardDescription>
          </div>
          <Badge variant={connected ? 'default' : 'outline'}>{connected ? 'Connected' : 'Not Connected'}</Badge>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button disabled className="pointer-events-none">
                  Connect
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Coming soon</TooltipContent>
          </Tooltip>
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV for QuickBooks
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
