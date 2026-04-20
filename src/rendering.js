import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";
import { DEFAULT_CUSTOMIZATION } from "./customization.js";
import { SPELL_CATEGORY_COLORS } from "./spells.js";

const RENDER_WIDTH = 480;
const RENDER_HEIGHT = 360;
const CARD_WIDTH = 0.9;
const CARD_HEIGHT = 1.28;
const FOG_COLOR = 0x2b2331;
const JITTER_SCALE = 0.58;
const JITTER_QUANTIZE = 1 / 64;
const JITTER_SPEED = 0.24;
const HOVER_POP_Z = 0.72;
const CAMERA_GLITCH_CHANCE = {
  normal: 0.015,
  chaos: 0.03,
};
const CAMERA_GLITCH_FRAMES = 12;
const TABLE_THEMES = {
  "backroom-tavern": {
    fog: 0x2b2331,
    ambient: 0x8a7a92,
    light: 0xffe2a3,
    backdrop: 0xf4d4a0,
    floor: 0x2b1d2b,
    wall: 0x302034,
    backWall: 0x3a2735,
    ceiling: 0x201623,
    tableBase: 0x5e3422,
    rim: 0x8d5731,
    legs: 0x4a2719,
    feltTint: [1, 1, 1],
  },
  "crooked-casino": {
    fog: 0x241c29,
    ambient: 0x9b6d61,
    light: 0xffbf84,
    backdrop: 0xffcf99,
    floor: 0x241425,
    wall: 0x3f2127,
    backWall: 0x4c252f,
    ceiling: 0x24141a,
    tableBase: 0x6d3027,
    rim: 0xb16634,
    legs: 0x52201a,
    feltTint: [1.08, 0.92, 0.9],
  },
  "audit-chamber": {
    fog: 0x1f2430,
    ambient: 0x6d88a5,
    light: 0xc8e1ff,
    backdrop: 0xbad8ff,
    floor: 0x1b2331,
    wall: 0x263347,
    backWall: 0x2d3b4f,
    ceiling: 0x141c28,
    tableBase: 0x4b556a,
    rim: 0x7a90ad,
    legs: 0x344154,
    feltTint: [0.82, 0.96, 1.08],
  },
};

function nearestTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children[0];
    group.remove(child);
    child.traverse?.((node) => {
      if (node.material) {
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => {
          if (material.map) {
            material.map.dispose();
          }
          material.dispose?.();
        });
      }
      node.geometry?.dispose?.();
    });
  }
}

function createPixelCardTexture(card) {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 144;
  const ctx = canvas.getContext("2d");

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = card.hidden ? "#18294c" : "#d8c08d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = card.hidden ? "#8ab0ff" : "#402b17";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

  if (card.hidden) {
    ctx.fillStyle = "#223864";
    ctx.fillRect(8, 8, canvas.width - 16, canvas.height - 16);
    for (let y = 16; y < 128; y += 10) {
      for (let x = (y / 10) % 2 === 0 ? 16 : 21; x < 78; x += 10) {
        ctx.fillStyle = (x + y) % 16 === 0 ? "#c4dcff" : "#5f7bb9";
        ctx.fillRect(x, y, 5, 5);
      }
    }
    ctx.fillStyle = "#f7e18c";
    ctx.fillRect(36, 24, 24, 24);
    ctx.fillRect(28, 62, 40, 6);
    ctx.fillRect(22, 74, 52, 6);
    ctx.fillRect(28, 86, 40, 6);
    ctx.fillStyle = "#8ab0ff";
    ctx.fillRect(16, 114, 64, 10);
    return nearestTexture(canvas);
  }

  if (card.gameType === "uno") {
    const cardColors = {
      Crimson: "#a32e2e",
      Gold: "#c79a21",
      Leaf: "#3d8a47",
      Azure: "#2d62aa",
      Wild: "#3a3145",
    };
    const fill = cardColors[card.suit] ?? "#6c5f54";
    ctx.fillStyle = fill;
    ctx.fillRect(8, 8, canvas.width - 16, canvas.height - 16);
    ctx.fillStyle = "#f8f1da";
    ctx.beginPath();
    ctx.ellipse(48, 72, 26, 44, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff7e9";
    drawPixelGlyph(ctx, card.rank, 18, 22, 5, "#fff7e9");
    drawPixelGlyph(ctx, card.rank, 24, 90, 6, "#fff7e9");
    ctx.fillStyle = "#fff7e9";
    ctx.fillRect(16, 16, 10, 10);
    ctx.fillRect(70, 118, 10, 10);
    return nearestTexture(canvas);
  }

  const rank = card.tempRank ?? card.rank;
  const symbol = card.symbol ?? "?";
  const color = card.suit === "Flames" ? "#8d2c24" : "#281b18";

  ctx.fillStyle = "#f4e6bf";
  ctx.fillRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = "#ead8a8";
  for (let y = 16; y < 126; y += 12) {
    ctx.fillRect(12, y, canvas.width - 24, 2);
  }
  ctx.fillStyle = "#fff6da";
  ctx.fillRect(12, 12, canvas.width - 24, 22);
  ctx.fillStyle = color;

  drawPixelGlyph(ctx, rank, 16, 16, 4, color);
  drawSuitGlyph(ctx, symbol, 58, 16, 4, color);
  drawSuitGlyph(ctx, symbol, 28, 44, 8, color);
  drawPixelGlyph(ctx, rank, 24, 94, 7, color);
  ctx.fillStyle = color;
  ctx.fillRect(22, 126, 52, 4);
  ctx.fillRect(28, 132, 40, 4);

  if (card.wild) {
    ctx.fillStyle = "#ff7a3f";
    ctx.fillRect(12, 112, 72, 10);
    ctx.fillStyle = "#fff4d2";
    ctx.fillRect(18, 116, 60, 2);
  }

  return nearestTexture(canvas);
}

function drawPixelGlyph(ctx, text, x, y, scale, color) {
  ctx.fillStyle = color;
  const glyph = String(text);
  for (let index = 0; index < glyph.length; index += 1) {
    const code = glyph.charCodeAt(index);
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        if ((code + row * 7 + col * 11) % 2 === 0) {
          ctx.fillRect(x + index * scale * 4 + col * scale, y + row * scale, scale, scale);
        }
      }
    }
  }
}

function drawSuitGlyph(ctx, symbol, x, y, scale, color) {
  ctx.fillStyle = color;
  const pixels = {
    "☾": [
      [0, 1], [1, 0], [1, 2], [2, 0], [2, 3], [3, 1], [3, 2],
    ],
    "✦": [
      [1, 0], [0, 1], [1, 1], [2, 1], [1, 2],
    ],
    "♢": [
      [1, 0], [0, 1], [2, 1], [1, 2],
    ],
    "≈": [
      [0, 1], [1, 0], [2, 1], [3, 0], [0, 3], [1, 2], [2, 3], [3, 2],
    ],
  }[symbol] ?? [[0, 0], [1, 1], [2, 2]];

  pixels.forEach(([px, py]) => {
    ctx.fillRect(x + px * scale, y + py * scale, scale, scale);
  });
}

function createFeltTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#18593e";
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = "#20694a";
  for (let y = 0; y < 32; y += 4) {
    for (let x = (y / 4) % 2 === 0 ? 0 : 2; x < 32; x += 4) {
      ctx.fillRect(x, y, 2, 2);
    }
  }
  ctx.fillStyle = "#4fcf82";
  ctx.fillRect(12, 12, 8, 8);
  return nearestTexture(canvas);
}

function createDitherShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 64, 64);
  ctx.clearRect(0, 0, 64, 64);

  for (let y = 0; y < 64; y += 2) {
    for (let x = 0; x < 64; x += 2) {
      const dx = x - 32;
      const dy = y - 32;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 26 && ((x + y) / 2) % 2 === 0) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  return nearestTexture(canvas);
}

function createBackdropTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#191126";
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = "#2c2030";
  ctx.fillRect(0, 38, 64, 26);
  ctx.fillStyle = "#45323f";
  ctx.fillRect(6, 12, 10, 34);
  ctx.fillRect(24, 8, 14, 38);
  ctx.fillRect(46, 16, 12, 30);
  ctx.fillStyle = "#a5764f";
  ctx.fillRect(7, 14, 8, 6);
  ctx.fillRect(27, 12, 8, 8);
  ctx.fillRect(49, 20, 6, 6);
  return nearestTexture(canvas);
}

function createEffectTexture(category) {
  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext("2d");
  const color = SPELL_CATEGORY_COLORS[category] ?? "#ffffff";
  ctx.clearRect(0, 0, 24, 24);
  ctx.fillStyle = color;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;

  const patterns = {
    "card manipulation": [
      [10, 0, 4, 24], [0, 10, 24, 4], [4, 4, 16, 16],
    ],
    deception: [
      [2, 2, 20, 4], [6, 8, 12, 4], [10, 12, 4, 10],
    ],
    economy: [
      [6, 2, 12, 20], [2, 6, 20, 12],
    ],
    disruption: [
      [10, 0, 4, 24], [0, 10, 24, 4], [3, 3, 6, 6], [15, 3, 6, 6], [9, 15, 6, 6],
    ],
    defense: [
      [4, 4, 16, 4], [2, 8, 20, 4], [4, 12, 16, 4], [8, 16, 8, 4],
    ],
    chaos: [
      [0, 8, 24, 8], [8, 0, 8, 24], [4, 4, 16, 16],
    ],
  };

  (patterns[category] ?? [[6, 6, 12, 12]]).forEach(([x, y, w, h]) => {
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  });

  return nearestTexture(canvas);
}

function createPlaqueTexture({
  title,
  subtitle = "",
  accent = "#c49a55",
  fill = "#efe0ba",
  ink = "#2f1c10",
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 60;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;

  ctx.fillStyle = "#1f1215";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#4f3321";
  ctx.fillRect(2, 2, canvas.width - 4, canvas.height - 4);
  ctx.fillStyle = fill;
  ctx.fillRect(6, 6, canvas.width - 12, canvas.height - 12);

  const gradient = ctx.createLinearGradient(0, 6, 0, canvas.height - 6);
  gradient.addColorStop(0, "rgba(255,244,213,0.92)");
  gradient.addColorStop(1, "rgba(217,188,131,0.92)");
  ctx.fillStyle = gradient;
  ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);

  ctx.fillStyle = "rgba(122, 88, 49, 0.08)";
  for (let y = 12; y < canvas.height - 12; y += 6) {
    ctx.fillRect(12, y, canvas.width - 24, 1);
  }

  ctx.fillStyle = accent;
  ctx.fillRect(14, 10, 8, canvas.height - 20);
  ctx.fillRect(canvas.width - 22, 10, 8, canvas.height - 20);

  ctx.fillStyle = "rgba(93, 58, 30, 0.18)";
  for (let x = 28; x < canvas.width - 28; x += 24) {
    ctx.fillRect(x, 16, 10, 2);
    ctx.fillRect(x + 4, canvas.height - 18, 10, 2);
  }

  ctx.fillStyle = "#6a4323";
  const cornerRunes = [
    [14, 10], [canvas.width - 26, 10], [14, canvas.height - 22], [canvas.width - 26, canvas.height - 22],
  ];
  cornerRunes.forEach(([x, y]) => {
    ctx.fillRect(x, y + 4, 12, 2);
    ctx.fillRect(x + 4, y, 4, 12);
    ctx.fillRect(x + 2, y + 2, 8, 8);
  });

  ctx.fillStyle = ink;
  ctx.font = "bold 16px Georgia, serif";
  ctx.textBaseline = "top";
  ctx.fillText(String(title).slice(0, 18), 32, 14);
  if (subtitle) {
    ctx.fillStyle = "#6b4526";
    ctx.font = "12px Georgia, serif";
    ctx.fillText(String(subtitle).slice(0, 24), 32, 33);
  }

  return nearestTexture(canvas);
}

function createPointerTexture(color = "#f5e490") {
  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = "#000";
  ctx.fillRect(10, 2, 4, 18);
  ctx.fillRect(6, 10, 12, 4);
  ctx.fillRect(4, 16, 16, 4);
  ctx.fillStyle = color;
  ctx.fillRect(10, 4, 4, 14);
  ctx.fillRect(8, 10, 8, 4);
  ctx.fillRect(6, 16, 12, 2);
  ctx.fillRect(8, 18, 8, 2);
  ctx.fillRect(10, 20, 4, 2);
  ctx.fillStyle = "#f7e9bb";
  ctx.fillRect(11, 6, 2, 8);
  ctx.fillRect(9, 11, 6, 2);

  return nearestTexture(canvas);
}

function createBurstTexture(color = "#f5e490", shape = "star") {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const patterns = {
    star: [
      [14, 0, 4, 32],
      [0, 14, 32, 4],
      [6, 6, 20, 20],
      [10, 10, 12, 12],
      [4, 4, 4, 4], [24, 4, 4, 4], [4, 24, 4, 4], [24, 24, 4, 4],
    ],
    target: [
      [4, 4, 24, 4],
      [4, 24, 24, 4],
      [4, 8, 4, 16],
      [24, 8, 4, 16],
      [12, 12, 8, 8],
      [14, 0, 4, 6],
      [14, 26, 4, 6],
    ],
  };

  ctx.fillStyle = "#000";
  (patterns[shape] ?? patterns.star).forEach(([x, y, w, h]) => {
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  });

  ctx.fillStyle = color;
  (patterns[shape] ?? patterns.star).forEach(([x, y, w, h]) => {
    ctx.fillRect(x, y, w, h);
  });

  return nearestTexture(canvas);
}

function flatMaterial(color) {
  return new THREE.MeshLambertMaterial({
    color,
    flatShading: true,
  });
}

function solidMaterial(color) {
  return new THREE.MeshBasicMaterial({
    color,
    toneMapped: false,
  });
}

function focusFinishColor(finish = "brass") {
  return {
    brass: 0xd4b072,
    oak: 0x6f4a2b,
    ivory: 0xe6dbc7,
    obsidian: 0x2d2940,
  }[finish] ?? 0xd4b072;
}

function blendHex(left, right, mix = 0.25) {
  return new THREE.Color(left).lerp(new THREE.Color(right), mix).getHex();
}

function reactiveHumanStyle(style = {}, themeKey = "backroom-tavern") {
  const theme = TABLE_THEMES[themeKey] ?? TABLE_THEMES["backroom-tavern"];
  return {
    ...style,
    trimColor: blendHex(style.trimColor ?? 0xd4b072, theme.rim, 0.28),
    collarColor: blendHex(style.collarColor ?? 0x5a3f2a, theme.tableBase, 0.2),
    charmColor: blendHex(style.charmColor ?? 0xf4d89a, theme.light, 0.32),
    sigilColor: blendHex(style.sigilColor ?? style.trimColor ?? 0xe7d4aa, theme.light, 0.24),
    focusColor: blendHex(style.focusColor ?? 0xc99641, theme.rim, 0.26),
    familiarColor: blendHex(style.familiarColor ?? 0xb39cf4, theme.backdrop, 0.18),
    eyeGlowColor: style.eyeGlowMode === "none"
      ? style.eyeGlowColor
      : blendHex(style.eyeGlowColor ?? 0x8cd7ff, theme.light, 0.34),
  };
}

function createWizardFigure(style = {}, options = {}) {
  const merged = {
    ...DEFAULT_CUSTOMIZATION,
    ...style,
  };
  const {
    baseColor = 0x443022,
    headColor = merged.skinColor ?? 0xdab58e,
    orbitScale = 0.22,
    ravenDepth = 0.08,
  } = options;

  const token = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.3, 0.08, 6, 1, false).toNonIndexed(),
    flatMaterial(baseColor),
  );
  base.position.y = 0.04;
  const robe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.31, 0.52, 6, 1, false).toNonIndexed(),
    flatMaterial(merged.robeColor),
  );
  robe.position.y = 0.3;
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.18, 0.12, 6, 1, false).toNonIndexed(),
    flatMaterial(merged.collarColor ?? merged.trimColor),
  );
  collar.position.y = 0.52;
  const shoulders = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.11, 0.18).toNonIndexed(),
    flatMaterial(merged.trimColor),
  );
  shoulders.position.set(0, 0.49, 0);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 6, 4).toNonIndexed(),
    flatMaterial(headColor),
  );
  head.position.y = 0.66;
  const sigilColor = merged.sigilColor ?? merged.eyeGlowColor ?? merged.trimColor;
  const sigilGroup = new THREE.Group();
  if (merged.sigilType === "brow") {
    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.018, 0.01).toNonIndexed(),
      solidMaterial(sigilColor),
    );
    brow.position.set(0, 0.705, 0.105);
    sigilGroup.add(brow);
  } else if (merged.sigilType === "split") {
    const leftMark = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.055, 0.01).toNonIndexed(),
      solidMaterial(sigilColor),
    );
    const rightMark = leftMark.clone();
    leftMark.position.set(-0.048, 0.648, 0.105);
    rightMark.position.set(0.048, 0.648, 0.105);
    leftMark.rotation.z = -0.3;
    rightMark.rotation.z = 0.3;
    sigilGroup.add(leftMark, rightMark);
  } else if (merged.sigilType === "crown") {
    const center = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.065, 0.01).toNonIndexed(),
      solidMaterial(sigilColor),
    );
    const left = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.05, 0.01).toNonIndexed(),
      solidMaterial(sigilColor),
    );
    const right = left.clone();
    center.position.set(0, 0.716, 0.105);
    left.position.set(-0.04, 0.7, 0.105);
    right.position.set(0.04, 0.7, 0.105);
    left.rotation.z = -0.36;
    right.rotation.z = 0.36;
    sigilGroup.add(center, left, right);
  }
  const leftEye = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.02, 0.02).toNonIndexed(),
    merged.eyeGlowMode === "none" ? flatMaterial(0x1a120e) : solidMaterial(merged.eyeGlowColor ?? 0x8cd7ff),
  );
  const rightEye = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.02, 0.02).toNonIndexed(),
    merged.eyeGlowMode === "none" ? flatMaterial(0x1a120e) : solidMaterial(merged.eyeGlowColor ?? 0x8cd7ff),
  );
  leftEye.position.set(-0.03, 0.67, 0.09);
  rightEye.position.set(0.03, 0.67, 0.09);
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(merged.hatRadius, merged.hatHeight, 6, 1).toNonIndexed(),
    flatMaterial(merged.hatColor),
  );
  hat.position.y = 0.76 + merged.hatHeight / 2;
  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(merged.hatRadius + 0.08, merged.hatRadius + 0.12, 0.03, 6, 1, false).toNonIndexed(),
    flatMaterial(merged.trimColor),
  );
  brim.position.y = 0.79;
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.28, 0.1).toNonIndexed(),
    flatMaterial(merged.sleeveColor),
  );
  arm.position.set(0.19, 0.4, 0);
  const offArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.22, 0.1).toNonIndexed(),
    flatMaterial(merged.sleeveColor),
  );
  offArm.position.set(-0.17, 0.38, 0);
  const hem = new THREE.Mesh(
    new THREE.TorusGeometry(0.23, 0.03, 4, 6).toNonIndexed(),
    flatMaterial(merged.trimColor),
  );
  hem.rotation.x = Math.PI / 2;
  hem.position.y = 0.07;
  let focus = null;
  const focusAccentColor = focusFinishColor(merged.focusFinish);
  if (merged.focusType === "staff") {
    focus = new THREE.Group();
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.55, 5, 1, false).toNonIndexed(),
      flatMaterial(merged.focusColor ?? 0xc99641),
    );
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.07, 0.07).toNonIndexed(),
      flatMaterial(focusAccentColor),
    );
    cap.position.set(0, 0.25, 0);
    focus.add(shaft, cap);
    focus.position.set(0.28, 0.34, 0.02);
    focus.rotation.z = -0.08;
  } else if (merged.focusType === "orb") {
    focus = new THREE.Group();
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 4).toNonIndexed(),
      flatMaterial(merged.focusColor ?? 0xc99641),
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.012, 4, 6).toNonIndexed(),
      flatMaterial(focusAccentColor),
    );
    ring.rotation.x = Math.PI / 2;
    focus.add(orb, ring);
    focus.position.set(0.27, 0.42, 0.05);
  } else if (merged.focusType === "book") {
    focus = new THREE.Group();
    const book = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.1, 0.05).toNonIndexed(),
      flatMaterial(merged.focusColor ?? 0xaa8ff2),
    );
    const clasp = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.1, 0.06).toNonIndexed(),
      flatMaterial(focusAccentColor),
    );
    clasp.position.set(0.05, 0, 0);
    focus.add(book, clasp);
    focus.position.set(0.26, 0.42, 0.05);
    focus.rotation.z = -0.22;
  }

  token.add(base, robe, collar, shoulders, head, sigilGroup, leftEye, rightEye, hat, brim, arm, offArm, hem);
  if (focus) {
    token.add(focus);
  }

  if (merged.faceVariant === "stern") {
    leftEye.position.y -= 0.01;
    rightEye.position.y -= 0.01;
  } else if (merged.faceVariant === "wide") {
    leftEye.scale.set(1.1, 1.4, 1);
    rightEye.scale.set(1.1, 1.4, 1);
  } else if (merged.faceVariant === "sleepy") {
    leftEye.scale.set(1.4, 0.55, 1);
    rightEye.scale.set(1.4, 0.55, 1);
  }

  if (merged.eyeGlowMode === "soft") {
    leftEye.scale.multiplyScalar(1.15);
    rightEye.scale.multiplyScalar(1.15);
  } else if (merged.eyeGlowMode === "bright") {
    leftEye.scale.multiplyScalar(1.35);
    rightEye.scale.multiplyScalar(1.35);
  }
  leftEye.userData.baseScale = leftEye.scale.clone();
  rightEye.userData.baseScale = rightEye.scale.clone();

  if (merged.charmType === "orbit") {
    const orb = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createBurstTexture(`#${merged.charmColor.toString(16).padStart(6, "0")}`, "star"),
        transparent: true,
        toneMapped: false,
      }),
    );
    orb.position.set(0.34, 0.74, 0);
    orb.scale.set(orbitScale, orbitScale, 1);
    token.add(orb);
  }

  if (merged.charmType === "raven") {
    const raven = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.02).toNonIndexed(),
      flatMaterial(merged.charmColor),
    );
    raven.position.set(-0.3, 0.72, ravenDepth);
    token.add(raven);
  }

  let familiar = null;
  let familiarFlame = null;
  if (merged.familiarType === "bat") {
    familiar = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.04, 0.06).toNonIndexed(),
      flatMaterial(merged.familiarColor ?? 0xb39cf4),
    );
    const leftWing = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.03, 0.02).toNonIndexed(),
      flatMaterial(merged.familiarColor ?? 0xb39cf4),
    );
    const rightWing = leftWing.clone();
    leftWing.position.set(-0.09, 0, 0);
    rightWing.position.set(0.09, 0, 0);
    leftWing.rotation.z = 0.28;
    rightWing.rotation.z = -0.28;
    familiar.add(body, leftWing, rightWing);
    familiar.position.set(-0.32, 0.82, 0.18);
    familiar.userData.type = "bat";
    familiar.userData.leftWing = leftWing;
    familiar.userData.rightWing = rightWing;
    token.add(familiar);
  } else if (merged.familiarType === "toad") {
    familiar = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 4).toNonIndexed(),
      flatMaterial(merged.familiarColor ?? 0x8fe0c4),
    );
    const eyes = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.03, 0.04).toNonIndexed(),
      flatMaterial(0xe7efc4),
    );
    eyes.position.set(0, 0.05, 0.03);
    familiar.add(body, eyes);
    familiar.position.set(-0.22, 0.11, 0.18);
    familiar.scale.set(1.1, 0.72, 0.9);
    familiar.userData.type = "toad";
    familiar.userData.baseY = familiar.position.y;
    token.add(familiar);
  } else if (merged.familiarType === "candle") {
    familiar = new THREE.Group();
    const skull = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.1, 0.08).toNonIndexed(),
      flatMaterial(0xe4d7c5),
    );
    const jaw = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.03, 0.05).toNonIndexed(),
      flatMaterial(0xd1c1af),
    );
    jaw.position.set(0, -0.055, 0.01);
    familiarFlame = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createBurstTexture("#ffd18a", "star"),
        transparent: true,
        toneMapped: false,
      }),
    );
    familiarFlame.position.set(0, 0.12, 0);
    familiarFlame.scale.set(0.15, 0.15, 1);
    familiar.add(skull, jaw, familiarFlame);
    familiar.position.set(-0.28, 0.77, 0.16);
    familiar.userData.type = "candle";
    familiar.userData.baseY = familiar.position.y;
    token.add(familiar);
  } else if (merged.familiarType === "moth") {
    familiar = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.1, 0.02).toNonIndexed(),
      flatMaterial(0x6f5b46),
    );
    const leftWing = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.09, 0.02).toNonIndexed(),
      flatMaterial(merged.familiarColor ?? 0xf4d89a),
    );
    const rightWing = leftWing.clone();
    leftWing.position.set(-0.08, 0, 0);
    rightWing.position.set(0.08, 0, 0);
    leftWing.rotation.z = 0.2;
    rightWing.rotation.z = -0.2;
    familiar.add(body, leftWing, rightWing);
    familiar.position.set(-0.24, 0.83, 0.18);
    familiar.userData.type = "moth";
    familiar.userData.leftWing = leftWing;
    familiar.userData.rightWing = rightWing;
    familiar.userData.baseX = familiar.position.x;
    familiar.userData.baseY = familiar.position.y;
    token.add(familiar);
  }

  return {
    group: token,
    base,
    robe,
    collar,
    shoulders,
    head,
    leftEye,
    rightEye,
    hat,
    brim,
    arm,
    offArm,
    hem,
    focus,
    sigilGroup,
    familiar,
    familiarFlame,
  };
}

function quantize(value, step = 1 / 24) {
  return Math.round(value / step) * step;
}

export class TableRenderer {
  constructor(canvas, floatingLayer) {
    this.canvas = canvas;
    this.floatingLayer = floatingLayer;
    this.sceneWrap = canvas.parentElement;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(FOG_COLOR);
    this.scene.fog = new THREE.Fog(FOG_COLOR, 8, 18);

    this.camera = new THREE.PerspectiveCamera(50, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 40);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(RENDER_WIDTH, RENDER_HEIGHT, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;

    this.clock = new THREE.Clock();
    this.frame = 0;
    this.pointer = new THREE.Vector2(5, 5);
    this.raycaster = new THREE.Raycaster();
    this.hoveredCardKey = null;
    this.lastTurnId = null;
    this.cameraVariant = 0;
    this.glitchFrames = 0;
    this.currentLookTarget = new THREE.Vector3(0, 1.1, 0);
    this.baseCameraPosition = new THREE.Vector3();
    this.screenShakeFrames = 0;
    this.screenShakePower = 0;
    this.impactTimer = null;
    this.chaosMode = false;
    this.presentationSettings = {
      stableVisuals: false,
      reducedFlash: false,
    };
    this.customizationStyle = { ...DEFAULT_CUSTOMIZATION };
    this.targetPreview = null;
    this.latestState = null;
    this.showdownSequence = null;
    this.lastShowdownKey = null;
    this.currentThemeKey = null;
    this.wallMeshes = [];
    this.tableLegs = [];

    this.tableGroup = new THREE.Group();
    this.roomGroup = new THREE.Group();
    this.cardsGroup = new THREE.Group();
    this.chipsGroup = new THREE.Group();
    this.activeGroup = new THREE.Group();
    this.fxGroup = new THREE.Group();
    this.tokenGroup = new THREE.Group();
    this.labelGroup = new THREE.Group();
    this.scene.add(this.roomGroup, this.tableGroup, this.cardsGroup, this.chipsGroup, this.activeGroup, this.fxGroup, this.tokenGroup, this.labelGroup);

    this.cardActors = new Map();
    this.tokenActors = new Map();
    this.jitterTargets = [];
    this.spriteEffects = [];
    this.floatingTexts = [];
    this.processedSpellFx = new Set();

    this.deckOrigin = new THREE.Vector3(0, 1.75, -0.1);
    this.playerAnchors = {
      human: new THREE.Vector3(0, 1.34, 3.3),
      bluff: new THREE.Vector3(-4, 1.26, 0.6),
      frost: new THREE.Vector3(4, 1.26, 0.6),
      chaos: new THREE.Vector3(0, 1.26, -3.35),
    };
    this.tokenAnchors = {
      human: new THREE.Vector3(0, 1.17, 4.05),
      bluff: new THREE.Vector3(-4.75, 1.15, 0.8),
      frost: new THREE.Vector3(4.75, 1.15, 0.8),
      chaos: new THREE.Vector3(0, 1.15, -4.05),
    };

    this.buildEnvironment();
    this.buildWizardTokens();
    this.cutCamera("overview");
    this.attachPointerEvents();
  }

  attachPointerEvents() {
    this.canvas.addEventListener("mousemove", (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.pointer.set(5, 5);
      this.hoveredCardKey = null;
    });
  }

  buildEnvironment() {
    this.ambientLight = new THREE.AmbientLight(0x8a7a92, 1.55);
    this.scene.add(this.ambientLight);

    this.chandelierLight = new THREE.PointLight(0xffe2a3, 2.1, 18);
    this.chandelierLight.position.set(0, 6.4, 0);
    this.scene.add(this.chandelierLight);

    this.backdropMaterial = new THREE.MeshBasicMaterial({
      map: createBackdropTexture(),
      toneMapped: false,
    });
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 10, 1, 1),
      this.backdropMaterial,
    );
    backdrop.position.set(0, 4, -8.2);
    this.roomGroup.add(backdrop);

    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18, 2, 2).toNonIndexed(),
      flatMaterial(0x2b1d2b),
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = -0.02;
    this.roomGroup.add(this.floor);
    this.addJitterTarget(this.floor, 0.012);

    const walls = [
      { pos: [-7.6, 3.2, 0], rot: [0, Math.PI / 2, 0], color: 0x302034 },
      { pos: [7.6, 3.2, 0], rot: [0, -Math.PI / 2, 0], color: 0x302034 },
      { pos: [0, 3.2, -7.8], rot: [0, 0, 0], color: 0x3a2735 },
      { pos: [0, 6.8, 0], rot: [Math.PI / 2, 0, 0], color: 0x201623 },
    ];
    walls.forEach((wall) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 8, 1, 1).toNonIndexed(),
        flatMaterial(wall.color),
      );
      mesh.position.set(...wall.pos);
      mesh.rotation.set(...wall.rot);
      this.roomGroup.add(mesh);
      this.wallMeshes.push(mesh);
      this.addJitterTarget(mesh, 0.01);
    });

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshBasicMaterial({
        map: createDitherShadowTexture(),
        transparent: true,
        alphaTest: 0.1,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.01, 0);
    this.tableGroup.add(shadow);

    this.tableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 4.2, 0.85, 8, 1, false).toNonIndexed(),
      flatMaterial(0x5e3422),
    );
    this.tableBase.position.set(0, 0.68, 0);
    this.tableGroup.add(this.tableBase);
    this.addJitterTarget(this.tableBase, 0.012);

    const feltGeometry = new THREE.CircleGeometry(3.32, 8);
    const feltMaterial = this.createFeltMaterial();
    this.feltUniforms = feltMaterial.uniforms;
    this.felt = new THREE.Mesh(feltGeometry, feltMaterial);
    this.felt.rotation.x = -Math.PI / 2;
    this.felt.position.y = 1.12;
    this.tableGroup.add(this.felt);

    this.rim = new THREE.Mesh(
      new THREE.CylinderGeometry(3.52, 3.72, 0.18, 8, 1, true).toNonIndexed(),
      flatMaterial(0x8d5731),
    );
    this.rim.position.set(0, 1.15, 0);
    this.tableGroup.add(this.rim);
    this.addJitterTarget(this.rim, 0.01);

    const legPositions = [
      [-1.9, 0.42, -1.9],
      [1.9, 0.42, -1.9],
      [-1.9, 0.42, 1.9],
      [1.9, 0.42, 1.9],
    ];
    legPositions.forEach((position) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.24, 1.0, 6, 1, false).toNonIndexed(),
        flatMaterial(0x4a2719),
      );
      leg.position.set(...position);
      this.tableGroup.add(leg);
      this.tableLegs.push(leg);
      this.addJitterTarget(leg, 0.012);
    });

    const chandelier = new THREE.Group();
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 6, 4).toNonIndexed(),
      flatMaterial(0xd9b36f),
    );
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6, 1, false).toNonIndexed(),
      flatMaterial(0x7d6747),
    );
    stem.position.y = 1.4;
    chandelier.add(ball, stem);
    chandelier.position.set(0, 4.8, 0);
    this.roomGroup.add(chandelier);
    this.addJitterTarget(ball, 0.01);
    this.addJitterTarget(stem, 0.01);
    this.applyTableTheme({ id: "backroom-tavern" });
  }

  createFeltMaterial() {
    const texture = createFeltTexture();
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: texture },
        uTime: { value: 0 },
        uTint: { value: new THREE.Vector3(1, 1, 1) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          vUv = uv;
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uTime;
        uniform vec3 uTint;
        varying vec2 vUv;
        varying vec3 vWorld;
        void main() {
          vec2 uv = vUv;
          uv.x += sin(vWorld.x * 1.7 + uTime * 1.2) * 0.0055;
          uv.y += cos(vWorld.z * 1.9 + uTime * 1.0) * 0.004;
          uv += (uv - 0.5) * 0.009;
          vec4 color = texture2D(uMap, uv * 2.0);
          color.rgb *= uTint;
          gl_FragColor = color;
        }
      `,
    });
  }

  applyTableTheme(currentTable) {
    const themeKey = currentTable?.id ?? "backroom-tavern";
    if (this.currentThemeKey === themeKey) {
      return;
    }

    this.currentThemeKey = themeKey;
    const theme = TABLE_THEMES[themeKey] ?? TABLE_THEMES["backroom-tavern"];
    this.scene.background = new THREE.Color(theme.fog);
    this.scene.fog.color.setHex(theme.fog);
    this.ambientLight?.color.setHex(theme.ambient);
    this.chandelierLight?.color.setHex(theme.light);
    this.backdropMaterial?.color.setHex(theme.backdrop);
    this.floor?.material?.color?.setHex(theme.floor);

    if (this.wallMeshes[0]) {
      this.wallMeshes[0].material.color.setHex(theme.wall);
    }
    if (this.wallMeshes[1]) {
      this.wallMeshes[1].material.color.setHex(theme.wall);
    }
    if (this.wallMeshes[2]) {
      this.wallMeshes[2].material.color.setHex(theme.backWall);
    }
    if (this.wallMeshes[3]) {
      this.wallMeshes[3].material.color.setHex(theme.ceiling);
    }

    this.tableBase?.material?.color?.setHex(theme.tableBase);
    this.rim?.material?.color?.setHex(theme.rim);
    this.tableLegs.forEach((leg) => leg.material?.color?.setHex(theme.legs));
    this.feltUniforms?.uTint?.value?.set(...theme.feltTint);
    this.buildWizardTokens();
  }

  buildWizardTokens() {
    clearGroup(this.tokenGroup);
    this.tokenActors.clear();
    const configs = {
      human: 0x6fa0ff,
      bluff: 0xcd7f5e,
      frost: 0x8be0ff,
      chaos: 0x98d85a,
    };

    Object.entries(configs).forEach(([playerId, color]) => {
      const style = playerId === "human"
        ? reactiveHumanStyle(this.customizationStyle, this.currentThemeKey ?? "backroom-tavern")
        : {
            robeColor: color,
            sleeveColor: color,
            trimColor: color,
            hatColor: 0x2a2242,
            skinColor: 0xdab58e,
            hatHeight: 0.38,
            hatRadius: 0.2,
            charmType: "none",
            charmColor: 0xf4d89a,
          };
      const figure = createWizardFigure(style);
      const { group: token, base, arm, offArm, familiar, familiarFlame } = figure;
      token.position.copy(this.tokenAnchors[playerId]);
      this.tokenGroup.add(token);

      this.tokenActors.set(playerId, {
        group: token,
        base,
        arm,
        offArm,
        familiar,
        familiarFlame,
        castFrames: 0,
      });
    });
  }

  setCustomizationStyle(style = {}) {
    this.customizationStyle = {
      ...DEFAULT_CUSTOMIZATION,
      ...style,
    };
    this.buildWizardTokens();
  }

  addJitterTarget(mesh, amount) {
    const positions = mesh.geometry.attributes.position;
    mesh.geometry.userData.basePositions = Float32Array.from(positions.array);
    this.jitterTargets.push({
      geometry: mesh.geometry,
      amount,
    });
  }

  createCardMesh(card) {
    const geometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT, 1, 1);
    const texture = createPixelCardTexture(card);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  update(state) {
    this.latestState = state;
    this.syncShowdownSequence(state);
    this.chaosMode = Boolean(state.chaosMode);
    this.applyTableTheme(state.currentTable);
    clearGroup(this.chipsGroup);
    clearGroup(this.activeGroup);
    clearGroup(this.labelGroup);
    this.syncCards(state);
    this.drawPot(state.pot);
    this.drawActiveMarker(state.currentPlayerId);
    this.drawTargetMarker();
    this.drawShowdownFocusMarker(state);
    this.drawWinnerMarkers(state);
    this.drawSceneLabels(state);
    this.handleCameraCut(state.currentPlayerId);
    this.consumeSpellEffects(state.spellFxEvents ?? []);
  }

  syncShowdownSequence(state) {
    const showdownKey = state.roundEnded && state.lastRoundSummary?.title === "Showdown"
      ? `${state.round}:${state.lastRoundSummary.title}`
      : null;

    if (!showdownKey) {
      this.showdownSequence = null;
      this.lastShowdownKey = null;
      return;
    }

    if (this.lastShowdownKey === showdownKey) {
      return;
    }

    this.lastShowdownKey = showdownKey;
    const order = state.players
      .filter((player) => player.id !== "human" && !player.folded)
      .map((player) => player.id);

    this.showdownSequence = {
      key: showdownKey,
      order,
      revealIndex: -1,
      focusPlayerId: order[0] ?? null,
      frameCountdown: 10,
      completed: order.length === 0,
    };
  }

  syncCards(state) {
    const desired = new Map();
    const roundKey = `r${state.round}`;
    ["human", "bluff", "frost", "chaos"].forEach((playerId) => {
      const player = state.players.find((entry) => entry.id === playerId);
      this.buildSeatEntries(
        desired,
        `${roundKey}-${playerId}`,
        playerId,
        this.getRenderedHand(player),
      );
    });

    state.communitySlots.forEach((card, index) => {
      desired.set(`${roundKey}-community-${index}`, {
        card,
        ownerId: "community",
        position: new THREE.Vector3((index - 1) * 1.05, 1.28, 0.08),
        rotation: new THREE.Euler(-Math.PI / 2, 0, 0),
      });
    });

    for (const [key, actor] of this.cardActors.entries()) {
      if (!desired.has(key)) {
        this.cardsGroup.remove(actor.mesh);
        actor.mesh.material.map.dispose();
        actor.mesh.material.dispose();
        actor.mesh.geometry.dispose();
        this.cardActors.delete(key);
      }
    }

    for (const [key, entry] of desired.entries()) {
      let actor = this.cardActors.get(key);
      if (!actor) {
        const mesh = this.createCardMesh(entry.card);
        mesh.position.copy(this.deckOrigin);
        mesh.rotation.set(-Math.PI / 2 - 0.8, 0, 0);
        actor = {
          key,
          mesh,
          ownerId: entry.ownerId,
          signature: this.cardSignature(entry.card),
          targetPosition: entry.position.clone(),
          targetRotation: entry.rotation.clone(),
          hoverable: entry.ownerId === "human",
        };
        this.cardActors.set(key, actor);
        this.cardsGroup.add(mesh);
      } else if (actor.signature !== this.cardSignature(entry.card)) {
        const oldMesh = actor.mesh;
        const replacement = this.createCardMesh(entry.card);
        replacement.position.copy(oldMesh.position);
        replacement.rotation.copy(oldMesh.rotation);
        this.cardsGroup.add(replacement);
        this.cardsGroup.remove(oldMesh);
        oldMesh.material.map.dispose();
        oldMesh.material.dispose();
        oldMesh.geometry.dispose();
        actor.mesh = replacement;
        actor.signature = this.cardSignature(entry.card);
        actor.hoverable = entry.ownerId === "human";
      }

      actor.ownerId = entry.ownerId;
      actor.targetPosition.copy(entry.position);
      actor.targetRotation.copy(entry.rotation);
    }
  }

  buildSeatEntries(map, prefix, ownerId, cards) {
    const anchor = this.playerAnchors[ownerId];
    const seatConfig = {
      human: { spreadX: 0.92, spreadZ: 0, tilt: 0.18, yaw: 0 },
      bluff: { spreadX: 0.76, spreadZ: 0.15, tilt: -0.08, yaw: 0.45 },
      frost: { spreadX: 0.76, spreadZ: -0.15, tilt: 0.08, yaw: -0.45 },
      chaos: { spreadX: 0.84, spreadZ: 0, tilt: -0.02, yaw: Math.PI },
    }[ownerId] ?? { spreadX: 0.84, spreadZ: 0, tilt: 0, yaw: 0 };

    cards.forEach((card, index) => {
      const rotation = new THREE.Euler(
        -Math.PI / 2 + 0.15,
        seatConfig.yaw,
        (index - 1) * 0.12 + seatConfig.tilt,
      );

      map.set(`${prefix}-${index}`, {
        card,
        ownerId,
        position: new THREE.Vector3(
          anchor.x + (index - 1) * seatConfig.spreadX,
          anchor.y + index * 0.01,
          anchor.z + (index - 1) * seatConfig.spreadZ,
        ),
        rotation,
      });
    });
  }

  getRenderedHand(player) {
    if (!player) {
      return [];
    }

    if (!this.showdownSequence || this.showdownSequence.completed || player.id === "human") {
      return player.hand ?? [];
    }

    const revealOrderIndex = this.showdownSequence.order.indexOf(player.id);
    if (revealOrderIndex === -1 || revealOrderIndex <= this.showdownSequence.revealIndex) {
      return player.hand ?? [];
    }

    return (player.hand ?? []).map(() => ({ hidden: true }));
  }

  cardSignature(card) {
    if (card.hidden) {
      return "hidden";
    }
    return `${card.rank}-${card.suit}-${card.tempRank ?? ""}-${card.wild ? "wild" : "plain"}`;
  }

  drawPot(pot) {
    if (this.latestState?.gameType === "uno") {
      const plaque = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createPlaqueTexture({
            title: "Deck",
            subtitle: `${pot} cards`,
            accent: "#c49a55",
          }),
          transparent: true,
          toneMapped: false,
        }),
      );
      plaque.position.set(0.18, 1.88, 1.05);
      plaque.scale.set(1.8, 0.56, 1);
      this.activeGroup.add(plaque);
      return;
    }

    const left = this.buildChipStack(Math.max(1, Math.ceil(pot / 4)), 0xe8c05a);
    left.position.set(-0.5, 1.16, 0.9);
    this.chipsGroup.add(left);

    const right = this.buildChipStack(Math.max(1, Math.ceil(pot / 6)), 0x5db5ff);
    right.position.set(0.72, 1.16, 0.72);
    this.chipsGroup.add(right);

    const plaque = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createPlaqueTexture({
          title: "Pot",
          subtitle: `${pot} chips`,
          accent: "#c49a55",
        }),
        transparent: true,
        toneMapped: false,
      }),
    );
    plaque.position.set(0.18, 1.88, 1.05);
    plaque.scale.set(1.8, 0.56, 1);
    this.activeGroup.add(plaque);
  }

  buildChipStack(height, color) {
    const group = new THREE.Group();
    for (let index = 0; index < height; index += 1) {
      const chip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.035, 8, 1, false).toNonIndexed(),
        flatMaterial(color),
      );
      chip.position.y = index * 0.038;
      group.add(chip);
    }
    return group;
  }

  drawActiveMarker(playerId) {
    if (!playerId || !this.playerAnchors[playerId]) {
      return;
    }

    const seatColors = {
      human: 0xf2d889,
      bluff: 0xd98868,
      frost: 0x88cbff,
      chaos: 0xb8df69,
    };
    const color = seatColors[playerId] ?? 0xf5e490;
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(1.45, 1.62, 8, 1),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      }),
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(this.playerAnchors[playerId].x, 1.1, this.playerAnchors[playerId].z);
    marker.userData.pulseBaseScale = 1;
    this.activeGroup.add(marker);

    const inner = new THREE.Mesh(
      new THREE.RingGeometry(1.12, 1.28, 8, 1),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      }),
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.copy(marker.position);
    inner.position.y += 0.01;
    inner.userData.pulseBaseScale = 0.98;
    this.activeGroup.add(inner);

    const outer = new THREE.Mesh(
      new THREE.RingGeometry(1.72, 1.84, 8, 1),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.32,
      }),
    );
    outer.rotation.x = -Math.PI / 2;
    outer.position.copy(marker.position);
    outer.position.y -= 0.01;
    outer.userData.pulseBaseScale = 1.04;
    this.activeGroup.add(outer);

    const pointer = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createPointerTexture(`#${color.toString(16).padStart(6, "0")}`),
        transparent: true,
        toneMapped: false,
      }),
    );
    const tokenAnchor = this.tokenAnchors[playerId] ?? this.playerAnchors[playerId];
    pointer.position.set(tokenAnchor.x, tokenAnchor.y + 1.12, tokenAnchor.z);
    pointer.scale.set(0.42, 0.42, 1);
    pointer.userData.pulseBaseScale = 0.42;
    this.activeGroup.add(pointer);
  }

  drawTargetMarker() {
    if (!this.targetPreview) {
      return;
    }

    const accent = new THREE.Color(this.targetPreview.accent ?? "#d0ab68");
    let position = null;
    let radius = [0.56, 0.7];

    if (this.targetPreview.playerId && this.playerAnchors[this.targetPreview.playerId]) {
      const anchor = this.playerAnchors[this.targetPreview.playerId];
      position = new THREE.Vector3(anchor.x, 1.11, anchor.z);
      radius = [1.95, 2.14];
    } else if (Number.isInteger(this.targetPreview.communityIndex)) {
      position = new THREE.Vector3((this.targetPreview.communityIndex - 1) * 1.05, 1.29, 0.08);
    } else if (Number.isInteger(this.targetPreview.handIndex)) {
      position = new THREE.Vector3((this.targetPreview.handIndex - 1) * 0.92, 1.29, 3.85);
    }

    if (!position) {
      return;
    }

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius[0], radius[1], 8, 1),
      new THREE.MeshBasicMaterial({
        color: accent,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position);
    ring.userData.pulseBaseScale = 1.02;
    this.activeGroup.add(ring);

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createBurstTexture(`#${accent.getHexString()}`, "target"),
        transparent: true,
        toneMapped: false,
      }),
    );
    sprite.position.set(position.x, position.y + 0.42, position.z);
    sprite.scale.set(0.36, 0.36, 1);
    sprite.userData.pulseBaseScale = 0.36;
    this.activeGroup.add(sprite);
  }

  drawShowdownFocusMarker(state) {
    if (!this.showdownSequence || this.showdownSequence.completed || !this.showdownSequence.focusPlayerId) {
      return;
    }

    const focusPlayer = state.players.find((player) => player.id === this.showdownSequence.focusPlayerId);
    const seat = this.playerAnchors[this.showdownSequence.focusPlayerId];
    const tokenAnchor = this.tokenAnchors[this.showdownSequence.focusPlayerId];
    if (!focusPlayer || !seat || !tokenAnchor) {
      return;
    }

    const focusRing = new THREE.Mesh(
      new THREE.RingGeometry(2.08, 2.3, 8, 1),
      new THREE.MeshBasicMaterial({
        color: "#f0cc72",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.74,
      }),
    );
    focusRing.rotation.x = -Math.PI / 2;
    focusRing.position.set(seat.x, 1.12, seat.z);
    focusRing.userData.pulseBaseScale = 1.04;
    this.activeGroup.add(focusRing);

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createBurstTexture("#f0cc72", "star"),
        transparent: true,
        toneMapped: false,
      }),
    );
    sprite.position.set(tokenAnchor.x, tokenAnchor.y + 1.44, tokenAnchor.z);
    sprite.scale.set(0.44, 0.44, 1);
    sprite.userData.pulseBaseScale = 0.44;
    this.activeGroup.add(sprite);

    const plaque = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createPlaqueTexture({
          title: "Reveal",
          subtitle: focusPlayer.evaluation?.label ?? focusPlayer.name,
          accent: "#f0cc72",
        }),
        transparent: true,
        toneMapped: false,
      }),
    );
    plaque.position.set(tokenAnchor.x, tokenAnchor.y + 1.82, tokenAnchor.z);
    plaque.scale.set(1.68, 0.48, 1);
    this.labelGroup.add(plaque);
  }

  drawWinnerMarkers(state) {
    if (!state.roundEnded || !state.lastRoundSummary?.winners?.length || (this.showdownSequence && !this.showdownSequence.completed)) {
      return;
    }

    const splitPot = state.lastRoundSummary.winners.length > 1;
    const sharedColor = splitPot ? "#d7dce7" : "#f0cc72";

    state.lastRoundSummary.winners.forEach((winner, index) => {
      const seat = this.playerAnchors[winner.id];
      const tokenAnchor = this.tokenAnchors[winner.id];
      if (!seat || !tokenAnchor) {
        return;
      }

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.96, 2.18, 8, 1),
        new THREE.MeshBasicMaterial({
          color: sharedColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.78,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(seat.x, 1.11 + index * 0.01, seat.z);
      ring.userData.pulseBaseScale = 1.03;
      this.activeGroup.add(ring);

      const crest = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createBurstTexture(sharedColor, "star"),
          transparent: true,
          toneMapped: false,
        }),
      );
      crest.position.set(tokenAnchor.x, tokenAnchor.y + 1.52, tokenAnchor.z);
      crest.scale.set(0.52, 0.52, 1);
      crest.userData.pulseBaseScale = 0.52;
      this.activeGroup.add(crest);

      const banner = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createPlaqueTexture({
            title: splitPot ? "Split pot" : "Winner",
            subtitle: winner.hand ?? "Fold win",
            accent: sharedColor,
          }),
          transparent: true,
          toneMapped: false,
        }),
      );
      banner.position.set(tokenAnchor.x, tokenAnchor.y + 1.86, tokenAnchor.z);
      banner.scale.set(1.72, 0.5, 1);
      this.labelGroup.add(banner);
    });
  }

  drawSceneLabels(state) {
    if (state.gameType === "uno") {
      state.players.forEach((player) => {
        const anchor = this.tokenAnchors[player.id];
        if (!anchor) {
          return;
        }

        const subtitle = player.id === state.currentPlayerId && !state.roundEnded
          ? "Playing now"
          : `${player.hand.length} cards left`;
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: createPlaqueTexture({
              title: player.id === "human" ? "You" : player.name,
              subtitle,
              accent: "#c49a55",
            }),
            transparent: true,
            toneMapped: false,
          }),
        );
        sprite.position.set(anchor.x, anchor.y + 1.35, anchor.z);
        sprite.scale.set(1.72, 0.54, 1);
        this.labelGroup.add(sprite);
      });

      const discardLabel = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createPlaqueTexture({
            title: "Discard",
            subtitle: state.communitySlots[0] ? `${state.unoCurrentColor} / ${state.communitySlots[0].rank}` : "Waiting",
            accent: "#8e7bd4",
          }),
          transparent: true,
          toneMapped: false,
        }),
      );
      discardLabel.position.set(0, 2.08, -0.72);
      discardLabel.scale.set(2.05, 0.6, 1);
      this.labelGroup.add(discardLabel);

      const handLabel = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createPlaqueTexture({
            title: "Your hand",
            subtitle: `${state.humanEvaluation?.label ?? "Cards"}`,
            accent: "#d0ab68",
          }),
          transparent: true,
          toneMapped: false,
        }),
      );
      handLabel.position.set(0, 1.96, 4.8);
      handLabel.scale.set(2.1, 0.58, 1);
      this.labelGroup.add(handLabel);

      const tableNote = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createPlaqueTexture({
            title: state.roundEnded ? "Hand over" : "Table note",
            subtitle: state.roundEnded ? state.winnerText : state.phaseDescription,
            accent: state.roundEnded ? "#d0ab68" : "#9b7b5a",
          }),
          transparent: true,
          toneMapped: false,
        }),
      );
      tableNote.position.set(-3.25, 2.02, -2.45);
      tableNote.scale.set(1.92, 0.58, 1);
      this.labelGroup.add(tableNote);
      return;
    }

    const accentMap = {
      human: "#d0ab68",
      bluff: "#c5795b",
      frost: "#76b7e7",
      chaos: "#92bf56",
    };

    state.players.forEach((player) => {
      const anchor = this.tokenAnchors[player.id];
      if (!anchor) {
        return;
      }

      const subtitle = player.folded
        ? "Folded"
        : player.id === state.currentPlayerId && !state.roundEnded
          ? "Playing now"
          : `${player.stack} chips / ${player.mana} mana`;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createPlaqueTexture({
            title: player.id === "human" ? "You" : player.name,
            subtitle,
            accent: accentMap[player.id] ?? "#c49a55",
          }),
          transparent: true,
          toneMapped: false,
        }),
      );
      sprite.position.set(anchor.x, anchor.y + 1.35, anchor.z);
      sprite.scale.set(1.72, 0.54, 1);
      this.labelGroup.add(sprite);
    });

    const runeLabel = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createPlaqueTexture({
          title: this.showdownSequence && !this.showdownSequence.completed ? "Showdown" : state.roundEnded && state.lastRoundSummary?.title === "Showdown" ? "Showdown" : "Shared cards",
          subtitle: this.showdownSequence && !this.showdownSequence.completed
            ? `Revealing ${state.players.find((player) => player.id === this.showdownSequence.focusPlayerId)?.name ?? "wizard"}`
            : state.roundEnded && state.lastRoundSummary?.winners?.length
              ? `${state.lastRoundSummary.winners[0].name}${state.lastRoundSummary.winners.length > 1 ? " +" : ""} / ${state.lastRoundSummary.winners[0].hand}`
            : state.phase,
          accent: state.roundEnded ? "#f0cc72" : "#8e7bd4",
        }),
        transparent: true,
        toneMapped: false,
      }),
    );
    runeLabel.position.set(0, 2.08, -0.72);
    runeLabel.scale.set(2.05, 0.6, 1);
    this.labelGroup.add(runeLabel);

    const handLabel = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createPlaqueTexture({
          title: "Your hand",
          subtitle: state.humanEvaluation?.label ?? "Three card hand",
          accent: "#d0ab68",
        }),
        transparent: true,
        toneMapped: false,
      }),
    );
    handLabel.position.set(0, 1.96, 4.8);
    handLabel.scale.set(2.1, 0.58, 1);
    this.labelGroup.add(handLabel);

    const tableNote = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createPlaqueTexture({
          title: this.showdownSequence && !this.showdownSequence.completed
            ? "Table note"
            : state.roundEnded ? (state.lastRoundSummary?.title ?? "Hand over") : "Table note",
          subtitle: this.showdownSequence && !this.showdownSequence.completed
            ? state.players.find((player) => player.id === this.showdownSequence.focusPlayerId)?.evaluation?.label ?? "Reading the table"
            : state.roundEnded
              ? state.winnerText
            : state.tableEvent?.name ?? state.phaseDescription,
          accent: state.roundEnded ? "#d0ab68" : "#9b7b5a",
        }),
        transparent: true,
        toneMapped: false,
      }),
    );
    tableNote.position.set(-3.25, 2.02, -2.45);
    tableNote.scale.set(1.92, 0.58, 1);
    this.labelGroup.add(tableNote);

    if (this.targetPreview?.title) {
      const previewAnchor = this.targetPreview.playerId
        ? (this.tokenAnchors[this.targetPreview.playerId] ?? new THREE.Vector3(0, 1.2, 0))
        : this.targetPreview.communityIndex !== undefined
          ? new THREE.Vector3((this.targetPreview.communityIndex - 1) * 1.05, 1.15, 0.08)
          : new THREE.Vector3(0, 1.18, 3.7);

      const previewSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createPlaqueTexture({
            title: this.targetPreview.title,
            subtitle: this.targetPreview.subtitle ?? "",
            accent: this.targetPreview.accent ?? "#d0ab68",
          }),
          transparent: true,
          toneMapped: false,
        }),
      );
      previewSprite.position.set(previewAnchor.x, previewAnchor.y + 1.15, previewAnchor.z);
      previewSprite.scale.set(1.9, 0.58, 1);
      this.labelGroup.add(previewSprite);
    }
  }

  handleCameraCut(playerId) {
    if (this.lastTurnId === playerId) {
      return;
    }
    this.lastTurnId = playerId;

    const stableMultiplier = this.presentationSettings.stableVisuals ? 0.25 : 1;
    const glitchChance = (this.chaosMode ? CAMERA_GLITCH_CHANCE.chaos : CAMERA_GLITCH_CHANCE.normal) * stableMultiplier;
    if (playerId && Math.random() < glitchChance) {
      this.glitchFrames = CAMERA_GLITCH_FRAMES;
      this.cutCamera("wrong");
      return;
    }

    this.cutCamera(playerId ?? "overview");
  }

  cycleCamera() {
    this.cameraVariant = (this.cameraVariant + 1) % 3;
    this.cutCamera(this.lastTurnId ?? "overview");
  }

  setPresentationSettings(settings = {}) {
    this.presentationSettings = {
      ...this.presentationSettings,
      ...settings,
    };
  }

  setTargetPreview(preview = null) {
    this.targetPreview = preview;
  }

  triggerImpact(power = 1) {
    const stableMultiplier = this.presentationSettings.stableVisuals ? 0.55 : 1;
    const flashMultiplier = this.presentationSettings.reducedFlash ? 0.65 : 1;
    this.screenShakeFrames = Math.max(this.screenShakeFrames, Math.round((4 + power) * stableMultiplier));
    this.screenShakePower = Math.max(this.screenShakePower, (0.012 + power * 0.005) * stableMultiplier * flashMultiplier);
    if (this.sceneWrap) {
      if (this.presentationSettings.reducedFlash) {
        return;
      }
      this.sceneWrap.classList.remove("impact");
      window.clearTimeout(this.impactTimer);
      void this.sceneWrap.offsetWidth;
      this.sceneWrap.classList.add("impact");
      this.impactTimer = window.setTimeout(() => {
        this.sceneWrap?.classList.remove("impact");
      }, 150);
    }
  }

  cutCamera(key) {
    const presets = {
      overview: [
        { position: [0, 5.3, 8.4], lookAt: [0, 1.15, 0] },
        { position: [-5.8, 4.7, 6.4], lookAt: [0, 1.1, 0] },
        { position: [5.8, 4.9, 6.1], lookAt: [0, 1.2, 0] },
      ],
      human: [
        { position: [0, 3.4, 6.9], lookAt: [0, 1.25, 2.9] },
        { position: [-1.6, 3.5, 6.1], lookAt: [0, 1.25, 3.0] },
        { position: [1.8, 3.0, 6.0], lookAt: [0.2, 1.22, 2.8] },
      ],
      bluff: [
        { position: [-6.2, 3.3, 1.1], lookAt: [-4, 1.2, 0.7] },
        { position: [-6.9, 4.2, 2.2], lookAt: [-3.8, 1.2, 0.7] },
        { position: [-5.2, 2.9, 2.3], lookAt: [-4.1, 1.2, 0.6] },
      ],
      frost: [
        { position: [6.2, 3.3, 1.1], lookAt: [4, 1.2, 0.7] },
        { position: [6.9, 4.2, 2.2], lookAt: [3.8, 1.2, 0.7] },
        { position: [5.2, 2.9, 2.3], lookAt: [4.1, 1.2, 0.6] },
      ],
      chaos: [
        { position: [0, 3.1, -6.2], lookAt: [0, 1.2, -3.15] },
        { position: [-1.8, 3.5, -5.6], lookAt: [0, 1.15, -3.25] },
        { position: [1.9, 3.2, -5.4], lookAt: [0.1, 1.15, -3.3] },
      ],
      wrong: [
        { position: [0, 0.9, -6.4], lookAt: [0, 0.6, 5.5] },
        { position: [0, 7.4, 0.3], lookAt: [0, 4.5, -6] },
        { position: [7.8, 0.8, 0], lookAt: [0, 1.5, 0] },
      ],
    };

    const variantSet = presets[key] ?? presets.overview;
    const preset = variantSet[this.cameraVariant % variantSet.length];
    this.baseCameraPosition.set(...preset.position.map((value) => quantize(value, 1 / 8)));
    this.camera.position.copy(this.baseCameraPosition);
    this.currentLookTarget.set(...preset.lookAt.map((value) => quantize(value, 1 / 8)));
    this.camera.lookAt(this.currentLookTarget);
  }

  consumeSpellEffects(events) {
    events.forEach((event) => {
      if (this.processedSpellFx.has(event.id)) {
        return;
      }
      this.processedSpellFx.add(event.id);
      this.spawnSpriteEffect(event);
      if (this.shouldShowFloatingText(event)) {
        this.spawnFloatingText(event);
      }
      if (event.impact) {
        this.triggerImpact(event.power ?? 1);
      }
      const token = this.tokenActors.get(event.playerId);
      if (token) {
        token.castFrames = 12;
      }
    });

    const liveIds = new Set(events.map((event) => event.id));
    for (const id of [...this.processedSpellFx]) {
      if (!liveIds.has(id)) {
        this.processedSpellFx.delete(id);
      }
    }
  }

  shouldShowFloatingText(event) {
    const text = String(event.text ?? "");
    return event.impact
      || event.playerId === "community"
      || /winner|win|showdown|fold|blind|return|reflect|wrong pot|split|tax|reveal/i.test(text);
  }

  spawnSpriteEffect(event) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createEffectTexture(event.category),
        transparent: true,
      }),
    );
    const anchor = this.tokenAnchors[event.playerId] ?? new THREE.Vector3(0, 1.2, 0);
    sprite.position.set(anchor.x, anchor.y + 0.7, anchor.z);
    sprite.scale.set(0.9, 0.9, 0.9);
    this.fxGroup.add(sprite);
    this.spriteEffects.push({
      sprite,
      baseScale: 0.9 + (event.impact ? 0.18 : 0),
      frames: 12,
    });

    if (event.casterId === "human") {
      const familiarShapes = {
        bat: "diamond",
        toad: "target",
        candle: "star",
        moth: "spark",
      };
      const familiarType = this.customizationStyle.familiarType;
      if (familiarType && familiarType !== "none") {
        const familiarColor = `#${(this.customizationStyle.familiarColor ?? 0xb39cf4).toString(16).padStart(6, "0")}`;
        const accent = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: createBurstTexture(familiarColor, familiarShapes[familiarType] ?? "spark"),
            transparent: true,
            toneMapped: false,
          }),
        );
        accent.position.set(anchor.x + 0.28, anchor.y + 0.96, anchor.z + 0.06);
        accent.scale.set(0.48, 0.48, 1);
        this.fxGroup.add(accent);
        this.spriteEffects.push({
          sprite: accent,
          baseScale: 0.5 + (event.impact ? 0.12 : 0),
          frames: 12,
        });
      }
    }
  }

  spawnFloatingText(event) {
    if (!this.floatingLayer) {
      return;
    }

    const positions = {
      human: { x: 50, y: 72 },
      bluff: { x: 19, y: 48 },
      frost: { x: 81, y: 48 },
      chaos: { x: 50, y: 20 },
      community: { x: 50, y: 39 },
    };
    const anchor = positions[event.playerId] ?? { x: 50, y: 48 };
    const node = document.createElement("div");
    node.className = "floating-spell-text";
    node.textContent = event.text;
    node.style.left = `${anchor.x}%`;
    node.style.top = `${anchor.y}%`;
    node.style.setProperty("--spell-accent", event.color ?? SPELL_CATEGORY_COLORS[event.category] ?? "#ffffff");
    this.floatingLayer.append(node);
    this.floatingTexts.push({
      node,
      x: anchor.x,
      y: anchor.y,
      frames: 30,
    });
  }

  updateHover() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = [...this.cardActors.values()]
      .filter((actor) => actor.hoverable)
      .map((actor) => actor.mesh);
    const intersect = this.raycaster.intersectObjects(meshes, false)[0];
    this.hoveredCardKey = intersect
      ? [...this.cardActors.entries()].find(([, actor]) => actor.mesh === intersect.object)?.[0] ?? null
      : null;
  }

  animate() {
    const delta = this.clock.getDelta();
    this.frame += 1;

    if (this.glitchFrames > 0) {
      this.glitchFrames -= 1;
      if (this.glitchFrames === 0) {
        this.cutCamera(this.lastTurnId ?? "overview");
      }
    }

    this.feltUniforms.uTime.value += delta;
    this.updateHover();

    if (this.showdownSequence && !this.showdownSequence.completed) {
      this.showdownSequence.frameCountdown -= 1;
      if (this.showdownSequence.frameCountdown <= 0) {
        this.showdownSequence.revealIndex += 1;
        if (this.showdownSequence.revealIndex < this.showdownSequence.order.length) {
          const playerId = this.showdownSequence.order[this.showdownSequence.revealIndex];
          this.showdownSequence.focusPlayerId = playerId;
          const player = this.latestState?.players?.find((entry) => entry.id === playerId);
          if (player) {
            this.spawnFloatingText({
              playerId,
              category: "economy",
              text: player.evaluation?.label ?? player.name,
            });
            this.spawnSpriteEffect({
              playerId,
              category: "economy",
              impact: false,
            });
          }
          this.showdownSequence.frameCountdown = 14;
        } else {
          this.showdownSequence.completed = true;
          this.showdownSequence.focusPlayerId = null;
        }
        if (this.latestState) {
          this.update(this.latestState);
        }
      }
    }

    this.jitterTargets.forEach((target) => {
      const positions = target.geometry.attributes.position;
      const base = target.geometry.userData.basePositions;
      for (let index = 0; index < positions.count; index += 1) {
        const offset = Math.sin(this.frame * JITTER_SPEED + index * 1.1) * target.amount * JITTER_SCALE;
        positions.array[index * 3] = quantize(base[index * 3] + offset, JITTER_QUANTIZE);
        positions.array[index * 3 + 1] = quantize(base[index * 3 + 1] - offset * 0.25, JITTER_QUANTIZE);
        positions.array[index * 3 + 2] = quantize(base[index * 3 + 2] + offset * 0.15, JITTER_QUANTIZE);
      }
      positions.needsUpdate = true;
    });

    for (const [key, actor] of this.cardActors.entries()) {
      actor.mesh.position.lerp(actor.targetPosition, 0.28);
      actor.mesh.rotation.x += (actor.targetRotation.x - actor.mesh.rotation.x) * 0.35;
      actor.mesh.rotation.y += (actor.targetRotation.y - actor.mesh.rotation.y) * 0.35;
      actor.mesh.rotation.z += (actor.targetRotation.z - actor.mesh.rotation.z) * 0.35;

      if (key === this.hoveredCardKey) {
        actor.mesh.position.z = actor.targetPosition.z + HOVER_POP_Z;
      }
    }

    for (const [playerId, token] of this.tokenActors.entries()) {
      const isWinner = Boolean(state.roundEnded && state.lastRoundSummary?.winners?.some((winner) => winner.id === playerId));
      const frameIndex = this.frame % 4;
      const idleKeys = [
        { y: 0, rot: 0.004 },
        { y: 0.012, rot: -0.003 },
        { y: 0.006, rot: 0.006 },
        { y: -0.004, rot: -0.002 },
      ];
      const idle = idleKeys[frameIndex];
      const activeMultiplier = this.lastTurnId === playerId ? 1.4 : 1;
      token.group.position.y = quantize(this.tokenAnchors[playerId].y + idle.y * activeMultiplier, 1 / 96);
      token.group.rotation.z = quantize(idle.rot * activeMultiplier, 1 / 192);
      token.group.rotation.x = quantize(Math.sin(this.frame * 0.06 + frameIndex) * 0.003, 1 / 256);
      const poseVariant = playerId === "human" ? (this.customizationStyle.poseVariant ?? "neutral") : "neutral";
      const neutralArm = poseVariant === "heroic" ? -0.12 : poseVariant === "crooked" ? -0.02 : 0.04;
      const neutralOffArm = poseVariant === "heroic" ? 0.16 : poseVariant === "crooked" ? -0.14 : -0.03;
      let armPose = neutralArm;
      let offArmPose = neutralOffArm;
      if (token.castFrames > 0) {
        armPose = -0.8;
        offArmPose = 0.08;
      } else if (isWinner) {
        const humanStyle = playerId === "human" ? this.customizationStyle : null;
        if (humanStyle?.focusType === "staff") {
          armPose = -1.04;
          offArmPose = 0.14;
        } else if (humanStyle?.focusType === "book") {
          armPose = -0.44;
          offArmPose = -0.34;
        } else if (humanStyle?.familiarType === "bat" || humanStyle?.familiarType === "moth") {
          armPose = -0.74;
          offArmPose = 0.44;
        } else {
          armPose = -0.68;
          offArmPose = 0.22;
        }
        token.group.position.y = quantize(this.tokenAnchors[playerId].y + 0.03 + Math.abs(Math.sin(this.frame * 0.08)) * 0.03, 1 / 96);
        token.group.rotation.z = quantize(Math.sin(this.frame * 0.08) * 0.01, 1 / 192);
      }
      token.arm.rotation.z = armPose;
      token.offArm.rotation.z = offArmPose;
      if (token.familiar) {
        const familiarType = token.familiar.userData?.type;
        if (familiarType === "bat") {
          token.familiar.position.y = 0.82 + Math.sin(this.frame * 0.18) * 0.06 + (isWinner ? 0.04 : 0);
          token.familiar.rotation.z = Math.sin(this.frame * 0.2) * 0.08;
          token.familiar.userData.leftWing.rotation.z = 0.28 + Math.sin(this.frame * 0.28) * 0.4;
          token.familiar.userData.rightWing.rotation.z = -0.28 - Math.sin(this.frame * 0.28) * 0.4;
        } else if (familiarType === "toad") {
          token.familiar.position.y = (token.familiar.userData.baseY ?? 0.11) + Math.sin(this.frame * 0.08) * 0.015 + (isWinner ? 0.015 : 0);
        } else if (familiarType === "candle") {
          token.familiar.position.y = (token.familiar.userData.baseY ?? 0.77) + Math.sin(this.frame * 0.1) * 0.018 + (isWinner ? 0.02 : 0);
          if (token.familiarFlame) {
            const flameScale = 0.15 + Math.sin(this.frame * 0.22) * 0.03 + (isWinner ? 0.02 : 0);
            token.familiarFlame.scale.set(flameScale, flameScale * 1.2, 1);
          }
        } else if (familiarType === "moth") {
          token.familiar.position.x = (token.familiar.userData.baseX ?? -0.24) + Math.cos(this.frame * 0.09) * (isWinner ? 0.12 : 0.08);
          token.familiar.position.y = (token.familiar.userData.baseY ?? 0.83) + Math.sin(this.frame * 0.16) * 0.05 + (isWinner ? 0.03 : 0);
          token.familiar.userData.leftWing.rotation.z = 0.2 + Math.sin(this.frame * 0.34) * 0.5;
          token.familiar.userData.rightWing.rotation.z = -0.2 - Math.sin(this.frame * 0.34) * 0.5;
        }
      }
      if (token.castFrames > 0) {
        token.castFrames -= 1;
      }
    }

    this.activeGroup.children.forEach((child, index) => {
      if (!child.userData.pulseBaseScale) {
        return;
      }
      const wobbleScale = this.presentationSettings.reducedFlash ? 0.5 : 1;
      const wobble = 1 + Math.sin(this.frame * 0.22 + index) * 0.04 * wobbleScale;
      const baseScale = child.userData.pulseBaseScale;
      child.scale.set(baseScale * wobble, baseScale * wobble, baseScale * wobble);
    });

    this.spriteEffects = this.spriteEffects.filter((effect) => {
      effect.sprite.position.y += 0.025;
      const pulseScale = this.presentationSettings.reducedFlash ? 0.4 : 1;
      const pulse = 1 + Math.sin((12 - effect.frames) * 0.9) * 0.08 * pulseScale;
      effect.sprite.scale.setScalar(effect.baseScale * pulse);
      effect.frames -= 1;
      if (effect.frames <= 0) {
        this.fxGroup.remove(effect.sprite);
        effect.sprite.material.map.dispose();
        effect.sprite.material.dispose();
        return false;
      }
      return true;
    });

    this.floatingTexts = this.floatingTexts.filter((text) => {
      text.frames -= 1;
      text.y -= 0.55;
      text.node.style.top = `${text.y}%`;
      const textScale = this.presentationSettings.reducedFlash ? 0.03 : 0.08;
      text.node.style.transform = `translate(-50%, 0) scale(${1 + Math.min(textScale, text.frames / 180)})`;
      if (text.frames <= 0) {
        text.node.remove();
        return false;
      }
      return true;
    });

    if (this.screenShakeFrames > 0) {
      this.screenShakeFrames -= 1;
      const intensity = this.screenShakePower * Math.max(0.35, this.screenShakeFrames / 8);
      this.camera.position.copy(this.baseCameraPosition);
      this.camera.position.x += quantize((Math.sin(this.frame * 2.2) - 0.5) * intensity, JITTER_QUANTIZE);
      this.camera.position.y += quantize((Math.cos(this.frame * 1.7) - 0.5) * intensity * 0.7, JITTER_QUANTIZE);
      this.camera.position.z += quantize((Math.sin(this.frame * 1.2) - 0.5) * intensity * 0.35, JITTER_QUANTIZE);
      if (this.screenShakeFrames === 0) {
        this.screenShakePower = 0;
      }
    } else {
      this.camera.position.copy(this.baseCameraPosition);
    }

    this.camera.lookAt(this.currentLookTarget);
    this.renderer.render(this.scene, this.camera);
  }
}

export class WizardPreviewRenderer {
  constructor(canvas, { creepy = false } = {}) {
    this.canvas = canvas;
    this.creepy = creepy;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(creepy ? 0x140f19 : 0x1d1620);
    this.camera = new THREE.PerspectiveCamera(38, canvas.width / canvas.height, 0.1, 20);
    this.camera.position.set(0, 1.15, 3.7);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(canvas.width, canvas.height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.moteGroup = new THREE.Group();
    this.scene.add(this.moteGroup);
    this.ambient = new THREE.AmbientLight(creepy ? 0x8d77a2 : 0x9b8ca8, 1.4);
    this.keyLight = new THREE.PointLight(creepy ? 0xf0c46c : 0xffdeb5, 15, 20);
    this.keyLight.position.set(0.8, 2.2, 1.6);
    this.fillLight = new THREE.PointLight(creepy ? 0x7f66c5 : 0x7aa5ff, 7, 20);
    this.fillLight.position.set(-1.6, 1.1, 1.4);
    this.scene.add(this.ambient, this.keyLight, this.fillLight);

    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.45, 0.12, 8, 1, false).toNonIndexed(),
      flatMaterial(creepy ? 0x2f1f19 : 0x3b2a24),
    );
    floor.position.y = -0.04;
    this.scene.add(floor);

    const runeRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.06, 4, 8).toNonIndexed(),
      flatMaterial(creepy ? 0x8d6fb8 : 0xb79056),
    );
    runeRing.rotation.x = Math.PI / 2;
    runeRing.position.y = 0.02;
    this.scene.add(runeRing);

    this.figure = null;
    this.motes = [];
    this.frame = 0;
    this.running = true;
    this.setStyle(DEFAULT_CUSTOMIZATION);
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  setStyle(style = {}) {
    this.currentStyle = {
      ...DEFAULT_CUSTOMIZATION,
      ...style,
    };
    if (this.figure?.group) {
      this.root.remove(this.figure.group);
    }
    this.figure = createWizardFigure(this.currentStyle, {
      baseColor: this.creepy ? 0x302019 : 0x443022,
      headColor: this.currentStyle.skinColor ?? 0xdab58e,
      orbitScale: 0.26,
      ravenDepth: 0.12,
    });
    this.figure.group.position.y = 0.02;
    this.root.add(this.figure.group);
    clearGroup(this.moteGroup);
    this.motes = [];
    const shouldAddMotes = this.currentStyle.familiarType !== "none" || this.currentStyle.eyeGlowMode !== "none";
    if (shouldAddMotes) {
      const moteColor = this.currentStyle.eyeGlowMode !== "none"
        ? `#${(this.currentStyle.eyeGlowColor ?? 0x8cd7ff).toString(16).padStart(6, "0")}`
        : `#${(this.currentStyle.familiarColor ?? 0xb39cf4).toString(16).padStart(6, "0")}`;
      const moteCount = this.currentStyle.familiarType === "none" ? 2 : 4;
      for (let index = 0; index < moteCount; index += 1) {
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: createBurstTexture(moteColor, index % 2 === 0 ? "spark" : "star"),
            transparent: true,
            toneMapped: false,
          }),
        );
        const baseScale = this.currentStyle.familiarType === "none" ? 0.1 : 0.13;
        sprite.scale.set(baseScale, baseScale, 1);
        this.moteGroup.add(sprite);
        this.motes.push({
          sprite,
          phase: index * 1.7,
          radius: 0.46 + index * 0.08,
          speed: 0.012 + index * 0.004,
          lift: 0.58 + index * 0.08,
          baseScale,
        });
      }
    }
    this.renderFrame();
  }

  loop() {
    if (!this.running) {
      return;
    }
    this.frame += 1;
    this.renderFrame();
    requestAnimationFrame(this.loop);
  }

  renderFrame() {
    if (!this.figure) {
      return;
    }
    const sway = Math.sin(this.frame * 0.035) * 0.05;
    const bob = Math.sin(this.frame * 0.05) * 0.04;
    const poseVariant = this.currentStyle?.poseVariant ?? "neutral";
    const neutralArm = poseVariant === "heroic" ? -0.18 : poseVariant === "crooked" ? 0.04 : -0.1;
    const neutralOffArm = poseVariant === "heroic" ? 0.18 : poseVariant === "crooked" ? -0.18 : 0.06;
    this.figure.group.rotation.y = 0.42 + sway;
    this.figure.group.position.y = 0.02 + bob;
    this.figure.arm.rotation.z = neutralArm + Math.sin(this.frame * 0.06) * 0.08;
    this.figure.offArm.rotation.z = neutralOffArm - Math.cos(this.frame * 0.05) * 0.05;
    if (this.currentStyle?.eyeGlowMode && this.currentStyle.eyeGlowMode !== "none") {
      const pulseStrength = this.currentStyle.eyeGlowMode === "bright" ? 0.24 : 0.12;
      const pulse = 1 + Math.sin(this.frame * 0.12) * pulseStrength;
      for (const key of ["leftEye", "rightEye"]) {
        const eye = this.figure[key];
        const baseScale = eye?.userData?.baseScale;
        if (eye && baseScale) {
          eye.scale.set(baseScale.x * pulse, baseScale.y * pulse, baseScale.z);
        }
      }
    }
    if (this.figure.familiar) {
      const familiarType = this.figure.familiar.userData.type;
      if (familiarType === "bat") {
        this.figure.familiar.position.y = 0.82 + Math.sin(this.frame * 0.18) * 0.06;
        this.figure.familiar.rotation.z = Math.sin(this.frame * 0.2) * 0.08;
        this.figure.familiar.userData.leftWing.rotation.z = 0.28 + Math.sin(this.frame * 0.28) * 0.4;
        this.figure.familiar.userData.rightWing.rotation.z = -0.28 - Math.sin(this.frame * 0.28) * 0.4;
      } else if (familiarType === "toad") {
        this.figure.familiar.position.y = (this.figure.familiar.userData.baseY ?? 0.11) + Math.sin(this.frame * 0.08) * 0.015;
      } else if (familiarType === "candle") {
        this.figure.familiar.position.y = (this.figure.familiar.userData.baseY ?? 0.77) + Math.sin(this.frame * 0.1) * 0.018;
        if (this.figure.familiarFlame) {
          const flameScale = 0.15 + Math.sin(this.frame * 0.22) * 0.03;
          this.figure.familiarFlame.scale.set(flameScale, flameScale * 1.2, 1);
        }
      } else if (familiarType === "moth") {
        this.figure.familiar.position.x = (this.figure.familiar.userData.baseX ?? -0.24) + Math.cos(this.frame * 0.09) * 0.08;
        this.figure.familiar.position.y = (this.figure.familiar.userData.baseY ?? 0.83) + Math.sin(this.frame * 0.16) * 0.05;
        this.figure.familiar.userData.leftWing.rotation.z = 0.2 + Math.sin(this.frame * 0.34) * 0.5;
        this.figure.familiar.userData.rightWing.rotation.z = -0.2 - Math.sin(this.frame * 0.34) * 0.5;
      }
    }
    this.motes.forEach((mote, index) => {
      const angle = this.frame * mote.speed + mote.phase;
      mote.sprite.position.set(
        Math.cos(angle) * mote.radius,
        mote.lift + Math.sin(angle * 1.3) * 0.12,
        Math.sin(angle) * 0.35 + 0.18,
      );
      const scale = mote.baseScale * (1 + Math.sin(this.frame * 0.16 + index) * 0.18);
      mote.sprite.scale.set(scale, scale, 1);
    });
    this.camera.lookAt(0, 0.72, 0);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.running = false;
    if (this.figure?.group) {
      clearGroup(this.root);
    }
    this.renderer.dispose();
  }
}
