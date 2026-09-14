'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Client } from '@/types/database';

interface ClientQuickAddDialogProps {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onSaved: (client: Client) => void;
}

export function ClientQuickAddDialog({ businessId, open, onOpenChange, initialName, onSaved }: ClientQuickAddDialogProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName ?? '');
      setPhone('');
    }
  }, [open, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('clients')
      .insert({ business_id: businessId, name: name.trim(), phone: phone.trim() || null })
      .select()
      .single();
    setSaving(false);

    if (error || !data) {
      toast.error(error?.message ?? 'Could not add client');
      return;
    }

    toast.success('Client added');
    onSaved(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add new client</DialogTitle>
          <DialogDescription>Just the essentials — add more details later from the Clients page.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="quick-name">Name *</Label>
            <Input id="quick-name" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quick-phone">Phone</Label>
            <Input id="quick-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="071 234 5678" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save &amp; select
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
