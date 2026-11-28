import { type ReactNode } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface Props {
  total: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({ total, currentPage, onPageChange }: Props) {
  const totalPages = Math.ceil(total / 50);
  if (totalPages <= 1) return null;

  const base =
    '!px-2.5 sm:!px-4 !py-2 min-h-[38px] rounded-full font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-torii';
  const inactive = `${base} torii-btn-glass text-text-secondary hover:text-text-primary`;
  const active = `${base} torii-btn-primary`;

  const pages: ReactNode[] = [];
  const maxVisiblePages = 5;
  const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (currentPage > 1) {
    pages.push(
      <button
        key="prev"
        onClick={() => onPageChange(currentPage - 1)}
        className={inactive}
        aria-label="Previous page"
      >
        <FiChevronLeft size={18} />
      </button>
    );
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(
      <button
        key={i}
        onClick={() => onPageChange(i)}
        className={i === currentPage ? active : inactive}
        aria-current={i === currentPage ? 'page' : undefined}
      >
        {i}
      </button>
    );
  }

  if (currentPage < totalPages) {
    pages.push(
      <button
        key="next"
        onClick={() => onPageChange(currentPage + 1)}
        className={inactive}
        aria-label="Next page"
      >
        <FiChevronRight size={18} />
      </button>
    );
  }

  return <div className="flex items-center justify-center gap-2 mt-8 px-4 sm:px-0">{pages}</div>;
}
