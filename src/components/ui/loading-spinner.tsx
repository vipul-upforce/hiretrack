import { Spinner } from './spinner';

export function LoadingSpinner({ width }: { width?: number }) {
  return (
    <div className="flex items-center justify-center">
      <Spinner width={width} />
    </div>
  );
}
