// components/Futurimi.js — Futurimi brand primitives (wordmark + three.js hero)
// Ported from the design handoff (design_handoff_futurimi_redesign): the
// wordmark is styled text, never an image; the hero is ambient background
// motion only (no controls).
import { useEffect, useRef } from 'react';

// Typographic wordmark: "futur" in ink, "imi" in brand indigo, with a small
// crimson diamond at baseline. `size` is the font size in px (40 = login hero,
// 15 = top bars); the diamond scales proportionally (8px at 40, 4px at 15).
export function FuturimiWordmark({ size = 40, ink = '#F4F1EC', diamond = '#C5132D', className = '' }) {
  const diamondSize = Math.max(3, Math.round(size / 5));
  const diamondLift = Math.round(size * 0.3);
  return (
    <span className={`inline-flex items-end gap-[0.175em] ${className}`}>
      <span
        className="font-grotesk font-bold lowercase leading-none tracking-[-0.02em]"
        style={{ fontSize: size }}
      >
        <span style={{ color: ink }}>futur</span>
        <span className="text-ftm-indigo">imi</span>
      </span>
      <span
        className="inline-block rotate-45"
        style={{ width: diamondSize, height: diamondSize, background: diamond, marginBottom: diamondLift }}
      />
    </span>
  );
}

function glyphTexture(THREE, letter, colorHex) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.font = '700 188px "Space Grotesk", sans-serif';
  ctx.fillStyle = colorHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, 128, 144);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function addGlyphRing(THREE, group, radius, opts) {
  if (!opts.glyphs || !opts.glyphs.length) return;
  const glyphGroup = new THREE.Group();
  opts.glyphs.forEach((L, idx) => {
    const tex = glyphTexture(THREE, L, opts.accentHex);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(opts.glyphSize || 0.7, opts.glyphSize || 0.7),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    );
    const a = (idx / opts.glyphs.length) * Math.PI * 2;
    mesh.position.set(Math.cos(a) * radius, (idx % 2 ? 0.55 : -0.55), Math.sin(a) * radius);
    glyphGroup.add(mesh);
  });
  group.add(glyphGroup);
  group.userData.glyphGroup = glyphGroup;
}

// Fibonacci-sphere point cloud with near-neighbour line segments (Pan-African
// network motif) plus an orbiting ring of language-glyph planes.
function buildGlobe(THREE, group, opts) {
  const radius = 2.5;
  const count = opts.count || 180;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  group.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: opts.secondaryHex, size: opts.dotSize || 0.055, transparent: true, opacity: 0.9 })));

  const linePos = [];
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const dx = positions[i * 3] - positions[j * 3], dy = positions[i * 3 + 1] - positions[j * 3 + 1], dz = positions[i * 3 + 2] - positions[j * 3 + 2];
      if (dx * dx + dy * dy + dz * dz < 0.8) {
        linePos.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2], positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
  group.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: opts.secondaryHex, transparent: true, opacity: 0.16 })));

  addGlyphRing(THREE, group, radius + 1.15, opts);
}

// Abstracted low-poly nod to the Kigali campus: staggered box terraces,
// cylinder columns, emissive red window accents, and an orbiting particle ring.
function buildCampus(THREE, group, opts) {
  const body = new THREE.MeshStandardMaterial({ color: opts.secondaryHex, roughness: 0.75, metalness: 0.04 });
  const glow = new THREE.MeshStandardMaterial({ color: opts.accentHex, emissive: opts.accentHex, emissiveIntensity: 0.85, roughness: 0.4 });
  const terraces = [
    [3.1, 0.46, 1.5, 0, -1.15, 0],
    [2.3, 0.46, 1.3, 0.85, -0.62, 0.25],
    [1.6, 0.46, 1.1, 1.55, -0.08, 0.45],
    [1.0, 0.46, 0.9, 2.2, 0.46, 0.55],
  ];
  terraces.forEach(([w, h, d, x, y, z], ti) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), body);
    box.position.set(x, y, z);
    group.add(box);
    for (let i = 0; i < 3; i++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.05), ((ti + i) % 3 === 0) ? glow : body);
      win.position.set(x - w / 2 + 0.38 + i * 0.48, y, z + d / 2 + 0.03);
      group.add(win);
    }
  });
  for (let i = 0; i < 3; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 2.5, 16), body);
    col.position.set(-1.55 + i * 0.95, -0.25, -1.05);
    group.add(col);
  }
  const ringCount = opts.count || 70;
  const ringPos = new Float32Array(ringCount * 3);
  for (let i = 0; i < ringCount; i++) {
    const a = (i / ringCount) * Math.PI * 2;
    const r = 3.5 + Math.sin(i * 1.7) * 0.3;
    ringPos[i * 3] = Math.cos(a) * r;
    ringPos[i * 3 + 1] = Math.sin(i * 0.5) * 1.1 + 0.2;
    ringPos[i * 3 + 2] = Math.sin(a) * r;
  }
  const rGeo = new THREE.BufferGeometry();
  rGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
  group.add(new THREE.Points(rGeo, new THREE.PointsMaterial({ color: opts.secondaryHex, size: 0.045, transparent: true, opacity: 0.75 })));

  addGlyphRing(THREE, group, 3.5, { ...opts, glyphSize: 0.55 });
}

// Ambient three.js hero. variant: 'globe' (login) | 'building' (admin bar).
export function FuturimiHero({ variant = 'globe', secondaryHex = '#55636C', accentHex = '#C5132D', count = 190, cameraZ = 8.2, glyphs = ['U', 'R', 'I', 'M', 'I'], dotSize, className = '', style }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let renderer, observer, rafId;

    import('three').then((THREE) => {
      if (disposed) return;
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(0, 0.25, cameraZ);
      scene.add(new THREE.AmbientLight(0xffffff, variant === 'building' ? 0.75 : 1.1));
      if (variant === 'building') {
        const key = new THREE.DirectionalLight(0xffffff, 1.15);
        key.position.set(4, 6, 4);
        scene.add(key);
      }
      const group = new THREE.Group();
      scene.add(group);
      const opts = { secondaryHex, accentHex, count, glyphs, dotSize };
      if (variant === 'globe') buildGlobe(THREE, group, opts); else buildCampus(THREE, group, opts);

      function resize() {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      observer = new ResizeObserver(resize);
      observer.observe(canvas);
      resize();

      const clock = new THREE.Clock();
      function animate() {
        if (disposed) return;
        rafId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        group.rotation.y = t * 0.12;
        if (group.userData.glyphGroup) group.userData.glyphGroup.rotation.y = -t * 0.22;
        renderer.render(scene, camera);
      }
      animate();
    });

    return () => {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (observer) observer.disconnect();
      if (renderer) renderer.dispose();
    };
  }, [variant, secondaryHex, accentHex, count, cameraZ, dotSize]); // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={canvasRef} className={`block w-full h-full ${className}`} style={style} />;
}

// Small greyscale ALU endorsement mark. Deliberately small and desaturated —
// ALU is the institutional endorser, not the hero.
export function AluMark({ height = 13, opacity = 0.55, className = '' }) {
  return (
    <img
      src="/assets/alu-mark.png"
      alt="African Leadership University"
      style={{ height, width: 'auto', filter: `grayscale(1) brightness(2.2) opacity(${opacity})` }}
      className={className}
    />
  );
}
