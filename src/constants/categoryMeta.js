import {
  BookOpenText,
  Books,
  FolderSimple,
  HandHeart,
  Mosque,
  Scales,
  Scroll,
} from "@phosphor-icons/react";

const CATEGORY_PRESETS = [
  {
    key: "aqeedah",
    matches: ["العقيدة"],
    color: "#1a6b5a",
    Icon: HandHeart,
  },
  {
    key: "seerah",
    matches: ["السيرة"],
    color: "#c68a2d",
    Icon: Mosque,
  },
  {
    key: "fiqh",
    matches: ["الفقه"],
    color: "#2f7d4e",
    Icon: Scales,
  },
  {
    key: "tafsir",
    matches: ["التفسير"],
    color: "#4b5fb8",
    Icon: Books,
  },
  {
    key: "quran",
    matches: ["القرآن"],
    color: "#1a6b5a",
    Icon: BookOpenText,
  },
  {
    key: "hadith",
    matches: ["الحديث"],
    color: "#7b6a58",
    Icon: Scroll,
  },
];

const DEFAULT_CATEGORY_META = {
  key: "general",
  color: "#1a6b5a",
  Icon: FolderSimple,
};

export function getCategoryMeta(category = "") {
  const normalized = String(category).trim();

  const match = CATEGORY_PRESETS.find((item) =>
    item.matches.some((token) => normalized.includes(token)),
  );

  return match || DEFAULT_CATEGORY_META;
}
