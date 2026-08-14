import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Tailwind's default `text-<size>` class group only recognizes t-shirt sizes
// (text-sm, text-lg, ...). Our custom fontSize tokens from tailwind.config.ts
// (text-display, text-page-title, etc.) don't match that pattern, so
// tailwind-merge misclassifies them into the text-color group and silently
// drops them when merged alongside a real color class (e.g. text-foreground).
// Registering them under a dedicated "font-size" class group fixes that.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "page-title",
            "section-title",
            "card-title",
            "body",
            "metadata",
            "micro-label",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
