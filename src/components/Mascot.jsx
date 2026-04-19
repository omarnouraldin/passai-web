/**
 * Mascot component — crops a specific pose from mascot-sheet.png
 *
 * The sheet layout (adjust SHEET_W / SHEET_H / POSES if your image differs):
 *
 *   [app-icon]  [reading]   [thinking]   [notifications]
 *   [logos…]
 *   [idle]  [studying]  [happy]  [encouraging]  [loading]
 *
 * All coordinates are in the ORIGINAL image's pixel space.
 */

// ── Tune these if the cat feels off-center ──────────────────────────
const SHEET_W = 1320;
const SHEET_H = 900;

const POSES = {
  idle:        { x: 30,   y: 570, w: 230, h: 280 },
  studying:    { x: 270,  y: 570, w: 230, h: 280 },
  happy:       { x: 510,  y: 570, w: 230, h: 280 },
  encouraging: { x: 750,  y: 570, w: 230, h: 280 },
  loading:     { x: 990,  y: 570, w: 230, h: 280 },
  thinking:    { x: 840,  y: 20,  w: 270, h: 340 },
  reading:     { x: 380,  y: 20,  w: 310, h: 380 },
};
// ────────────────────────────────────────────────────────────────────

export default function Mascot({ pose = 'idle', size = 120, style = {} }) {
  const p = POSES[pose] ?? POSES.idle;

  // Scale factor so the cropped region fills `size`
  const scale = size / p.w;

  const containerStyle = {
    width: size,
    height: Math.round(p.h * scale),
    overflow: 'hidden',
    flexShrink: 0,
    borderRadius: '50%',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  };

  const imgStyle = {
    width:  SHEET_W * scale,
    height: SHEET_H * scale,
    marginLeft: -(p.x * scale),
    marginTop:  -(p.y * scale),
    imageRendering: 'auto',
    flexShrink: 0,
  };

  return (
    <div style={containerStyle}>
      <img src="/mascot-sheet.png" alt={pose} style={imgStyle} draggable={false} />
    </div>
  );
}
