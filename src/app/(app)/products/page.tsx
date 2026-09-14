'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBusiness } from '@/lib/contexts/business-context';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductFormDialog } from '@/components/products/product-form-dialog';
import { BulkImportDialog } from '@/components/products/bulk-import-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Package, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types/database';

function ProductsPageInner() {
  const { currentBusiness } = useBusiness();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (searchParams.get('new') === '1') setFormOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (!currentBusiness) return;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from('products')
      .select('*')
      .eq('business_id', currentBusiness.id)
      .order('name', { ascending: true })
      .then(({ data }) => {
        setProducts(data ?? []);
        setLoading(false);
      });
  }, [currentBusiness]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
  }, [products, query]);

  const upsertLocal = (product: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      const next = exists ? prev.map((p) => (p.id === product.id ? product : p)) : [...prev, product];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  };

  const toggleActive = async (product: Product) => {
    upsertLocal({ ...product, is_active: !product.is_active });
    const supabase = createClient();
    const { error } = await supabase.from('products').update({ is_active: !product.is_active }).eq('id', product.id);
    if (error) {
      toast.error(error.message);
      upsertLocal(product);
    }
  };

  const commitPrice = async (product: Product) => {
    const draft = priceDrafts[product.id];
    if (draft === undefined) return;
    const price = parseFloat(draft);
    if (Number.isNaN(price) || price === product.unit_price) {
      setPriceDrafts((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      return;
    }
    upsertLocal({ ...product, unit_price: price });
    setPriceDrafts((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
    const supabase = createClient();
    const { error } = await supabase.from('products').update({ unit_price: price }).eq('id', product.id);
    if (error) toast.error(error.message);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    const supabase = createClient();
    const { error } = await supabase.from('products').delete().eq('id', deletingProduct.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id));
    setDeletingProduct(null);
    toast.success('Product deleted');
  };

  if (!currentBusiness) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search products…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Bulk Import</span>
        </Button>
        <Button
          onClick={() => {
            setEditingProduct(null);
            setFormOpen(true);
          }}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Product</span>
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-background">
        {loading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Package className="h-8 w-8" />
            <p className="text-sm">{query ? 'No products match your search.' : 'No products yet. Add your first one.'}</p>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="hidden sm:table-cell">Active</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => (
                <TableRow key={product.id} className={product.is_active ? '' : 'opacity-50'}>
                  <TableCell>
                    <p className="font-medium">{product.name}</p>
                    {product.description && <p className="max-w-56 truncate text-xs text-muted-foreground">{product.description}</p>}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{product.sku ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">{currentBusiness.currency === 'ZAR' ? 'R' : ''}</span>
                      <Input
                        className="h-8 w-24"
                        type="number"
                        step="0.01"
                        value={priceDrafts[product.id] ?? String(product.unit_price)}
                        onChange={(e) => setPriceDrafts((prev) => ({ ...prev, [product.id]: e.target.value }))}
                        onBlur={() => commitPrice(product)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Switch checked={product.is_active} onCheckedChange={() => toggleActive(product)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingProduct(product);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingProduct(product)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ProductFormDialog
        businessId={currentBusiness.id}
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        onSaved={upsertLocal}
      />

      <BulkImportDialog
        businessId={currentBusiness.id}
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={(imported) => setProducts((prev) => [...prev, ...imported].sort((a, b) => a.name.localeCompare(b.name)))}
      />

      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingProduct?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsPageInner />
    </Suspense>
  );
}
