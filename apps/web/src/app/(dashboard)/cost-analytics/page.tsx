'use client';

import { useApi } from '@/hooks/use-api';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';

interface PerSqft {
  propertyId: string;
  name: string;
  sqft: number;
  totalSpentCents: number;
  costPerSqftCents: number;
  renoCents: number;
  maintCents: number;
  opexCents: number;
}

interface ROI {
  summary: {
    totalRenoSpentCents: number;
    totalEquityGainCents: number;
    overallROIBps: number | null;
  };
  byCategory: {
    category: string;
    spentCents: number;
    itemCount: number;
    shareBps: number;
  }[];
}

interface Neighborhood {
  area: string;
  count: number;
  totalSqft: number;
  totalDelta: number;
  totalCost: number;
  avgPricePerSqftCents: number;
  avgEquityGainCents: number;
}

export default function CostAnalyticsPage() {
  const { data: perSqft } = useApi<PerSqft[]>('/cost-analytics/per-sqft');
  const { data: roi } = useApi<ROI>('/cost-analytics/roi-by-category');
  const { data: neigh } = useApi<Neighborhood[]>('/cost-analytics/neighborhoods');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cost Analytics"
        description="Cost-per-sqft, ROI per renovation category, and neighborhood comparisons."
      />

      {roi && (
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="text-xs text-gray-500">Renovation spend</div>
              <div className="text-2xl font-bold">
                ${(roi.summary.totalRenoSpentCents / 100).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-xs text-gray-500">Equity gain</div>
              <div className="text-2xl font-bold text-emerald-600">
                ${(roi.summary.totalEquityGainCents / 100).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-xs text-gray-500">Overall ROI</div>
              <div className="text-2xl font-bold text-blue-600">
                {roi.summary.overallROIBps != null
                  ? `${(roi.summary.overallROIBps / 100).toFixed(1)}%`
                  : '—'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Cost per sqft by property</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Property</th>
                <th>Sqft</th>
                <th className="text-right">Reno</th>
                <th className="text-right">Maint</th>
                <th className="text-right">Opex</th>
                <th className="text-right">Total</th>
                <th className="text-right">$/sqft</th>
              </tr>
            </thead>
            <tbody>
              {perSqft?.map((p) => (
                <tr key={p.propertyId} className="border-b">
                  <td className="py-2">{p.name}</td>
                  <td>{p.sqft.toLocaleString()}</td>
                  <td className="text-right">${(p.renoCents / 100).toLocaleString()}</td>
                  <td className="text-right">${(p.maintCents / 100).toLocaleString()}</td>
                  <td className="text-right">${(p.opexCents / 100).toLocaleString()}</td>
                  <td className="text-right font-bold">
                    ${(p.totalSpentCents / 100).toLocaleString()}
                  </td>
                  <td className="text-right">${(p.costPerSqftCents / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Renovation spend by category</h3>
          <div className="space-y-2">
            {roi?.byCategory.map((c) => (
              <div key={c.category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{c.category}</span>
                  <span>
                    ${(c.spentCents / 100).toLocaleString()} ({(c.shareBps / 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 rounded bg-gray-100">
                  <div
                    className="h-full rounded bg-blue-500"
                    style={{ width: `${(c.shareBps / 100).toFixed(0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Neighborhood comparison</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Area</th>
                <th>Properties</th>
                <th className="text-right">Avg $/sqft</th>
                <th className="text-right">Avg equity gain</th>
              </tr>
            </thead>
            <tbody>
              {neigh?.map((n) => (
                <tr key={n.area} className="border-b">
                  <td className="py-2">{n.area}</td>
                  <td>{n.count}</td>
                  <td className="text-right">
                    ${(n.avgPricePerSqftCents / 100).toFixed(2)}
                  </td>
                  <td className="text-right text-emerald-600">
                    ${(n.avgEquityGainCents / 100).toLocaleString()}
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
