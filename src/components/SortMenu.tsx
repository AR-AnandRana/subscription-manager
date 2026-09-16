'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppData } from './AppDataProvider';
import { SORT_OPTIONS } from '@/lib/constants';

interface Props {
  sort: string;
  onChange: (sort: string) => void;
  hideDisabled: boolean;
}

/** Sort dropdown, mirroring includes/sort_options.php. */
export function SortMenu({ sort, onChange, hideDisabled }: Props) {
  const { t } = useAppData();
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
        title={t('sort')}
        onClick={() => setOpen((value) => !value)}
      >
        <i className="fa-solid fa-arrow-down-wide-short" />
      </button>

      <div className={`sort-options${open ? ' is-open' : ''}`} id="sort-options">
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
              {t(option.labelKey)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
