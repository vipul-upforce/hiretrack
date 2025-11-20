import { Spinner } from "./spinner";

export function LoadingSpinner({ w }: { w?: number }) {
  return (
    <div className="flex items-center justify-center">
      <Spinner />
    </div>
  );
}
