'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  done: boolean;
  href: string;
  cta: string;
}

interface Checklist {
  items: ChecklistItem[];
  completed: number;
  total: number;
  percent: number;
}

const HIDE_KEY = 'casa-meni-onboarding-hidden';

export function OnboardingChecklist() {
  const { data, loading } = useApi<Checklist>('/onboarding/checklist');
  const [expanded, setExpanded] = useState(true);
  const [hidden, setHidden] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(HIDE_KEY) === 'true';
  });

  if (loading || !data || hidden) return null;
  if (data.completed === data.total) return null; // Hide once everything is done

  const dismiss = () => {
    localStorage.setItem(HIDE_KEY, 'true');
    setHidden(true);
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-600 p-1.5 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Set up Casa Meni
              </h3>
              <p className="text-xs text-gray-600">
                {data.completed} of {data.total} done · {data.percent}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded((e) => !e)}
              className="rounded-md p-1.5 text-gray-500 hover:bg-white hover:text-gray-900"
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={dismiss}
              className="text-xs font-medium text-gray-500 hover:text-gray-900"
              title="Hide setup checklist"
            >
              Dismiss
            </button>
          </div>
        </div>

        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{ width: `${data.percent}%` }}
          />
        </div>

        {expanded && (
          <ul className="mt-4 space-y-2">
            {data.items.map((item) => (
              <li
                key={item.id}
                className={`flex items-start gap-3 rounded-lg border bg-white p-3 ${
                  item.done
                    ? 'border-emerald-100'
                    : 'border-gray-200 hover:border-blue-200 hover:shadow-sm'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {item.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      item.done ? 'text-gray-500 line-through' : 'text-gray-900'
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {item.description}
                  </p>
                </div>
                {!item.done && (
                  <Link
                    href={item.href}
                    className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    {item.cta}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
