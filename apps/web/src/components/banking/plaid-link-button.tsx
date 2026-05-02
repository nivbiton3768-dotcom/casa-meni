'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { Landmark, Loader2 } from 'lucide-react';

interface PlaidLinkButtonProps {
  onLinked?: (result: {
    accountsCreated: number;
    transactionsAdded: number;
    transactionsAutoMatched: number;
  }) => void;
  className?: string;
  disabled?: boolean;
}

export function PlaidLinkButton({
  onLinked,
  className,
  disabled,
}: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const requestLinkToken = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: { linkToken: string } }>(
        '/banking/link-token',
        { method: 'POST', body: JSON.stringify({}) },
      );
      setLinkToken(res.data.linkToken);
    } catch (err) {
      toast.error(
        'Could not start Plaid',
        err instanceof Error ? err.message : '',
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const onSuccess = useCallback(
    async (publicToken: string) => {
      setLoading(true);
      try {
        const res = await apiFetch<{
          data: {
            accountsCreated: number;
            transactionsAdded: number;
            transactionsAutoMatched: number;
          };
        }>('/banking/exchange-token', {
          method: 'POST',
          body: JSON.stringify({ publicToken }),
        });
        const r = res.data;
        toast.success(
          'Bank connected',
          r.accountsCreated > 0
            ? `${r.accountsCreated} account${r.accountsCreated === 1 ? '' : 's'} added · ${r.transactionsAdded} transactions imported${r.transactionsAutoMatched ? ` · ${r.transactionsAutoMatched} auto-matched` : ''}`
            : 'Already connected',
        );
        onLinked?.(r);
        setLinkToken(null);
      } catch (err) {
        toast.error(
          'Connect failed',
          err instanceof Error ? err.message : '',
        );
      } finally {
        setLoading(false);
      }
    },
    [onLinked, toast],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => setLinkToken(null),
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  return (
    <Button
      onClick={requestLinkToken}
      disabled={disabled || loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Landmark className="mr-2 h-4 w-4" />
      )}
      Connect bank, Cash App, or Chime
    </Button>
  );
}
