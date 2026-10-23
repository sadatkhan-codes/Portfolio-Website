/**
 * MOHD SADAT KHAN — JOURNEY EXPERIENCE ENGINE
 * - Interactive Timeline Spine & Milestone Tracker
 * - Scroll Reveal Animations
 * - Document Certificate Lightbox / Modal
 * - Accessible Navigation & Reduced-Motion Handlers
 */

(function () {
  'use strict';

  const spineFill = document.getElementById('timeline-spine-fill');
  const spineEl = document.querySelector('.timeline-spine');
  const milestoneBlocks = document.querySelectorAll('.milestone-block');
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-full-img');
  const modalCaption = document.getElementById('modal-caption');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const backToTopBtn = document.getElementById('back-to-top-btn');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Dynamic Timeline Spine Fill on Scroll ---
  function updateTimelineSpine() {
    if (!spineFill || !spineEl || prefersReducedMotion) return;

    const spineRect = spineEl.getBoundingClientRect();
    const windowH = window.innerHeight;
    const triggerY = windowH * 0.55;

    const totalHeight = spineRect.height;
    const scrolledPastTop = triggerY - spineRect.top;

    let progressPercent = (scrolledPastTop / totalHeight) * 100;
    progressPercent = Math.max(0, Math.min(100, progressPercent));

    spineFill.style.height = `${progressPercent}%`;

    // Highlight milestone beacons as spine reaches them
    milestoneBlocks.forEach(block => {
      const beacon = block.querySelector('.milestone-beacon');
      if (beacon) {
        const beaconTop = beacon.getBoundingClientRect().top;
        if (beaconTop <= triggerY) {
          block.classList.add('active');
        } else {
          block.classList.remove('active');
        }
      }
    });
  }

  window.addEventListener('scroll', updateTimelineSpine, { passive: true });
  window.addEventListener('resize', updateTimelineSpine, { passive: true });
  updateTimelineSpine();

  // --- Scroll Reveal Animations ---
  function initScrollReveals() {
    const revealItems = document.querySelectorAll('.reveal-item');
    if (!revealItems.length) return;

    if ('IntersectionObserver' in window && !prefersReducedMotion) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
      });

      revealItems.forEach(item => observer.observe(item));
    } else {
      revealItems.forEach(item => item.classList.add('revealed'));
    }
  }

  initScrollReveals();

  // --- Document Modal / Lightbox ---
  function initDocModal() {
    if (!modal || !modalImg || !modalCloseBtn) return;

    document.querySelectorAll('[data-zoomable="true"]').forEach(frame => {
      frame.addEventListener('click', () => {
        const fullSrc = frame.getAttribute('data-full-src');
        const caption = frame.getAttribute('data-caption') || 'Academic Document';

        modalImg.src = fullSrc;
        modalCaption.textContent = caption;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      });
    });

    function closeModal() {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      modalImg.src = '';
    }

    modalCloseBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) {
        closeModal();
      }
    });
  }

  initDocModal();

  // --- Back to Top ---
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });
    });
  }

  // --- Dynamic Year ---
  const yearEl = document.getElementById('current-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();
