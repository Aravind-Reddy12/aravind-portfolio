import { lerp, clamp } from '../utils/math';

// ─── Constants ───────────────────────────────────────────────────────────────
export const CYCLIST_SCREEN_X_RATIO = 0.33; // 33% from left — exported so scrubber can import it
const SCREEN_X_RATIO = CYCLIST_SCREEN_X_RATIO;
const ROAD_Y_RATIO   = 0.70; // same as road.js ground start

const WHEEL_R    = 18;
const CRANK      = 12;
const PEDAL_RATIO = 0.07;

// Segment lengths
const THIGH = 22;
const SHIN  = 20;
const UPPER_ARM = 18;
const FOREARM   = 16;
const TORSO_LEN = 28;
const NECK_LEN  = 8;
const HEAD_R    = 8;
const SPOKE_COUNT = 6;

// Colors (Lo-fi palette)
const COL_FRAME   = '#f4a261';
const COL_WHEEL   = '#e8d5b7';
const COL_JERSEY  = '#2d2545';
const COL_SHORTS  = '#1e1535';
const COL_SKIN    = '#e8b88a';

// ─── Module state ─────────────────────────────────────────────────────────────
let pedalAngle  = 0;
let wheelAngle  = 0; // wheel rotation angle (radians)
let leanAngle   = 0; // current smoothed lean (radians, 0 = upright)

// ─── IK Solver ────────────────────────────────────────────────────────────────
function twoSegmentIK(root, target, lenA, lenB) {
  const dist = Math.hypot(target.x - root.x, target.y - root.y);
  const clampedDist = clamp(dist, Math.abs(lenA - lenB) + 0.01, lenA + lenB - 0.01);
  const angle = Math.atan2(target.y - root.y, target.x - root.x);
  const cosKnee = (lenA * lenA + clampedDist * clampedDist - lenB * lenB) /
                  (2 * lenA * clampedDist);
  const kneeAngle = angle - Math.acos(clamp(cosKnee, -1, 1));
  return {
    x: root.x + lenA * Math.cos(kneeAngle),
    y: root.y + lenA * Math.sin(kneeAngle),
  };
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────
function drawLine(ctx, a, b, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth   = width;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function drawWheel(ctx, cx, cy, r, color, angle) {
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  // Rotating spokes
  ctx.lineWidth = 1;
  for (let i = 0; i < SPOKE_COUNT; i++) {
    const a = angle + (i / SPOKE_COUNT) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }
  // Hub
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Main draw ────────────────────────────────────────────────────────────────
export const cyclist = {
  draw(ctx, world, width, height) {
    const speed = world.worldSpeed;

    // Update pedal and wheel rotation
    pedalAngle += speed * PEDAL_RATIO;
    wheelAngle += speed * 0.15;

    // Target lean: forward when fast, back when reversing
    const targetLean = speed > 0.3
      ? 0.22 + Math.min(speed - 0.3, 0.7) * 0.3
      : speed < -0.1
        ? -0.12
        : 0.08; // slight default forward posture
    leanAngle = lerp(leanAngle, targetLean, 0.06);

    // ─── Geometry ─────────────────────────────────────────────────────────────
    const cx = width  * SCREEN_X_RATIO;
    const groundY = height * ROAD_Y_RATIO; // top of road strip

    // Wheel centres sit on the ground line
    const rearWheelX  = cx - 20;
    const frontWheelX = cx + 24;
    const wheelY      = groundY + WHEEL_R - 4; // tyres just above road line

    // Bottom bracket (crank pivot) — centre of bike
    const bb = { x: cx + 2, y: wheelY - WHEEL_R + 4 };

    // Pedal positions
    const leftPedal  = {
      x: bb.x + CRANK * Math.cos(pedalAngle),
      y: bb.y + CRANK * Math.sin(pedalAngle),
    };
    const rightPedal = {
      x: bb.x + CRANK * Math.cos(pedalAngle + Math.PI),
      y: bb.y + CRANK * Math.sin(pedalAngle + Math.PI),
    };

    // Seat position (above bb, leaned back slightly)
    const seat = {
      x: bb.x - 8,
      y: bb.y - WHEEL_R + 2,
    };

    // Hip at seat
    const hip = { x: seat.x, y: seat.y };

    // Shoulder — torso leaned forward by leanAngle
    const shoulder = {
      x: hip.x + TORSO_LEN * Math.sin(leanAngle),
      y: hip.y - TORSO_LEN * Math.cos(leanAngle),
    };

    // Neck / head
    const neck = {
      x: shoulder.x + NECK_LEN * Math.sin(leanAngle * 0.6),
      y: shoulder.y - NECK_LEN * Math.cos(leanAngle * 0.6),
    };

    // Handlebar grip (fixed relative to front of bike)
    const handlebar = {
      x: frontWheelX - 8 + leanAngle * 10,
      y: wheelY - WHEEL_R * 1.7,
    };

    // IK: knees
    const leftKnee  = twoSegmentIK(hip, leftPedal,  THIGH, SHIN);
    const rightKnee = twoSegmentIK(hip, rightPedal, THIGH, SHIN);

    // IK: elbows (both arms reach to same handlebar point)
    const leftElbow  = twoSegmentIK(shoulder, handlebar, UPPER_ARM, FOREARM);
    const rightElbow = twoSegmentIK(
      { x: shoulder.x + 3, y: shoulder.y },
      { x: handlebar.x + 3, y: handlebar.y },
      UPPER_ARM, FOREARM
    );

    // ─── Render back-to-front ──────────────────────────────────────────────────

    // Right leg (behind, slightly faded)
    ctx.globalAlpha = 0.7;
    drawLine(ctx, hip, rightKnee,  COL_SHORTS, 4.5);
    drawLine(ctx, rightKnee, rightPedal, COL_SKIN, 4);
    ctx.globalAlpha = 1;

    // Rear wheel
    drawWheel(ctx, rearWheelX, wheelY, WHEEL_R, COL_WHEEL, wheelAngle);

    // Bicycle frame
    ctx.strokeStyle = COL_FRAME;
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    // Main triangle: bb → seat → head tube top → bb
    ctx.beginPath();
    ctx.moveTo(bb.x, bb.y);
    ctx.lineTo(seat.x, seat.y);
    ctx.lineTo(frontWheelX - 6, wheelY - WHEEL_R * 1.8);
    ctx.lineTo(bb.x, bb.y);
    ctx.stroke();
    // Chain stay: bb → rear wheel axle
    ctx.beginPath();
    ctx.moveTo(bb.x, bb.y);
    ctx.lineTo(rearWheelX, wheelY);
    ctx.stroke();
    // Seat stay: seat → rear wheel axle
    ctx.beginPath();
    ctx.moveTo(seat.x, seat.y);
    ctx.lineTo(rearWheelX, wheelY);
    ctx.stroke();
    // Fork: head tube → front wheel axle
    ctx.beginPath();
    ctx.moveTo(frontWheelX - 6, wheelY - WHEEL_R * 1.8);
    ctx.lineTo(frontWheelX, wheelY);
    ctx.stroke();
    // Seat post
    ctx.beginPath();
    ctx.moveTo(bb.x - 2, bb.y);
    ctx.lineTo(seat.x, seat.y - 2);
    ctx.stroke();

    // Saddle
    ctx.fillStyle = COL_WHEEL;
    ctx.fillRect(seat.x - 9, seat.y - 3, 18, 4);

    // Bottom bracket circle
    ctx.strokeStyle = COL_FRAME;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(bb.x, bb.y, 5, 0, Math.PI * 2);
    ctx.stroke();

    // Handlebars
    ctx.strokeStyle = COL_WHEEL;
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.moveTo(handlebar.x - 5, handlebar.y - 8);
    ctx.quadraticCurveTo(handlebar.x, handlebar.y - 12, handlebar.x + 6, handlebar.y - 5);
    ctx.stroke();

    // Front wheel
    drawWheel(ctx, frontWheelX, wheelY, WHEEL_R, COL_WHEEL, wheelAngle);

    // Left leg (front, fully opaque)
    drawLine(ctx, hip, leftKnee,  COL_SHORTS, 5);
    drawLine(ctx, leftKnee, leftPedal, COL_SKIN, 4.5);

    // Pedals
    ctx.fillStyle = COL_WHEEL;
    ctx.fillRect(leftPedal.x  - 5, leftPedal.y  - 2, 10, 3);
    ctx.fillRect(rightPedal.x - 5, rightPedal.y - 2, 10, 3);

    // Right arm (behind)
    ctx.globalAlpha = 0.7;
    drawLine(ctx, { x: shoulder.x + 3, y: shoulder.y }, rightElbow, COL_JERSEY, 4);
    drawLine(ctx, rightElbow, { x: handlebar.x + 3, y: handlebar.y }, COL_SKIN, 3.5);
    ctx.globalAlpha = 1;

    // Torso
    drawLine(ctx, hip, shoulder, COL_JERSEY, 9);

    // Left arm (front)
    drawLine(ctx, shoulder, leftElbow, COL_JERSEY, 4.5);
    drawLine(ctx, leftElbow, handlebar, COL_SKIN, 4);

    // Head
    ctx.fillStyle = COL_SKIN;
    ctx.beginPath();
    ctx.arc(neck.x, neck.y, HEAD_R, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = COL_JERSEY;
    ctx.beginPath();
    ctx.ellipse(neck.x, neck.y - HEAD_R * 0.2, HEAD_R + 1, HEAD_R * 0.85, leanAngle * 0.5, Math.PI, 0);
    ctx.fill();
  },
};
