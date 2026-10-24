import { createCn } from "cn/config";

// Our type steps are text-* utilities too. Without this, cn can't tell
// `text-ui` (a size) from `text-text-2` (a color) and drops one of them.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "caption",
            "label",
            "ui",
            "body",
            "title",
            "heading",
            "display",
            "essay",
            "essay-title",
          ],
        },
      ],
    },
  },
});
