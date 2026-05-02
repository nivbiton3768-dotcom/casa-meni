'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch, cn } from '@/lib/utils';
import { ArrowLeft, Send, User, Wrench } from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  body: string;
  createdAt: string;
  sender: { name: string; role: string };
}

interface WorkOrderDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  createdAt: string;
  completedAt: string | null;
  property: { name: string };
  unit: { unitNumber: string } | null;
  assignedTo: { name: string } | null;
  messages: Message[];
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  WAITING_PARTS: 'bg-orange-100 text-orange-700',
};

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const { data: order, loading, refetch } = useApi<WorkOrderDetail>(
    `/tenant-portal/work-orders/${id}`,
  );
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await apiFetch(`/tenant-portal/work-orders/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: message }),
      });
      setMessage('');
      refetch();
    } catch {
      // handled
    } finally {
      setSending(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="space-y-4 pb-6">
        <div className="h-8 w-40 animate-pulse rounded bg-gray-100" />
        <Card>
          <CardContent className="p-6">
            <div className="h-40 animate-pulse rounded bg-gray-100" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const isClosed = order.status === 'COMPLETED' || order.status === 'CANCELLED';

  return (
    <div className="space-y-6 pb-6">
      <Link
        href="/portal/maintenance"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Requests
      </Link>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 break-words md:text-2xl">{order.title}</h1>
          <p className="text-sm text-gray-500 break-words">
            {order.property.name}
            {order.unit ? ` — Unit ${order.unit.unitNumber}` : ''} ·{' '}
            Submitted {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className={cn('shrink-0 self-start whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium', statusColors[order.status])}>
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{order.description}</p>
            </CardContent>
          </Card>

          {/* Messages / Conversation */}
          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.messages.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No messages yet. Send a message to your property manager below.
                </p>
              ) : (
                order.messages.map((msg) => {
                  const isTenant = msg.sender.role === 'TENANT';
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex gap-2 sm:gap-3', isTenant && 'flex-row-reverse')}
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-medium',
                          isTenant ? 'bg-emerald-500' : 'bg-blue-500',
                        )}
                      >
                        {isTenant ? <User className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                      </div>
                      <div
                        className={cn(
                          'max-w-[80%] min-w-0 break-words rounded-xl px-3 py-2 sm:px-4 sm:py-2.5',
                          isTenant
                            ? 'bg-emerald-50 text-emerald-900'
                            : 'bg-gray-100 text-gray-900',
                        )}
                      >
                        <p className="text-xs font-medium break-words">
                          {msg.sender.name}{' '}
                          <span className="text-gray-400">
                            · {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </p>
                        <p className="mt-1 break-words text-sm">{msg.body}</p>
                      </div>
                    </div>
                  );
                })
              )}

              {!isClosed && (
                <form
                  onSubmit={handleSendMessage}
                  className="sticky bottom-0 z-10 -mx-6 -mb-6 mt-4 flex gap-2 border-t bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 lg:static lg:m-0 lg:border-0 lg:bg-transparent lg:p-0"
                >
                  <Textarea
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[44px] text-base md:text-sm"
                  />
                  <Button
                    type="submit"
                    disabled={sending || !message.trim()}
                    className="h-11 shrink-0 self-end px-3"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between gap-3 text-sm">
                <span className="shrink-0 text-gray-500">Priority</span>
                <span className="font-medium">{order.priority}</span>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <span className="shrink-0 text-gray-500">Category</span>
                <span className="font-medium">{order.category || '—'}</span>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <span className="shrink-0 text-gray-500">Assigned To</span>
                <span className="min-w-0 break-words text-right font-medium">{order.assignedTo?.name || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <span className="shrink-0 text-gray-500">Submitted</span>
                <span className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              {order.completedAt && (
                <div className="flex justify-between gap-3 text-sm">
                  <span className="shrink-0 text-gray-500">Completed</span>
                  <span className="font-medium">{new Date(order.completedAt).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
