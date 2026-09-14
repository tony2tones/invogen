'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBusiness } from '@/lib/contexts/business-context';
import { InvoiceBuilder } from '@/components/invoices/invoice-builder';
import { Loader2 } from 'lucide-react';
import type { InvoiceType } from '@/types/database';

function NewInvoicePageInner() {
  const { currentBusiness, loading } = useBusiness();
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') as InvoiceType) === 'quote' ? 'quote' : 'invoice';
  const clientId = searchParams.get('clientId') ?? undefined;

  if (loading || !currentBusiness) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <InvoiceBuilder business={currentBusiness} defaultType={type} defaultClientId={clientId} />;
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={null}>
      <NewInvoicePageInner />
    </Suspense>
  );
}
