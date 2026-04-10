export type ParsingStatus = "IDLE" | "PROCESSING" | "PARSED" | "FAILED";
 
export function StatusBadge({ status }: { status: ParsingStatus }) {
  const config: Record<ParsingStatus, { label: string; dot: string; text: string; bg: string }> = {
    IDLE: {
      label: "READY",
      dot: "bg-gray-500",
      text: "text-gray-400",
      bg: "bg-gray-800/50 border-gray-700/50",
    },
    PROCESSING: {
      label: "EXTRACTING",
      dot: "bg-yellow-400 animate-pulse",
      text: "text-yellow-400",
      bg: "bg-yellow-900/20 border-yellow-700/30",
    },
    PARSED: {
      label: "PARSED",
      dot: "bg-emerald-400",
      text: "text-emerald-400",
      bg: "bg-emerald-900/20 border-emerald-700/30",
    },
    FAILED: {
      label: "FAILED",
      dot: "bg-red-400",
      text: "text-red-400",
      bg: "bg-red-900/20 border-red-700/30",
    },
  };
 
  const c = config[status];
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold tracking-[0.2em] ${c.bg} ${c.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}