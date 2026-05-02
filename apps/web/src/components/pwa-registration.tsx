'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'casa-meni-pwa-dismissed-at';
const DISMISS_DAYS = 14;

export function PWARegistration() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const ageDays = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (ageDays < DISMISS_DAYS) return;
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const ua = window.navigator.userAgent;
    const iOS = /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS/.test(ua);
    setIsIOS(iOS);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    if (iOS) {
      const t = setTimeout(() => setShowIOSHint(true), 4000);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      };
    }
    return () =>
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowBanner(false);
    setShowIOSHint(false);
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowBanner(false);
    } else {
      dismiss();
    }
  };

  if (!showBanner && !showIOSHint) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 pointer-events-none sm:px-6 sm:pb-6">
      <div className="pointer-events-auto mx-auto flex max-w-md items-start gap-3 rounded-xl border border-blue-200 bg-white p-4 shadow-lg ring-1 ring-black/5">
        <div className="rounded-lg bg-blue-50 p-2">
          <Download className="h-5 w-5 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">
            Install Casa Meni
          </p>
          {isIOS ? (
            <p className="mt-0.5 text-xs text-gray-600">
              Tap the share icon in Safari, then{' '}
              <span className="font-medium">Add to Home Screen</span>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-gray-600">
              Add Casa Meni to your home screen for one-tap access, push
              notifications, and offline-friendly performance.
            </p>
          )}
          {!isIOS && (
            <button
              onClick={install}
              className="mt-2 inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Install
            </button>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded-md p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
