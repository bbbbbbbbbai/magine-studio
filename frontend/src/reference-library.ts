export type ReferenceKind = "portrait" | "costume" | "pose";

export interface ReferenceItem {
  key: string;
  id: string;
  kind: ReferenceKind;
  title: string;
  subtitle: string;
  category: string;
  tags: string[];
  promptText: string;
  thumb: string;
  original: string;
  depthThumb?: string;
  depthOriginal?: string;
  angle?: string;
  hot?: boolean;
  nsfw: boolean;
  sourceName: string;
  sourceUrl?: string;
}

export interface ReferenceRecipe {
  portrait: ReferenceItem | null;
  costume: ReferenceItem | null;
  pose: ReferenceItem | null;
  poseDepth: boolean;
}

export interface ReferenceLibraryData {
  portraits: ReferenceItem[];
  costumes: ReferenceItem[];
  poses: ReferenceItem[];
  counts: Record<ReferenceKind, number>;
}

interface RawPose {
  id: string;
  体系?: string;
  姿势编号?: string;
  分类?: string;
  姿势名称?: string;
  角度?: string;
  缩略图?: string;
  原图?: string;
  检索?: string;
}

interface RawCostumeView {
  id: string;
  label: string;
  缩略图?: string;
  预览图?: string;
  原图?: string;
}

interface RawCostume {
  id: string;
  source?: string;
  一级分类?: string;
  分类?: string;
  服装名称?: string;
  标签?: string[];
  关键词?: string;
  缩略图?: string;
  预览图?: string;
  原图?: string;
  来源?: string;
  来源地址?: string;
  敏感?: boolean;
  检索?: string;
  selectedView?: string;
  views?: RawCostumeView[];
}

interface RawPortrait {
  id: string;
  分区?: string;
  发长?: string;
  发型名称?: string;
  标题?: string;
  热门?: boolean;
  缩略图?: string;
  原图?: string;
  检索?: string;
}

const DATA_BASE =
  import.meta.env.VITE_REFERENCE_DATA_BASE ||
  "https://raw.githubusercontent.com/anhao/ai-pose-gallery-zh/main";
const ASSET_BASE =
  import.meta.env.VITE_REFERENCE_ASSET_BASE ||
  "https://ai-pose-gallery.anhao.app";

const DATA_FILES = {
  pose: "data/pose-zh.json",
  costume: "data/costume-zh.json",
  costumeAnime: "data/costume-anime-zh.json",
  costumeGiaAnime: "data/costume-gia-anime-zh.json",
  costumeShisei: "data/costume-shisei-zh.json",
  portrait: "data/portrait-zh.json",
} as const;

const ADULT_POSE_SYSTEMS = new Set(["全身单人・性感系", "双人缠绵"]);
const ADULT_COSTUME_CATEGORIES = new Set(["内衣・睡衣", "性感穿搭"]);
const RECIPE_STORAGE_KEY = "imagine-studio:reference-recipe:v1";

let libraryPromise: Promise<ReferenceLibraryData> | null = null;

export const EMPTY_REFERENCE_RECIPE: ReferenceRecipe = {
  portrait: null,
  costume: null,
  pose: null,
  poseDepth: false,
};

function asAssetUrl(path: string | undefined) {
  if (!path) return "";
  if (/^(data:|https?:\/\/|\/)/i.test(path)) return path;
  return `${ASSET_BASE.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function poseDepthPath(path: string | undefined, layer: "thumb" | "image") {
  if (!path || /^(data:|https?:\/\/)/i.test(path)) return undefined;
  const clean = path.replace(/^\/+/, "");
  if (layer === "thumb") {
    if (clean.startsWith("thumbs/depth/")) return asAssetUrl(clean);
    if (clean.startsWith("thumbs/")) {
      return asAssetUrl(
        `thumbs/depth/${clean
          .slice("thumbs/".length)
          .replace(/\.(jpe?g|png)$/i, ".webp")}`,
      );
    }
    return undefined;
  }
  if (clean.startsWith("img/depth/")) return asAssetUrl(clean);
  if (clean.startsWith("img/")) {
    return asAssetUrl(
      `img/depth/${clean
        .slice("img/".length)
        .replace(/\.(jpe?g|png)$/i, ".webp")}`,
    );
  }
  return undefined;
}

function costumeSource(item: RawCostume) {
  if (item.source === "charadb") {
    return {
      name: item.来源 || "たき AI · CharaDB",
      url: item.来源地址 || "https://charadb-2fi.pages.dev/",
    };
  }
  if (item.source === "gia-anime") {
    return {
      name: item.来源 || "ギア · 动漫服装",
      url:
        item.来源地址 ||
        "https://ai-costume-anime-gallery.pages.dev/",
    };
  }
  if (item.source === "shisei") {
    return {
      name: item.来源 || "Shisei · wquguru",
      url: item.来源地址 || "https://github.com/wquguru/shisei",
    };
  }
  return {
    name: item.来源 || "ギア · 现实服装",
    url: item.来源地址 || "https://ai-costume-gallery.pages.dev/",
  };
}

function normalizePose(item: RawPose): ReferenceItem {
  const system = item.体系 || "姿势参考";
  const name = item.姿势名称 || item.id;
  return {
    key: `pose:${item.id}`,
    id: item.id,
    kind: "pose",
    title: `${item.姿势编号 || ""} ${name}`.trim(),
    subtitle: `${system} · ${item.角度 || "默认视角"}`,
    category: item.分类 || "未分类",
    tags: [system, item.分类 || "", item.角度 || ""].filter(Boolean),
    promptText: `${name}，${item.角度 || "自然视角"}，${system}，${item.分类 || ""}`,
    thumb: asAssetUrl(item.缩略图),
    original: asAssetUrl(item.原图 || item.缩略图),
    depthThumb: poseDepthPath(item.缩略图, "thumb"),
    depthOriginal: poseDepthPath(item.原图 || item.缩略图, "image"),
    angle: item.角度,
    nsfw: ADULT_POSE_SYSTEMS.has(system),
    sourceName: "ギア · 姿势参考",
    sourceUrl: "https://ai-pose-gallery.pages.dev/",
  };
}

function normalizeCostume(item: RawCostume): ReferenceItem {
  const source = costumeSource(item);
  const sourceId = item.source || "gia";
  return {
    key: `costume:${sourceId}:${item.id}`,
    id: item.id,
    kind: "costume",
    title: item.服装名称 || item.id,
    subtitle: `${item.分类 || "未分类"} · ${source.name}`,
    category: item.分类 || "未分类",
    tags: item.标签 || [],
    promptText:
      item.关键词 ||
      `${item.服装名称 || item.id}，${(item.标签 || []).join("，")}`,
    thumb: asAssetUrl(item.缩略图 || item.预览图),
    original: asAssetUrl(item.原图 || item.预览图 || item.缩略图),
    nsfw:
      Boolean(item.敏感) ||
      ADULT_COSTUME_CATEGORIES.has(item.分类 || ""),
    sourceName: source.name,
    sourceUrl: source.url,
  };
}

function normalizePortrait(item: RawPortrait): ReferenceItem {
  return {
    key: `portrait:${item.id}`,
    id: item.id,
    kind: "portrait",
    title: item.标题 || item.发型名称 || item.id,
    subtitle: `${item.分区 || "人像参考"} · ${item.发长 || "自然发长"}`,
    category: item.分区 || "人像参考",
    tags: [item.发长 || "", item.发型名称 || ""].filter(Boolean),
    promptText: `${item.发型名称 || item.标题 || item.id}，${item.发长 || ""}`,
    thumb: asAssetUrl(item.缩略图),
    original: asAssetUrl(item.原图 || item.缩略图),
    hot: Boolean(item.热门),
    nsfw: false,
    sourceName: "ギア · 人像参考 · CC0",
    sourceUrl: "https://ai-portrait-gallery.pages.dev/",
  };
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(
    `${DATA_BASE.replace(/\/+$/, "")}/${path}`,
  );
  if (!response.ok) {
    throw new Error(`素材索引加载失败 (${response.status})`);
  }
  return (await response.json()) as T;
}

export function loadReferenceLibrary() {
  if (!libraryPromise) {
    libraryPromise = Promise.all([
      fetchJson<RawPose[]>(DATA_FILES.pose),
      fetchJson<RawCostume[]>(DATA_FILES.costume),
      fetchJson<RawCostume[]>(DATA_FILES.costumeAnime),
      fetchJson<RawCostume[]>(DATA_FILES.costumeGiaAnime),
      fetchJson<RawCostume[]>(DATA_FILES.costumeShisei),
      fetchJson<RawPortrait[]>(DATA_FILES.portrait),
    ])
      .then(([poses, costumes, anime, giaAnime, shisei, portraits]) => {
        const normalizedPoses = poses.map(normalizePose);
        const normalizedCostumes = [
          ...costumes.map(normalizeCostume),
          ...anime.map(normalizeCostume),
          ...giaAnime.map(normalizeCostume),
          ...shisei.map(normalizeCostume),
        ];
        const normalizedPortraits = portraits.map(normalizePortrait);
        return {
          poses: normalizedPoses,
          costumes: normalizedCostumes,
          portraits: normalizedPortraits,
          counts: {
            pose: normalizedPoses.length,
            costume: normalizedCostumes.length,
            portrait: normalizedPortraits.length,
          },
        } satisfies ReferenceLibraryData;
      })
      .catch((error: unknown) => {
        libraryPromise = null;
        throw error;
      });
  }
  return libraryPromise;
}

export function referenceImage(item: ReferenceItem, poseDepth = false) {
  return poseDepth && item.depthOriginal
    ? item.depthOriginal
    : item.original;
}

export function referenceThumb(item: ReferenceItem, poseDepth = false) {
  return poseDepth && item.depthThumb ? item.depthThumb : item.thumb;
}

export function selectedReferenceCount(recipe: ReferenceRecipe) {
  return [recipe.portrait, recipe.costume, recipe.pose].filter(Boolean)
    .length;
}

export function buildReferencePrompt(recipe: ReferenceRecipe) {
  const parts = [
    "根据角色参考配方，创作一位原创虚构的成年角色，保持自然的人体比例与完整构图。",
  ];
  if (recipe.portrait) {
    parts.push(
      `人像与发型参考：${recipe.portrait.title}，${recipe.portrait.promptText}。`,
    );
  }
  if (recipe.costume) {
    parts.push(
      `服装参考：${recipe.costume.title}；${recipe.costume.promptText}。`,
    );
  }
  if (recipe.pose) {
    parts.push(
      `姿势与镜头参考：${recipe.pose.promptText}；画面采用${recipe.pose.angle || "自然"}视角。`,
    );
  }
  if (selectedReferenceCount(recipe) > 0) {
    parts.push(
      "只借鉴发型、服装款式、姿势与镜头关系，不复刻参考图中的具体人物身份。",
    );
  }
  return parts.join("");
}

export function loadSavedReferenceRecipe(): ReferenceRecipe {
  try {
    const raw = window.localStorage.getItem(RECIPE_STORAGE_KEY);
    if (!raw) return EMPTY_REFERENCE_RECIPE;
    const value = JSON.parse(raw) as Partial<ReferenceRecipe>;
    return {
      portrait:
        value.portrait?.kind === "portrait" ? value.portrait : null,
      costume:
        value.costume?.kind === "costume" ? value.costume : null,
      pose: value.pose?.kind === "pose" ? value.pose : null,
      poseDepth: Boolean(value.poseDepth),
    };
  } catch {
    return EMPTY_REFERENCE_RECIPE;
  }
}

export function saveReferenceRecipe(recipe: ReferenceRecipe) {
  try {
    window.localStorage.setItem(RECIPE_STORAGE_KEY, JSON.stringify(recipe));
  } catch {
    // The recipe still works for the current session when storage is blocked.
  }
}
