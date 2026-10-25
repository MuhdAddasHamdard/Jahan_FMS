const Skeleton = ({ className = "", style }) => (
  <div className={`skeleton ${className}`} style={style} aria-hidden="true" />
);

export const SkeletonStat = () => (
  <div className="card p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-32" />
      </div>
      <Skeleton className="h-11 w-11 rounded-xl" />
    </div>
    <Skeleton className="mt-4 h-3 w-40" />
  </div>
);

export const SkeletonChart = ({ height = 260 }) => (
  <div className="card p-5">
    <Skeleton className="h-4 w-40" />
    <Skeleton className="mt-2 h-3 w-56" />
    <Skeleton className="mt-5 w-full" style={{ height }} />
  </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="card overflow-hidden">
    <div className="border-b border-[color:var(--border)] px-5 py-4">
      <Skeleton className="h-4 w-36" />
    </div>
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  </div>
);

export default Skeleton;
