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
import type { Client } from '@/types/database';

interface ClientFormDialogProps {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSaved: (client: Client) => void;
}

const emptyForm = { name: '', email: '', phone: '', address: '', vat_number: '', notes: '' };

export function ClientFormDialog({ businessId, open, onOpenChange, client, onSaved }: ClientFormDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        client
          ? {
              name: client.name,
              email: client.email ?? '',
              phone: client.phone ?? '',
              address: client.address ?? '',
              vat_number: client.vat_number ?? '',
              notes: client.notes ?? '',
            }
          : emptyForm
      );
    }
  }, [open, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      vat_number: form.vat_number.trim() || null,
      notes: form.notes.trim() || null,
    };

    const query = client
      ? supabase.from('clients').update(payload).eq('id', client.id).select().single()
      : supabase.from('clients').insert({ ...payload, business_id: businessId }).select().single();

    const { data, error } = await query;
    setSaving(false);

    if (error || !data) {
      toast.error(error?.message ?? 'Could not save client');
      return;
    }

    toast.success(client ? 'Client updated' : 'Client added');
    onSaved(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Edit client' : 'Add client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="client-name">Name *</Label>
            <Input id="client-name" required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="client-phone">Phone</Label>
              <Input id="client-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-email">Email</Label>
              <Input id="client-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-address">Address</Label>
            <Input id="client-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-vat">VAT number</Label>
            <Input id="client-vat" value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-notes">Notes</Label>
            <Textarea id="client-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
