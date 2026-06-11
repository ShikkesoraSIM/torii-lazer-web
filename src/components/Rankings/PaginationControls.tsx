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
    'px-4 py-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25';
  const inactive = `${base} border border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/10 hover:text-white`;
  const active = `${base} border border-osu-pink bg-osu-pink text-white shadow-[0_6px_18px_-8px_rgba(0,0,0,0.6)]`;

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
