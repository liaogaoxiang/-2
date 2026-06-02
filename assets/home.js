const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function updateClock() {
  const now = new Date();
  document.querySelector("#currentTime").textContent = now.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function setupReveal() {
  const items = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14 });

  items.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 55, 260)}ms`;
    observer.observe(item);
  });
}

function setupMainScroll() {
  document.querySelector(".primary-action").addEventListener("click", (event) => {
    event.preventDefault();
    document.querySelector("#entry-grid").scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start"
    });
  });
}

function setupComingSoon() {
  const toast = document.querySelector("#entryToast");
  const toastModule = document.querySelector("#toastModule");
  let timer;

  document.querySelectorAll("[data-coming-soon]").forEach((card) => {
    card.addEventListener("click", (event) => {
      event.preventDefault();
      toastModule.textContent = card.dataset.comingSoon;
      toast.classList.add("is-visible");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
    });
  });
}

updateClock();
window.setInterval(updateClock, 30000);
setupReveal();
setupMainScroll();
setupComingSoon();
