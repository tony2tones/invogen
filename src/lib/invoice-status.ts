import type { InvoiceStatus } from '@/types/database';

export function statusBadgeVariant(status: InvoiceStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
      return 'default';
    case 'overdue':
      return 'destructive';
    case 'sent':
      return 'secondary';
    default:
      return 'outline';
  }
}
