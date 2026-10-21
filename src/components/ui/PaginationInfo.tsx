import { cn } from '@/lib/utils';

type PaginationInfoProps = {
  total: number;
  page: number;
  perPage: number;
  className?: string;
};

export function PaginationInfo({
  total = 0,
  page = 0,
  perPage = 0,
  className = '',
}: PaginationInfoProps) {
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div className={cn('text-sm text-muted-foreground', className)}>
      {total === 0
        ? 'No results'
        : `Showing ${start}–${end} of ${total} results`}
    </div>
  );
}
export default PaginationInfo;
