import UniqueLoading from "./morph-loading";

export function LoadingSpinner({ w }: { w?: number }) {
  return (
    <div className="flex items-center justify-center">
      <UniqueLoading variant="morph" size="sm" />
    </div>
  );
}
