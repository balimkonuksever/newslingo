// Draws the site's İznik motifs, in src/app/motifs/: vine.svg, the vine that
// grows down each side of the page on wide screens, corner.svg, the spray in
// each top corner that the vine grows from, and emblem.svg, the İznik plate
// beside the site's name. They use the motifs of İznik tiles: lale (tulip),
// karanfil (carnation), hatayi and penç flowers, serrated saz leaves, sümbül
// (hyacinth) sprigs and çintemani's three pearls, on running stems. Every
// shape is drawn here from geometry; nothing is traced or copied from an
// existing artwork.
//
//   pnpm exec tsx scripts/draw-motifs.ts
//
// rewrites the files. scripts/draw-motifs.test.ts fails while the committed
// files differ from what this script draws, so edit the drawing here.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type Point = [number, number];
type Curve = [Point, Point, Point, Point];

/** İznik colours. The drawings have no ground: they sit on the page. */
const COLOURS = {
  glaze: "#fffdf8",
  cobalt: "#1f3d93",
  turquoise: "#35a19c",
  red: "#c63c2c",
  green: "#3b7d55",
  stem: "#2f6c4a",
  line: "#1a2242",
  white: "#ffffff",
};

/**
 * Outlines. Each motif is drawn once at a small size with `OUTLINE`, and
 * placed at about twice that size; shapes drawn straight onto a piece, such as
 * leaves, use `LINE` to match. Drawing units are pixels at the largest size,
 * where the vines are 160 wide.
 */
const OUTLINE = ` stroke="${COLOURS.line}" stroke-width="0.5" stroke-linejoin="round"`;
const LINE = 0.9;

// ---------- geometry ----------

const fmt = (value: number) => {
  const rounded = Math.round(value * 10) / 10;

  return Object.is(rounded, -0) ? "0" : String(rounded);
};
const xy = ([x, y]: Point) => `${fmt(x)} ${fmt(y)}`;
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const scale = (a: Point, k: number): Point => [a[0] * k, a[1] * k];
const unit = (a: Point): Point => {
  const length = Math.hypot(a[0], a[1]) || 1;

  return [a[0] / length, a[1] / length];
};

/** The point at radius `r` and angle `degrees`, clockwise from straight up. */
function polar(r: number, degrees: number, [cx, cy]: Point = [0, 0]): Point {
  const angle = (degrees * Math.PI) / 180;

  return [cx + r * Math.sin(angle), cy - r * Math.cos(angle)];
}

function onCurve([p0, p1, p2, p3]: Curve, t: number): Point {
  const u = 1 - t;
  const at = (k: 0 | 1) =>
    u * u * u * p0[k] +
    3 * u * u * t * p1[k] +
    3 * u * t * t * p2[k] +
    t * t * t * p3[k];

  return [at(0), at(1)];
}

function tangent([p0, p1, p2, p3]: Curve, t: number): Point {
  const u = 1 - t;
  const at = (k: 0 | 1) =>
    3 * u * u * (p1[k] - p0[k]) +
    6 * u * t * (p2[k] - p1[k]) +
    3 * t * t * (p3[k] - p2[k]);

  return [at(0), at(1)];
}

/** A smooth curve through the points, as cubic segments without a move-to. */
function through(points: Point[]) {
  let d = "";

  for (let i = 0; i < points.length - 1; i++) {
    const before = points[Math.max(0, i - 1)];
    const from = points[i];
    const to = points[i + 1];
    const after = points[Math.min(points.length - 1, i + 2)];

    d += `C${xy(add(from, scale(sub(to, before), 1 / 6)))} ${xy(sub(to, scale(sub(after, from), 1 / 6)))} ${xy(to)}`;
  }

  return d;
}

/** A leaf's half-width at t, from 0 at its base to 1 at its pointed tip. */
function leafWidth(t: number, bulge: number, base: number) {
  if (t <= bulge) {
    return base + (1 - base) * Math.sin((Math.PI / 2) * (t / bulge));
  }

  return Math.pow(Math.cos((Math.PI / 2) * ((t - bulge) / (1 - bulge))), 1.15);
}

type LeafShape = {
  width: number;
  bulge?: number;
  base?: number;
  /** Serrations along one side, as on a saz leaf. */
  teeth?: number;
  depth?: number;
};

/** A pointed leaf along a curve: its outline, and its plain side's points. */
function leaf(
  spine: Curve,
  { width, bulge = 0.42, base = 0.25, teeth = 0, depth = 1 }: LeafShape,
) {
  const samples = teeth ? teeth * 2 : 12;
  const serrated: Point[] = [];
  const plain: Point[] = [];

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const point = onCurve(spine, t);
    const [tx, ty] = unit(tangent(spine, t));
    const normal: Point = [-ty, tx];
    const half = width * leafWidth(t, bulge, base);
    const tooth =
      teeth && i % 2 === 1 && i < samples - 1
        ? depth * Math.sin(Math.PI * t)
        : 0;

    serrated.push(add(point, scale(normal, half + tooth)));
    plain.push(add(point, scale(normal, -half)));
  }
  const tip = onCurve(spine, 1);
  serrated[samples] = tip;
  plain[samples] = tip;
  const serratedSide = teeth
    ? serrated
        .slice(1)
        .map((point) => `L${xy(point)}`)
        .join("")
    : through(serrated);

  return {
    d: `M${xy(serrated[0])}${serratedSide}${through([...plain].reverse())}Z`,
    plain,
  };
}

// ---------- elements ----------

const shape = (d: string, fill: string, extra = "") =>
  `<path d="${d}" fill="${fill}"${extra}/>`;
const outlined = (d: string, fill: string, width = 0.5) =>
  shape(
    d,
    fill,
    ` stroke="${COLOURS.line}" stroke-width="${width}" stroke-linejoin="round"`,
  );
const stroke = (d: string, colour: string, width: number) =>
  `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${width}" stroke-linecap="round"/>`;
const place = (id: string, x: number, y: number, transform = "") =>
  `<use href="#${id}" transform="translate(${fmt(x)} ${fmt(y)})${transform}"/>`;

// ---------- motifs, each drawn once in its own coordinates ----------

/** Lale: an Ottoman tulip, its base at 0,0, 30 high, pointing up. */
function tulip() {
  const side =
    "M-.6-1.2C-4.6-3.6-6.4-9.4-6-15.2C-5.7-19.6-4.8-23.6-5.6-28.4C-3.4-25.4-2.3-21.2-1.9-16.4C-1.5-10.6-1.1-4.8-.6-1.2Z";
  const vein = "M-1.5-4.6C-3.6-8.6-4.3-15-4.2-22.6";
  const centre =
    "M0-1.6C-3.4-6.4-3.8-15.2-2.2-22.2C-1.4-25.6-.6-28.4 0-30.6C.6-28.4 1.4-25.6 2.2-22.2C3.8-15.2 3.4-6.4 0-1.6Z";

  return [
    `<path id="tulip-petal" d="${side}" fill="${COLOURS.red}"${OUTLINE}/>`,
    stroke(vein, COLOURS.white, 0.5),
    `<g transform="scale(-1 1)"><use href="#tulip-petal"/>${stroke(vein, COLOURS.white, 0.5)}</g>`,
    outlined(centre, COLOURS.red),
    stroke("M0-5.5V-26", COLOURS.white, 0.6),
    stroke(
      "M-1.3-7C-1.9-12-1.9-17-1.1-21.6M1.3-7C1.9-12 1.9-17 1.1-21.6",
      COLOURS.white,
      0.35,
    ),
  ].join("");
}

/** Karanfil: a carnation seen from the side, its base at 0,0, 21 high. */
function carnation() {
  const centre: Point = [0, -8.6];
  const from = -76;
  const teeth = 15;
  const step = 152 / teeth;
  const outline: Point[] = [[-3.1, -8.2]];

  for (let k = 0; k <= teeth; k++) {
    // Deeper notches part the five petals.
    const parting = k % 3 === 0 && k > 0 && k < teeth;

    outline.push(polar(parting ? 8.2 : 9.4, from + step * k, centre));
    if (k < teeth) outline.push(polar(11.6, from + step * (k + 0.5), centre));
  }
  outline.push([3.1, -8.2]);
  const seams = [3, 6, 9, 12]
    .map(
      (k) =>
        `M${xy(polar(2.5, from + step * k, centre))}L${xy(polar(8.4, from + step * k, centre))}`,
    )
    .join("");
  const ring = `M${xy(polar(4.2, -70, centre))}A4.2 4.2 0 0 1 ${xy(polar(4.2, 70, centre))}`;

  return [
    outlined(`M${outline.map(xy).join("L")}Z`, COLOURS.red),
    stroke(seams, COLOURS.white, 0.55),
    stroke(ring, COLOURS.white, 0.45),
    outlined(
      "M-3.3-8.4L-5.8-10.4L-2.1-9.6ZM3.3-8.4L5.8-10.4L2.1-9.6Z",
      COLOURS.green,
    ),
    outlined(
      "M-3.3-8.4C-3.1-4.4-2.1-1.3 0 0C2.1-1.3 3.1-4.4 3.3-8.4Z",
      COLOURS.turquoise,
    ),
    stroke("M0-1.8V-7.2", COLOURS.white, 0.4),
  ].join("");
}

/** Hatayi: a stylised flower seen from above, centred at 0,0, radius 14. */
function hatayi() {
  const petal =
    "M0-4.4C-3.9-5.4-5.8-8.9-4-11.6C-2.8-13.1-1.1-12.9 0-14.2C1.1-12.9 2.8-13.1 4-11.6C5.8-8.9 3.9-5.4 0-4.4Z";
  const inner =
    "M0-6C-2.1-6.9-2.8-9.3-1.8-10.8C-1.1-11.6-.5-11.5 0-12.3C.5-11.5 1.1-11.6 1.8-10.8C2.8-9.3 2.1-6.9 0-6Z";
  const parts = [
    `<g id="hatayi-tip" transform="rotate(22.5)"><path d="M0-4.6Q-1.9-7.6 0-10.6Q1.9-7.6 0-4.6Z" fill="${COLOURS.turquoise}"${OUTLINE}/></g>`,
  ];

  for (let k = 1; k < 8; k++) {
    parts.push(`<use href="#hatayi-tip" transform="rotate(${k * 45})"/>`);
  }
  parts.push(
    `<g id="hatayi-petal"><path d="${petal}" fill="${COLOURS.cobalt}"${OUTLINE}/><path d="${inner}" fill="${COLOURS.turquoise}"/></g>`,
  );
  for (let k = 1; k < 8; k++) {
    parts.push(`<use href="#hatayi-petal" transform="rotate(${k * 45})"/>`);
  }
  parts.push(`<circle r="5.4" fill="${COLOURS.red}"${OUTLINE}/>`);
  for (let k = 0; k < 8; k++) {
    const [x, y] = polar(3.7, k * 45 + 22.5);

    parts.push(
      `<circle cx="${fmt(x)}" cy="${fmt(y)}" r=".65" fill="${COLOURS.white}"/>`,
    );
  }
  parts.push(
    `<circle r="2.2" fill="${COLOURS.cobalt}"${OUTLINE}/>`,
    `<circle r=".8" fill="${COLOURS.white}"/>`,
  );

  return parts.join("");
}

/** Penç: a five-petalled flower seen from above, radius 8.4. */
function penc() {
  const petal =
    "M0-1.6C-3-2.4-3.9-6-1.6-7.6C-.8-8.1-.3-7.6 0-8.4C.3-7.6.8-8.1 1.6-7.6C3.9-6 3-2.4 0-1.6Z";
  const parts = [
    `<path id="penc-sepal" transform="rotate(36)" d="M0-2Q-1.4-4.6 0-6.8Q1.4-4.6 0-2Z" fill="${COLOURS.cobalt}"${OUTLINE}/>`,
  ];

  for (let k = 1; k < 5; k++) {
    parts.push(`<use href="#penc-sepal" transform="rotate(${k * 72})"/>`);
  }
  parts.push(
    `<g id="penc-petal"><path d="${petal}" fill="${COLOURS.red}"${OUTLINE}/>${stroke("M0-3V-6.4", COLOURS.white, 0.45)}</g>`,
  );
  for (let k = 1; k < 5; k++) {
    parts.push(`<use href="#penc-petal" transform="rotate(${k * 72})"/>`);
  }
  parts.push(
    `<circle r="2.1" fill="${COLOURS.turquoise}"${OUTLINE}/>`,
    `<circle r=".7" fill="${COLOURS.white}"/>`,
  );

  return parts.join("");
}

/** Çintemani's three pearls. */
function pearls() {
  return [0, 120, 240]
    .map((degrees) => {
      const [x, y] = polar(2, degrees);

      return `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="1.35" fill="${COLOURS.red}"${OUTLINE}/>`;
    })
    .join("");
}

/** Sümbül: a hyacinth sprig, its base at 0,0, 20 high, with cobalt bells. */
function hyacinth() {
  const parts = [
    stroke("M0 0C.5-5 .1-11 1-17", COLOURS.green, 0.8),
    `<path id="hyacinth-bell" d="M0 0C-1.3.3-1.7 1.8-1.1 3.1L0 2.5L1.1 3.1C1.7 1.8 1.3.3 0 0Z" fill="${COLOURS.cobalt}"${OUTLINE}/>`,
  ];
  const bells: Array<[number, number, number]> = [
    [0.15, -4, 58],
    [0.3, -6.5, -58],
    [0.35, -9.5, 58],
    [0.55, -12.4, -58],
    [0.75, -15, 50],
  ];

  for (const [x, y, degrees] of bells) {
    parts.push(
      `<use href="#hyacinth-bell" transform="translate(${x} ${y}) rotate(${degrees})"/>`,
    );
  }
  parts.push(
    `<path d="M1-17Q.1-19 1.1-20.6Q2-19 1-17Z" fill="${COLOURS.cobalt}"${OUTLINE}/>`,
  );

  return parts.join("");
}

/** A saz leaf: long, curved and serrated, cobalt with a turquoise half. */
function saz(spine: Curve, width: number, teeth: number) {
  const { d, plain } = leaf(spine, {
    width,
    teeth,
    depth: width * 0.3,
    bulge: 0.38,
    base: 0.3,
  });
  const midrib = Array.from({ length: 11 }, (_, i) => onCurve(spine, i / 10));
  const edge = plain
    .filter((_, i) => i % 2 === 0)
    .map((point, i, all) =>
      add(
        point,
        scale(sub(midrib[Math.round((i / (all.length - 1)) * 10)], point), 0.2),
      ),
    );

  return [
    outlined(d, COLOURS.cobalt, LINE),
    shape(
      `M${xy(midrib[0])}${through(midrib)}${through([...edge].reverse())}Z`,
      COLOURS.turquoise,
    ),
    stroke(
      `M${xy(midrib[0])}${through(midrib.slice(0, 9))}`,
      COLOURS.white,
      width * 0.13,
    ),
  ].join("");
}

/** A plain green leaf along a curve. */
function greenLeaf(spine: Curve, width: number) {
  const { d } = leaf(spine, { width, bulge: 0.45, base: 0.2 });
  const vein = [0, 0.25, 0.5, 0.72].map((t) => onCurve(spine, t));

  return (
    outlined(d, COLOURS.green, LINE) +
    stroke(`M${xy(vein[0])}${through(vein)}`, COLOURS.white, width * 0.15)
  );
}

// ---------- the vines and the corner sprays ----------

/**
 * A running stem: a sine-like wave of cubic segments along x (or y), rising
 * first to `centre - amplitude`.
 */
function stem(
  start: number,
  length: number,
  centre: number,
  amplitude: number,
  period: number,
  along: "x" | "y",
) {
  const quarter = period / 4;
  const pull = (amplitude * Math.PI) / 6;
  const point = (a: number, b: number): Point =>
    along === "x" ? [a, b] : [b, a];
  let position = start;
  let d = `M${xy(point(position, centre))}`;

  for (let i = 0; i < Math.round(length / quarter); i++) {
    const phase = i % 4;
    const sign = phase < 2 ? -1 : 1;
    const outward = phase % 2 === 0;
    const peak = centre + sign * amplitude;
    const c1 = point(
      position + quarter / 3,
      outward ? centre + sign * pull : peak,
    );
    const c2 = point(
      position + (2 * quarter) / 3,
      outward ? peak : centre + sign * pull,
    );

    position += quarter;
    d += `C${xy(c1)} ${xy(c2)} ${xy(point(position, outward ? peak : centre))}`;
  }

  return stroke(d, COLOURS.stem, 2);
}

/** A stalk from a stem to a flower, curving through `bend`. */
const stalk = (from: Point, bend: Point, to: Point, width = 1.6) =>
  stroke(`M${xy(from)}Q${xy(bend)} ${xy(to)}`, COLOURS.stem, width);

const MOTIFS: Array<[string, () => string]> = [
  ["tulip", tulip],
  ["carnation", carnation],
  ["hatayi", hatayi],
  ["penc", penc],
  ["pearls", pearls],
  ["hyacinth", hyacinth],
];

function svg(width: number, height: number, body: string[]) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`,
    "<!-- Drawn by scripts/draw-motifs.ts: edit the drawing there, not here. -->",
    "<defs>",
    ...MOTIFS.map(([id, draw]) => `<g id="${id}">${draw()}</g>`),
    "</defs>",
    ...body,
    "</svg>",
    "",
  ].join("\n");
}

/** A tendril curling in from `at`, about `size` across, turning 1.2 times. */
function curl(at: Point, size: number, startDegrees: number, turn: 1 | -1) {
  const start = polar(size, startDegrees);
  const centre = sub(at, start);
  const points = Array.from({ length: 17 }, (_, i) => {
    const t = i / 16;

    return polar(size * (1 - 0.8 * t), startDegrees + turn * 430 * t, centre);
  });

  return stroke(`M${xy(points[0])}${through(points)}`, COLOURS.stem, 1.1);
}

/**
 * A vine: 160 wide and 384 high, repeating down the left of the page; the
 * right one is its mirror image. Its stem runs near the outer edge, furthest
 * in (x 34) at both ends of the piece, where it joins the corner spray.
 * From it grow a tulip with a saz leaf curling over it, and a hatayi under an
 * arching saz leaf with a carnation below.
 */
function vine() {
  const height = 384;
  const stemX = (y: number) => 26 + 8 * Math.cos((2 * Math.PI * y) / 192);
  const on = (y: number): Point => [stemX(y), y];

  return svg(160, height, [
    saz([on(112), [24, 70], [50, 30], [94, 14]], 5.6, 12),
    saz(
      [
        [40, 146],
        [76, 140],
        [108, 152],
        [126, 182],
      ],
      5,
      11,
    ),
    saz([on(222), [62, 198], [106, 204], [132, 236]], 5.6, 12),
    greenLeaf(
      [
        [42, 300],
        [60, 310],
        [70, 326],
        [70, 344],
      ],
      3,
    ),
    stem(-144, height + 288, 26, 8, 192, "y"),
    stroke(
      `M${xy(on(150))}C44 146 58 128 68 104M${xy(on(246))}C45 248 58 262 66 268M${xy(on(330))}C40 332 50 338 56 336`,
      COLOURS.stem,
      1.6,
    ),
    curl([112, 112], 7, 250, 1),
    curl([58, 226], 6, 330, -1),
    place("tulip", 68, 104, " rotate(28) scale(2.4)"),
    place("hatayi", 90, 276, " scale(2.2)"),
    place("carnation", 56, 336, " rotate(80) scale(1.9)"),
    place("hyacinth", stemX(190), 190, " rotate(52) scale(1.6)"),
    place("pearls", 132, 120, " scale(1.4)"),
    place("pearls", 120, 342, " scale(1.4)"),
  ]);
}

/**
 * The spray in the top left corner, 160 wide and 240 high; the top right one
 * is its mirror image. A hatayi sits in the corner, a tulip grows from it into
 * the page, a short stem with a hyacinth curls along the top, and the vine's
 * stem leaves at the bottom edge (x 34, upright), where the vine joins it.
 */
function corner() {
  return svg(160, 240, [
    saz(
      [
        [78, 30],
        [104, 34],
        [128, 48],
        [152, 72],
      ],
      5.6,
      12,
    ),
    saz(
      [
        [30, 80],
        [34, 108],
        [46, 136],
        [66, 164],
      ],
      5.6,
      12,
    ),
    stroke("M-8 0C40 14 92 10 124 20M0-8C18 30 34 150 34 240", COLOURS.stem, 2),
    curl([124, 20], 6, 18, 1),
    stalk([70, 70], [86, 88], [100, 100], 1.8),
    stalk([34, 196], [46, 200], [56, 194]),
    curl([118, 92], 6, 200, -1),
    place("tulip", 100, 100, " rotate(135) scale(2.3)"),
    place("hatayi", 46, 46, " scale(2.4)"),
    place("carnation", 56, 194, " rotate(65) scale(1.9)"),
    place("hyacinth", 98, 14, " rotate(165) scale(1.5)"),
    place("pearls", 126, 112, " scale(1.5)"),
    place("pearls", 86, 158, " scale(1.4)"),
  ]);
}

/**
 * The mark beside the site's name: an İznik plate, a hatayi inside a cobalt
 * rim of white beads, 64 square. The page turns it by one petal (45°) when
 * the name is pointed at, which leaves the drawing looking the same.
 */
function emblem() {
  const beads = Array.from({ length: 16 }, (_, k) => {
    const [x, y] = polar(27.4, k * 22.5, [32, 32]);

    return `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="1.3" fill="${COLOURS.white}"/>`;
  });

  return svg(64, 64, [
    `<circle cx="32" cy="32" r="31.2" fill="${COLOURS.cobalt}"${OUTLINE}/>`,
    ...beads,
    `<circle cx="32" cy="32" r="24.6" fill="${COLOURS.glaze}" stroke="${COLOURS.turquoise}" stroke-width="1.4"/>`,
    place("hatayi", 32, 32, " scale(1.55)"),
  ]);
}

export const MOTIFS_DIRECTORY = fileURLToPath(
  new URL("../src/app/motifs/", import.meta.url),
);

/** Each drawing's file name and content. */
export function drawMotifs() {
  return {
    "vine.svg": vine(),
    "corner.svg": corner(),
    "emblem.svg": emblem(),
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await mkdir(MOTIFS_DIRECTORY, { recursive: true });
  for (const [name, content] of Object.entries(drawMotifs())) {
    await writeFile(join(MOTIFS_DIRECTORY, name), content);
    console.log(`Drew src/app/motifs/${name}.`);
  }
}
