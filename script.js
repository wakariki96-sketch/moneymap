const menuButton = document.querySelector("[data-menu-button]");
const mobileMenu = document.querySelector("[data-mobile-menu]");


if (menuButton && mobileMenu) {
  const closeMenu = () => {
    menuButton.classList.remove("is-open");
    mobileMenu.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "メニューを開く");
  };

  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.classList.toggle("is-open");
    mobileMenu.classList.toggle("is-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "メニューを閉じる" : "メニューを開く");
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
}

const viewport = document.querySelector("[data-carousel-viewport]");
const track = document.querySelector("[data-carousel-track]");
const prevButton = document.querySelector("[data-carousel-prev]");
const nextButton = document.querySelector("[data-carousel-next]");
const dots = [...document.querySelectorAll("[data-carousel-dot]")];

if (viewport && track && prevButton && nextButton && dots.length) {
  const cards = [...track.children];
  let activeIndex = 0;

  const visibleCount = () => {
    if (window.matchMedia("(max-width: 390px)").matches) return 1;
    if (window.matchMedia("(max-width: 720px)").matches) return 2;
    return 4;
  };

  const maxIndex = () => Math.max(0, cards.length - visibleCount());

  const cardStep = () => {
    const firstCard = cards[0];
    if (!firstCard) return 0;
    const styles = getComputedStyle(track);
    const parsedGap = Number.parseFloat(styles.columnGap || styles.gap || "0");
    const gap = Number.isFinite(parsedGap) ? parsedGap : 0;
    return firstCard.getBoundingClientRect().width + gap;
  };

  const updateCarousel = (nextIndex) => {
    activeIndex = Math.min(Math.max(nextIndex, 0), maxIndex());
    track.style.transform = `translateX(${-activeIndex * cardStep()}px)`;

    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === activeIndex);
      dot.setAttribute("aria-current", index === activeIndex ? "true" : "false");
    });

    prevButton.disabled = activeIndex === 0;
    nextButton.disabled = activeIndex === maxIndex();
  };

  prevButton.addEventListener("click", () => updateCarousel(activeIndex - 1));
  nextButton.addEventListener("click", () => updateCarousel(activeIndex + 1));

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => updateCarousel(index));
  });

  viewport.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") updateCarousel(activeIndex - 1);
    if (event.key === "ArrowRight") updateCarousel(activeIndex + 1);
  });

  window.addEventListener("resize", () => updateCarousel(activeIndex));
  updateCarousel(0);
}
