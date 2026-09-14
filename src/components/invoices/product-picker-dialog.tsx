'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/format';
import { Package, Search } from 'lucide-react';
import type { Product } from '@/types/database';

interface ProductPickerDialogProps {
  products: Product[];
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (product: Product) => void;
}

export function ProductPickerDialog({ products, currency, open, onOpenChange, onSelect }: ProductPickerDialogProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const active = products.filter((p) => p.is_active);
    const q = query.trim().toLowerCase();
    if (!q) return active;
    return active.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
  }, [products, query]);

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setQuery(''); }}>
      <DialogContent className="max-h-[85vh] overflow-hidden p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Add from catalog</DialogTitle>
        </DialogHeader>
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus placeholder="Type to filter products…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        <div className="grid max-h-[55vh] grid-cols-2 gap-2 overflow-y-auto p-4 pt-1 sm:grid-cols-3">
          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Package className="h-6 w-6" />
              <p className="text-sm">No matching products.</p>
            </div>
          )}
          {filtered.map((product) => (
            <button
              key={product.id}
              onClick={() => {
                onSelect(product);
                onOpenChange(false);
                setQuery('');
              }}
              className="flex flex-col items-start rounded-lg border p-3 text-left hover:border-foreground/40 hover:bg-muted/40"
            >
              <span className="line-clamp-2 text-sm font-medium">{product.name}</span>
              <span className="mt-1 text-sm font-semibold text-primary">{formatCurrency(product.unit_price, currency)}</span>
              <span className="text-xs text-muted-foreground">per {product.unit}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
