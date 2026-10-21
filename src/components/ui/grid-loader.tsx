import UniqueLoading from './morph-loading';

export function GridLoader() {
  return (
    <div className="w-full flex items-center justify-center min-h-[500px]">
      <div className="text-center">
        <UniqueLoading variant="morph" size="lg" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          Loading search results...
        </p>
      </div>
    </div>
  );
}
