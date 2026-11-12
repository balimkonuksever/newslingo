// Draws the Turkish motif bands that frame every page, in src/app/motifs/:
// band.svg, the frieze across the top and bottom of the page, and side.svg,
// the bands down both sides on wide screens. They follow İznik tile borders:
// a running stem with lale (tulip), karanfil (carnation), hatayi and penç
// flowers, serrated saz leaves, sümbül (hyacinth) sprigs and çintemani's
// three pearls, between cobalt guard strips. Every shape is drawn here from
// geometry; nothing is traced or copied from an existing artwork.
//
//   pnpm exec tsx scripts/draw-motifs.ts
//
// rewrites both files. scripts/draw-motifs.test.ts fails while the committed
// files differ from what this script draws, so edit the drawing here.
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type Point = [number, number];
type Curve = [Point, Point, Point, Point];

/** İznik colours, with a ground warm enough to sit on the site's paper. */
const COLOURS = {
  ground: "#fdfaf3",
  cobalt: "#1f3d93",
  turquoise: "#35a19c",
  red: "#c63c2c",
  green: "#3b7d55",
  stem: "#2f6c4a",
  line: "#1a2242",
  white: "#ffffff",
};

/** Drawing units are pixels at full size: bands 64 units across. */
const OUTLINE = ` stroke="${COLOURS.line}" stroke-width="0.5" stroke-linejoin="round"`;

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
const outlined = (d: string, fill: string) => shape(d, fill, OUTLINE);
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
    depth: 0.85,
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
    outlined(d, COLOURS.cobalt),
    shape(
      `M${xy(midrib[0])}${through(midrib)}${through([...edge].reverse())}Z`,
      COLOURS.turquoise,
    ),
    stroke(
      `M${xy(midrib[0])}${through(midrib.slice(0, 9))}`,
      COLOURS.white,
      0.4,
    ),
  ].join("");
}

/** A plain green leaf along a curve. */
function greenLeaf(spine: Curve, width: number) {
  const { d } = leaf(spine, { width, bulge: 0.45, base: 0.2 });
  const vein = [0, 0.25, 0.5, 0.72].map((t) => onCurve(spine, t));

  return (
    outlined(d, COLOURS.green) +
    stroke(`M${xy(vein[0])}${through(vein)}`, COLOURS.white, 0.3)
  );
}

// ---------- the bands ----------

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

  return stroke(d, COLOURS.stem, 1.15);
}

/** Cobalt guard strips: a white bead every 8 units, a turquoise dot between. */
const GUARDS =
  `<pattern id="guard-x" width="8" height="6" patternUnits="userSpaceOnUse"><rect width="8" height="6" fill="${COLOURS.cobalt}"/><circle cx="2" cy="3" r="1.2" fill="${COLOURS.white}"/><circle cx="6" cy="3" r=".5" fill="${COLOURS.turquoise}"/></pattern>` +
  `<pattern id="guard-y" width="6" height="8" patternUnits="userSpaceOnUse"><rect width="6" height="8" fill="${COLOURS.cobalt}"/><circle cx="3" cy="2" r="1.2" fill="${COLOURS.white}"/><circle cx="3" cy="6" r=".5" fill="${COLOURS.turquoise}"/></pattern>`;

const guard = (x: number, y: number, w: number, h: number, along: "x" | "y") =>
  `<rect width="${w}" height="${h}" transform="translate(${x} ${y})" fill="url(#guard-${along})"/>`;

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
    GUARDS,
    "</defs>",
    ...body,
    "</svg>",
    "",
  ].join("\n");
}

/**
 * The frieze: 256 wide and 64 high, repeating sideways. Guard strips at the
 * top and bottom, and a field from 7 to 57 where the stem crests at x 32 and
 * 160 and dips at 96 and 224.
 */
function band() {
  const width = 256;
  const stemY = (x: number) => 32 - 10 * Math.sin((2 * Math.PI * x) / 128);
  const leaves = [
    saz(
      [
        [58, stemY(58)],
        [52, 18],
        [42, 11],
        [27, 10],
      ],
      3,
      8,
    ),
    saz(
      [
        [70, stemY(70)],
        [76, 45],
        [86, 51.5],
        [100, 52.5],
      ],
      2.8,
      8,
    ),
  ].join("");

  return svg(width, 64, [
    `<rect width="${width}" height="64" fill="${COLOURS.ground}"/>`,
    guard(0, 0, width, 6, "x"),
    guard(0, 58, width, 6, "x"),
    `<rect y="6" width="${width}" height="1" fill="${COLOURS.turquoise}"/>`,
    `<rect y="57" width="${width}" height="1" fill="${COLOURS.turquoise}"/>`,
    `<g id="saz-pair">${leaves}</g>`,
    `<use href="#saz-pair" transform="translate(128 0)"/>`,
    greenLeaf(
      [
        [96, 41],
        [90, 38.5],
        [85, 33],
        [83.5, 26],
      ],
      2,
    ),
    greenLeaf(
      [
        [96, 41],
        [102, 38.5],
        [107, 33],
        [108.5, 26],
      ],
      2,
    ),
    greenLeaf(
      [
        [224, 41],
        [218, 39.5],
        [213.5, 36],
        [212, 30],
      ],
      1.8,
    ),
    greenLeaf(
      [
        [224, 41],
        [230, 39.5],
        [234.5, 36],
        [236, 30],
      ],
      1.8,
    ),
    greenLeaf(
      [
        [160, 22],
        [151, 24],
        [146, 30],
        [146.5, 37],
      ],
      1.6,
    ),
    greenLeaf(
      [
        [160, 22],
        [169, 24],
        [174, 30],
        [173.5, 37],
      ],
      1.6,
    ),
    stem(-128, width + 256, 32, 10, 128, "x"),
    stroke("M32 22V28M160 22V29", COLOURS.stem, 1),
    place("hatayi", 32, 41.5, " scale(.97)"),
    place("tulip", 96, 41, " scale(1.06)"),
    place("penc", 160, 38, " scale(1.12)"),
    place("carnation", 224, 41, " scale(1.1)"),
    place("hyacinth", 12, 54, " rotate(-8)"),
    place("hyacinth", 132, 26, " scale(.95)"),
    place("pearls", 13, 15),
    place("pearls", 122, 48),
    place("pearls", 197, 14),
    place("pearls", 245, 49),
  ]);
}

/**
 * The side band: 64 wide and 256 high, repeating downwards. The stem bulges
 * left at y 32 and 160 and right at 96 and 224, and the flowers fill the
 * wider side of each bulge.
 */
function side() {
  const height = 256;
  const stemX = (y: number) => 32 - 8 * Math.sin((2 * Math.PI * y) / 128);
  const branch = (y: number, x: number, toY: number) =>
    `M${fmt(stemX(y))} ${y}C${fmt(stemX(y) + 6)} ${y} ${fmt(x - 2)} ${fmt(toY + 3)} ${fmt(x)} ${fmt(toY)}`;
  const leaves = [
    saz(
      [
        [stemX(6), 6],
        [21, 12],
        [13.5, 23],
        [12, 40],
      ],
      2.7,
      7,
    ),
    greenLeaf(
      [
        [stemX(70), 70],
        [44, 74],
        [50.5, 85],
        [51, 101],
      ],
      1.9,
    ),
  ].join("");

  return svg(64, height, [
    `<rect width="64" height="${height}" fill="${COLOURS.ground}"/>`,
    guard(0, 0, 6, height, "y"),
    guard(58, 0, 6, height, "y"),
    `<rect x="6" width="1" height="${height}" fill="${COLOURS.turquoise}"/>`,
    `<rect x="57" width="1" height="${height}" fill="${COLOURS.turquoise}"/>`,
    `<g id="leaf-pair">${leaves}</g>`,
    `<use href="#leaf-pair" transform="translate(0 128)"/>`,
    stem(-128, height + 256, 32, 8, 128, "y"),
    stroke(
      `${branch(60, 43, 52)}${branch(188, 43, 180)}M40 96H35M40 224H30`,
      COLOURS.stem,
      1,
    ),
    greenLeaf(
      [
        [43, 52],
        [38, 49],
        [35, 44],
        [35.5, 37],
      ],
      1.7,
    ),
    greenLeaf(
      [
        [43, 180],
        [38, 177],
        [35, 172],
        [35.5, 165],
      ],
      1.7,
    ),
    greenLeaf(
      [
        [22, 232],
        [17, 236],
        [13, 242],
        [13, 249],
      ],
      1.6,
    ),
    place("tulip", 43, 52, " scale(1.02)"),
    place("hatayi", 21, 96, " scale(.92)"),
    place("carnation", 43, 180, " scale(1.05)"),
    place("penc", 21, 224, " scale(1.05)"),
    place("hyacinth", 48, 126, " scale(.9)"),
    place("hyacinth", 15, 190, " scale(.9) rotate(-6)"),
    place("pearls", 49, 72),
    place("pearls", 13, 130),
    place("pearls", 49, 240),
    place("pearls", 14, 62),
  ]);
}

export const MOTIFS_DIRECTORY = fileURLToPath(
  new URL("../src/app/motifs/", import.meta.url),
);

/** Each drawing's file name and content. */
export function drawMotifs() {
  return { "band.svg": band(), "side.svg": side() };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  for (const [name, content] of Object.entries(drawMotifs())) {
    await writeFile(join(MOTIFS_DIRECTORY, name), content);
    console.log(`Drew src/app/motifs/${name}.`);
  }
}
