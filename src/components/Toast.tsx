'use client';

import { useEffect, useState } from 'react';

type ToastKind = 'error' | 'success';

interface ToastState {
  kind: ToastKind;
  message: string;
  /** Bumped on every call so repeat messages restart the animation. */
  nonce: number;
}

let emit: ((state: ToastState) => void) | null = null;
let nonce = 0;

function show(kind: ToastKind, message: string) {
  nonce += 1;
  emit?.({ kind, message, nonce });
}

export function showErrorMessage(message: string) {
  show('error', message);
}

export function showSuccessMessage(message: string) {
  show('success', message);
}

/**
 * Renders Wallos's two toast elements and drives the same `.active` class the
 * upstream stylesheet animates. The 5s dismissal and 5.3s progress-bar reset
 * are upstream's timings.
 */
export function ToastHost() {
  const [state, setState] = useState<ToastState | null>(null);
  // Visibility is derived rather than stored, so showing a toast is a single
  // state update instead of one to set the message and another to reveal it.
  const [dismissedNonce, setDismissedNonce] = useState(0);
  const visible = state !== null && state.nonce !== dismissedNonce;

  useEffect(() => {
    emit = setState;
    return () => {
      emit = null;
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    const hide = setTimeout(() => setDismissedNonce(state.nonce), 5000);
    return () => clearTimeout(hide);
  }, [state]);

  const isError = state?.kind === 'error';
  const isSuccess = state?.kind === 'success';

  return (
    <>
      <div className={`toast${visible && isError ? ' active' : ''}`} id="errorToast">
        <div className="toast-content">
          <i className="fas fa-solid fa-x toast-icon error" />
          <div className="message">
            <span className="text text-1">Error</span>
            <span className="text text-2 errorMessage">{isError ? state?.message : ''}</span>
          </div>
        </div>
        <i
          className="fa-solid fa-xmark close close-error"
          onClick={() => state && setDismissedNonce(state.nonce)}
          role="button"
          aria-label="Close"
        />
        <div className={`progress error${visible && isError ? ' active' : ''}`} />
      </div>

      <div className={`toast${visible && isSuccess ? ' active' : ''}`} id="successToast">
        <div className="toast-content">
          <i className="fas fa-solid fa-check toast-icon success" />
          <div className="message">
            <span className="text text-1">Success</span>
            <span className="text text-2 successMessage">{isSuccess ? state?.message : ''}</span>
          </div>
        </div>
        <i
          className="fa-solid fa-xmark close close-success"
          onClick={() => state && setDismissedNonce(state.nonce)}
          role="button"
          aria-label="Close"
        />
        <div className={`progress success${visible && isSuccess ? ' active' : ''}`} />
      </div>
    </>
  );
}
