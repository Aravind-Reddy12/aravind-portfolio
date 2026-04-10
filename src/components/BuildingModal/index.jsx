import { useEffect, useRef, useCallback } from 'react';
import { world, notifySubscribers } from '../../engine/WorldState';
import { useWorldState } from '../../hooks/useWorldState';
import Education  from '../sections/Education';
import Experience from '../sections/Experience';
import Projects   from '../sections/Projects';
import Hobbies    from '../sections/Hobbies';
import Contact    from '../sections/Contact';
import styles from './BuildingModal.module.css';

const SECTIONS = {
  education:  { label: 'Education',  Component: Education  },
  experience: { label: 'Experience', Component: Experience },
  projects:   { label: 'Projects',   Component: Projects   },
  hobbies:    { label: 'Hobbies',    Component: Hobbies    },
  contact:    { label: 'Contact',    Component: Contact     },
};

function closeModal() {
  world.modalOpen      = false;
  world.activeBuilding = null;
  notifySubscribers();
}

export default function BuildingModal() {
  const isOpen        = useWorldState(s => s.modalOpen);
  const buildingId    = useWorldState(s => s.activeBuilding);
  const closeBtnRef   = useRef(null);
  const panelRef      = useRef(null);

  const section = SECTIONS[buildingId] ?? null;

  // Focus close button on open
  useEffect(() => {
    if (isOpen) {
      // Defer so the slide-in animation has started
      const id = setTimeout(() => closeBtnRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  // Escape key closes
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e) {
      if (e.key === 'Escape') closeModal();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  // Focus trap
  const onKeyDown = useCallback((e) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (!first) return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }, []);

  // Don't unmount immediately — keep in DOM while animating out
  if (!isOpen && !buildingId) return null;

  const headingId = `modal-heading-${buildingId ?? 'none'}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropVisible : ''}`}
        onClick={closeModal}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onKeyDown={onKeyDown}
      >
        {/* Close button */}
        <button
          ref={closeBtnRef}
          className={styles.closeBtn}
          onClick={closeModal}
          aria-label="Close"
        >
          ×
        </button>

        {/* Content */}
        <div className={styles.content}>
          {section ? (
            <section.Component headingId={headingId} />
          ) : null}
        </div>
      </div>
    </>
  );
}
