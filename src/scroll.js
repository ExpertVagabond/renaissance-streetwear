// scroll.js — Lenis smooth-scroll wired into GSAP ScrollTrigger.
// One scroll gesture drives both the DOM text reveals AND the 3D camera drift.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export function initScroll({ camera, rooms, spacing, onRoom }) {
  // ---- Lenis: interpolates the native scroll into buttery motion ----
  const lenis = new Lenis({
    duration: 1.15,            // higher = more drift/inertia
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo-out
    smoothWheel: true,
    syncTouch: true,
  });

  // Drive Lenis from GSAP's ticker so scroll + tween clocks never desync.
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // ---- Camera drift: scrub Z across the whole corridor as the user scrolls ----
  const lastZ = -(rooms.length - 1) * spacing;
  const travel = gsap.timeline({
    scrollTrigger: {
      trigger: '#scroll',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2,             // 1.2s catch-up = cinematic lag, not 1:1 snapping
    },
  });
  travel.to(camera.position, {
    z: lastZ + 11,
    ease: 'none',
  });
  // Subtle vertical sway + dolly as we pass through rooms (parallax depth).
  travel.to(camera.position, {
    y: 0.6,
    ease: 'sine.inOut',
  }, 0);

  // ---- Per-room editorial reveals ----
  const sections = gsap.utils.toArray('.room');
  sections.forEach((section, i) => {
    const kicker = section.querySelector('.kicker');
    const display = section.querySelector('.display');
    const lede = section.querySelector('.lede');

    gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 75%',
        end: 'top 20%',
        toggleActions: 'play none none reverse',
        onEnter: () => onRoom?.(i),
        onEnterBack: () => onRoom?.(i),
      },
    })
      .from(kicker, { opacity: 0, y: 24, duration: 0.8, ease: 'power3.out' })
      .from(display, { opacity: 0, y: 60, duration: 1.1, ease: 'power4.out' }, '-=0.55')
      .from(lede, { opacity: 0, y: 30, duration: 0.9, ease: 'power3.out' }, '-=0.7')
      .set([kicker, display, lede], { clearProps: 'opacity' });
  });

  // Parallax: each section's text floats at its own rate vs. the scroll.
  sections.forEach((section) => {
    gsap.to(section.querySelector('.display'), {
      yPercent: -12,
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  return lenis;
}
