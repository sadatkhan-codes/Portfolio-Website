/**
 * MOHD SADAT KHAN — CINEMATIC DEVELOPER PORTFOLIO
 * Core Animation Engine & Interactive Controls
 * 
 * Features:
 * - 240-Frame High-Performance Canvas Scroll Scrubbing
 * - Dynamic Vertical Parallax & Shoulders-to-Head Movement (PART 4)
 * - Seamless Ambient Fade into Lower Sections
 * - Prioritized 2-Wave Preloader (Instant Frame 0 + Keyframe Scrubbing)
 * - Typewriter Greeting in Speech Bubble (PART 5)
 * - Glassmorphic Header & Mobile Drawer Navigation (PART 7)
 * - IntersectionObserver Scroll Reveal Animations
 * - Accessibility: prefers-reduced-motion compliance
 */

(function () {
  'use strict';

  // --- Configuration ---
  const TOTAL_FRAMES = 240;
  // Multiple fallback path candidates for maximum reliability
  const PATH_CANDIDATES = [
    'frames/frame_',
    'Face_disintegrating_into_code_1080p_20261023232018_gwr_video_mvp_frames/frame_',
    'Face_disintegrating_into_digital__1080p_20261023212429_gwr_video_mvp_frames/frame_'
  ];
  const LERP_FACTOR = 0.12; // Silky-smooth momentum damping

  // --- DOM Elements ---
  const canvas = document.getElementById('animation-canvas');
  const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;
  const loaderOverlay = document.getElementById('loader-overlay');
  const loaderProgress = document.getElementById('loader-progress');
  const loaderPercentage = document.getElementById('loader-percentage');
  const siteHeader = document.querySelector('.site-header');
  const mobileToggle = document.getElementById('mobile-menu-btn');
  const mobileDrawer = document.getElementById('mobile-nav-drawer');
  const backToTopBtn = document.getElementById('back-to-top-btn');

  // --- Animation State ---
  const images = new Array(TOTAL_FRAMES + 1);
  const loadedFlags = new Uint8Array(TOTAL_FRAMES + 1); // 1 = loaded
  let totalLoadedCount = 0;
  let hasFadedLoader = false;
  let activePathPrefix = PATH_CANDIDATES[0];

  // Motion physics
  let targetFrame = 1;
  let currentFrame = 1;
  let targetParallaxY = 0;
  let currentParallaxY = 0;
  let targetOpacity = 1.0;
  let currentOpacity = 1.0;
  let lastRenderedFrameIndex = -1;
  let isRenderLoopActive = false;

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Zero-pad helper: 7 -> "007"
  function formatIndex(i) {
    return String(i).padStart(3, '0');
  }

  // High-DPI canvas resizing
  function resizeCanvas() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;

    // Buffer dimensions match exact device pixel grid
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    // Explicit CSS pixel dimensions lock internal aspect ratio to 1:1 display ratio
    // eliminating any non-uniform vertical stretching from mobile browser chrome
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    lastRenderedFrameIndex = -1;
    drawFrame(Math.round(currentFrame), currentParallaxY, currentOpacity, true);
  }

  // Outward search for nearest loaded neighbor to prevent blank flashes
  function getClosestLoadedImage(idealIdx) {
    idealIdx = Math.min(TOTAL_FRAMES, Math.max(1, idealIdx));

    if (loadedFlags[idealIdx] === 1 && images[idealIdx] && images[idealIdx].complete && images[idealIdx].naturalWidth > 0) {
      return { img: images[idealIdx], index: idealIdx };
    }

    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = idealIdx - offset;
      if (prev >= 1 && loadedFlags[prev] === 1 && images[prev] && images[prev].complete && images[prev].naturalWidth > 0) {
        return { img: images[prev], index: prev };
      }
      const next = idealIdx + offset;
      if (next <= TOTAL_FRAMES && loadedFlags[next] === 1 && images[next] && images[next].complete && images[next].naturalWidth > 0) {
        return { img: images[next], index: next };
      }
    }

    return null;
  }

  /**
   * Draw Frame to Canvas with:
   * - Proportional cover scaling
   * - Vertical parallax movement (face stays in focus, torso moves up)
   * - Smooth opacity transition into lower sections
   */
  function drawFrame(frameIdx, parallaxY, opacity, force = false) {
    if (!ctx || !canvas) return;

    const match = getClosestLoadedImage(frameIdx);
    if (!match) return;

    // Skip redundant draws if frame, parallax, and opacity haven't shifted meaningfully
    if (!force && match.index === lastRenderedFrameIndex && Math.abs(parallaxY - currentParallaxY) < 0.2 && Math.abs(opacity - currentOpacity) < 0.01) {
      return;
    }

    const img = match.img;
    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth || 1920;
    const ih = img.naturalHeight || 1080;

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const isMobile = screenWidth <= 768;
    const isTablet = screenWidth > 768 && screenWidth <= 1024;

    const hRatio = cw / iw;
    const vRatio = ch / ih;

    let scale;
    let offsetX;
    let offsetY;

    if (isMobile) {
      // Natural Mobile Portrait Framing:
      // In 1920x1080 source frames, the person's head & face are centered horizontally
      // (head width ≈ 450px, top hair y ≈ 55px, chin y ≈ 620px).
      // Scale proportionally so the entire face, ears, and neck remain in natural proportions
      // without being cropped into a narrow vertical strip.
      const mobileHeadScale = hRatio * 2.15;
      const minVerticalCover = (ch * 0.70) / ih;
      scale = Math.max(mobileHeadScale, minVerticalCover);

      const renderW = iw * scale;
      const renderH = ih * scale;
      offsetX = (cw - renderW) * 0.5;

      // Position top of hair comfortably below the greeting speech bubble:
      // on small phones (e.g. 568px height) target ~150px CSS, on modern phones ~190-195px CSS.
      const targetHairCssY = Math.min(195, Math.max(150, screenHeight * 0.23));
      offsetY = (targetHairCssY * dpr) - (55 * scale) + (parallaxY * 0.55);
    } else if (isTablet) {
      scale = Math.max(hRatio, vRatio) * 0.95;
      const renderW = iw * scale;
      const renderH = ih * scale;
      offsetX = (cw - renderW) * 0.5;
      offsetY = (ch - renderH) * 0.48 + parallaxY * 0.8;
    } else {
      // Desktop: Full cinematic cover with smooth vertical parallax
      scale = Math.max(hRatio, vRatio);
      const renderW = iw * scale;
      const renderH = ih * scale;
      offsetX = (cw - renderW) * 0.5;
      offsetY = (ch - renderH) * 0.48 + parallaxY;
    }

    // Clear background to obsidian tone
    ctx.fillStyle = '#080605';
    ctx.fillRect(0, 0, cw, ch);

    // Apply smooth opacity
    ctx.save();
    ctx.globalAlpha = Math.max(0.12, Math.min(1.0, opacity));
    ctx.drawImage(img, offsetX, offsetY, iw * scale, ih * scale);
    ctx.restore();

    lastRenderedFrameIndex = match.index;
  }

  /**
   * Scroll Synchronization:
   * Maps scroll progress through Intro -> Hero -> About -> Lower Sections.
   * - Intro & Hero: Face is prominent, disintegrates smoothly into code particles.
   * - Torso travels upward out of view while face and upper head remain visible.
   * - About onwards: Disintegrated code texture transitions into an ambient background.
   */
  function handleScroll() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const vh = window.innerHeight;

    // Header glassmorphism
    if (siteHeader) {
      if (scrollY > 35) {
        siteHeader.classList.add('scrolled');
      } else {
        siteHeader.classList.remove('scrolled');
      }
    }

    if (prefersReducedMotion) {
      targetFrame = 1;
      targetParallaxY = 0;
      targetOpacity = 0.85;
      drawFrame(1, 0, 0.85, true);
      return;
    }

    // Active animation timeline range (covers Intro, Hero, and upper About section)
    const animRange = Math.max(1, vh * 2.3);
    const scrubProgress = Math.min(1, Math.max(0, scrollY / animRange));

    // Target frame: progresses from 1 to 240 as user scrolls through Intro and Hero
    targetFrame = 1 + scrubProgress * (TOTAL_FRAMES - 1);

    // Vertical parallax: portrait moves upward at ~36% speed of foreground scroll
    targetParallaxY = -scrollY * 0.36;

    // Opacity transition: remains 1.0 throughout Intro and Hero, then gently dissolves
    // to ~0.20 as user enters deeper content sections so text remains 100% readable
    if (scrollY <= vh * 1.4) {
      targetOpacity = 1.0;
    } else if (scrollY <= vh * 3.2) {
      const fadeProgress = (scrollY - vh * 1.4) / (vh * 1.8);
      targetOpacity = 1.0 - fadeProgress * 0.82; // Fades from 1.0 down to 0.18
    } else {
      targetOpacity = 0.18; // Stays as a subtle ambient code texture
    }

    // Trigger render loop if idle
    if (!isRenderLoopActive) {
      isRenderLoopActive = true;
      requestAnimationFrame(renderLoop);
    }
  }

  // Animation Physics Loop (LERP)
  function renderLoop() {
    const frameDelta = targetFrame - currentFrame;
    const parallaxDelta = targetParallaxY - currentParallaxY;
    const opacityDelta = targetOpacity - currentOpacity;

    if (Math.abs(frameDelta) < 0.01) {
      currentFrame = targetFrame;
    } else {
      currentFrame += frameDelta * LERP_FACTOR;
    }

    if (Math.abs(parallaxDelta) < 0.2) {
      currentParallaxY = targetParallaxY;
    } else {
      currentParallaxY += parallaxDelta * LERP_FACTOR;
    }

    if (Math.abs(opacityDelta) < 0.005) {
      currentOpacity = targetOpacity;
    } else {
      currentOpacity += opacityDelta * LERP_FACTOR;
    }

    const roundedFrame = Math.round(currentFrame);
    drawFrame(roundedFrame, currentParallaxY, currentOpacity);

    // Keep loop active while interpolating
    if (Math.abs(targetFrame - currentFrame) >= 0.01 || Math.abs(targetParallaxY - currentParallaxY) >= 0.2 || Math.abs(targetOpacity - currentOpacity) >= 0.005) {
      requestAnimationFrame(renderLoop);
    } else {
      isRenderLoopActive = false;
    }
  }

  // Wheel listener: gives immediate response on trackpads and mousewheels
  window.addEventListener('wheel', () => {
    if (!isRenderLoopActive) {
      isRenderLoopActive = true;
      requestAnimationFrame(renderLoop);
    }
  }, { passive: true });

  /**
   * Smart 2-Wave Preloader:
   * Wave 1: Frame 1 immediately (renders in <50ms) + coarse keyframes every 4th frame.
   *         Allows the user to scrub smoothly through the entire animation within 1s.
   * Wave 2: All remaining intermediate frames stream in background for full 60fps.
   */
  function preloadAllFrames() {
    const keyframes = [1];
    for (let i = 5; i <= TOTAL_FRAMES; i += 4) {
      keyframes.push(i);
    }

    const keyframeSet = new Set(keyframes);
    const remainingFrames = [];
    for (let i = 2; i <= TOTAL_FRAMES; i++) {
      if (!keyframeSet.has(i)) {
        remainingFrames.push(i);
      }
    }

    const loadQueue = keyframes.concat(remainingFrames);

    function onImageLoaded(idx) {
      loadedFlags[idx] = 1;
      totalLoadedCount++;

      const pct = Math.floor((totalLoadedCount / TOTAL_FRAMES) * 100);
      if (loaderProgress) loaderProgress.style.width = `${pct}%`;
      if (loaderPercentage) loaderPercentage.textContent = `${pct}%`;

      // Render Frame 1 immediately upon decode
      if (idx === 1 && lastRenderedFrameIndex === -1) {
        drawFrame(1, 0, 1.0, true);
      } else {
        const desired = Math.round(currentFrame);
        if (Math.abs(idx - desired) < Math.abs(lastRenderedFrameIndex - desired)) {
          drawFrame(desired, currentParallaxY, currentOpacity);
        }
      }

      // Dismiss loader as soon as keyframe buffer is ready (~36 frames = full scrub coverage)
      if ((totalLoadedCount >= 36 || totalLoadedCount === TOTAL_FRAMES) && !hasFadedLoader) {
        hasFadedLoader = true;
        setTimeout(() => {
          if (loaderOverlay) loaderOverlay.classList.add('loaded');
        }, 120);
      }
    }

    // Safety fallback: ensure loader overlay fades away within 1.8s regardless of network conditions
    setTimeout(() => {
      if (!hasFadedLoader) {
        hasFadedLoader = true;
        if (loaderOverlay) loaderOverlay.classList.add('loaded');
        if (lastRenderedFrameIndex === -1) {
          drawFrame(1, 0, 1.0, true);
        }
      }
    }, 1800);

    function loadImageWithFallback(index) {
      const img = new Image();
      const num = formatIndex(index);
      let pathIdx = 0;

      function tryLoad() {
        if (pathIdx >= PATH_CANDIDATES.length) {
          totalLoadedCount++;
          return;
        }
        img.src = `${PATH_CANDIDATES[pathIdx]}${num}.jpg`;
      }

      img.onload = () => onImageLoaded(index);
      img.onerror = () => {
        pathIdx++;
        tryLoad();
      };

      images[index] = img;
      tryLoad();
    }

    // Concurrent batch loader
    let cursor = 0;
    const BATCH_SIZE = 12;

    function processBatch() {
      const end = Math.min(cursor + BATCH_SIZE, loadQueue.length);
      for (; cursor < end; cursor++) {
        loadImageWithFallback(loadQueue[cursor]);
      }
      if (cursor < loadQueue.length) {
        setTimeout(processBatch, 20);
      }
    }

    processBatch();
  }

  // Typewriter Animation for Greeting Speech Bubble (PART 5)
  function initTypewriter() {
    const textEl = document.getElementById('typewriter-text');
    if (!textEl) return;

    const messages = [
      "Hey, I'm Sadat.",
      "Welcome to my little corner of the internet."
    ];

    let msgIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let typingSpeed = 65;

    function typeTick() {
      const currentMsg = messages[msgIdx];

      if (isDeleting) {
        textEl.textContent = currentMsg.substring(0, charIdx - 1);
        charIdx--;
        typingSpeed = 30;
      } else {
        textEl.textContent = currentMsg.substring(0, charIdx + 1);
        charIdx++;
        typingSpeed = 65;
      }

      if (!isDeleting && charIdx === currentMsg.length) {
        // Pause at completion so message is comfortably read
        typingSpeed = msgIdx === 0 ? 2000 : 2800;
        isDeleting = true;
      } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        msgIdx = (msgIdx + 1) % messages.length;
        typingSpeed = 400;
      }

      setTimeout(typeTick, typingSpeed);
    }

    // Start typing after bubble entrance
    setTimeout(typeTick, 600);
  }

  // Scroll Reveal Animations (IntersectionObserver)
  function initScrollReveal() {
    const items = document.querySelectorAll('.reveal-item');
    if (!items.length) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.08,
        rootMargin: '0px 0px -30px 0px'
      });

      items.forEach(el => observer.observe(el));
    } else {
      items.forEach(el => el.classList.add('revealed'));
    }
  }

  // Navigation, Mobile Drawer & Micro-Interactions
  function initInteractions() {
    const yearEl = document.getElementById('current-year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }

    // Mobile Navigation Drawer Toggle
    if (mobileToggle && mobileDrawer) {
      mobileToggle.addEventListener('click', () => {
        const isOpen = mobileDrawer.classList.toggle('active');
        mobileToggle.setAttribute('aria-expanded', String(isOpen));
        mobileDrawer.setAttribute('aria-hidden', String(!isOpen));
      });

      mobileDrawer.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          mobileDrawer.classList.remove('active');
          mobileToggle.setAttribute('aria-expanded', 'false');
          mobileDrawer.setAttribute('aria-hidden', 'true');
        });
      });
    }

    // Back to top
    if (backToTopBtn) {
      backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });
      });
    }

    // Smooth Anchor Scroll with Fixed Header Offset
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href === '#') return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          const headerH = siteHeader ? siteHeader.offsetHeight : 0;
          const targetY = target.getBoundingClientRect().top + window.pageYOffset;
          const finalY = targetY - headerH - 12;

          window.scrollTo({
            top: finalY,
            behavior: prefersReducedMotion ? 'auto' : 'smooth'
          });
        }
      });
    });
  }

  // Initialization
  function init() {
    window.addEventListener('resize', resizeCanvas, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    resizeCanvas();
    preloadAllFrames();
    handleScroll();
    initScrollReveal();
    initInteractions();
    initTypewriter();

    // If arriving directly with a hash anchor, scroll smoothly to target after layout settles
    if (window.location.hash) {
      setTimeout(() => {
        const target = document.querySelector(window.location.hash);
        if (target) {
          const headerH = siteHeader ? siteHeader.offsetHeight : 0;
          const targetY = target.getBoundingClientRect().top + window.pageYOffset;
          window.scrollTo({
            top: targetY - headerH - 12,
            behavior: prefersReducedMotion ? 'auto' : 'smooth'
          });
        }
      }, 150);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
