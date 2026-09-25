/**
 * AlgoVerse Hero Section 3D Animation
 * Renders an interactive 3D constellation of glowing purple nodes & wireframe geometry.
 */
class HeroBackground {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas || typeof THREE === 'undefined') return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.particles = null;
    this.linesMesh = null;
    this.shapesGroup = null;

    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;

    this.nodeCount = 75;
    this.nodes = [];
    this.maxDistance = 140;

    this.init();
  }

  init() {
    const width = (this.canvas.parentElement && this.canvas.parentElement.clientWidth) || window.innerWidth || 1280;
    const height = (this.canvas.parentElement && this.canvas.parentElement.clientHeight) || window.innerHeight || 700;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, width / height, 1, 2000);
    this.camera.position.z = 450;

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } catch (e) {
      console.warn('WebGL not supported for hero background:', e);
      return;
    }

    // Floating Geodesic Wireframe Polyhedra
    this.shapesGroup = new THREE.Group();

    const icoGeo = new THREE.IcosahedronGeometry(130, 1);
    const icoMat = new THREE.MeshBasicMaterial({
      color: 0x7C3AED,
      wireframe: true,
      transparent: true,
      opacity: 0.16
    });
    this.icoMesh = new THREE.Mesh(icoGeo, icoMat);
    this.shapesGroup.add(this.icoMesh);

    const octGeo = new THREE.OctahedronGeometry(80, 0);
    const octMat = new THREE.MeshBasicMaterial({
      color: 0xC4B5FD,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });
    this.octMesh = new THREE.Mesh(octGeo, octMat);
    this.shapesGroup.add(this.octMesh);

    const ringGeo = new THREE.TorusGeometry(180, 0.8, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xA78BFA,
      transparent: true,
      opacity: 0.2
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.rotation.x = Math.PI / 3;
    this.shapesGroup.add(this.ringMesh);

    this.scene.add(this.shapesGroup);

    // Dynamic Connected Particle Nodes (Graph-like constellation)
    const positions = new Float32Array(this.nodeCount * 3);
    const colors = new Float32Array(this.nodeCount * 3);
    const colorA = new THREE.Color(0x7C3AED);
    const colorB = new THREE.Color(0xC4B5FD);
    const colorC = new THREE.Color(0xEC4899);

    for (let i = 0; i < this.nodeCount; i++) {
      const x = (Math.random() - 0.5) * 600;
      const y = (Math.random() - 0.5) * 450;
      const z = (Math.random() - 0.5) * 350;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.nodes.push({
        x, y, z,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        vz: (Math.random() - 0.5) * 0.45
      });

      const mixColor = i % 3 === 0 ? colorC : (i % 2 === 0 ? colorA : colorB);
      colors[i * 3] = mixColor.r;
      colors[i * 3 + 1] = mixColor.g;
      colors[i * 3 + 2] = mixColor.b;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Circle Sprite for glowing round nodes
    const canvasDot = document.createElement('canvas');
    canvasDot.width = 32;
    canvasDot.height = 32;
    const dotCtx = canvasDot.getContext('2d');
    const grad = dotCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(196, 181, 253, 0.9)');
    grad.addColorStop(0.8, 'rgba(124, 58, 237, 0.4)');
    grad.addColorStop(1, 'rgba(124, 58, 237, 0)');
    dotCtx.fillStyle = grad;
    dotCtx.fillRect(0, 0, 32, 32);

    const spriteTexture = new THREE.CanvasTexture(canvasDot);

    const particleMat = new THREE.PointsMaterial({
      size: 16,
      map: spriteTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.particles);

    // Connecting line segments
    const maxLineSegments = this.nodeCount * this.nodeCount;
    this.linePositions = new Float32Array(maxLineSegments * 6);
    this.lineColors = new Float32Array(maxLineSegments * 6);

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeo.setAttribute('color', new THREE.BufferAttribute(this.lineColors, 3).setUsage(THREE.DynamicDrawUsage));

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.NormalBlending
    });

    this.linesMesh = new THREE.LineSegments(lineGeo, lineMat);
    this.scene.add(this.linesMesh);

    // Event listeners
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));

    this.animate();
  }

  onMouseMove(e) {
    this.targetMouseX = (e.clientX - window.innerWidth / 2) * 0.0006;
    this.targetMouseY = (e.clientY - window.innerHeight / 2) * 0.0006;
  }

  onResize() {
    if (!this.renderer || !this.camera || !this.canvas.parentElement) return;
    const width = this.canvas.parentElement.clientWidth;
    const height = this.canvas.parentElement.clientHeight || 600;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Mouse parallax interpolation
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    // Slow organic rotation of wireframe geometries
    if (this.shapesGroup) {
      this.shapesGroup.rotation.y += 0.0025;
      this.shapesGroup.rotation.x += 0.0015;
      this.shapesGroup.rotation.y += this.mouseX * 0.3;
      this.shapesGroup.rotation.x += this.mouseY * 0.3;
    }

    if (this.octMesh) {
      this.octMesh.rotation.y -= 0.004;
      this.octMesh.rotation.z += 0.002;
    }

    if (this.ringMesh) {
      this.ringMesh.rotation.z += 0.0018;
    }

    // Animate graph nodes and compute dynamic edges
    const posAttr = this.particles.geometry.attributes.position;
    let lineIdx = 0;
    const boundary = 300;

    for (let i = 0; i < this.nodeCount; i++) {
      const n = this.nodes[i];
      n.x += n.vx;
      n.y += n.vy;
      n.z += n.vz;

      // Bounce at boundary
      if (Math.abs(n.x) > boundary) n.vx *= -1;
      if (Math.abs(n.y) > 220) n.vy *= -1;
      if (Math.abs(n.z) > 180) n.vz *= -1;

      posAttr.setXYZ(i, n.x, n.y, n.z);

      // Check connections with other nodes
      for (let j = i + 1; j < this.nodeCount; j++) {
        const n2 = this.nodes[j];
        const dx = n.x - n2.x;
        const dy = n.y - n2.y;
        const dz = n.z - n2.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < this.maxDistance) {
          const alpha = 1.0 - dist / this.maxDistance;

          this.linePositions[lineIdx * 6] = n.x;
          this.linePositions[lineIdx * 6 + 1] = n.y;
          this.linePositions[lineIdx * 6 + 2] = n.z;

          this.linePositions[lineIdx * 6 + 3] = n2.x;
          this.linePositions[lineIdx * 6 + 4] = n2.y;
          this.linePositions[lineIdx * 6 + 5] = n2.z;

          const r = 0.48; // #7C3AED
          const g = 0.22;
          const b = 0.93;

          this.lineColors[lineIdx * 6] = r * alpha;
          this.lineColors[lineIdx * 6 + 1] = g * alpha;
          this.lineColors[lineIdx * 6 + 2] = b * alpha;

          this.lineColors[lineIdx * 6 + 3] = 0.77 * alpha; // #C4B5FD
          this.lineColors[lineIdx * 6 + 4] = 0.71 * alpha;
          this.lineColors[lineIdx * 6 + 5] = 0.99 * alpha;

          lineIdx++;
        }
      }
    }

    posAttr.needsUpdate = true;

    this.linesMesh.geometry.setDrawRange(0, lineIdx * 2);
    this.linesMesh.geometry.attributes.position.needsUpdate = true;
    this.linesMesh.geometry.attributes.color.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }
}

window.HeroBackground = HeroBackground;
