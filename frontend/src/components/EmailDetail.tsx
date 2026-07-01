'use client';

import DOMPurify from 'isomorphic-dompurify';
import { format, isValid } from 'date-fns';

interface EmailFull {
  id: string;
  from: string;
  to: string;
  subject: string;
  receivedAt: string | null;
  text: string;
  html: string;
}

function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'img', 'picture', 'source', 'link'],
    FORBID_ATTR: ['src', 'srcset', 'action', 'formaction', 'style', 'background'],
    FORCE_BODY: true,
  });
}

function formatDate(receivedAt: string | null): string {
  if (!receivedAt) return 'Unknown date';
  const d = new Date(receivedAt);
  return isValid(d) ? format(d, 'MMM d, yyyy · HH:mm') : 'Unknown date';
}

function MetaRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-gray-400 w-8 shrink-0 text-right">{label}</span>
      <span className="text-gray-700 break-all min-w-0">{value}</span>
    </div>
  );
}

export function EmailDetail({ email }: { email: EmailFull }) {
  const useHtml = !email.text && !!email.html;

  return (
    <div className="min-h-full">
      {/* Email header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 md:px-8 md:py-6">
        <h2 className="text-lg font-semibold text-gray-900 leading-snug mb-4">
          {email.subject || '(no subject)'}
        </h2>
        <div className="space-y-1.5">
          <MetaRow label="From" value={email.from} />
          <MetaRow label="To" value={email.to} />
          <MetaRow label="Date" value={formatDate(email.receivedAt)} />
        </div>
      </div>

      {/* Email body */}
      <div className="px-6 py-6 md:px-8 md:py-8 max-w-3xl">
        {useHtml ? (
          <div
            className="text-sm text-gray-800 leading-relaxed [&_a]:text-blue-600 [&_a]:underline [&_p]:mb-3 [&_br]:block"
            dangerouslySetInnerHTML={{ __html: sanitize(email.html) }}
          />
        ) : email.text ? (
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
            {email.text}
          </pre>
        ) : (
          <p className="text-sm text-gray-400 italic">No message body.</p>
        )}
      </div>
    </div>
  );
}
