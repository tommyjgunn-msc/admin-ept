// ⚠ MIRRORED FILE: an identical copy of this file lives in BOTH ept-portal
// and admin-ept (shared branding, no shared package). If you change one copy,
// change the other in the same sitting — they have already diverged silently
// once before.
//
// components/Futurimi.js — Futurimi brand primitives.
//
// The wordmark is styled text, never an image. It is set in a single colour:
// the only accent is the crimson diamond, which is also the imigongo motif the
// rest of the system is built from. (It used to set "imi" in indigo — a second
// accent hue that put the mark in purple-on-black territory and fought the
// crimson. One accent, one mark.)
//
// The rotating three.js particle globe that used to sit on the login screen is
// gone. It was a glowing sphere of dots over a radial gradient — decoration
// that carried no information, cost a WebGL context and the whole `three`
// bundle on the first screen a candidate sees. FuturimiRegister replaces it:
// the same geometry the brand already implies, drawn in CSS, weighing nothing.

// Typographic wordmark. `size` is the font size in px (34 = login, 15 = top
// bars); the diamond scales with it.
export function FuturimiWordmark({ size = 34, ink = '#F4F1EC', diamond = '#C5132D', className = '' }) {
  const diamondSize = Math.max(3, Math.round(size / 5));
  const diamondLift = Math.round(size * 0.3);
  return (
    <span className={`inline-flex items-end gap-[0.175em] ${className}`}>
      <span
        className="font-grotesk font-bold lowercase leading-none tracking-[-0.02em]"
        style={{ fontSize: size, color: ink }}
      >
        futurimi
      </span>
      <span
        className="inline-block rotate-45"
        style={{ width: diamondSize, height: diamondSize, background: diamond, marginBottom: diamondLift }}
        aria-hidden="true"
      />
    </span>
  );
}

// Imigongo register — a band of diamonds after the Rwandan relief-painting
// tradition of Gisaka in the Eastern Province, where the motifs are diamonds
// and zigzags and the ground is black. It is the one ornament in the system and
// it is structural: it marks the top edge of a page, and nothing else.
//
// `tone` names the page it sits on, not the band's own colour. The band has to
// contrast with the page or it stops reading as a band and starts reading as
// fringe — so on a dark page it takes a paper ground, and on paper it takes an
// ink one.
export function FuturimiRegister({ tone = 'night', tall = false, className = '' }) {
  return (
    <div
      className={`ftm-register ${tone === 'paper' ? 'ftm-register-paper' : ''} ${tall ? 'ftm-register-tall' : ''} ${className}`}
      role="presentation"
    />
  );
}

// Small greyscale ALU endorsement mark. Deliberately small and desaturated —
// ALU is the institutional endorser, not the hero.
//
// `tone` must match the ground. The mark artwork is dark, so on a dark ground
// it has to be inverted to near-white to be visible at all; on paper it must
// NOT be, or it washes out to nothing. The single brightness(2.2) that used to
// apply everywhere made it invisible on every light page.
export function AluMark({ height = 13, opacity = 0.55, tone = 'night', className = '' }) {
  const filter = tone === 'paper'
    ? `grayscale(1) opacity(${opacity})`
    : `grayscale(1) brightness(2.2) opacity(${opacity})`;
  return (
    <img
      src="/assets/alu-mark.png"
      alt="African Leadership University"
      style={{ height, width: 'auto', filter }}
      className={className}
    />
  );
}
