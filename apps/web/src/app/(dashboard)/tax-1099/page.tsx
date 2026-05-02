'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { apiFetch } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { FileText, Download } from 'lucide-react';

interface Row {
  vendor: { id: string; name: string; taxId: string | null; is1099Required: boolean };
  totalCents: number;
  reportable: boolean;
}

export default function Tax1099Page() {
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const { data, refetch } = useApi<Row[]>(`/tax-1099/${year}`);
  const toast = useToast();

  const snapshot = async () => {
    try {
      const res = await apiFetch<{ data: { vendors: number; reportable: number } }>(
        `/tax-1099/${year}/snapshot`,
        { method: 'POST' },
      );
      toast.success(
        'Snapshot saved',
        `${res.data.reportable} of ${res.data.vendors} vendors require 1099 filing`,
      );
    } catch {
      toast.error('Failed');
    }
  };

  const download = (vendorId: string) => {
    const token = localStorage.getItem('token');
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    fetch(`${baseUrl}/tax-1099/${year}/vendor/${vendorId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `1099-${vendorId}-${year}.pdf`;
        a.click();
      });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="1099-NEC Reporting"
        description="Vendor totals + 1099-NEC equivalent statements for year-end tax filing."
        actions={
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-24"
            />
            <Button onClick={() => refetch()}>Recalculate</Button>
            <Button onClick={snapshot} variant="secondary">
              Snapshot
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Vendor</th>
                <th>Tax ID</th>
                <th>1099 req'd?</th>
                <th className="text-right">Total paid</th>
                <th>Reportable</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.map((r) => (
                <tr key={r.vendor.id} className="border-b">
                  <td className="py-2 font-medium">{r.vendor.name}</td>
                  <td className="text-xs">
                    {r.vendor.taxId ? `***-**-${r.vendor.taxId.slice(-4)}` : (
                      <span className="text-red-600">Missing</span>
                    )}
                  </td>
                  <td>{r.vendor.is1099Required ? 'Yes' : 'No'}</td>
                  <td className="text-right font-bold">
                    ${(r.totalCents / 100).toLocaleString()}
                  </td>
                  <td>
                    {r.reportable ? (
                      <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                        Yes
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td>
                  <td>
                    {r.reportable && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => download(r.vendor.id)}
                      >
                        <Download className="mr-1 h-3 w-3" /> PDF
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
