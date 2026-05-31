"use client";

import { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";

interface Props {
  url: string;
  title?: string;
}

export function ShareButton({ url, title }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Try native share sheet first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title: title ?? "APEX TIMING", url });
        return;
      } catch {}
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 bg-neon-purple/10 hover:bg-neon-purple/20 border border-neon-purple/30 hover:border-neon-purple/50 text-neon-purple text-xs font-mono font-bold tracking-widest rounded-lg transition-all flex-shrink-0"
    >
      {copied ? (
        <>
          <Check size={13} className="text-neon-green" />
          <span className="text-neon-green">COPIED!</span>
        </>
      ) : (
        <>
          <Share2 size={13} />
          SHARE
        </>
      )}
    </button>
  );
}
