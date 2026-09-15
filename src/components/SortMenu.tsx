'use client';

import { useEffect, useRef, useState } from 'react';

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'id', label: 'Last added' },
  { value: 'price', label: 'Price' },
  { value: 'next_payment', label: 'Next payment' },
  { value: 'payer_user_id', label: 'Member' },
  { value: 'category_id', label: 'Category' },
  { value: 'payment_method_id', label: 'Payment method' },
  { value: 'inactive', label: 'State', needsDisabled: true },
  { value: 'alphanumeric', label: 'Alphanumeric' },
  { value: 'renewal_type', label: 'Renewal type' },
] as const;

interface Props {
  sort: string;
  onChange: (sort: string) => void;
  hideDisabled: boolean;
}

/** Sort dropdown, mirroring includes/sort_options.php. */
export function SortMenu({ sort, onChange, hideDisabled }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div className="sort-container" ref={containerRef}>
      <button
        className="button secondary-button"
        id="sort-button"
        title="Sort"
        onClick={() => setOpen((value) => !value)}
      >
        <i className="fa-solid fa-arrow-down-wide-short" />
      </button>

      <div className="sort-options" id="sort-options" style={open ? { display: 'block' } : undefined}>
        <ul>
          {SORT_OPTIONS.filter(
            (option) => !('needsDisabled' in option && option.needsDisabled && hideDisabled),
          ).map((option) => (
            <li
              key={option.value}
              id={`sort-${option.value}`}
              className={sort === option.value ? 'selected' : undefined}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
