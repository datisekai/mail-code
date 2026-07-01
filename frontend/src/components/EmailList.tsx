import { formatDistanceToNow } from 'date-fns';

interface Email {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string | null;
  isUnread: boolean;
}

interface Props {
  emails: Email[];
  loading?: boolean;
  loadError?: boolean;
  selectedId?: string;
  onSelect: (id: string) => void;
}

function senderName(from: string): string {
  const match = from.match(/^([^<]+)</);
  return (match ? match[1].trim() : from) || from;
}

function senderInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
];

function avatarColor(name: string): string {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function Avatar({ name }: { name: string }) {
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${avatarColor(name)}`}>
      {senderInitial(name)}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="px-4 py-3.5 flex gap-3 items-start">
      <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="flex justify-between gap-2">
          <div className="h-3 bg-gray-100 rounded animate-pulse w-2/5" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-10 shrink-0" />
        </div>
        <div className="h-3 bg-gray-100 rounded animate-pulse w-4/5" />
        <div className="h-2.5 bg-gray-50 rounded animate-pulse w-full" />
      </div>
    </div>
  );
}

function relativeTime(receivedAt: string | null): string {
  if (!receivedAt) return '';
  try {
    return formatDistanceToNow(new Date(receivedAt), { addSuffix: false })
      .replace('about ', '')
      .replace(' minutes', 'm')
      .replace(' minute', 'm')
      .replace(' hours', 'h')
      .replace(' hour', 'h')
      .replace(' days', 'd')
      .replace(' day', 'd')
      .replace(' months', 'mo')
      .replace(' month', 'mo');
  } catch {
    return '';
  }
}

export function EmailList({ emails, loading, loadError, selectedId, onSelect }: Props) {
  if (loading) {
    return (
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-2">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm font-medium text-gray-700">Could not load inbox</p>
        <p className="text-xs text-gray-400">Check that the backend is running.</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-2">
        <span className="text-3xl">📭</span>
        <p className="text-sm font-medium text-gray-700">No emails found</p>
        <p className="text-xs text-gray-400">The inbox appears to be empty.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {emails.map((email) => {
        const name = senderName(email.from);
        const isSelected = selectedId === email.id;

        return (
          <li
            key={email.id}
            onClick={() => onSelect(email.id)}
            className={`
              px-4 py-3.5 cursor-pointer select-none transition-colors duration-100
              ${isSelected
                ? 'bg-blue-50 border-l-[3px] border-l-blue-500'
                : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'
              }
            `}
          >
            <div className="flex gap-3 items-start">
              <Avatar name={name} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center gap-2 mb-0.5">
                  <span className={`text-sm truncate ${email.isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'}`}>
                    {name}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                    {relativeTime(email.receivedAt)}
                  </span>
                </div>
                <p className={`text-sm truncate leading-snug ${email.isUnread ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                  {email.subject || '(no subject)'}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5 leading-relaxed">
                  {email.snippet}
                </p>
              </div>
              {email.isUnread && (
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
