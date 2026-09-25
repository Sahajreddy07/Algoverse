/**
 * AlgoVerse - Main Application Controller
 * Handles state machine, playback engine, UI interactions, and keyboard shortcuts.
 */

class AlgoApp {
  constructor() {
    this.currentAlgo = 'bubble';
    this.isPlaying = false;
    this.timer = null;
    this.speed = 1.0; // 0.25x to 3x
    this.baseDelay = 450; // base step interval in ms

    this.arraySize = 14;
    this.arrayData = [];
    this.steps = [];
    this.currentStepIndex = 0;

    // Binary search target
    this.searchTarget = null;

    // BFS/DFS start node
    this.graphStartNode = 0;

    // Visualizer instance
    this.visualizer = null;

    // Algorithm metadata registry
    this.algorithms = {
      bubble: {
        engine: window.BubbleSortEngine,
        name: 'Bubble Sort',
        category: 'Sorting',
        type: 'sorting',
        desc: 'Iteratively compares adjacent pairs and swaps them if disordered, bubbling larger values to the end.'
      },
      merge: {
        engine: window.MergeSortEngine,
        name: 'Merge Sort',
        category: 'Sorting',
        type: 'sorting',
        desc: 'Divide-and-conquer algorithm that recursively splits arrays and merges them in sorted order in O(n log n).'
      },
      binary_search: {
        engine: window.BinarySearchEngine,
        name: 'Binary Search',
        category: 'Searching',
        type: 'searching',
        desc: 'Quickly finds a target in a sorted array by repeatedly dividing the search interval in half.'
      },
      bfs: {
        engine: window.BFSEngine,
        name: 'Breadth-First Search (BFS)',
        category: 'Graph Traversal',
        type: 'graph',
        desc: 'Explores 3D graph networks layer by layer from the source using a FIFO Queue.'
      },
      dfs: {
        engine: window.DFSEngine,
        name: 'Depth-First Search (DFS)',
        category: 'Graph Traversal',
        type: 'graph',
        desc: 'Dives deeply along each graph branch using a LIFO Stack before backtracking.'
      }
    };

    this.init();
  }

  init() {
    // 1. Initialize Visualizer
    this.visualizer = new AlgoVisualizer('algo-canvas', 'canvas-tooltip');

    // 2. Initialize Hero 3D background
    if (window.HeroBackground) {
      new window.HeroBackground('hero-canvas');
    }

    // 3. Bind UI Events & Controls
    this.bindEvents();

    // 4. Generate initial data & load default algorithm
    this.generateRandomData();
    this.loadAlgorithm('bubble');

    // 5. Scroll listener for sticky glass navbar
    this.setupNavbarScroll();

    // 6. Scroll-triggered card animations via IntersectionObserver
    this.setupScrollAnimations();

    // 7. Active nav link tracking via IntersectionObserver
    this.setupActiveNavTracking();
  }

  setupNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  setupScrollAnimations() {
    // Add initial hidden state to animated elements
    const animTargets = document.querySelectorAll('.how-card, .about-highlight-box, .panel-card, .visualizer-card');
    animTargets.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(28px)';
      el.style.transition = `opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.06}s, transform 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.06}s`;
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    animTargets.forEach(el => observer.observe(el));
  }

  setupActiveNavTracking() {
    const sections = document.querySelectorAll('section[id], header[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { threshold: 0.35 });

    sections.forEach(s => sectionObserver.observe(s));
  }

  bindEvents() {
    // 1. Algorithm Selector Tabs
    const tabBtns = document.querySelectorAll('.algo-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const algoKey = btn.dataset.algo;
        if (algoKey && this.algorithms[algoKey]) {
          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.loadAlgorithm(algoKey);
        }
      });
    });

    // 2. Playback Controls
    const playBtn = document.getElementById('btn-play');
    if (playBtn) {
      playBtn.addEventListener('click', () => this.togglePlay());
    }

    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetPlayback());
    }

    const stepForwardBtn = document.getElementById('btn-step-forward');
    if (stepForwardBtn) {
      stepForwardBtn.addEventListener('click', () => this.stepForward());
    }

    const stepBackwardBtn = document.getElementById('btn-step-back');
    if (stepBackwardBtn) {
      stepBackwardBtn.addEventListener('click', () => this.stepBackward());
    }

    const shuffleBtn = document.getElementById('btn-shuffle');
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', () => {
        this.generateRandomData();
        this.loadAlgorithm(this.currentAlgo);
      });
    }

    // 3. Speed Slider
    const speedSlider = document.getElementById('speed-slider');
    const speedBadge = document.getElementById('speed-badge');
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        this.speed = parseFloat(e.target.value);
        if (speedBadge) {
          speedBadge.textContent = `${this.speed.toFixed(1)}x`;
        }
      });
    }

    // 4. 2D / 3D Toggle
    const btn2D = document.getElementById('view-mode-2d');
    const btn3D = document.getElementById('view-mode-3d');
    if (btn2D && btn3D) {
      btn2D.addEventListener('click', () => {
        btn2D.classList.add('active');
        btn3D.classList.remove('active');
        this.visualizer.toggle2D3D('2D');
      });
      btn3D.addEventListener('click', () => {
        btn3D.classList.add('active');
        btn2D.classList.remove('active');
        this.visualizer.toggle2D3D('3D');
      });
    }

    // 5. Orbit Reset Button
    const orbitResetBtn = document.getElementById('btn-reset-orbit');
    if (orbitResetBtn) {
      orbitResetBtn.addEventListener('click', () => {
        this.visualizer.resetCamera();
      });
    }

    // 6. Audio FX Mute / Unmute Toggle (Controls Bar 🔊/🔇 + Navbar Sync)
    this.updateAudioUI = () => {
      const isMuted = window.soundEngine ? window.soundEngine.isMuted : false;
      const allAudioBtns = document.querySelectorAll('[data-audio-toggle]');

      allAudioBtns.forEach(btn => {
        btn.classList.toggle('active', !isMuted);
        btn.classList.toggle('muted', isMuted);
        btn.setAttribute('aria-pressed', String(!isMuted));
        btn.setAttribute('title', isMuted ? 'Unmute Sound (M)' : 'Mute Sound (M)');

        // Update speaker emoji if present
        const speakerSpan = btn.querySelector('.speaker-icon');
        if (speakerSpan) {
          speakerSpan.textContent = isMuted ? '🔇' : '🔊';
        }
      });
    };

    const allAudioBtns = document.querySelectorAll('[data-audio-toggle]');
    this.updateAudioUI();

    allAudioBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.soundEngine) {
          window.soundEngine.toggleMute();
          this.updateAudioUI();
        }
      });
    });

    // 7. Binary Search Target Input
    const targetInput = document.getElementById('search-target-input');
    if (targetInput) {
      targetInput.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val)) {
          this.searchTarget = val;
          this.prepareSteps();
          this.resetPlayback();
        }
      });
    }

    // 8. Custom Data Modal
    const customDataBtn = document.getElementById('btn-custom-data');
    const modalBackdrop = document.getElementById('custom-data-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const applyCustomBtn = document.getElementById('btn-apply-custom');

    if (customDataBtn && modalBackdrop) {
      customDataBtn.addEventListener('click', () => {
        modalBackdrop.classList.add('open');
      });
    }
    if (modalCloseBtn && modalBackdrop) {
      modalCloseBtn.addEventListener('click', () => {
        modalBackdrop.classList.remove('open');
      });
    }
    if (applyCustomBtn && modalBackdrop) {
      applyCustomBtn.addEventListener('click', () => {
        const textarea = document.getElementById('custom-array-input');
        if (textarea && textarea.value) {
          const parsed = textarea.value.split(/[\s,]+/).map(Number).filter(n => !isNaN(n) && n > 0 && n <= 100);
          if (parsed.length >= 4) {
            this.arrayData = parsed.slice(0, 24);
            modalBackdrop.classList.remove('open');
            this.loadAlgorithm(this.currentAlgo);
          } else {
            alert('Please enter at least 4 numbers between 1 and 100.');
          }
        }
      });
    }

    // 9. Info / Complexity Deep Dive Modal
    const infoBtn = document.getElementById('btn-info-modal');
    const infoModal = document.getElementById('algo-info-modal');
    const infoCloseBtn = document.getElementById('info-modal-close');
    if (infoBtn && infoModal) {
      infoBtn.addEventListener('click', () => {
        this.populateInfoModal();
        infoModal.classList.add('open');
      });
    }
    if (infoCloseBtn && infoModal) {
      infoCloseBtn.addEventListener('click', () => {
        infoModal.classList.remove('open');
      });
    }

    // Close modals on clicking backdrop
    [modalBackdrop, infoModal].forEach(m => {
      if (m) {
        m.addEventListener('click', (e) => {
          if (e.target === m) m.classList.remove('open');
        });
      }
    });

    // 10. Click-to-Inspect 3D Elements
    window.addEventListener('algo-element-inspected', (e) => {
      const data = e.detail;
      if (!data) return;

      if (data.type === 'cube' && this.currentAlgo === 'binary_search') {
        const input = document.getElementById('search-target-input');
        if (input) input.value = data.value;
        this.searchTarget = data.value;
        this.prepareSteps();
        this.resetPlayback();
      } else if (data.type === 'graph_node' && (this.currentAlgo === 'bfs' || this.currentAlgo === 'dfs')) {
        this.graphStartNode = data.id;
        this.prepareSteps();
        this.resetPlayback();
      }
    });

    // 11. Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (window.soundEngine) window.soundEngine.initContext();
        this.togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.stepForward(); // initContext called inside
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.stepBackward(); // initContext called inside
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        this.resetPlayback(); // initContext & playReset called inside
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        if (window.soundEngine) {
          window.soundEngine.toggleMute();
          if (this.updateAudioUI) this.updateAudioUI();
        }
      }
    });

    // 12. "Start Visualizing" Smooth Scroll CTA
    const startCta = document.getElementById('hero-cta-btn');
    if (startCta) {
      startCta.addEventListener('click', (e) => {
        e.preventDefault();
        const visualizerSection = document.getElementById('visualizer');
        if (visualizerSection) {
          visualizerSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // 13. Back to Top Smooth Scroll
    const backToTopBtn = document.getElementById('btn-back-to-top');
    if (backToTopBtn) {
      backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  generateRandomData() {
    this.arrayData = [];
    const count = this.arraySize;
    for (let i = 0; i < count; i++) {
      this.arrayData.push(Math.floor(Math.random() * 85) + 12);
    }
  }

  loadAlgorithm(algoKey) {
    this.pause();
    this.currentAlgo = algoKey;
    const algo = this.algorithms[algoKey];
    if (!algo) return;

    // Update Header & Descriptions
    const titleEl = document.getElementById('canvas-algo-title');
    if (titleEl) titleEl.textContent = algo.name;

    const bannerDesc = document.getElementById('algo-desc-banner');
    if (bannerDesc) {
      bannerDesc.innerHTML = `<strong>${algo.name}:</strong> ${algo.desc}`;
    }

    // Toggle Binary Search Target Input visibility
    const targetGroup = document.getElementById('search-target-group');
    if (targetGroup) {
      if (algoKey === 'binary_search') {
        targetGroup.classList.add('visible');
        const sorted = [...this.arrayData].sort((a, b) => a - b);
        this.searchTarget = sorted[Math.floor(sorted.length * 0.65)];
        const input = document.getElementById('search-target-input');
        if (input) input.value = this.searchTarget;
      } else {
        targetGroup.classList.remove('visible');
      }
    }

    // Toggle Live Queue/Stack HUD panel for BFS/DFS
    const hudPanel = document.getElementById('graph-hud-panel');
    if (hudPanel) {
      if (algo.type === 'graph') {
        hudPanel.classList.remove('hidden');
        const hudTitle = document.getElementById('hud-title');
        if (hudTitle) {
          hudTitle.textContent = algoKey === 'bfs' ? 'Live FIFO Queue' : 'Live LIFO Stack';
        }
      } else {
        hudPanel.classList.add('hidden');
      }
    }

    // Update Pseudocode display
    this.renderPseudocode(algo.engine.pseudocode);

    // Update Complexity Badges
    this.updateComplexityBadges(algo.engine);

    // Generate Steps & Build 3D objects
    this.prepareSteps();

    // Reset to step 0
    this.applyStep(0);
  }

  prepareSteps() {
    const algo = this.algorithms[this.currentAlgo];
    if (!algo) return;

    if (algo.type === 'sorting') {
      this.steps = algo.engine.generateSteps(this.arrayData);
      this.visualizer.buildSortingBars(this.arrayData);
    } else if (this.currentAlgo === 'binary_search') {
      const sorted = [...this.arrayData].sort((a, b) => a - b);
      this.steps = algo.engine.generateSteps(sorted, this.searchTarget);
      this.visualizer.buildBinarySearchCubes(sorted);
    } else if (algo.type === 'graph') {
      this.steps = algo.engine.generateSteps(null, this.graphStartNode);
      this.visualizer.build3DGraph(algo.engine.defaultGraph || window.BFSEngine.defaultGraph);
    }

    this.currentStepIndex = 0;
  }

  renderPseudocode(codeLines = []) {
    const container = document.getElementById('pseudocode-lines');
    if (!container) return;
    container.innerHTML = '';
    codeLines.forEach((line, idx) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'code-line';
      lineEl.dataset.line = idx + 1;
      lineEl.textContent = `${(idx + 1).toString().padStart(2, ' ')}  ${line}`;
      container.appendChild(lineEl);
    });
  }

  highlightCodeLine(lineNum) {
    const container = document.getElementById('pseudocode-lines');
    const lines = document.querySelectorAll('.code-line');
    let activeLine = null;

    lines.forEach(l => {
      if (parseInt(l.dataset.line, 10) === lineNum) {
        l.classList.add('active');
        activeLine = l;
      } else {
        l.classList.remove('active');
      }
    });

    // Scroll ONLY inside the pseudocode block — never scrolls the page
    if (activeLine && container) {
      const blockParent = container.closest('.pseudocode-block');
      if (blockParent) {
        const lineTop = activeLine.offsetTop;
        const lineH = activeLine.offsetHeight;
        const parentH = blockParent.clientHeight;
        const scrollTarget = lineTop - (parentH / 2) + (lineH / 2);
        blockParent.scrollTop = Math.max(0, scrollTarget);
      }
    }
  }

  updateComplexityBadges(engine) {
    const timeBest = document.getElementById('comp-time-best');
    const timeAvg = document.getElementById('comp-time-avg');
    const timeWorst = document.getElementById('comp-time-worst');
    const spaceVal = document.getElementById('comp-space');

    if (timeBest) timeBest.textContent = engine.timeComplexity.best;
    if (timeAvg) timeAvg.textContent = engine.timeComplexity.average;
    if (timeWorst) timeWorst.textContent = engine.timeComplexity.worst;
    if (spaceVal) spaceVal.textContent = engine.spaceComplexity;
  }

  // ==========================================================================
  // Playback Control Machine
  // ==========================================================================

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (this.isPlaying) return;
    // Single shared AudioContext initialized/resumed on user click gesture
    if (window.soundEngine) {
      window.soundEngine.initContext();
    }
    // If at the end, restart from step 0
    if (this.currentStepIndex >= this.steps.length - 1) {
      this.resetPlayback();
    }
    this.isPlaying = true;
    this.updatePlayButtonUI(true);
    this.runPlaybackLoop();
  }

  pause() {
    this.isPlaying = false;
    clearTimeout(this.timer);
    this.updatePlayButtonUI(false);
  }

  resetPlayback() {
    this.pause();
    // Play low, short thud tone on Reset
    if (window.soundEngine) {
      window.soundEngine.initContext();
      window.soundEngine.playReset();
    }
    this.currentStepIndex = 0;
    this.prepareSteps();
    this.applyStep(0);
  }

  stepForward() {
    this.pause();
    if (window.soundEngine) window.soundEngine.initContext();
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.applyStep(this.currentStepIndex);
    }
  }

  stepBackward() {
    this.pause();
    if (window.soundEngine) window.soundEngine.initContext();
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.applyStep(this.currentStepIndex);
    }
  }

  runPlaybackLoop() {
    if (!this.isPlaying) return;

    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.applyStep(this.currentStepIndex);

      const delay = Math.max(70, this.baseDelay / this.speed);
      this.timer = setTimeout(() => {
        this.runPlaybackLoop();
      }, delay);
    } else {
      this.pause();
    }
  }

  applyStep(stepIdx) {
    if (stepIdx < 0 || stepIdx >= this.steps.length) return;
    const step = this.steps[stepIdx];

    // 1. Update 3D Visualizer
    const algo = this.algorithms[this.currentAlgo];
    if (algo.type === 'sorting') {
      this.visualizer.updateSortingState(step);
    } else if (this.currentAlgo === 'binary_search') {
      this.visualizer.updateBinarySearchState(step);
    } else if (algo.type === 'graph') {
      this.visualizer.updateGraphState(step);
    }

    // 2. Update Narration (fade transition, no layout reflow)
    const narrationText = document.getElementById('narration-text');
    if (narrationText) {
      narrationText.style.opacity = '0';
      // Use requestAnimationFrame to batch the DOM update
      requestAnimationFrame(() => {
        narrationText.innerHTML = step.narration || '&nbsp;';
        narrationText.style.opacity = '1';
      });
    }

    // 3. Highlight Pseudocode Line
    if (step.codeLine) {
      this.highlightCodeLine(step.codeLine);
    }

    // 4. Update Metrics Counters
    if (step.metrics) {
      const compEl = document.getElementById('metric-comparisons');
      const swapEl = document.getElementById('metric-swaps');
      const opsEl = document.getElementById('metric-operations');

      if (compEl) compEl.textContent = step.metrics.comparisons;
      if (swapEl) swapEl.textContent = step.metrics.swaps;
      if (opsEl) opsEl.textContent = step.metrics.operations;

      // Status Badge
      const statusBadge = document.getElementById('algo-status-badge');
      if (statusBadge && step.metrics.status) {
        statusBadge.textContent = step.metrics.status;
        statusBadge.className = `algo-status-badge status-${step.metrics.status.toLowerCase()}`;
      }
    }

    // 5. Update Live Queue / Stack HUD
    if (algo.type === 'graph') {
      this.updateGraphHUD(step);
    }
  }

  updateGraphHUD(step) {
    const list = document.getElementById('hud-items-list');
    const count = document.getElementById('hud-count');
    if (!list) return;

    list.innerHTML = '';
    const items = this.currentAlgo === 'bfs' 
      ? (step.queueSnapshot || [])
      : (step.stackSnapshot || []);

    if (count) count.textContent = `${items.length} items`;

    const g = this.algorithms[this.currentAlgo].engine.defaultGraph || window.BFSEngine.defaultGraph;

    items.forEach((nodeId, idx) => {
      const nodeLabel = g.nodes[nodeId] ? g.nodes[nodeId].label : nodeId;
      const itemEl = document.createElement('div');
      itemEl.className = `hud-item ${idx === 0 ? 'head-item' : ''}`;
      itemEl.innerHTML = `
        <span>${this.currentAlgo === 'bfs' && idx === 0 ? '▶ Head' : (this.currentAlgo === 'dfs' && idx === items.length - 1 ? '▲ Top' : `#${idx + 1}`)}</span>
        <strong>Node ${nodeLabel}</strong>
      `;
      list.appendChild(itemEl);
    });
  }

  updatePlayButtonUI(isPlaying) {
    const playBtn = document.getElementById('btn-play');
    if (!playBtn) return;

    if (isPlaying) {
      playBtn.setAttribute('title', 'Pause (Space)');
      playBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="22" height="22">
          <rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"></rect>
          <rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"></rect>
        </svg>
      `;
    } else {
      playBtn.setAttribute('title', 'Play (Space)');
      playBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="22" height="22">
          <polygon points="6 4 20 12 6 20 6 4" fill="currentColor"></polygon>
        </svg>
      `;
    }
  }

  populateInfoModal() {
    const algo = this.algorithms[this.currentAlgo];
    if (!algo) return;

    const title = document.getElementById('info-modal-title');
    const body = document.getElementById('info-modal-body');
    if (title) title.textContent = `${algo.name} Deep Dive`;

    if (body) {
      let content = `
        <p><strong>Category:</strong> ${algo.category}</p>
        <p style="margin-top: 10px;">${algo.desc}</p>
        <h4 style="margin: 18px 0 8px; color: var(--accent-purple);">Complexity Profile</h4>
        <ul style="padding-left: 20px;">
          <li><strong>Best Case Time:</strong> ${algo.engine.timeComplexity.best}</li>
          <li><strong>Average Case Time:</strong> ${algo.engine.timeComplexity.average}</li>
          <li><strong>Worst Case Time:</strong> ${algo.engine.timeComplexity.worst}</li>
          <li><strong>Auxiliary Space:</strong> ${algo.engine.spaceComplexity}</li>
        </ul>
      `;

      if (this.currentAlgo === 'bubble') {
        content += `
          <h4 style="margin: 18px 0 8px; color: var(--accent-purple);">When to use Bubble Sort</h4>
          <p>Bubble sort is primarily used for educational clarity due to its conceptual simplicity. It is also well-suited when an array is already nearly sorted ($O(n)$ with swap-flag early exit), or for embedded hardware where memory is strictly constrained to $O(1)$ auxiliary footprint.</p>
        `;
      } else if (this.currentAlgo === 'merge') {
        content += `
          <h4 style="margin: 18px 0 8px; color: var(--accent-purple);">When to use Merge Sort</h4>
          <p>Merge sort guarantees $O(n \\log n)$ worst-case time complexity, making it immune to adversarial inputs that plague QuickSort ($O(n^2)$ worst case). It is stable (preserves identical key order) and excels at external sorting for multi-gigabyte files on disks.</p>
        `;
      } else if (this.currentAlgo === 'binary_search') {
        content += `
          <h4 style="margin: 18px 0 8px; color: var(--accent-purple);">When to use Binary Search</h4>
          <p>Binary Search is the cornerstone of logarithmic lookups ($O(\\log n)$). A billion records can be searched in at most 30 comparisons. Requires the underlying sequence to be sorted and accessible with random access.</p>
        `;
      } else if (this.currentAlgo === 'bfs') {
        content += `
          <h4 style="margin: 18px 0 8px; color: var(--accent-purple);">When to use BFS</h4>
          <p>BFS guarantees the shortest unweighted path between two nodes (e.g., GPS route finders, degrees of separation in social networks, and web crawling).</p>
        `;
      } else if (this.currentAlgo === 'dfs') {
        content += `
          <h4 style="margin: 18px 0 8px; color: var(--accent-purple);">When to use DFS</h4>
          <p>DFS is the basis for topological sorting, cycle detection, strongly connected components, solving mazes, and exploring game decision trees.</p>
        `;
      }

      body.innerHTML = content;
    }
  }
}

// Bootstrap application on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.algoApp = new AlgoApp();
});
