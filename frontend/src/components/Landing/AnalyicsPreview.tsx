export function AnalyticsPreview() {
  return (
    <div className="w-full bg-[#0b0e18] border border-gray-800/60 rounded-2xl overflow-hidden shadow-2xl">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-800/60">
        {/* Sidebar toggle placeholder */}
        <div className="flex flex-col gap-[3px] mr-3">
          <span className="block w-5 h-[2px] rounded-full bg-gray-600" />
          <span className="block w-5 h-[2px] rounded-full bg-gray-600" />
          <span className="block w-5 h-[2px] rounded-full bg-gray-600" />
        </div>
        <div className="flex-1 flex gap-2">
          <div className="h-1.5 w-24 rounded-full bg-gray-700/80" />
        </div>
        <div className="flex gap-2 ml-auto">
          <span className="w-3 h-3 rounded-full bg-gray-700" />
          <span className="w-3 h-3 rounded-full bg-gray-700" />
        </div>
      </div>
 
      {/* Graph area */}
      <div className="relative flex h-52 sm:h-64 md:h-80">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between py-4 px-3 text-[10px] text-gray-600 font-mono select-none min-w-[2.5rem]">
          {["100", "75", "50", "25", "0"].map((v) => (
            <span key={v}>{v}</span>
          ))}
        </div>
 
        {/* Chart */}
        <div className="relative flex-1 overflow-hidden">
          {/* Horizontal grid lines */}
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute w-full border-t border-gray-800/50"
              style={{ top: `${i * 25}%` }}
            />
          ))}
 
          {/* SVG wave lines */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 800 300"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="fillGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="fillGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
              </linearGradient>
            </defs>
 
            {/* Fill area 1 */}
            <path
              d="M0 220 C80 210, 160 150, 240 170 C320 190, 400 130, 480 110 C560 90, 640 160, 720 140 C760 130, 780 125, 800 120 L800 300 L0 300 Z"
              fill="url(#fillGrad1)"
            />
            {/* Line 1 */}
            <path
              d="M0 220 C80 210, 160 150, 240 170 C320 190, 400 130, 480 110 C560 90, 640 160, 720 140 C760 130, 780 125, 800 120"
              fill="none"
              stroke="#6366f1"
              strokeWidth="1.5"
              opacity="0.7"
            />
 
            {/* Fill area 2 */}
            <path
              d="M0 260 C100 250, 200 200, 300 230 C380 250, 460 190, 540 175 C620 160, 700 200, 800 185 L800 300 L0 300 Z"
              fill="url(#fillGrad2)"
            />
            {/* Line 2 */}
            <path
              d="M0 260 C100 250, 200 200, 300 230 C380 250, 460 190, 540 175 C620 160, 700 200, 800 185"
              fill="none"
              stroke="#818cf8"
              strokeWidth="1"
              opacity="0.45"
            />
 
            {/* Horizontal reference line */}
            <line
              x1="0"
              y1="160"
              x2="800"
              y2="160"
              stroke="#4f5470"
              strokeWidth="1"
              strokeDasharray="6 4"
            />
          </svg>
 
          {/* Bottom bar rows (ATS score indicators) */}
          <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-1 px-2 pb-3">
            {[
              { w: "82%", color: "bg-indigo-600/60" },
              { w: "65%", color: "bg-indigo-500/40" },
              { w: "90%", color: "bg-indigo-700/50" },
              { w: "55%", color: "bg-indigo-400/30" },
            ].map((bar, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500/60 flex-shrink-0" />
                <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${bar.color}`}
                    style={{ width: bar.w }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
