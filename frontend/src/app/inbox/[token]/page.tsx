'use client';

import { useState, useEffect, useCallback, useRef, use } from 'react';
import { EmailList } from '@/components/EmailList';
import { EmailDetail } from '@/components/EmailDetail';

interface Email {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string | null;
  isUnread: boolean;
}

interface EmailFull extends Email {
  to: string;
  text: string;
  html: string;
}

const API = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

function ErrorScreen({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-2">
        <div className="text-5xl">{icon}</div>
        <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
        <p className="text-sm text-gray-500 max-w-xs">{desc}</p>
      </div>
    </div>
  );
}

export default function InboxPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const encodedToken = encodeURIComponent(token);

  const [emails, setEmails] = useState<Email[]>([]);
  const [selected, setSelected] = useState<EmailFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [credentialsInvalid, setCredentialsInvalid] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Mobile: whether to show detail pane instead of list
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const detailAbortRef = useRef<AbortController | null>(null);
  const autoSelectedRef = useRef(false);

  const fetchDetail = useCallback(async (id: string, mobile = false) => {
    detailAbortRef.current?.abort();
    const ctrl = new AbortController();
    detailAbortRef.current = ctrl;
    setDetailLoading(true);
    if (mobile) setMobileShowDetail(true);
    try {
      const res = await fetch(`${API}/api/mail/${id}?token=${encodedToken}`, { signal: ctrl.signal });
      if (!res.ok) return;
      const data = await res.json();
      if (!ctrl.signal.aborted) setSelected(data);
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('fetchDetail failed', err);
    } finally {
      if (!ctrl.signal.aborted) setDetailLoading(false);
    }
  }, [encodedToken]);

  const fetchList = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const res = await fetch(`${API}/api/mail?token=${encodedToken}`);
        if (res.status === 403) { setAccessDenied(true); return; }
        if (res.status === 500) {
          const body = await res.json().catch(() => ({}));
          if (body?.message === 'credentials_invalid') { setCredentialsInvalid(true); return; }
        }
        if (!res.ok) throw new Error();
        const data: Email[] = await res.json();
        const list = Array.isArray(data) ? data : [];
        setEmails(list);
        setStale(false);
        setLoadError(false);
        // Auto-select first email on initial load
        if (!autoSelectedRef.current && list.length > 0) {
          autoSelectedRef.current = true;
          fetchDetail(list[0].id);
        }
      } catch {
        if (silent) setStale(true);
        else setLoadError(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [encodedToken, fetchDetail],
  );

  useEffect(() => {
    fetchList();
    const intervalId = setInterval(() => fetchList(true), 15_000);
    return () => {
      clearInterval(intervalId);
      detailAbortRef.current?.abort();
    };
  }, [fetchList]);

  if (accessDenied) return <ErrorScreen icon="🚫" title="Access Denied" desc="Invalid or expired access token." />;
  if (credentialsInvalid) return <ErrorScreen icon="⚠️" title="Gmail Credentials Invalid" desc="Refresh token revoked. Check your .env configuration." />;

  const handleSelect = (id: string) => {
    fetchDetail(id, true);
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <header className="h-14 px-4 md:px-5 flex items-center justify-between border-b border-gray-200 shrink-0 bg-white z-10">
        <div className="flex items-center gap-2.5">
          {/* Back button on mobile when viewing detail */}
          {mobileShowDetail && (
            <button
              onClick={() => setMobileShowDetail(false)}
              className="md:hidden mr-1 p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <span className="text-base">📬</span>
          <span className="font-semibold text-gray-900 text-sm tracking-tight">Shared Inbox</span>
          {refreshing && (
            <span className="w-3.5 h-3.5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin inline-block" />
          )}
        </div>
        <div className="flex items-center gap-3">
          {stale && (
            <span className="hidden sm:flex text-xs text-amber-600 items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              Could not refresh
            </span>
          )}
          <button
            onClick={() => fetchList(true)}
            disabled={refreshing}
            className="text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-40 transition-colors px-2.5 py-1.5 rounded-md hover:bg-gray-100"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — hidden on mobile when viewing detail */}
        <aside
          className={`
            w-full md:w-72 xl:w-80 shrink-0 border-r border-gray-200 flex flex-col overflow-hidden bg-white
            ${mobileShowDetail ? 'hidden md:flex' : 'flex'}
          `}
        >
          <div className="flex-1 overflow-y-auto">
            <EmailList
              emails={emails}
              loading={loading}
              loadError={loadError}
              selectedId={selected?.id}
              onSelect={handleSelect}
            />
          </div>
        </aside>

        {/* Detail pane — hidden on mobile when viewing list */}
        <main
          className={`
            flex-1 overflow-y-auto bg-gray-50
            ${mobileShowDetail ? 'flex' : 'hidden md:flex'}
            flex-col
          `}
        >
          {detailLoading ? (
            <div className="flex items-center justify-center flex-1">
              <span className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin inline-block" />
            </div>
          ) : selected ? (
            <EmailDetail email={selected} />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 gap-2 text-gray-400">
              <span className="text-4xl">✉️</span>
              <p className="text-sm">Select an email to read</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
