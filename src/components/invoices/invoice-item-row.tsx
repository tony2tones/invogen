'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { Minus, Plus, X } from 'lucide-react';

export interface BuilderLineItem {
  localId: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
}

interface InvoiceItemRowProps {
  item: BuilderLineItem;
  currency: string;
  onChange: (item: BuilderLineItem) => void;
  onRemove: () => void;
}

export function InvoiceItemRow({ item, currency, onChange, onRemove }: InvoiceItemRowProps) {
  const total = (item.quantity || 0) * (item.unit_price || 0);

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
      <Input
        value={item.description}
        onChange={(e) => onChange({ ...item, description: e.target.value })}
        placeholder="Item description"
        className="sm:flex-1"
      />
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-md border">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onChange({ ...item, quantity: Math.max(0, roundQty(item.quantity - 1)) })}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Input
            type="number"
            value={item.quantity}
            onChange={(e) => onChange({ ...item, quantity: parseFloat(e.target.value) || 0 })}
            className="h-8 w-14 border-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onChange({ ...item, quantity: roundQty(item.quantity + 1) })}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">@</span>
          <Input
            type="number"
            step="0.01"
            value={item.unit_price}
            onChange={(e) => onChange({ ...item, unit_price: parseFloat(e.target.value) || 0 })}
            className="h-8 w-24"
          />
        </div>
        <span className="w-24 shrink-0 text-right text-sm font-semibold">{formatCurrency(total, currency)}</span>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function roundQty(n: number) {
  return Math.round(n * 100) / 100;
}
