/**
 * Mascot component — crops a specific pose from mascot-sheet.png
 * Sheet size: 1254×1254px, dark purple background (#1e1b3a)
 */

const SHEET_W = 1254;
const SHEET_H = 1254;

// All coordinates verified by pixel measurement
const POSES = {
  main:     { x: 5,   y: 20,  w: 440, h: 480 }, // large cat with holographic board
  happy:    { x: 5,   y: 730, w: 180, h: 260 }, // smiling, hands together
  thinking: { x: 185, y: 730, w: 180, h: 260 }, // curious, question mark
  panic:    { x: 365, y: 730, w: 180, h: 260 }, // stressed, sweating
  sleepy:   { x: 545, y: 730, w: 185, h: 260 }, // ZZz, sleeping
  front:    { x: 445, y: 35,  w: 205, h: 395 }, // clean front-facing pose
};

export default function Mascot({ pose = 'happy', size = 120, style = {} }) {
  const p = POSES[pose] ?? POSES.happy;

  const scale = size / p.w;

  const containerStyle = {
    width: size,
    height: Math.round(p.h * scale),
    overflow: 'hidden',
    flexShrink: 0,
    borderRadius: 14,
    background: '#1e1b3a',   // matches the sheet's dark purple background
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  };

  const imgStyle = {
    width:      SHEET_W * scale,
    height:     SHEET_H * scale,
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
