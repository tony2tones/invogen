'use client';

import { useRouter } from 'next/navigation';
import { useBusiness } from '@/lib/contexts/business-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Building2, ChevronsUpDown, Plus } from 'lucide-react';

export function BusinessSwitcher() {
  const { businesses, currentBusiness, setCurrentBusinessId } = useBusiness();
  const router = useRouter();

  if (!currentBusiness) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 max-w-[220px] justify-start gap-2 px-2">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-semibold">{currentBusiness.name}</span>
          {businesses.length > 1 && <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch business</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {businesses.map((b) => (
          <DropdownMenuItem key={b.id} onClick={() => setCurrentBusinessId(b.id)} className="gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{b.name}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/onboarding')} className="gap-2">
          <Plus className="h-4 w-4" />
          Add business
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
