(function() {
  'use strict';

  // ===================== Service Worker =====================
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.log('SW failed:', err));
    });
  }

  // ===================== PWA Install Banner =====================
  let deferredPrompt = null;
  const installBanner = document.getElementById('install-banner');
  const btnInstall = document.getElementById('btn-install');
  const btnCloseBanner = document.getElementById('btn-close-banner');

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
    || window.navigator.standalone 
    || document.referrer.includes('android-app://');

  if (!isStandalone) {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showInstallBanner();
    });
  }

  function showInstallBanner() {
    if (installBanner) installBanner.classList.add('show');
  }
  function hideInstallBanner() {
    if (installBanner) installBanner.classList.remove('show');
  }

  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (!deferredPrompt) {
        alert('Please use "Add to Home Screen" or "Install App" in your browser menu');
        return;
      }
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted install');
      }
      deferredPrompt = null;
      hideInstallBanner();
    });
  }

  if (btnCloseBanner) {
    btnCloseBanner.addEventListener('click', hideInstallBanner);
  }

  // ===================== Audio Engine =====================
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function now() { return audioCtx ? audioCtx.currentTime : 0; }

  function stopNodes(nodes) {
    nodes.forEach(n => {
      try { n.stop(); } catch(e){}
      try { n.disconnect(); } catch(e){}
    });
  }

  function playInhaleTone(durationSec, volume) {
    ensureAudio();
    const t0 = now();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t0);
    osc.frequency.linearRampToValueAtTime(800, t0 + durationSec);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.02);
    gain.gain.setValueAtTime(volume, t0 + durationSec - 0.02);
    gain.gain.linearRampToValueAtTime(0, t0 + durationSec);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + durationSec);
    return [osc, gain];
  }

  function playExhaleTone(durationSec, volume) {
    ensureAudio();
    const t0 = now();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t0);
    osc.frequency.linearRampToValueAtTime(200, t0 + durationSec);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.02);
    gain.gain.setValueAtTime(volume, t0 + durationSec - 0.02);
    gain.gain.linearRampToValueAtTime(0, t0 + durationSec);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + durationSec);
    return [osc, gain];
  }

  function playClick(volume) {
    ensureAudio();
    const t0 = now();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, t0);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.08);
  }

  function playDingDong(volume) {
    ensureAudio();
    const t0 = now();
    const osc1 = audioCtx.createOscillator();
    const g1 = audioCtx.createGain();
    osc1.type = 'sine'; osc1.frequency.value = 880;
    g1.gain.setValueAtTime(volume, t0);
    g1.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
    osc1.connect(g1); g1.connect(audioCtx.destination);
    osc1.start(t0); osc1.stop(t0 + 0.25);

    const osc2 = audioCtx.createOscillator();
    const g2 = audioCtx.createGain();
    osc2.type = 'sine'; osc2.frequency.value = 660;
    g2.gain.setValueAtTime(volume, t0 + 0.35);
    g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35 + 0.3);
    osc2.connect(g2); g2.connect(audioCtx.destination);
    osc2.start(t0 + 0.35); osc2.stop(t0 + 0.35 + 0.3);
  }

  function playDoubleBeep(volume) {
    ensureAudio();
    const t0 = now();
    [0, 0.13].forEach((offset) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t0 + offset);
      gain.gain.setValueAtTime(volume, t0 + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + offset + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t0 + offset);
      osc.stop(t0 + offset + 0.08);
    });
  }

  // ===================== State =====================
  const STORAGE_KEY = 'rhythmSettings_v1';

  let state = {
    inhale: 4, hold: 7, exhale: 8, exhaleHold: 0, countdown: 3, totalMin: 3,
    sound: true, vibrate: true, volume: 0.8
  };

  let appState = {
    active: false,
    paused: false,
    phase: null,
    phaseDur: 0,
    phaseElapsed: 0,
    totalElapsed: 0,
    timerId: null,
    holdClickId: null,
    audioNodes: [],
    lastTs: 0,
    lastIntRem: 0
  };

  // ===================== DOM =====================
  const $ = id => document.getElementById(id);
  const els = {
    inhaleSlider: $('inhale-slider'), inhaleVal: $('inhale-val'),
    holdSlider: $('hold-slider'), holdVal: $('hold-val'),
    exhaleSlider: $('exhale-slider'), exhaleVal: $('exhale-val'),
    exhaleHoldSlider: $('exhale-hold-slider'), exhaleHoldVal: $('exhale-hold-val'),
    countdownSlider: $('countdown-slider'), countdownVal: $('countdown-val'),
    totalSlider: $('total-slider'), totalVal: $('total-val'),
    volSlider: $('vol-slider'), volVal: $('vol-val'),
    btnSound: $('btn-sound'), btnVibrate: $('btn-vibrate'),
    btnStart: $('btn-start'), btnPause: $('btn-pause'),
    btnResume: $('btn-resume'), btnEnd: $('btn-end'),
    settings: $('settings-panel'),
    circle: $('breath-circle'),
    phaseLabel: $('phase-label'),
    countdown: $('countdown'),
    progressText: $('progress-text')
  };

  // ===================== Persistence =====================
  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        state.inhale = s.inhale ?? 4;
        state.hold = s.hold ?? 7;
        state.exhale = s.exhale ?? 8;
        state.exhaleHold = s.exhaleHold ?? 0;
        state.countdown = s.countdown ?? 3;
        state.totalMin = s.totalMin ?? 3;
        state.sound = s.sound !== false;
        state.vibrate = s.vibrate !== false;
        state.volume = (s.volume == null) ? 0.8 : s.volume;
      }
    } catch(e) {}
    syncUI();
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function syncUI() {
    els.inhaleSlider.value = state.inhale; els.inhaleVal.textContent = state.inhale.toFixed(1) + ' s';
    els.holdSlider.value = state.hold; els.holdVal.textContent = state.hold.toFixed(1) + ' s';
    els.exhaleSlider.value = state.exhale; els.exhaleVal.textContent = state.exhale.toFixed(1) + ' s';
    els.exhaleHoldSlider.value = state.exhaleHold; els.exhaleHoldVal.textContent = state.exhaleHold.toFixed(1) + ' s';
    els.countdownSlider.value = state.countdown; els.countdownVal.textContent = state.countdown + ' s';
    els.totalSlider.value = state.totalMin; els.totalVal.textContent = state.totalMin.toFixed(1) + ' min';
    els.volSlider.value = state.volume; els.volVal.textContent = Math.round(state.volume * 100) + '%';
    updateToggle(els.btnSound, state.sound, 'Sound');
    updateToggle(els.btnVibrate, state.vibrate, 'Vibrate');
  }

  function updateToggle(btn, on, name) {
    btn.textContent = name + ' ' + (on ? 'ON' : 'OFF');
    btn.classList.toggle('on', on);
    btn.classList.toggle('off', !on);
  }

  // ===================== Helpers =====================
  function fmtTime(sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function vibrate(ms) {
    if (state.vibrate && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  }

  function setCircle(radiusRatio, colorRatio, phase) {
    const minR = 20, maxR = 110;
    const r = minR + (maxR - minR) * radiusRatio;
    let rCol, gCol, bCol, a;
    if (phase === 'inhale') {
      rCol = 60 + 180 * colorRatio; gCol = 20; bCol = 20; a = 0.6 + 0.3 * colorRatio;
    } else if (phase === 'exhale') {
      rCol = 240 - 180 * colorRatio; gCol = 20; bCol = 20; a = 0.9 - 0.3 * colorRatio;
    } else if (phase === 'hold') {
      rCol = 240; gCol = 20; bCol = 20; a = 0.9;
    } else if (phase === 'exhaleHold') {
      rCol = 20; gCol = 60; bCol = 240; a = 0.9;
    } else {
      rCol = 200; gCol = 60; bCol = 60; a = 0.8;
    }
    els.circle.setAttribute('r', r.toFixed(1));
    els.circle.setAttribute('fill', `rgba(${Math.round(rCol)},${gCol},${bCol},${a.toFixed(2)})`);
  }

  function updateProgress() {
    const rem = Math.max(0, appState.phaseDur - appState.phaseElapsed);
    els.countdown.textContent = rem.toFixed(1);
    const totalSec = state.totalMin * 60;
    els.progressText.textContent = 'Total: ' + fmtTime(appState.totalElapsed + appState.phaseElapsed) + ' / ' + fmtTime(totalSec);
    if (appState.phaseDur <= 0) return;
    const prog = appState.phaseElapsed / appState.phaseDur;
    if (appState.phase === 'inhale') {
      setCircle(prog, prog, 'inhale');
    } else if (appState.phase === 'exhale') {
      setCircle(1 - prog, prog, 'exhale');
    } else if (appState.phase === 'hold') {
      setCircle(1, 1, 'hold');
    } else if (appState.phase === 'exhaleHold') {
      setCircle(1, 1, 'exhaleHold');
    }
  }

  // ===================== Training Control =====================
  function clearTimers() {
    if (appState.timerId) { clearInterval(appState.timerId); appState.timerId = null; }
    if (appState.holdClickId) { clearInterval(appState.holdClickId); appState.holdClickId = null; }
    stopNodes(appState.audioNodes);
    appState.audioNodes = [];
  }

  function setControls(active, paused) {
    if (!active) {
      els.settings.classList.remove('hidden');
      els.btnStart.classList.remove('hidden'); els.btnStart.disabled = false;
      els.btnPause.classList.add('hidden'); els.btnPause.disabled = true;
      els.btnResume.classList.add('hidden'); els.btnResume.disabled = true;
      els.btnEnd.classList.add('hidden'); els.btnEnd.disabled = true;
      els.phaseLabel.textContent = 'Ready';
      els.countdown.textContent = '0.0';
      els.progressText.textContent = 'Total: 0:00 / ' + fmtTime(state.totalMin * 60);
      setCircle(0, 0, 'ready');
    } else if (!paused) {
      els.settings.classList.add('hidden');
      els.btnStart.classList.add('hidden'); els.btnStart.disabled = true;
      els.btnPause.classList.remove('hidden'); els.btnPause.disabled = false;
      els.btnResume.classList.add('hidden'); els.btnResume.disabled = true;
      els.btnEnd.classList.remove('hidden'); els.btnEnd.disabled = false;
    } else {
      els.btnPause.classList.add('hidden'); els.btnPause.disabled = true;
      els.btnResume.classList.remove('hidden'); els.btnResume.disabled = false;
      els.btnEnd.classList.remove('hidden'); els.btnEnd.disabled = false;
      els.phaseLabel.textContent = 'Paused';
    }
  }

  // ===================== Countdown =====================
  function startCountdown() {
    const cd = state.countdown;
    if (cd <= 0) {
      vibrate(100);
      if (state.sound) playDoubleBeep(state.volume);
      startPhase('inhale');
      return;
    }
    appState.phase = 'countdown';
    appState.phaseDur = cd;
    appState.phaseElapsed = 0;
    appState.lastIntRem = cd + 1;
    appState.lastTs = performance.now();
    els.phaseLabel.textContent = 'Get Ready';
    els.countdown.textContent = cd.toFixed(1);
    setCircle(0, 0, 'ready');
    if (state.sound) playClick(state.volume);
    appState.timerId = setInterval(tickCountdown, 100);
  }

  function tickCountdown() {
    if (!appState.active || appState.paused) return;
    const nowTs = performance.now();
    const dt = (nowTs - appState.lastTs) / 1000;
    appState.lastTs = nowTs;
    appState.phaseElapsed += dt;

    const rem = Math.max(0, appState.phaseDur - appState.phaseElapsed);
    els.countdown.textContent = rem.toFixed(1);

    const intRem = Math.ceil(rem);
    if (intRem !== appState.lastIntRem && intRem > 0) {
      appState.lastIntRem = intRem;
      if (state.sound) playClick(state.volume);
    }

    if (appState.phaseElapsed >= appState.phaseDur) {
      clearTimers();
      vibrate(100);
      if (state.sound) playDoubleBeep(state.volume);
      setTimeout(() => startPhase('inhale'), 200);
    }
  }

  // ===================== Phases =====================
  function startPhase(phase) {
    appState.phase = phase;
    appState.phaseElapsed = 0;
    appState.lastTs = performance.now();
    if (phase === 'inhale') {
      appState.phaseDur = state.inhale;
      els.phaseLabel.textContent = 'Inhale';
      if (state.sound) {
        appState.audioNodes = playInhaleTone(state.inhale, state.volume);
      }
    } else if (phase === 'hold') {
      appState.phaseDur = state.hold;
      els.phaseLabel.textContent = 'Hold';
      if (state.hold > 0) {
        if (state.sound) playClick(state.volume);
        appState.holdClickId = setInterval(() => {
          if (state.sound) playClick(state.volume);
        }, 1000);
      } else {
        onPhaseFinished(); return;
      }
    } else if (phase === 'exhale') {
      appState.phaseDur = state.exhale;
      els.phaseLabel.textContent = 'Exhale';
      if (state.sound) {
        appState.audioNodes = playExhaleTone(state.exhale, state.volume);
      }
    } else if (phase === 'exhaleHold') {
      appState.phaseDur = state.exhaleHold;
      els.phaseLabel.textContent = 'Exhale Hold';
      if (state.exhaleHold > 0) {
        if (state.sound) playClick(state.volume);
        appState.holdClickId = setInterval(() => {
          if (state.sound) playClick(state.volume);
        }, 1000);
      } else {
        onPhaseFinished(); return;
      }
    }
    appState.timerId = setInterval(tick, 100);
  }

  function tick() {
    if (!appState.active || appState.paused) return;
    const nowTs = performance.now();
    const dt = (nowTs - appState.lastTs) / 1000;
    appState.lastTs = nowTs;
    appState.phaseElapsed += dt;
    if (appState.phaseElapsed >= appState.phaseDur) {
      appState.phaseElapsed = appState.phaseDur;
      updateProgress();
      onPhaseFinished();
    } else {
      updateProgress();
    }
  }

  function onPhaseFinished() {
    clearTimers();
    vibrate(80);
    if (state.sound) playDoubleBeep(state.volume);
    appState.totalElapsed += appState.phaseDur;

    const totalSec = state.totalMin * 60;
    if (appState.totalElapsed >= totalSec - 0.05) {
      finishTraining();
      return;
    }

    let next;
    if (appState.phase === 'inhale') {
      next = (state.hold > 0) ? 'hold' : 'exhale';
    } else if (appState.phase === 'hold') {
      next = 'exhale';
    } else if (appState.phase === 'exhale') {
      next = (state.exhaleHold > 0) ? 'exhaleHold' : 'inhale';
    } else if (appState.phase === 'exhaleHold') {
      next = 'inhale';
    }
    setTimeout(() => startPhase(next), 200);
  }

  function startTraining() {
    ensureAudio();
    state.inhale = parseFloat(els.inhaleSlider.value);
    state.hold = parseFloat(els.holdSlider.value);
    state.exhale = parseFloat(els.exhaleSlider.value);
    state.exhaleHold = parseFloat(els.exhaleHoldSlider.value);
    state.countdown = parseInt(els.countdownSlider.value, 10);
    state.totalMin = parseFloat(els.totalSlider.value);
    saveSettings();

    clearTimers();
    appState.active = true;
    appState.paused = false;
    appState.totalElapsed = 0;
    setControls(true, false);
    startCountdown();
  }

  function pauseTraining() {
    if (!appState.active || appState.paused) return;
    appState.paused = true;
    clearTimers();
    setControls(true, true);
  }

  function resumeTraining() {
    if (!appState.active || !appState.paused) return;
    appState.paused = false;
    appState.phaseDur = appState.phaseDur - appState.phaseElapsed;
    appState.phaseElapsed = 0;
    if (appState.phaseDur <= 0) { onPhaseFinished(); return; }
    appState.lastTs = performance.now();
    setControls(true, false);

    if (appState.phase === 'countdown') {
      appState.lastIntRem = Math.ceil(appState.phaseDur) + 1;
      if (state.sound) playClick(state.volume);
      appState.timerId = setInterval(tickCountdown, 100);
    } else {
      if (appState.phase === 'inhale' && state.sound) {
        appState.audioNodes = playInhaleTone(appState.phaseDur, state.volume);
      } else if (appState.phase === 'exhale' && state.sound) {
        appState.audioNodes = playExhaleTone(appState.phaseDur, state.volume);
      } else if (appState.phase === 'hold' && state.hold > 0) {
        if (state.sound) playClick(state.volume);
        appState.holdClickId = setInterval(() => {
          if (state.sound) playClick(state.volume);
        }, 1000);
      } else if (appState.phase === 'exhaleHold' && state.exhaleHold > 0) {
        if (state.sound) playClick(state.volume);
        appState.holdClickId = setInterval(() => {
          if (state.sound) playClick(state.volume);
        }, 1000);
      }
      appState.timerId = setInterval(tick, 100);
    }
  }

  function endTraining() {
    clearTimers();
    appState.active = false;
    appState.paused = false;
    setControls(false, false);
    els.phaseLabel.textContent = 'Ended';
  }

  function finishTraining() {
    clearTimers();
    appState.active = false;
    appState.paused = false;
    setControls(false, false);
    els.phaseLabel.textContent = 'Complete!';
    if (state.sound) playDingDong(state.volume);
    vibrate(200);
  }

  // ===================== Events =====================
  function init() {
    loadSettings();

    els.inhaleSlider.addEventListener('input', e => { state.inhale = parseFloat(e.target.value); els.inhaleVal.textContent = state.inhale.toFixed(1) + ' s'; saveSettings(); });
    els.holdSlider.addEventListener('input', e => { state.hold = parseFloat(e.target.value); els.holdVal.textContent = state.hold.toFixed(1) + ' s'; saveSettings(); });
    els.exhaleSlider.addEventListener('input', e => { state.exhale = parseFloat(e.target.value); els.exhaleVal.textContent = state.exhale.toFixed(1) + ' s'; saveSettings(); });
    els.exhaleHoldSlider.addEventListener('input', e => { state.exhaleHold = parseFloat(e.target.value); els.exhaleHoldVal.textContent = state.exhaleHold.toFixed(1) + ' s'; saveSettings(); });
    els.countdownSlider.addEventListener('input', e => { state.countdown = parseInt(e.target.value, 10); els.countdownVal.textContent = state.countdown + ' s'; saveSettings(); });
    els.totalSlider.addEventListener('input', e => { state.totalMin = parseFloat(e.target.value); els.totalVal.textContent = state.totalMin.toFixed(1) + ' min'; saveSettings(); });
    els.volSlider.addEventListener('input', e => { state.volume = parseFloat(e.target.value); els.volVal.textContent = Math.round(state.volume * 100) + '%'; saveSettings(); });

    els.btnSound.addEventListener('click', () => { state.sound = !state.sound; updateToggle(els.btnSound, state.sound, 'Sound'); saveSettings(); });
    els.btnVibrate.addEventListener('click', () => { state.vibrate = !state.vibrate; updateToggle(els.btnVibrate, state.vibrate, 'Vibrate'); saveSettings(); });

    els.btnStart.addEventListener('click', startTraining);
    els.btnPause.addEventListener('click', pauseTraining);
    els.btnResume.addEventListener('click', resumeTraining);
    els.btnEnd.addEventListener('click', endTraining);

    document.addEventListener('keydown', e => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!appState.active) startTraining();
        else if (!appState.paused) pauseTraining();
        else resumeTraining();
      }
      if (e.code === 'Escape' && appState.active) {
        endTraining();
      }
    });

    setControls(false, false);
  }

  init();
})();