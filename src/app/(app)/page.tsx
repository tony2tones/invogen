'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useBusiness } from '@/lib/contexts/business-context';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Invoice } from '@/types/database';
import { FilePlus2, FileText, Package, Receipt, Users } from 'lucide-react';
import { statusBadgeVariant } from '@/lib/invoice-status';

export default function DashboardPage() {
  const { currentBusiness } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ outstanding: 0, paidThisMonth: 0, expensesThisMonth: 0, netThisMonth: 0 });
  const [recent, setRecent] = useState<(Invoice & { client_name: string | null })[]>([]);

  useEffect(() => {
    if (!currentBusiness) return;
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [invoicesRes, expensesRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, invoice_number, status, type, total, issue_date, client_id, clients(name)')
          .eq('business_id', currentBusiness.id)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('expenses')
          .select('amount, expense_date')
          .eq('business_id', currentBusiness.id)
          .order('expense_date', { ascending: false })
          .limit(500),
      ]);

      if (cancelled) return;

      const invoices = (invoicesRes.data ?? []) as unknown as (Invoice & { clients: { name: string } | null })[];
      const now = new Date();
      const outstanding = invoices
        .filter((i) => i.status === 'sent' || i.status === 'overdue')
        .reduce((sum, i) => sum + Number(i.total), 0);
      const paidThisMonth = invoices
        .filter(
          (i) =>
            i.status === 'paid' &&
            new Date(i.issue_date).getMonth() === now.getMonth() &&
            new Date(i.issue_date).getFullYear() === now.getFullYear()
        )
        .reduce((sum, i) => sum + Number(i.total), 0);
      const expensesThisMonth = (expensesRes.data ?? [])
        .filter(
          (e) =>
            new Date(e.expense_date).getMonth() === now.getMonth() &&
            new Date(e.expense_date).getFullYear() === now.getFullYear()
        )
        .reduce((sum, e) => sum + Number(e.amount), 0);

      setStats({
        outstanding,
        paidThisMonth,
        expensesThisMonth,
        netThisMonth: paidThisMonth - expensesThisMonth,
      });
      setRecent(
        invoices.slice(0, 6).map((i) => ({ ...i, client_name: i.clients?.name ?? null }))
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentBusiness]);

  if (!currentBusiness) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatCurrency(stats.outstanding, currentBusiness.currency)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Paid this month</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatCurrency(stats.paidThisMonth, currentBusiness.currency)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Expenses this month</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatCurrency(stats.expensesThisMonth, currentBusiness.currency)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Net this month</CardTitle>
          </CardHeader>
          <CardContent className={`text-xl font-bold ${stats.netThisMonth < 0 ? 'text-destructive' : ''}`}>
            {formatCurrency(stats.netThisMonth, currentBusiness.currency)}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Button asChild variant="outline" className="h-16 flex-col gap-1">
          <Link href="/invoices/new">
            <FilePlus2 className="h-4 w-4" />
            New Invoice
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-16 flex-col gap-1">
          <Link href="/invoices/new?type=quote">
            <FileText className="h-4 w-4" />
            New Quote
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-16 flex-col gap-1">
          <Link href="/clients?new=1">
            <Users className="h-4 w-4" />
            Add Client
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-16 flex-col gap-1">
          <Link href="/products?new=1">
            <Package className="h-4 w-4" />
            Add Product
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-16 flex-col gap-1">
          <Link href="/expenses?new=1">
            <Receipt className="h-4 w-4" />
            Add Expense
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent invoices</CardTitle>
          <Button asChild variant="link" size="sm" className="h-auto p-0">
            <Link href="/invoices">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-1">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && recent.length === 0 && <p className="text-sm text-muted-foreground">No invoices yet.</p>}
          {recent.map((invoice) => (
            <Link
              key={invoice.id}
              href={`/invoices/${invoice.id}`}
              className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/60"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{invoice.client_name ?? 'No client'}</p>
                <p className="text-xs text-muted-foreground">
                  {invoice.invoice_number} · {formatDate(invoice.issue_date)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{formatCurrency(Number(invoice.total), currentBusiness.currency)}</span>
                <Badge variant={statusBadgeVariant(invoice.status)}>{invoice.status}</Badge>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
