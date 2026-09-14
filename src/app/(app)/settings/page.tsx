'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useBusiness } from '@/lib/contexts/business-context';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, Loader2, Plug, Upload } from 'lucide-react';
import { toast } from 'sonner';

const currencies = ['ZAR', 'USD', 'EUR', 'GBP'];

export default function SettingsPage() {
  const { currentBusiness, refresh } = useBusiness();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    vat_number: '',
    currency: 'ZAR',
    invoice_prefix: 'INV',
    primary_color: '#111827',
    bank_name: '',
    account_holder: '',
    account_number: '',
    branch_code: '',
    account_type: '',
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!currentBusiness) return;
    setForm({
      name: currentBusiness.name,
      email: currentBusiness.email ?? '',
      phone: currentBusiness.phone ?? '',
      address: currentBusiness.address ?? '',
      vat_number: currentBusiness.vat_number ?? '',
      currency: currentBusiness.currency,
      invoice_prefix: currentBusiness.invoice_prefix,
      primary_color: currentBusiness.primary_color,
      bank_name: currentBusiness.bank_name ?? '',
      account_holder: currentBusiness.account_holder ?? '',
      account_number: currentBusiness.account_number ?? '',
      branch_code: currentBusiness.branch_code ?? '',
      account_type: currentBusiness.account_type ?? '',
    });
    setLogoUrl(currentBusiness.logo_url);
  }, [currentBusiness]);

  if (!currentBusiness) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('business_profiles')
      .update({
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        vat_number: form.vat_number.trim() || null,
        currency: form.currency,
        invoice_prefix: form.invoice_prefix.trim() || 'INV',
        primary_color: form.primary_color,
        bank_name: form.bank_name.trim() || null,
        account_holder: form.account_holder.trim() || null,
        account_number: form.account_number.trim() || null,
        branch_code: form.branch_code.trim() || null,
        account_type: form.account_type.trim() || null,
      })
      .eq('id', currentBusiness.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Business profile updated');
    refresh();
  };

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split('.').pop() ?? 'png';
    const path = `${currentBusiness.id}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage.from('business-logos').upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('business-logos').getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    const { error } = await supabase.from('business_profiles').update({ logo_url: url }).eq('id', currentBusiness.id);
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLogoUrl(url);
    toast.success('Logo updated');
    refresh();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">No logo</span>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Upload logo
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="biz-name">Business name</Label>
              <Input id="biz-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="biz-email">Email</Label>
                <Input id="biz-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="biz-phone">Phone</Label>
                <Input id="biz-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="biz-address">Address</Label>
              <Input id="biz-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="biz-vat">VAT number</Label>
                <Input id="biz-vat" value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="biz-prefix">Invoice prefix</Label>
                <Input id="biz-prefix" value={form.invoice_prefix} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="biz-currency">Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger id="biz-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="biz-color">Brand color</Label>
                <Input id="biz-color" type="color" className="h-10 p-1" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
              </div>
            </div>
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium">Banking details</p>
              <p className="-mt-2 text-xs text-muted-foreground">Shown on invoices &amp; quotes so clients know where to pay.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bank-name">Bank name</Label>
                  <Input id="bank-name" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="FNB" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bank-holder">Account holder</Label>
                  <Input id="bank-holder" value={form.account_holder} onChange={(e) => setForm({ ...form, account_holder: e.target.value })} placeholder={form.name || 'Acme Trading CC'} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bank-account">Account number</Label>
                  <Input id="bank-account" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bank-branch">Branch code</Label>
                  <Input id="bank-branch" value={form.branch_code} onChange={(e) => setForm({ ...form, branch_code: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bank-type">Account type</Label>
                  <Input id="bank-type" value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })} placeholder="Cheque / Savings" />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Link href="/settings/integrations" className="flex items-center justify-between rounded-lg border bg-background p-4 hover:bg-muted/60">
        <div className="flex items-center gap-3">
          <Plug className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">Integrations</p>
            <p className="text-sm text-muted-foreground">QuickBooks &amp; data export</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </div>
  );
}
