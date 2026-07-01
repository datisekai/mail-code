'use client';

import { useState } from 'react';

interface OtpCandidate {
  code: string;
  score: number;
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

function detectOtps(raw: string): OtpCandidate[] {
  if (!raw) return [];
  // Cap input to prevent regex and spread issues on very large emails
  const text = (raw.includes('<') ? stripHtml(raw) : raw).slice(0, 50_000);

  const keywordRe = /\b(code|otp|verify|verification|pin|passcode)\b/gi;
  const digitRe = /(?<!\d)(\d{4,8})(?!\d)/g;

  const kwPositions: number[] = [];
  let km: RegExpExecArray | null;
  while ((km = keywordRe.exec(text)) !== null) kwPositions.push(km.index);

  const seen = new Set<string>();
  const candidates: OtpCandidate[] = [];

  let dm: RegExpExecArray | null;
  while ((dm = digitRe.exec(text)) !== null) {
    const code = dm[1];
    if (seen.has(code)) continue;
    seen.add(code);

    // Use reduce instead of spread to avoid stack overflow on large kwPositions
    const minDist =
      kwPositions.length > 0
        ? kwPositions.reduce((min, kp) => Math.min(min, Math.abs(dm!.index - kp)), Infinity)
        : Infinity;

    const score = minDist <= 80 ? Math.max(1, 10 - Math.floor(minDist / 10)) : 0;
    candidates.push({ code, score });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export function OtpBadge({ text }: { text: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const otps = detectOtps(text);
  if (otps.length === 0) return null;

  const handleCopy = async (code: string) => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard permission denied — silently ignore
    }
  };

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {otps.map(({ code }) => (
        <div
          key={code}
          className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
        >
          <span className="font-mono text-xl font-bold text-amber-800 tracking-[0.2em]">
            {code}
          </span>
          <button
            onClick={() => handleCopy(code)}
            className="text-xs bg-amber-200 hover:bg-amber-300 active:bg-amber-400 text-amber-900 px-2 py-1 rounded transition-colors"
          >
            {copied === code ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      ))}
    </div>
  );
}
