import Lenis from "lenis";

document.addEventListener("DOMContentLoaded", () => {
  const lenis = new Lenis();

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);

  /* For Anchor Links Scrolling */
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  for (const link of anchorLinks) {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      const t = e.currentTarget;

      if (t) {
        lenis.scrollTo(t.getAttribute("href"), { offset: -132 } ?? "");
      }
    });
  }
});
