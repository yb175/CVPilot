import { JobMatchBadge } from "./JobMatchBadge";
import { useBookmarks } from "../ui/BookmarksProvider";

interface JobCardProps {
  jobId: string;
  title: string;
  company: string;
  location: string;
  locationType: "REMOTE" | "HYBRID" | "ONSITE";
  seniority: "INTERN" | "FULLTIME";
  score: string;
  reason: string;
  index: number;
  onClick: (jobId: string) => void;
}

const LOCATION_STYLES: Record<string, string> = {
  REMOTE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  HYBRID: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  ONSITE: "bg-sky-500/10 text-sky-400 border-sky-500/20",
};

const SENIORITY_STYLES: Record<string, string> = {
  INTERN: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  FULLTIME: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

export function JobCard({
  jobId,
  title,
  company,
  location,
  locationType,
  seniority,
  score,
  reason,
  index,
  onClick,
}: JobCardProps) {
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();
  const bookmarked = isBookmarked(jobId);

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (bookmarked) {
      removeBookmark(jobId);
    } else {
      addBookmark(jobId);
    }
  };

  return (
    <article
      onClick={() => onClick(jobId)}
      className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.14] transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-lg hover:scale-[1.01]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Rank number */}
      <div className="absolute top-4 left-4 sm:top-5 sm:left-5 text-[10px] font-bold text-gray-700 tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Hover accent line */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-indigo-500/0 group-hover:bg-indigo-500/60 transition-all duration-300 rounded-l-2xl" />

      <div className="pl-10 sm:pl-12 pr-4 sm:pr-5 py-4 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          {/* Left content */}
          <div className="flex-1 min-w-0">
            <h3
              className="text-base sm:text-lg font-semibold text-[#e8e8e8] group-hover:text-white transition-colors leading-snug truncate"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              {title}
            </h3>
            <p className="text-sm text-gray-400 mt-0.5">
              {company}
              <span className="text-gray-600 mx-1.5">·</span>
              {location}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <span className={`inline-flex items-center text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-md border ${LOCATION_STYLES[locationType]}`}>
                {locationType}
              </span>
              <span className={`inline-flex items-center text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-md border ${SENIORITY_STYLES[seniority]}`}>
                {seniority}
              </span>
            </div>

            {/* Reason snippet */}
            <p className="text-xs text-gray-500 mt-3 leading-relaxed line-clamp-2 max-w-xl">
              {reason}
            </p>
          </div>

          {/* Right actions */}
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            {/* Score ring */}
            <JobMatchBadge score={score} size="sm" />

            {/* Bookmark button */}
            <button
              onClick={handleBookmarkClick}
              className={`flex-shrink-0 p-2 rounded-lg transition-all duration-300 ${
                bookmarked
                  ? 'bg-status-warning/20 text-status-warning'
                  : 'bg-transparent text-gray-500 hover:text-gray-400 hover:bg-white/[0.05]'
              }`}
              title={bookmarked ? 'Remove bookmark' : 'Save bookmark'}
            >
              <svg className="w-4 h-4" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h6a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Arrow indicator */}
      <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 11L11 3M11 3H5M11 3v6" stroke="#818cf8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </article>
  );
}