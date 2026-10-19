// Tegner øvelser som ikke finnes i Free Exercise DB, med start- og sluttbilde, og lagrer dem som
// public/exercises/{id}/0.jpg og 1.jpg (samme format som de nedlastede bildene).
// ID-ene starter med «Cut_», så `npm run images` vet at de ikke skal hentes fra nett.
//
// Kjør: npm run images:draw
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = 850;
const H = 567;
/** Der hender, knær og føtter står på matta (nærmeste side). */
const FLOOR = 466;
/** Lemmer på siden som vender bort, står litt lenger inn på matta. */
const FAR = [6, -6];
const TORSO = 165;

const C = {
  wallTop: '#EFEBE5',
  wallBottom: '#E1DBD2',
  floorTop: '#D6C8B6',
  floorBottom: '#BCAA94',
  board: '#D9D2C8',
  mat: '#4C525B',
  matTop: '#636A75',
  matEdge: '#373B42',
  skin: '#E2A47C',
  skinFar: '#B97F5C',
  top: '#2F6F98',
  shorts: '#272A30',
  shortsNear: '#33373E',
  shortsFar: '#1C1E23',
  shoe: '#F4F3F0',
  shoeFar: '#C9C6C0',
  hair: '#4A3426',
  line: '#2B201B',
};

// ---------- Geometri (skjermkoordinater, y nedover) ----------

const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]);
const unit = (a) => mul(a, 1 / len(a));
const lerp = (a, b, t) => add(a, mul(sub(b, a), t));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
/** Retning i grader: 0 = høyre, 90 = opp. */
const dir = (deg) => [Math.cos((deg * Math.PI) / 180), -Math.sin((deg * Math.PI) / 180)];
const polar = (p, length, deg) => add(p, mul(dir(deg), length));
/** Roterer 90° mot klokka (side 1) eller med klokka (side −1) slik det ser ut på skjermen. */
const turn = (a, side) => (side > 0 ? [a[1], -a[0]] : [-a[1], a[0]]);

/** Ledd mellom a og c med lengdene l1 og l2. Velger løsningen som ligger høyest (kne opp). */
function joint(a, c, l1, l2) {
  const d = Math.min(len(sub(c, a)), l1 + l2 - 0.01);
  const base = Math.atan2(c[1] - a[1], c[0] - a[0]);
  const angle = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
  const options = [base + angle, base - angle].map((t) => [
    a[0] + l1 * Math.cos(t),
    a[1] + l1 * Math.sin(t),
  ]);
  return options[0][1] < options[1][1] ? options[0] : options[1];
}

// ---------- Former: kjeder av sirkler med tangenter imellom (avsmalnende kapsler) ----------

function tangents([c1, r1], [c2, r2]) {
  const d = sub(c2, c1);
  const dist = len(d);
  if (dist <= Math.abs(r1 - r2)) return null;
  const theta = Math.atan2(d[1], d[0]);
  const phi = Math.acos((r1 - r2) / dist);
  const at = (c, r, a) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  return [
    at(c1, r1, theta + phi),
    at(c2, r2, theta + phi),
    at(c2, r2, theta - phi),
    at(c1, r1, theta - phi),
  ];
}

const n = (x) => Math.round(x * 10) / 10;
const pts = (list) => list.map((p) => `${n(p[0])},${n(p[1])}`).join(' ');

/** En kroppsdel: punkter med radius, fylt med én farge. `cut` gir en rett kant (fald). */
const part = (fill, ...nodes) => ({ fill, nodes });
/** Beholder bare det som ligger i retning `towards` fra linja gjennom `at`. */
const cut = (p, at, towards) => ({ ...p, cut: { at, towards: unit(towards) } });

let clipCount = 0;
function shapes(p, attrs, defs) {
  const out = p.nodes.map(
    ([c, r]) => `<circle cx="${n(c[0])}" cy="${n(c[1])}" r="${n(r)}" ${attrs}/>`,
  );
  for (let i = 1; i < p.nodes.length; i++) {
    const quad = tangents(p.nodes[i - 1], p.nodes[i]);
    if (quad) out.push(`<polygon points="${pts(quad)}" ${attrs}/>`);
  }
  if (!p.cut) return out.join('');
  const { at, towards } = p.cut;
  const side = turn(towards, 1);
  const id = `cut${++clipCount}`;
  const half = [
    add(at, mul(side, 600)),
    add(add(at, mul(side, 600)), mul(towards, 600)),
    add(add(at, mul(side, -600)), mul(towards, 600)),
    add(at, mul(side, -600)),
  ];
  defs.push(`<clipPath id="${id}"><polygon points="${pts(half)}"/></clipPath>`);
  return `<g clip-path="url(#${id})">${out.join('')}</g>`;
}

/**
 * Tegner lagene bakfra og fram. Én kontur rundt hele figuren, og en svakere kontur der
 * lemmene på nærmeste side ligger over kroppen.
 */
function draw(layers) {
  const defs = [];
  const all = layers.flatMap((l) => l.parts);
  const outline = all
    .map((p) =>
      shapes(
        p,
        `fill="${C.line}" stroke="${C.line}" stroke-width="5" stroke-linejoin="round"`,
        defs,
      ),
    )
    .join('');
  const body = layers
    .map((l) => {
      const inner = l.innerLine
        ? `<g opacity="0.35">${l.parts
            .map((p) => shapes(p, `fill="none" stroke="${C.line}" stroke-width="3"`, defs))
            .join('')}</g>`
        : '';
      const fill = l.parts.map((p) => shapes(p, `fill="${p.fill}"`, defs)).join('');
      return `${inner}${fill}${l.extra ?? ''}`;
    })
    .join('');
  return `<defs>${defs.join('')}</defs>${outline}${body}`;
}

// ---------- Figuren ----------

function torsoPoint(pose, t) {
  const split = 0.55;
  const mid = polar(pose.hip, TORSO * split, pose.lower);
  return t <= split
    ? polar(pose.hip, TORSO * t, pose.lower)
    : polar(mid, TORSO * (t - split), pose.upper);
}

function leg(hip, l, far) {
  const skin = far ? C.skinFar : C.skin;
  const thigh = sub(l.knee, hip);
  return [
    part(skin, [hip, 24], [l.knee, 15]),
    part(skin, [l.knee, 15], [lerp(l.knee, l.ankle, 0.3), 16], [l.ankle, 9.5]),
    cut(
      part(far ? C.shortsFar : C.shortsNear, [hip, 27], [lerp(hip, l.knee, 0.6), 21]),
      lerp(hip, l.knee, 0.45),
      mul(thigh, -1),
    ),
    part(far ? C.shoeFar : C.shoe, [l.ankle, 10.5], ...(l.heel ? [[l.heel, 10]] : []), [
      l.toe,
      8.5,
    ]),
  ];
}

const upperArm = (root, a, far) => [part(far ? C.skinFar : C.skin, [root, 18], [a.elbow, 12])];
function forearm(a, far) {
  const skin = far ? C.skinFar : C.skin;
  return [
    part(skin, [a.elbow, 12], [lerp(a.elbow, a.wrist, 0.3), 13.5], [a.wrist, 9]),
    part(skin, [a.wrist, 9.5], [a.hand, 7.5]),
  ];
}

function head(center, axis, face) {
  const r = 27;
  // Håret dekker bakhodet og toppen (motsatt side av ansiktet).
  const back = unit(sub(mul(axis, 0.85), mul(face, 0.5)));
  const hair = [];
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2;
    const d = [Math.cos(a), Math.sin(a)];
    if (dot(d, back) > 0.12) hair.push(add(center, mul(d, r + 1.5)));
  }
  // Start buen der den begynner, så polygonet ikke krysser seg selv.
  const start = hair.findIndex((p, i) => i > 0 && len(sub(p, hair[i - 1])) > 5);
  const arc = start > 0 ? [...hair.slice(start), ...hair.slice(0, start)] : hair;
  const at = (f, a) => add(center, add(mul(face, f), mul(axis, a)));
  const eye = at(14, 9);
  return {
    parts: [part(C.skin, [center, r]), part(C.skin, [at(25, 3), 5.5])],
    extra: [
      `<polygon points="${pts(arc)}" fill="${C.hair}"/>`,
      `<circle cx="${n(eye[0])}" cy="${n(eye[1])}" r="2.5" fill="${C.line}"/>`,
    ].join(''),
  };
}

/**
 * Figuren sett fra venstre side. pose.lower/upper: vinkelen på nedre og øvre del av
 * overkroppen. face: −1 = ansiktet ned, 1 = opp.
 */
function figure(pose) {
  const axis = dir(pose.upper);
  const face = turn(axis, pose.face);
  const shoulder = torsoPoint(pose, 1);
  const headCenter = add(add(shoulder, mul(axis, 49)), mul(face, pose.headShift));
  const torso = (from, to) =>
    [
      [0, 31],
      [0.35, 27.5],
      [0.55, 29],
      [0.78, 32.5],
      [1, 25],
    ]
      .filter(([t]) => t >= from && t <= to)
      .map(([t, r]) => [torsoPoint(pose, t), r]);
  const hem = torsoPoint(pose, 0.38);
  const h = head(headCenter, axis, face);

  const behind = [];
  const far = [];
  const near = [...leg(pose.hip, pose.nearLeg, false)];
  if (pose.farLeg) far.push(...leg(pose.hip, pose.farLeg, true));
  if (pose.farArm)
    far.push(...upperArm(pose.armRoot, pose.farArm, true), ...forearm(pose.farArm, true));
  if (pose.nearArm.behind) behind.push(...forearm(pose.nearArm, false));
  else near.push(...forearm(pose.nearArm, false));
  near.push(...upperArm(pose.armRoot, pose.nearArm, false));

  const body = [
    part(C.skin, [torsoPoint(pose, 0.97), 12.5], [add(headCenter, mul(axis, -20)), 11]),
    part(C.shorts, ...torso(0, 0.55)),
    cut(part(C.top, ...torso(0.35, 1)), hem, dir(pose.lower)),
    ...h.parts,
  ];
  return draw([
    { parts: behind },
    { parts: far },
    { parts: body, extra: h.extra },
    { parts: near, innerLine: true },
  ]);
}

/** Skulderleddet ligger litt under ryggens linje, på brystsiden. */
function armRoot(pose) {
  return add(torsoPoint(pose, 0.95), mul(turn(dir(pose.upper), pose.face), 7));
}

// ---------- Scene ----------

function scene(content, view) {
  const horizon = 318;
  const vh = (view.w * H) / W;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${view.x} ${view.y} ${view.w} ${n(vh)}">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.wallTop}"/><stop offset="1" stop-color="${C.wallBottom}"/>
    </linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.floorTop}"/><stop offset="1" stop-color="${C.floorBottom}"/>
    </linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75">
      <stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.16"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="7"/></filter>
  </defs>
  <rect x="-300" y="-300" width="${W + 600}" height="${horizon + 300}" fill="url(#wall)"/>
  <rect x="-300" y="${horizon}" width="${W + 600}" height="${H - horizon + 300}" fill="url(#floor)"/>
  <rect x="-300" y="${horizon - 10}" width="${W + 600}" height="10" fill="${C.board}"/>
  <rect x="-300" y="${horizon}" width="${W + 600}" height="2" fill="#000" opacity="0.08"/>
  <polygon points="118,440 732,440 772,490 78,490" fill="${C.mat}"/>
  <polygon points="118,440 732,440 735,444 115,444" fill="${C.matTop}"/>
  <polygon points="78,490 772,490 772,497 78,497" fill="${C.matEdge}"/>
  <ellipse cx="425" cy="${FLOOR + 4}" rx="260" ry="10" fill="#000" opacity="0.28" filter="url(#soft)"/>
  ${content}
  <rect x="${view.x}" y="${view.y}" width="${view.w}" height="${n(vh)}" fill="url(#vignette)"/>
</svg>`;
}

// ---------- Øvelsene ----------

/** Bird dog: på alle fire → motsatt arm og bein strakt (armen på andre siden, beinet nærmest). */
function birdDog(extended) {
  const hip = [296, 339];
  const angle = (Math.asin((hip[1] - (FLOOR - 9 - 160)) / TORSO) * 180) / Math.PI;
  const pose = { hip, lower: angle, upper: angle, face: -1, headShift: 1 };
  pose.armRoot = armRoot(pose);
  const root = pose.armRoot;

  const wrist = [root[0], FLOOR - 9];
  pose.nearArm = { elbow: lerp(root, wrist, 0.52), wrist, hand: add(wrist, [27, 3]) };
  const kneel = { knee: [300, FLOOR - 15], ankle: [195, FLOOR - 10], toe: [158, FLOOR - 7] };
  pose.farLeg = {
    knee: add(kneel.knee, FAR),
    ankle: add(kneel.ankle, FAR),
    toe: add(kneel.toe, FAR),
  };

  if (extended) {
    const elbow = polar(root, 88, 8);
    const w = polar(elbow, 80, 8);
    pose.farArm = { elbow, wrist: w, hand: polar(w, 28, 5) };
    const knee = add(hip, [-112, -4]);
    const ankle = add(knee, [-105, -2]);
    pose.nearLeg = { knee, ankle, toe: add(ankle, [-1, 30]) };
  } else {
    const w = add(wrist, FAR);
    pose.farArm = { elbow: lerp(root, w, 0.52), wrist: w, hand: add(w, [27, 3]) };
    pose.nearLeg = kneel;
  }
  return pose;
}

/** McGill curl-up: på ryggen med ett kne bøyd og hendene under korsryggen → hode og skuldre løftes litt. */
function mcgillCurlUp(lifted) {
  const hip = [330, FLOOR - 30];
  const pose = { hip, lower: 0, upper: lifted ? 10 : 0, face: 1, headShift: -6 };
  pose.armRoot = armRoot(pose);
  const ankle = [190, FLOOR - 10];
  pose.nearLeg = {
    knee: joint(hip, ankle, 112, 105),
    ankle,
    heel: [197, FLOOR - 7],
    toe: [158, FLOOR - 6],
  };
  pose.farLeg = {
    knee: add([218, FLOOR - 15], FAR),
    ankle: add([113, FLOOR - 10], FAR),
    heel: add([110, FLOOR - 6], FAR),
    toe: add([102, FLOOR - 40], FAR),
  };
  // Albuen i gulvet, hendene under korsryggen (skjult under kroppen).
  pose.nearArm = {
    elbow: [418, FLOOR - 12],
    wrist: [380, FLOOR - 8],
    hand: [352, FLOOR - 7],
    behind: true,
  };
  return pose;
}

const exercises = [
  {
    id: 'Cut_Bird_Dog',
    frames: [birdDog(false), birdDog(true)],
    offset: 75,
    view: { x: 30, y: 100, w: 790 },
  },
  {
    id: 'Cut_McGill_Curl-Up',
    frames: [mcgillCurlUp(false), mcgillCurlUp(true)],
    offset: 92,
    view: { x: 105, y: 205, w: 640 },
  },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
for (const ex of exercises) {
  const outDir = join(root, 'public', 'exercises', ex.id);
  await mkdir(outDir, { recursive: true });
  for (const [i, pose] of ex.frames.entries()) {
    const svg = scene(`<g transform="translate(${ex.offset} 0)">${figure(pose)}</g>`, ex.view);
    await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    const jpg = await page.screenshot({
      type: 'jpeg',
      quality: 86,
      clip: { x: 0, y: 0, width: W, height: H },
    });
    await writeFile(join(outDir, `${i}.jpg`), jpg);
    console.log(`✓ ${ex.id}/${i}.jpg (${Math.round(jpg.length / 1024)} kB)`);
  }
}
await browser.close();
