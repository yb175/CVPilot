interface JobMatchBadgeProps {
  score: string;
  size?: "sm" | "lg";
}

function getScoreMeta(score: number): {
  label: string;
  ringColor: string;
  textColor: string;
  bgColor: string;
  trackColor: string;
} {
  if (score >= 90)
    return {
      label: "Excellent",
      ringColor: "#34d399",
      textColor: "text-emerald-300",
      bgColor: "bg-emerald-500/10",
      trackColor: "rgba(52,211,153,0.15)",
    };
  if (score >= 80)
    return {
      label: "Strong",
      ringColor: "#818cf8",
      textColor: "text-indigo-300",
      bgColor: "bg-indigo-500/10",
      trackColor: "rgba(129,140,248,0.15)",
    };
  if (score >= 70)
    return {
      label: "Good",
      ringColor: "#fb923c",
      textColor: "text-orange-300",
      bgColor: "bg-orange-500/10",
      trackColor: "rgba(251,146,60,0.15)",
    };
  return {
    label: "Fair",
    ringColor: "#94a3b8",
    textColor: "text-slate-400",
    bgColor: "bg-slate-500/10",
    trackColor: "rgba(148,163,184,0.15)",
  };
}

export function JobMatchBadge({ score, size = "sm" }: JobMatchBadgeProps) {
  const numScore = parseInt(score, 10);
  const meta = getScoreMeta(numScore);
  const radius = size === "lg" ? 28 : 18;
  const stroke = size === "lg" ? 3 : 2.5;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (numScore / 100) * circumference;
  const svgSize = (radius + stroke + 2) * 2;

  if (size === "lg") {
    return (
      <div className="flex items-center gap-4">
        <div className="relative flex items-center justify-center" style={{ width: svgSize, height: svgSize }}>
          <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={svgSize / 2} cy={svgSize / 2} r={radius} fill="none" stroke={meta.trackColor} strokeWidth={stroke} />
            <circle
              cx={svgSize / 2} cy={svgSize / 2} r={radius}
              fill="none"
              stroke={meta.ringColor}
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute text-center">
            <span className={`text-xl font-bold ${meta.textColor}`} style={{ fontFamily: "'Georgia', serif" }}>
              {score}
            </span>
          </div>
        </div>
        <div>
          <p className={`text-sm font-semibold ${meta.textColor}`}>{meta.label} match</p>
          <p className="text-xs text-gray-500">{score}% compatibility</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center`} style={{ width: svgSize, height: svgSize }}>
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={svgSize / 2} cy={svgSize / 2} r={radius} fill="none" stroke={meta.trackColor} strokeWidth={stroke} />
        <circle
          cx={svgSize / 2} cy={svgSize / 2} r={radius}
          fill="none"
          stroke={meta.ringColor}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <span className={`absolute text-[11px] font-bold ${meta.textColor}`}>{score}</span>
    </div>
  );
}