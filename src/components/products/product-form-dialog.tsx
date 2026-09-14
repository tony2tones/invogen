'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types/database';

interface ProductFormDialogProps {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSaved: (product: Product) => void;
}

const emptyForm = { name: '', description: '', unit_price: '', unit: 'unit', vat_rate: '0', sku: '' };

export function ProductFormDialog({ businessId, open, onOpenChange, product, onSaved }: ProductFormDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        product
          ? {
              name: product.name,
              description: product.description ?? '',
              unit_price: String(product.unit_price),
              unit: product.unit,
              vat_rate: String(product.vat_rate),
              sku: product.sku ?? '',
            }
          : emptyForm
      );
    }
  }, [open, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(form.unit_price);
    if (!form.name.trim() || Number.isNaN(price)) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      unit_price: price,
      unit: form.unit.trim() || 'unit',
      vat_rate: parseFloat(form.vat_rate) || 0,
      sku: form.sku.trim() || null,
    };

    const query = product
      ? supabase.from('products').update(payload).eq('id', product.id).select().single()
      : supabase.from('products').insert({ ...payload, business_id: businessId }).select().single();

    const { data, error } = await query;
    setSaving(false);

    if (error || !data) {
      toast.error(error?.message ?? 'Could not save product');
      return;
    }

    toast.success(product ? 'Product updated' : 'Product added');
    onSaved(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit product' : 'Add product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="product-name">Name *</Label>
            <Input id="product-name" required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="product-price">Price *</Label>
              <Input
                id="product-price"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-unit">Unit</Label>
              <Input id="product-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="unit, hour, kg…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="product-vat">VAT rate (%)</Label>
              <Input id="product-vat" type="number" step="0.01" min="0" value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-sku">SKU</Label>
              <Input id="product-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-description">Description</Label>
            <Textarea id="product-description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim() || !form.unit_price}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
