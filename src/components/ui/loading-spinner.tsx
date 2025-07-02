export function LoadingSpinner({ w }: { w?: number }) {
  return (
    <div className={`flex items-center justify-center`}>
      <div
        className={`animate-spin rounded-full border-4 border-gray-300 border-t-primary ${w ? `w-${w}` : "w-8"} ${w ? `h-${w}` : "h-8"} `}
      ></div>
    </div>
  );
}
