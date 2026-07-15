import { useTranslation } from 'next-i18next';
import Button from '@/components/ui/Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  startIndex,
  endIndex,
}: PaginationProps) {
  const { t } = useTranslation('common');

  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between">
      <div className="text-sm text-gray-700 dark:text-gray-300">
        {t('showing') || 'Showing'} {startIndex + 1}-{endIndex} {t('of') || 'of'} {totalItems} {t('items') || 'items'}
      </div>
      <div className="flex space-x-2">
        <Button
          variant="secondary"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          {t('previous') || 'Previous'}
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          // Show first page, last page, current page, and pages around current
          if (
            page === 1 ||
            page === totalPages ||
            (page >= currentPage - 1 && page <= currentPage + 1)
          ) {
            return (
              <Button
                key={page}
                variant={currentPage === page ? 'primary' : 'secondary'}
                onClick={() => onPageChange(page)}
              >
                {page}
              </Button>
            );
          } else if (page === currentPage - 2 || page === currentPage + 2) {
            return <span key={page} className="px-2 text-gray-500">...</span>;
          }
          return null;
        })}
        <Button
          variant="secondary"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          {t('next') || 'Next'}
        </Button>
      </div>
    </div>
  );
}
