const GROUND_COLOR    = '#2a2035';
const ROAD_COLOR      = '#1e1a2e';
const DASH_COLOR      = '#f4a261';
const EDGE_COLOR      = '#3a3050';

const GROUND_RATIO    = 0.30; // bottom 30% of canvas
const ROAD_HEIGHT     = 40;   // px — the tarmac strip
const DASH_WIDTH      = 30;
const DASH_HEIGHT     = 3;
const DASH_SPACING    = 60;   // gap between dash starts
const EDGE_LINE_WIDTH = 1;

export function drawRoad(ctx, width, height, worldOffset) {
  const groundY = height * (1 - GROUND_RATIO); // Y where ground begins
  const roadY   = groundY;                      // road sits at top of ground area

  // Ground fill below road
  ctx.fillStyle = GROUND_COLOR;
  ctx.fillRect(0, groundY, width, height - groundY);

  // Road surface strip
  ctx.fillStyle = ROAD_COLOR;
  ctx.fillRect(0, roadY, width, ROAD_HEIGHT);

  // Road edge lines
  ctx.strokeStyle = EDGE_COLOR;
  ctx.lineWidth   = EDGE_LINE_WIDTH;

  ctx.beginPath();
  ctx.moveTo(0, roadY);
  ctx.lineTo(width, roadY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, roadY + ROAD_HEIGHT);
  ctx.lineTo(width, roadY + ROAD_HEIGHT);
  ctx.stroke();

  // Dashed center line — scrolls at 1.0× worldOffset
  const centerY    = roadY + ROAD_HEIGHT / 2 - DASH_HEIGHT / 2;
  const dashOffset = -(worldOffset % DASH_SPACING);

  ctx.fillStyle = DASH_COLOR;
  for (let x = dashOffset; x < width; x += DASH_SPACING) {
    ctx.fillRect(x, centerY, DASH_WIDTH, DASH_HEIGHT);
  }
}
