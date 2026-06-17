(function () {
  const swaps = Array.from(document.querySelectorAll("[data-scroll-swap]"));
  if (!swaps.length) return;

  const DEFAULT_FADE_DURATION_MS = 360;
  const DEFAULT_FINAL_HOLD_RATIO = 0.45;
  const DEFAULT_TRIGGER_LINE_RATIO = 0.88;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function getLabels(swap) {
    const track = swap.querySelector(".scroll-swap__track");
    const labels = track && track.dataset.labels
      ? track.dataset.labels.split("|").map((label) => label.trim()).filter(Boolean)
      : [];

    return labels.length ? labels : ["Before", "After"];
  }

  function getFadeDuration(swap) {
    const requestedDuration = Number.parseInt(swap.dataset.swapFadeMs, 10);
    return Number.isFinite(requestedDuration) && requestedDuration >= 0
      ? requestedDuration
      : DEFAULT_FADE_DURATION_MS;
  }

  function getFinalHoldRatio(swap, labels) {
    const requestedHold = Number.parseFloat(swap.dataset.swapFinalHold);

    if (Number.isFinite(requestedHold)) {
      return Math.min(Math.max(requestedHold, 0), 0.85);
    }

    return labels.length >= 3 ? DEFAULT_FINAL_HOLD_RATIO : 0;
  }

  function getTriggerLine(swap) {
    const requestedTrigger = Number.parseFloat(swap.dataset.swapTrigger);
    const triggerRatio = Number.isFinite(requestedTrigger)
      ? Math.min(Math.max(requestedTrigger, 0.1), 0.95)
      : DEFAULT_TRIGGER_LINE_RATIO;

    return window.innerHeight * triggerRatio;
  }

  function getProgressTrackTop(swap, trackRect) {
    const stage = swap.querySelector(".scroll-swap__stage");
    if (!stage) return trackRect.top;

    const swapRect = swap.getBoundingClientRect();
    const stickyOffset = Number.parseFloat(window.getComputedStyle(stage).top) || 0;
    const viewportStageHeight = Math.max(window.innerHeight - stickyOffset, 1);
    return Math.min(trackRect.top, swapRect.top + viewportStageHeight);
  }

  function applyFrame(swap, nextIndex) {
    const labels = getLabels(swap);
    const clampedIndex = Math.min(Math.max(nextIndex, 0), labels.length - 1);

    if (Number.parseInt(swap.dataset.swapIndex, 10) === clampedIndex) return;

    const frame = swap.querySelector(".scroll-swap__frame");
    const label = swap.querySelector(".scroll-swap__label");
    if (!frame || !label) return;

    swap.dataset.swapIndex = String(clampedIndex);
    frame.style.setProperty("--frame-progress", clampedIndex / Math.max(labels.length - 1, 1));

    if (prefersReducedMotion.matches) {
      label.innerHTML = labelText(frame, labels[clampedIndex]);
      return;
    }

    frame.classList.add("is-changing");
    window.clearTimeout(swap.__swapCleanupTimer);

    window.setTimeout(() => {
      label.innerHTML = labelText(frame, labels[clampedIndex]);
      frame.classList.remove("is-changing");
    }, Math.min(getFadeDuration(swap) / 2, 160));

    swap.__swapCleanupTimer = window.setTimeout(() => {
      frame.classList.remove("is-changing");
    }, getFadeDuration(swap));
  }

  function labelText(frame, frameLabel) {
    const title = frame.dataset.frameTitle || "Scroll-Swap";
    return `${title}<br />${frameLabel}`;
  }

  function updateSwaps() {
    swaps.forEach((swap) => {
      const track = swap.querySelector(".scroll-swap__track");
      if (!track) return;

      const labels = getLabels(swap);
      const trackRect = track.getBoundingClientRect();
      const progressTrackTop = getProgressTrackTop(swap, trackRect);
      const triggerLine = getTriggerLine(swap);
      const trackHeight = Math.max(trackRect.height, 1);
      const trackProgress = Math.min(Math.max((triggerLine - progressTrackTop) / trackHeight, 0), 0.999);
      const finalHoldRatio = getFinalHoldRatio(swap, labels);
      const transitionProgress = finalHoldRatio > 0
        ? Math.min(trackProgress / (1 - finalHoldRatio), 0.999)
        : trackProgress;
      const nextIndex = progressTrackTop <= triggerLine
        ? Math.min(Math.floor(transitionProgress * (labels.length - 1)) + 1, labels.length - 1)
        : 0;

      applyFrame(swap, nextIndex);
    });

    ticking = false;
  }

  let ticking = false;

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateSwaps);
  }

  swaps.forEach((swap) => {
    const labels = getLabels(swap);
    const requestedIndex = Number.parseInt(swap.dataset.swapIndex, 10);
    const initialIndex = Number.isInteger(requestedIndex)
      ? Math.min(Math.max(requestedIndex, 0), labels.length - 1)
      : 0;

    swap.dataset.swapIndex = "-1";
    applyFrame(swap, initialIndex);
  });

  requestUpdate();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
})();
