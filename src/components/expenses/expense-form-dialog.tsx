'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EXPENSE_CATEGORIES } from '@/lib/expense-categories';
import { Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Expense } from '@/types/database';

interface ExpenseFormDialogProps {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
  onSaved: (expense: Expense) => void;
}

const paymentMethods = ['Card', 'EFT', 'Cash', 'Debit order'];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = {
  category: EXPENSE_CATEGORIES[0] as string,
  vendor: '',
  description: '',
  amount: '',
  vat_amount: '',
  payment_method: '',
  expense_date: todayIso(),
};

export function ExpenseFormDialog({ businessId, open, onOpenChange, expense, onSaved }: ExpenseFormDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [removeExistingReceipt, setRemoveExistingReceipt] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReceiptFile(null);
    setRemoveExistingReceipt(false);
    setReceiptPreviewUrl(null);

    if (expense) {
      setForm({
        category: expense.category,
        vendor: expense.vendor ?? '',
        description: expense.description ?? '',
        amount: String(expense.amount),
        vat_amount: String(expense.vat_amount ?? 0),
        payment_method: expense.payment_method ?? '',
        expense_date: expense.expense_date,
      });
      if (expense.receipt_path) {
        const supabase = createClient();
        supabase.storage
          .from('expense-receipts')
          .createSignedUrl(expense.receipt_path, 60 * 5)
          .then(({ data }) => setReceiptPreviewUrl(data?.signedUrl ?? null));
      }
    } else {
      setForm(emptyForm);
    }
  }, [open, expense]);

  const handleFileChange = (file: File | null) => {
    setReceiptFile(file);
    setRemoveExistingReceipt(false);
    setReceiptPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (Number.isNaN(amount)) return;
    setSaving(true);
    const supabase = createClient();

    const payload = {
      category: form.category,
      vendor: form.vendor.trim() || null,
      description: form.description.trim() || null,
      amount,
      vat_amount: parseFloat(form.vat_amount) || 0,
      payment_method: form.payment_method || null,
      expense_date: form.expense_date,
    };

    const query = expense
      ? supabase.from('expenses').update(payload).eq('id', expense.id).select().single()
      : supabase.from('expenses').insert({ ...payload, business_id: businessId }).select().single();

    const { data, error } = await query;

    if (error || !data) {
      setSaving(false);
      toast.error(error?.message ?? 'Could not save expense');
      return;
    }

    let receiptPath = expense?.receipt_path ?? null;

    if (removeExistingReceipt && receiptPath) {
      await supabase.storage.from('expense-receipts').remove([receiptPath]);
      receiptPath = null;
    }

    if (receiptFile) {
      const ext = receiptFile.name.split('.').pop() ?? 'jpg';
      const path = `${businessId}/${data.id}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('expense-receipts').upload(path, receiptFile, { upsert: true });
      if (uploadError) {
        toast.error(`Saved, but receipt upload failed: ${uploadError.message}`);
      } else {
        receiptPath = path;
      }
    }

    if (receiptPath !== (expense?.receipt_path ?? null)) {
      await supabase.from('expenses').update({ receipt_path: receiptPath }).eq('id', data.id);
    }

    setSaving(false);
    toast.success(expense ? 'Expense updated' : 'Expense added');
    onSaved({ ...data, receipt_path: receiptPath });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? 'Edit expense' : 'Add expense'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">Amount *</Label>
              <Input
                id="exp-amount"
                type="number"
                step="0.01"
                min="0"
                required
                autoFocus
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">Date</Label>
              <Input id="exp-date" type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exp-category">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger id="exp-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-vendor">Vendor</Label>
              <Input id="exp-vendor" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="e.g. Makro" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-payment">Payment method</Label>
              <Select value={form.payment_method || undefined} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger id="exp-payment">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exp-vat">VAT included (optional)</Label>
            <Input id="exp-vat" type="number" step="0.01" min="0" value={form.vat_amount} onChange={(e) => setForm({ ...form, vat_amount: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exp-description">Notes</Label>
            <Textarea id="exp-description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label>Receipt</Label>
            {receiptPreviewUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={receiptPreviewUrl} alt="Receipt" className="h-16 w-16 rounded border object-cover" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => {
                    setReceiptPreviewUrl(null);
                    setReceiptFile(null);
                    setRemoveExistingReceipt(true);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                <Camera className="h-3.5 w-3.5" />
                Attach photo
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.amount}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
