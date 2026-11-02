((root, factory) => {
  const createReplayController = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = { createReplayController };
  if (root) root.createReplayController = createReplayController;
})(typeof window === 'undefined' ? globalThis : window, () => {
  function createReplayController({ sendStep, sendLive, onChange = () => {}, setIntervalFn = setInterval, clearIntervalFn = clearInterval }) {
    let steps = [];
    let index = -1;
    let timer = null;

    function state() {
      return { steps, index, step: index >= 0 ? steps[index] : null, playing: timer !== null };
    }

    function notify() { onChange(state()); }

    function clearPlayback() {
      if (timer !== null) clearIntervalFn(timer);
      timer = null;
    }

    function show(nextIndex) {
      if (nextIndex < 0 || nextIndex >= steps.length) return;
      index = nextIndex;
      sendStep(steps[index]);
      notify();
    }

    function setSteps(nextSteps) {
      const wasPlaying = timer !== null;
      clearPlayback();
      const selectedCommit = state().step?.commit;
      steps = Array.isArray(nextSteps) ? [...nextSteps] : [];
      index = selectedCommit ? steps.findIndex((step) => step.commit === selectedCommit) : -1;
      if (index < 0) index = -1;
      if (wasPlaying) sendLive();
      notify();
    }

    function play() {
      clearPlayback();
      if (!steps.length) { notify(); return; }
      show(0);
      timer = setIntervalFn(() => {
        if (index >= steps.length - 1) {
          stop();
          return;
        }
        show(index + 1);
      }, 3000);
      notify();
    }

    function previous() {
      clearPlayback();
      show(index < 0 ? Math.max(0, steps.length - 2) : Math.max(0, index - 1));
    }

    function next() {
      clearPlayback();
      show(index < 0 ? 0 : Math.min(steps.length - 1, index + 1));
    }

    function stop() {
      clearPlayback();
      index = -1;
      sendLive();
      notify();
    }

    function receiveStep(commit) {
      const nextIndex = steps.findIndex((step) => step.commit === commit);
      if (nextIndex < 0) return;
      index = nextIndex;
      notify();
    }

    function receiveLive() {
      clearPlayback();
      index = -1;
      notify();
    }

    return { setSteps, play, previous, next, stop, receiveStep, receiveLive, getState: state };
  }

  return createReplayController;
});
