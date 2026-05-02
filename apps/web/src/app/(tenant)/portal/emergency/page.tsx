'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { AlertTriangle, Flame, Droplets, Zap, Shield, Heart } from 'lucide-react';

const CATEGORIES = [
  { id: 'gas', label: 'Gas leak', icon: Flame, color: 'bg-red-500' },
  { id: 'water', label: 'Major water leak', icon: Droplets, color: 'bg-blue-500' },
  { id: 'electric', label: 'Electrical hazard', icon: Zap, color: 'bg-yellow-500' },
  { id: 'fire', label: 'Fire / smoke', icon: Flame, color: 'bg-red-700' },
  { id: 'intrusion', label: 'Break-in / intrusion', icon: Shield, color: 'bg-purple-500' },
  { id: 'medical', label: 'Medical emergency', icon: Heart, color: 'bg-pink-500' },
];

export default function TenantEmergencyPage() {
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const submit = async () => {
    if (!category || !description.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch('/emergency/report', {
        method: 'POST',
        body: JSON.stringify({
          category,
          description,
          severity: 'CRITICAL',
        }),
      });
      toast.success('Reported. Owners are being contacted now.');
      setDescription('');
      setCategory('');
    } catch {
      toast.error('Failed to send — call 911 if life-threatening');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader
        title={
          <span className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-7 w-7" /> Emergency Report
          </span>
        }
        description="If life-threatening, call 911 first. Then notify Casa Meni below."
      />

      <Card className="border-red-300 bg-red-50">
        <CardContent className="p-4 text-sm text-red-900">
          <strong>This page alerts owners and property managers immediately</strong> via
          email and in-app notification. It also creates an URGENT maintenance ticket.
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold">What's happening?</h3>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`rounded-lg border-2 p-4 text-left transition ${
                  category === c.id
                    ? `border-red-500 bg-red-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className={`mb-1 inline-flex h-10 w-10 items-center justify-center rounded-full ${c.color} text-white`}
                >
                  <c.icon className="h-5 w-5" />
                </div>
                <div className="font-medium text-sm">{c.label}</div>
              </button>
            ))}
          </div>

          <Input
            placeholder="Describe the emergency"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="text-base"
          />

          <Button
            onClick={submit}
            disabled={!category || !description.trim() || submitting}
            className="w-full bg-red-600 hover:bg-red-700"
            size="lg"
          >
            {submitting ? 'Sending…' : '🚨 Report Emergency'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
