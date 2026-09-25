/**
 * AlgoVerse - 3D Visualizer Core Engine (Three.js)
 * Implements 3D bar sorting, cube pointer tracking, and spherical 3D graph traversals.
 */

class AlgoVisualizer {
  constructor(canvasId, tooltipId) {
    this.canvas = document.getElementById(canvasId);
    this.tooltip = document.getElementById(tooltipId);
    if (!this.canvas) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    // Camera viewpoints
    this.defaultCamPos = new THREE.Vector3(0, 130, 290);
    this.defaultCamTarget = new THREE.Vector3(0, 20, 0);
    this.cam2DPos = new THREE.Vector3(0, 30, 360);
    this.cam2DTarget = new THREE.Vector3(0, 30, 0);
    this.is3D = true;

    // Visual elements groups
    this.mainGroup = new THREE.Group();
    this.pointersGroup = new THREE.Group();
    this.particleBursts = [];

    // Current visual objects map/array
    this.visualElements = []; // { mesh, labelSprite, index, value, targetPos, currentPos, state }
    this.graphNodes = [];    // { mesh, labelSprite, haloMesh, id, label, x, y, z, state }
    this.graphEdges = [];    // { lineMesh, u, v, active }

    // Floating Pointers for Binary Search
    this.lowMarker = null;
    this.midMarker = null;
    this.highMarker = null;

    // Hover / Inspection state
    this.hoveredItem = null;

    this.init();
  }

  init() {
    const parent = this.canvas.parentElement;
    const width = parent ? parent.clientWidth || 800 : (this.canvas.clientWidth || 800);
    const height = parent ? parent.clientHeight || 520 : (this.canvas.clientHeight || 520);

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xFAF9FF);

    // Subtle exponential fog for spatial depth
    this.scene.fog = new THREE.FogExp2(0xFAF9FF, 0.0018);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    this.camera.position.copy(this.defaultCamPos);
    this.camera.lookAt(this.defaultCamTarget);

    // 3. Renderer
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: false
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch (e) {
      console.error('WebGL initialization error:', e);
      return;
    }

    // 4. Lighting Setup
    this.setupLighting();

    // 5. Environmental Floor & Stage
    this.setupStage();

    // 6. Groups
    this.scene.add(this.mainGroup);
    this.scene.add(this.pointersGroup);

    // 7. Controls (OrbitControls with custom fallback)
    this.setupControls();

    // 8. Event Listeners
    window.addEventListener('resize', () => this.onResize());
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('pointerleave', () => this.onPointerLeave());
    this.canvas.addEventListener('click', (e) => this.onClick(e));

    // 9. Start Render Loop
    this.animate();
  }

  setupLighting() {
    // Soft ambient illumination
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.75);
    this.scene.add(ambientLight);

    // Directional sunlight for clean shadows
    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
    dirLight.position.set(120, 240, 160);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 600;
    const d = 220;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Colored Accent Pointlights for dramatic 3D purple aesthetic
    const purpleLight = new THREE.PointLight(0x7C3AED, 1.4, 450);
    purpleLight.position.set(-150, 90, 100);
    this.scene.add(purpleLight);

    const pinkLight = new THREE.PointLight(0xEC4899, 1.0, 400);
    pinkLight.position.set(150, 80, -80);
    this.scene.add(pinkLight);
  }

  setupStage() {
    // Subtle shadow receiving floor disc
    const floorGeo = new THREE.CylinderGeometry(280, 280, 2, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.9,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -1;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Concentric stage rings
    const ringGeo = new THREE.RingGeometry(279, 282, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xC4B5FD,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.2;
    this.scene.add(ring);

    // Delicate grid pattern
    const grid = new THREE.GridHelper(500, 30, 0xDDD6FE, 0xEDE9FE);
    grid.position.y = -0.1;
    this.scene.add(grid);
  }

  setupControls() {
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't flip below stage
      this.controls.minDistance = 90;
      this.controls.maxDistance = 650;
      this.controls.target.copy(this.defaultCamTarget);
    } else {
      // Robust custom Orbit fallback
      this.isDragging = false;
      this.prevMousePos = { x: 0, y: 0 };
      this.spherical = { radius: 310, theta: 0, phi: Math.PI / 3.5 };

      this.canvas.addEventListener('mousedown', (e) => {
        this.isDragging = true;
        this.prevMousePos = { x: e.clientX, y: e.clientY };
      });
      window.addEventListener('mouseup', () => { this.isDragging = false; });
      window.addEventListener('mousemove', (e) => {
        if (!this.isDragging) return;
        const dx = e.clientX - this.prevMousePos.x;
        const dy = e.clientY - this.prevMousePos.y;
        this.spherical.theta -= dx * 0.008;
        this.spherical.phi = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, this.spherical.phi - dy * 0.008));
        this.updateCameraFromSpherical();
        this.prevMousePos = { x: e.clientX, y: e.clientY };
      });
      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.spherical.radius = Math.max(90, Math.min(650, this.spherical.radius + e.deltaY * 0.4));
        this.updateCameraFromSpherical();
      }, { passive: false });
    }
  }

  updateCameraFromSpherical() {
    if (this.controls) return;
    const { radius, theta, phi } = this.spherical;
    this.camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
    this.camera.position.y = radius * Math.cos(phi);
    this.camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
    this.camera.lookAt(this.defaultCamTarget);
  }

  resetCamera() {
    const targetPos = this.is3D ? this.defaultCamPos : this.cam2DPos;
    const lookTarget = this.is3D ? this.defaultCamTarget : this.cam2DTarget;

    // Smooth tween to target
    this.cameraTween = {
      fromPos: this.camera.position.clone(),
      toPos: targetPos.clone(),
      fromTarget: this.controls ? this.controls.target.clone() : this.defaultCamTarget.clone(),
      toTarget: lookTarget.clone(),
      progress: 0
    };
  }

  toggle2D3D(forceMode = null) {
    if (forceMode !== null) {
      this.is3D = forceMode === '3D';
    } else {
      this.is3D = !this.is3D;
    }

    if (!this.is3D) {
      // 2D orthographic-like front view
      if (this.controls) {
        this.controls.enableRotate = false;
      }
      this.resetCamera();
    } else {
      if (this.controls) {
        this.controls.enableRotate = true;
      }
      this.resetCamera();
    }

    return this.is3D ? '3D' : '2D';
  }

  // Generate crisp canvas sprite for numbers & text labels
  createTextSprite(text, fontSize = 28, color = '#1E1B29', bgColor = null) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    if (bgColor) {
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(14, 8, 100, 48, 12);
      ctx.fill();
    }

    ctx.font = `bold ${fontSize}px "Space Grotesk", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(16, 8, 1);
    return sprite;
  }

  // Clear current active algorithm objects
  clearSceneObjects() {
    while (this.mainGroup.children.length > 0) {
      const obj = this.mainGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
      this.mainGroup.remove(obj);
    }
    while (this.pointersGroup.children.length > 0) {
      const p = this.pointersGroup.children[0];
      this.pointersGroup.remove(p);
    }

    this.visualElements = [];
    this.graphNodes = [];
    this.graphEdges = [];
    this.lowMarker = null;
    this.midMarker = null;
    this.highMarker = null;
  }

  // ==========================================================================
  // Sorting Visuals (Bubble & Merge Sort)
  // ==========================================================================

  buildSortingBars(arrayData) {
    this.clearSceneObjects();
    const count = arrayData.length;
    const maxVal = Math.max(...arrayData, 100);
    const totalWidth = Math.min(260, count * 18);
    const barWidth = (totalWidth / count) * 0.72;
    const barDepth = 14;
    const startX = -totalWidth / 2 + barWidth / 2;

    for (let i = 0; i < count; i++) {
      const val = arrayData[i];
      const barHeight = Math.max(12, (val / maxVal) * 110);
      const posX = startX + i * (totalWidth / count);
      const posY = barHeight / 2;
      const posZ = 0;

      // Rounded/beveled extruded bar
      const geo = new THREE.BoxGeometry(barWidth, barHeight, barDepth);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x8B5CF6,
        roughness: 0.25,
        metalness: 0.2,
        emissive: 0x000000
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(posX, posY, posZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { type: 'bar', index: i, value: val, height: barHeight };
      this.mainGroup.add(mesh);

      // Value label floating above bar
      const label = this.createTextSprite(val.toString(), 28, '#7C3AED');
      label.position.set(posX, barHeight + 9, posZ);
      this.mainGroup.add(label);

      this.visualElements.push({
        mesh,
        label,
        index: i,
        value: val,
        height: barHeight,
        x: posX,
        y: posY,
        z: posZ,
        targetX: posX,
        targetY: posY,
        state: 'default'
      });
    }
  }

  updateSortingState(step) {
    if (!step) return;
    const { type, indices = [], values = [], arraySnapshot } = step;

    // Reset all bars to default state unless completed
    this.visualElements.forEach((el, idx) => {
      if (type === 'complete') {
        el.mesh.material.color.setHex(0x10B981); // Emerald celebration
        el.mesh.material.emissive.setHex(0x065F46);
        el.mesh.material.emissiveIntensity = 0.4;
      } else {
        el.mesh.material.color.setHex(0x8B5CF6);
        el.mesh.material.emissive.setHex(0x000000);
        el.mesh.material.emissiveIntensity = 0;
        el.targetY = el.height / 2;
      }
    });

    // Sync heights and values with arraySnapshot for 100% deterministic steps & backward seeking
    if (arraySnapshot && arraySnapshot.length === this.visualElements.length) {
      const maxVal = Math.max(...arraySnapshot, 100);
      for (let k = 0; k < arraySnapshot.length; k++) {
        const el = this.visualElements[k];
        const val = arraySnapshot[k];
        if (el.value !== val) {
          el.value = val;
          el.mesh.userData.value = val;
          const newHeight = Math.max(12, (val / maxVal) * 110);
          el.height = newHeight;
          el.mesh.scale.y = newHeight / (el.mesh.geometry.parameters.height || 1);
          el.targetY = newHeight / 2;
          this.mainGroup.remove(el.label);
          el.label = this.createTextSprite(val.toString(), 28, '#7C3AED');
          el.label.position.set(el.x, newHeight + 9, 0);
          this.mainGroup.add(el.label);
        }
      }
    }

    if (type === 'compare') {
      indices.forEach(idx => {
        if (this.visualElements[idx]) {
          this.visualElements[idx].mesh.material.color.setHex(0x7C3AED); // Glowing Deep Purple
          this.visualElements[idx].mesh.material.emissive.setHex(0x7C3AED);
          this.visualElements[idx].mesh.material.emissiveIntensity = 0.7;
        }
      });
      // Sound feedback at the exact moment comparison highlight renders
      if (window.soundEngine && indices.length >= 1) {
        const val = (this.visualElements[indices[0]] && this.visualElements[indices[0]].value) || 50;
        window.soundEngine.playComparison(val);
      }
    } else if (type === 'swap') {
      // Animate 3D arched swap
      if (indices.length === 2) {
        const [i, j] = indices;
        const elA = this.visualElements[i];
        const elB = this.visualElements[j];

        if (elA && elB) {
          elA.mesh.material.color.setHex(0xEC4899); // Pink-Violet Pulse
          elB.mesh.material.color.setHex(0xEC4899);
          elA.mesh.material.emissive.setHex(0xBE185D);
          elB.mesh.material.emissive.setHex(0xBE185D);
          elA.mesh.material.emissiveIntensity = 0.8;
          elB.mesh.material.emissiveIntensity = 0.8;

          // 3D vertical arch
          elA.targetY = elA.height / 2 + 16;
          elB.targetY = elB.height / 2 + 16;

          // Sound feedback at the exact moment swap pulse renders
          if (window.soundEngine) {
            window.soundEngine.playSwap(elA.value, elB.value);
          }
        }
      }
    } else if (type === 'write') {
      // Merge sort single bar height update
      const [idx] = indices;
      const [val] = values;
      if (this.visualElements[idx] && val !== undefined) {
        const el = this.visualElements[idx];
        el.value = val;
        el.mesh.userData.value = val;
        const maxVal = 100;
        const newHeight = Math.max(12, (val / maxVal) * 110);
        el.height = newHeight;
        el.mesh.scale.y = newHeight / (el.mesh.geometry.parameters.height || 1);
        el.targetY = newHeight / 2;
        el.mesh.material.color.setHex(0xEC4899);
        el.mesh.material.emissive.setHex(0xBE185D);
        el.mesh.material.emissiveIntensity = 0.6;

        // Update label
        this.mainGroup.remove(el.label);
        el.label = this.createTextSprite(val.toString(), 28, '#EC4899');
        el.label.position.set(el.targetX, newHeight + 9, 0);
        this.mainGroup.add(el.label);

        // Sound feedback for Merge Sort write/exchange (punchy pop)
        if (window.soundEngine) {
          window.soundEngine.playSwap(val, val);
        }
      }
    } else if (type === 'highlight_subarrays') {
      indices.forEach(idx => {
        if (this.visualElements[idx]) {
          this.visualElements[idx].targetY = this.visualElements[idx].height / 2 + 18; // Elevate in 3D!
          this.visualElements[idx].mesh.material.color.setHex(0xA78BFA);
        }
      });
    } else if (type === 'mark_sorted') {
      indices.forEach(idx => {
        if (this.visualElements[idx]) {
          this.visualElements[idx].mesh.material.color.setHex(0x10B981);
          this.visualElements[idx].mesh.material.emissive.setHex(0x065F46);
          this.visualElements[idx].mesh.material.emissiveIntensity = 0.35;
        }
      });
    } else if (type === 'complete') {
      if (window.soundEngine) {
        window.soundEngine.playComplete();
      }
    }
  }

  // ==========================================================================
  // Binary Search Visuals (3D Cubes + Floating LOW, MID, HIGH Pointers)
  // ==========================================================================

  buildBinarySearchCubes(sortedArray) {
    this.clearSceneObjects();
    const count = sortedArray.length;
    const totalWidth = Math.min(270, count * 22);
    const cubeSize = Math.min(18, (totalWidth / count) * 0.82);
    const startX = -totalWidth / 2 + cubeSize / 2;

    for (let i = 0; i < count; i++) {
      const val = sortedArray[i];
      const posX = startX + i * (totalWidth / count);
      const posY = cubeSize / 2 + 2;
      const posZ = 0;

      const geo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x7C3AED,
        roughness: 0.2,
        metalness: 0.15,
        transparent: true,
        opacity: 0.95
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(posX, posY, posZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { type: 'cube', index: i, value: val };
      this.mainGroup.add(mesh);

      // Value label on cube
      const label = this.createTextSprite(val.toString(), 30, '#FFFFFF', '#7C3AED');
      label.position.set(posX, posY + cubeSize / 2 + 7, posZ);
      this.mainGroup.add(label);

      // Index label below cube
      const idxLabel = this.createTextSprite(`[${i}]`, 22, '#8E89A8');
      idxLabel.position.set(posX, -7, posZ);
      this.mainGroup.add(idxLabel);

      this.visualElements.push({
        mesh,
        label,
        idxLabel,
        index: i,
        value: val,
        x: posX,
        y: posY,
        z: posZ,
        state: 'active'
      });
    }

    // Build 3D Floating Pointer Markers
    this.buildPointerMarkers();
  }

  buildPointerMarkers() {
    const createMarker = (name, colorHex) => {
      const group = new THREE.Group();

      // Cone/Arrow pointing down
      const coneGeo = new THREE.ConeGeometry(3.5, 9, 16);
      const coneMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.5,
        roughness: 0.3
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.rotation.x = Math.PI; // Point downwards
      cone.position.y = 4.5;
      group.add(cone);

      // Floating label badge
      const badge = this.createTextSprite(name, 26, '#FFFFFF', colorHex);
      badge.position.y = 17;
      badge.scale.set(18, 9, 1);
      group.add(badge);

      group.visible = false;
      this.pointersGroup.add(group);
      return group;
    };

    this.lowMarker = createMarker('LOW', '#06B6D4');  // Cyan
    this.midMarker = createMarker('MID', '#7C3AED');  // Glowing Purple
    this.highMarker = createMarker('HIGH', '#F59E0B'); // Amber
  }

  updateBinarySearchState(step) {
    if (!step) return;
    const { low, mid, high, discarded = [], type, target } = step;

    // 1. Update Discarded visual cubes
    this.visualElements.forEach((el, idx) => {
      if (discarded.includes(idx)) {
        el.mesh.material.opacity = 0.22;
        el.mesh.material.color.setHex(0xD1D5DB);
        el.mesh.material.emissive.setHex(0x000000);
        el.mesh.material.emissiveIntensity = 0;
      } else {
        el.mesh.material.opacity = 0.95;
        el.mesh.material.color.setHex(0x7C3AED);
      }
    });

    // 2. Position Low Pointer
    if (low !== null && low < this.visualElements.length && this.lowMarker) {
      const targetX = this.visualElements[low].x;
      this.lowMarker.position.set(targetX, 36, 0);
      this.lowMarker.visible = true;
    } else if (this.lowMarker) {
      this.lowMarker.visible = false;
    }

    // 3. Position High Pointer
    if (high !== null && high >= 0 && high < this.visualElements.length && this.highMarker) {
      const targetX = this.visualElements[high].x;
      this.highMarker.position.set(targetX, 36, 0);
      this.highMarker.visible = true;
    } else if (this.highMarker) {
      this.highMarker.visible = false;
    }

    // 4. Position Mid Pointer
    if (mid !== null && mid >= 0 && mid < this.visualElements.length && this.midMarker) {
      const targetX = this.visualElements[mid].x;
      this.midMarker.position.set(targetX, 48, 0); // slightly higher to avoid overlap
      this.midMarker.visible = true;

      const midEl = this.visualElements[mid];
      if (type === 'inspect_mid') {
        midEl.mesh.material.color.setHex(0xA855F7);
        midEl.mesh.material.emissive.setHex(0x7C3AED);
        midEl.mesh.material.emissiveIntensity = 0.8;
      }

      if (window.soundEngine && type === 'inspect_mid') {
        window.soundEngine.playComparison(midEl.value);
      }
    } else if (this.midMarker) {
      this.midMarker.visible = false;
    }

    // 5. Found celebration state
    if (type === 'found' && mid !== null) {
      const foundEl = this.visualElements[mid];
      foundEl.mesh.material.color.setHex(0x10B981); // Emerald celebration
      foundEl.mesh.material.emissive.setHex(0x10B981);
      foundEl.mesh.material.emissiveIntensity = 1.0;
      this.triggerParticleBurst(foundEl.x, foundEl.y + 10, foundEl.z);

      if (window.soundEngine) {
        window.soundEngine.playSuccess();
      }
    }
  }

  // ==========================================================================
  // Graph Traversal Visuals (BFS & DFS)
  // ==========================================================================

  build3DGraph(graphData) {
    this.clearSceneObjects();
    const { nodes, edges } = graphData;

    // 1. Draw Edges as 3D tubes/lines
    edges.forEach(([u, v]) => {
      const nodeU = nodes[u];
      const nodeV = nodes[v];

      const p1 = new THREE.Vector3(nodeU.x, nodeU.y, nodeU.z);
      const p2 = new THREE.Vector3(nodeV.x, nodeV.y, nodeV.z);

      const path = new THREE.LineCurve3(p1, p2);
      const tubeGeo = new THREE.TubeGeometry(path, 16, 1.8, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0xDDD6FE,
        roughness: 0.5,
        transparent: true,
        opacity: 0.6
      });

      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      this.mainGroup.add(tubeMesh);

      this.graphEdges.push({
        mesh: tubeMesh,
        u,
        v,
        active: false
      });
    });

    // 2. Draw 3D Nodes (Spheres with glowing halos)
    nodes.forEach(n => {
      const nodeGeo = new THREE.SphereGeometry(14, 32, 32);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: 0xC4B5FD,
        roughness: 0.2,
        metalness: 0.1,
        emissive: 0x000000
      });

      const mesh = new THREE.Mesh(nodeGeo, nodeMat);
      mesh.position.set(n.x, n.y, n.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { type: 'graph_node', id: n.id, label: n.label };
      this.mainGroup.add(mesh);

      // Glowing Outer Halo
      const haloGeo = new THREE.SphereGeometry(17, 24, 24);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x7C3AED,
        transparent: true,
        opacity: 0,
        wireframe: true
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.position.set(n.x, n.y, n.z);
      this.mainGroup.add(haloMesh);

      // Node Label Sprite
      const labelSprite = this.createTextSprite(n.label, 32, '#FFFFFF', '#7C3AED');
      labelSprite.position.set(n.x, n.y + 19, n.z);
      labelSprite.scale.set(16, 8, 1);
      this.mainGroup.add(labelSprite);

      this.graphNodes.push({
        mesh,
        haloMesh,
        labelSprite,
        id: n.id,
        label: n.label,
        x: n.x,
        y: n.y,
        z: n.z,
        state: 'unvisited'
      });
    });
  }

  updateGraphState(step) {
    if (!step) return;
    const { currentNode, visitedNodes = [], queueSnapshot = [], stackSnapshot = [], traversedEdges = [], type } = step;

    // Reset edges
    this.graphEdges.forEach(e => {
      const isTraversed = traversedEdges.some(([u, v]) => (e.u === u && e.v === v) || (e.u === v && e.v === u));
      if (isTraversed) {
        e.mesh.material.color.setHex(0x7C3AED); // Traversed edge glows deep purple
        e.mesh.material.opacity = 1.0;
        e.mesh.material.emissive = new THREE.Color(0x7C3AED);
      } else {
        e.mesh.material.color.setHex(0xDDD6FE);
        e.mesh.material.opacity = 0.5;
        e.mesh.material.emissive = new THREE.Color(0x000000);
      }
    });

    // Update Nodes
    const inQueueOrStack = new Set([...queueSnapshot, ...stackSnapshot]);

    this.graphNodes.forEach(node => {
      const isCurrent = node.id === currentNode;
      const isVisited = visitedNodes.includes(node.id);
      const isWaiting = inQueueOrStack.has(node.id);

      if (isCurrent) {
        node.mesh.material.color.setHex(0xEC4899); // Radiant Pink Current Node
        node.mesh.material.emissive.setHex(0xBE185D);
        node.mesh.material.emissiveIntensity = 0.9;
        node.haloMesh.material.opacity = 0.85;
        node.haloMesh.material.color.setHex(0xEC4899);

        if (window.soundEngine) {
          window.soundEngine.playNodeVisit(node.id);
        }
      } else if (isVisited) {
        node.mesh.material.color.setHex(0x7C3AED); // Visited nodes shine deep purple
        node.mesh.material.emissive.setHex(0x5B21B6);
        node.mesh.material.emissiveIntensity = 0.4;
        node.haloMesh.material.opacity = 0.2;
        node.haloMesh.material.color.setHex(0x7C3AED);
      } else if (isWaiting) {
        node.mesh.material.color.setHex(0xF59E0B); // Amber for Queued/Stacked
        node.mesh.material.emissive.setHex(0xB45309);
        node.mesh.material.emissiveIntensity = 0.5;
        node.haloMesh.material.opacity = 0.4;
        node.haloMesh.material.color.setHex(0xF59E0B);
      } else {
        node.mesh.material.color.setHex(0xC4B5FD); // Unvisited
        node.mesh.material.emissive.setHex(0x000000);
        node.mesh.material.emissiveIntensity = 0;
        node.haloMesh.material.opacity = 0;
      }
    });

    if (type === 'complete' && window.soundEngine) {
      window.soundEngine.playSuccess();
    }
  }

  // ==========================================================================
  // Particle Celebration System
  // ==========================================================================

  triggerParticleBurst(x, y, z) {
    const pCount = 36;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);
    const velocities = [];

    for (let i = 0; i < pCount; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.5;
      velocities.push({
        vx: Math.cos(angle) * speed,
        vy: 1.5 + Math.random() * 2.5,
        vz: Math.sin(angle) * speed,
        life: 1.0
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size: 5,
      color: 0x10B981,
      transparent: true,
      opacity: 1
    });

    const pSystem = new THREE.Points(geo, mat);
    this.scene.add(pSystem);
    this.particleBursts.push({ system: pSystem, velocities, geo });
  }

  // ==========================================================================
  // Raycasting & Click-to-Inspect Interactivity
  // ==========================================================================

  onPointerMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.checkHover(e.clientX - rect.left, e.clientY - rect.top);
  }

  onPointerLeave() {
    this.mouse.x = -999;
    this.mouse.y = -999;
    if (this.tooltip) {
      this.tooltip.classList.remove('visible');
    }
  }

  onClick(e) {
    if (!this.hoveredItem) return;
    const data = this.hoveredItem.userData;
    // Dispatch custom event for app modal or details banner
    const event = new CustomEvent('algo-element-inspected', { detail: data });
    window.dispatchEvent(event);
  }

  checkHover(pixelX, pixelY) {
    if (!this.tooltip) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.mainGroup.children);

    const hit = intersects.find(i => i.object.userData && (i.object.userData.type === 'bar' || i.object.userData.type === 'cube' || i.object.userData.type === 'graph_node'));

    if (hit) {
      this.hoveredItem = hit.object;
      const data = hit.object.userData;

      let title = '';
      let val = '';
      let desc = '';

      if (data.type === 'bar') {
        title = `Array Element #${data.index}`;
        val = `Value: ${data.value}`;
        desc = `Click to inspect details â€¢ Height: ${Math.round(data.height)}px`;
      } else if (data.type === 'cube') {
        title = `Search Cube #${data.index}`;
        val = `Value: ${data.value}`;
        desc = `Click to set as target value`;
      } else if (data.type === 'graph_node') {
        title = `Graph Node ${data.label}`;
        val = `Node ID: ${data.id}`;
        desc = `Click to set as start traversal node`;
      }

      this.tooltip.querySelector('.tooltip-title').textContent = title;
      this.tooltip.querySelector('.tooltip-val').textContent = val;
      this.tooltip.querySelector('.tooltip-desc').textContent = desc;

      this.tooltip.style.left = `${pixelX}px`;
      this.tooltip.style.top = `${pixelY}px`;
      this.tooltip.classList.add('visible');
    } else {
      this.hoveredItem = null;
      this.tooltip.classList.remove('visible');
    }
  }

  onResize() {
    if (!this.canvas.parentElement) return;
    const width = this.canvas.parentElement.clientWidth;
    const height = this.canvas.parentElement.clientHeight || 520;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // ==========================================================================
  // Render Loop
  // ==========================================================================

  animate() {
    requestAnimationFrame(() => this.animate());

    // 1. Controls update
    if (this.controls) {
      this.controls.update();
    }

    // 2. Camera tweening on reset or 2D/3D toggle
    if (this.cameraTween) {
      this.cameraTween.progress += 0.04;
      const t = Math.min(1, this.cameraTween.progress);
      const ease = t * (2 - t); // Quad ease-out

      this.camera.position.lerpVectors(this.cameraTween.fromPos, this.cameraTween.toPos, ease);
      if (this.controls) {
        this.controls.target.lerpVectors(this.cameraTween.fromTarget, this.cameraTween.toTarget, ease);
      } else {
        this.camera.lookAt(this.cameraTween.toTarget);
      }

      if (t >= 1) {
        this.cameraTween = null;
      }
    }

    // 3. Smooth Lerp for sorting bar swaps & height transitions
    this.visualElements.forEach(el => {
      if (el.targetX !== undefined) {
        el.x += (el.targetX - el.x) * 0.16;
        el.mesh.position.x = el.x;
        if (el.label) el.label.position.x = el.x;
      }
      if (el.targetY !== undefined) {
        el.y += (el.targetY - el.y) * 0.16;
        el.mesh.position.y = el.y;
        if (el.label) el.label.position.y = el.y + el.height / 2 + 9;
      }
    });

    // 4. Subtle rotation on graph halo meshes
    this.graphNodes.forEach(n => {
      if (n.haloMesh && n.haloMesh.material.opacity > 0) {
        n.haloMesh.rotation.y += 0.02;
        n.haloMesh.rotation.x += 0.01;
      }
    });

    // 5. Update Particle Bursts
    for (let b = this.particleBursts.length - 1; b >= 0; b--) {
      const burst = this.particleBursts[b];
      const pos = burst.geo.attributes.position;
      let allDead = true;

      for (let i = 0; i < burst.velocities.length; i++) {
        const v = burst.velocities[i];
        if (v.life > 0) {
          allDead = false;
          pos.setXYZ(
            i,
            pos.getX(i) + v.vx,
            pos.getY(i) + v.vy,
            pos.getZ(i) + v.vz
          );
          v.vy -= 0.08; // gravity
          v.life -= 0.02;
        }
      }
      pos.needsUpdate = true;
      burst.system.material.opacity = Math.max(0, burst.velocities[0].life);

      if (allDead) {
        this.scene.remove(burst.system);
        burst.geo.dispose();
        burst.system.material.dispose();
        this.particleBursts.splice(b, 1);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.AlgoVisualizer = AlgoVisualizer;

