'use client';

import { useMemo } from 'react';
import { formatCurrency } from '@/lib/format';
import { categoryColor } from '@/lib/expense-categories';
import type { Expense } from '@/types/database';

export function CategoryBreakdown({ expenses, currency }: { expenses: Expense[]; currency: string }) {
  const rows = useMemo(() => {
    const totals = new Map<string, number>();
    for (const expense of expenses) {
      totals.set(expense.category, (totals.get(expense.category) ?? 0) + Number(expense.amount));
    }
    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    return Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount, pct: total > 0 ? (amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No expenses in this period yet.</p>;
  }

  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.category}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium">{row.category}</span>
            <span className="text-muted-foreground">{formatCurrency(row.amount, currency)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${categoryColor(row.category)}`} style={{ width: `${Math.max(row.pct, 2)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
