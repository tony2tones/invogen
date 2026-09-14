'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBusiness } from '@/lib/contexts/business-context';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ExpenseFormDialog } from '@/components/expenses/expense-form-dialog';
import { CategoryBreakdown } from '@/components/expenses/category-breakdown';
import { EXPENSE_CATEGORIES, categoryColor } from '@/lib/expense-categories';
import { formatCurrency, formatDate } from '@/lib/format';
import { toCsv, downloadCsv } from '@/lib/csv';
import { Download, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Expense } from '@/types/database';

type Period = 'this_month' | 'last_month' | 'this_year' | 'all';

const periods: { value: Period; label: string }[] = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

function inPeriod(dateStr: string, period: Period) {
  if (period === 'all') return true;
  const date = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  if (period === 'this_month') {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }
  if (period === 'last_month') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return date.getFullYear() === lastMonth.getFullYear() && date.getMonth() === lastMonth.getMonth();
  }
  return date.getFullYear() === now.getFullYear();
}

function ExpensesPageInner() {
  const { currentBusiness } = useBusiness();
  const searchParams = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('this_month');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  useEffect(() => {
    if (searchParams.get('new') === '1') setFormOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (!currentBusiness) return;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from('expenses')
      .select('*')
      .eq('business_id', currentBusiness.id)
      .order('expense_date', { ascending: false })
      .then(({ data }) => {
        setExpenses(data ?? []);
        setLoading(false);
      });
  }, [currentBusiness]);

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => inPeriod(e.expense_date, period))
      .filter((e) => categoryFilter === 'all' || e.category === categoryFilter);
  }, [expenses, period, categoryFilter]);

  const total = filtered.reduce((sum, e) => sum + Number(e.amount), 0);
  const vatTotal = filtered.reduce((sum, e) => sum + Number(e.vat_amount), 0);

  const upsertLocal = (expense: Expense) => {
    setExpenses((prev) => {
      const exists = prev.some((e) => e.id === expense.id);
      const next = exists ? prev.map((e) => (e.id === expense.id ? expense : e)) : [expense, ...prev];
      return next.sort((a, b) => (a.expense_date < b.expense_date ? 1 : -1));
    });
  };

  const handleDelete = async () => {
    if (!deletingExpense) return;
    const supabase = createClient();
    if (deletingExpense.receipt_path) {
      await supabase.storage.from('expense-receipts').remove([deletingExpense.receipt_path]);
    }
    const { error } = await supabase.from('expenses').delete().eq('id', deletingExpense.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setExpenses((prev) => prev.filter((e) => e.id !== deletingExpense.id));
    setDeletingExpense(null);
    toast.success('Expense deleted');
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.info('No expenses to export for this period');
      return;
    }
    const headers = ['Date', 'Category', 'Vendor', 'Description', 'Amount', 'VAT', 'PaymentMethod'];
    const rows = filtered.map((e) => [e.expense_date, e.category, e.vendor ?? '', e.description ?? '', e.amount, e.vat_amount, e.payment_method ?? '']);
    downloadCsv(`expenses_${period}.csv`, toCsv(headers, rows));
  };

  if (!currentBusiness) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="flex-wrap">
            {periods.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setEditingExpense(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total expenses</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatCurrency(total, currentBusiness.currency)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">VAT included</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatCurrency(vatTotal, currentBusiness.currency)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By category</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryBreakdown expenses={filtered} currency={currentBusiness.currency} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{filtered.length} expense{filtered.length === 1 ? '' : 's'}</p>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="divide-y rounded-lg border bg-background">
        {loading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Receipt className="h-8 w-8" />
            <p className="text-sm">No expenses in this period.</p>
          </div>
        )}
        {filtered.map((expense) => (
          <div key={expense.id} className="flex items-center gap-3 p-3">
            <span className={`h-2 w-2 shrink-0 rounded-full ${categoryColor(expense.category)}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{expense.vendor || expense.category}</p>
              <p className="truncate text-xs text-muted-foreground">
                {formatDate(expense.expense_date)} · {expense.category}
                {expense.description ? ` · ${expense.description}` : ''}
              </p>
            </div>
            <span className="shrink-0 font-semibold">{formatCurrency(Number(expense.amount), currentBusiness.currency)}</span>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setEditingExpense(expense);
                  setFormOpen(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingExpense(expense)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ExpenseFormDialog businessId={currentBusiness.id} open={formOpen} onOpenChange={setFormOpen} expense={editingExpense} onSaved={upsertLocal} />

      <AlertDialog open={!!deletingExpense} onOpenChange={(open) => !open && setDeletingExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={null}>
      <ExpensesPageInner />
    </Suspense>
  );
}
