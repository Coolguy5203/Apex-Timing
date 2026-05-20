export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="inline-block animate-spin rounded-full border-2 border-race-border border-t-neon-purple"
      style={{ width: size, height: size }}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <LoadingSpinner size={40} />
      <p className="text-race-dim text-xs font-mono tracking-widest animate-pulse">
        LOADING DATA...
      </p>
    </div>
  );
}
