import { ArrowRight } from 'lucide-react';

interface ViewAllButtonProps {
  onClick?: () => void; // connect this to a page or route later
}

export function ViewAllButton({ onClick }: ViewAllButtonProps) {
  return (
    <button type="button" className="fd-link" onClick={onClick}>
      View All <ArrowRight size={14} aria-hidden="true" />
    </button>
  );
}