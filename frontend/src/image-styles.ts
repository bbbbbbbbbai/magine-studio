import {
  Baby,
  Ban,
  Boxes,
  CloudSun,
  Film,
  Gamepad2,
  Glasses,
  LayoutTemplate,
  PenTool,
  Sparkles,
  SunMedium,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface ImageStylePreset {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const IMAGE_STYLE_PRESETS: ImageStylePreset[] = [
  { id: "none", label: "无预设（跟随参考图）", icon: Ban },
  { id: "realistic", label: "写实人像写真", icon: SunMedium },
  { id: "fashion", label: "日韩杂志画报", icon: Glasses },
  { id: "film", label: "复古胶片写真", icon: Film },
  { id: "semi_real", label: "2.5D 游戏原画立绘", icon: Gamepad2 },
  { id: "anime", label: "日系二次元插画", icon: Sparkles },
  { id: "cel_anime", label: "新海诚感动画电影", icon: CloudSun },
  { id: "manga", label: "日式黑白漫画网点", icon: PenTool },
  { id: "render3d", label: "3D 次世代角色渲染", icon: Boxes },
  { id: "toy", label: "3D 潮玩手办质感", icon: Baby },
  { id: "cyberpunk", label: "赛博朋克霓虹", icon: Zap },
  { id: "concept_sheet", label: "角色设定集立绘（纯白底）", icon: LayoutTemplate },
];

export const DEFAULT_IMAGE_STYLE = IMAGE_STYLE_PRESETS[0].id;
