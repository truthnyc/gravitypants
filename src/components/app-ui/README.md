# app-ui

Shared look for signed-in app pages, matched to publish.html. The marketing site does not use these.

Tokens live in `src/styles.css` under the `--ap-*` block and map to Tailwind classes such as `bg-ap-panel`, `text-ap-ink`, `border-ap-hairline`, `shadow-ap-focus` and `font-ap`.

| Token | Value | Use |
|---|---|---|
| ink | #1d1d1f | headings, main text |
| body | #57575c | secondary text, section labels |
| muted | #6e6e73 | hints, placeholders |
| blue / blue-hover | #0071e3 / #0077ed | primary actions, selection, active states |
| badge | #0058b0 | badge text |
| soft-blue | #eef4fb | info boxes |
| panel | #f5f5f7 | page background for Photos, Edit, Export, Share; ghost buttons; segmented |
| media | #ededf0 | empty image areas |
| hairline | #e5e5ea | field and chip borders |
| inner | #e8e8ed | thumbnail inner ring, off switch |
| green | #248a3d | completed steps |
| amber | #b25000 | warnings |
| switch-off | #d1d1d6 | switch track when off |

Components (`@/components/app-ui`):

- `AppCard` - white, 24px radius, 22-26px padding, no border.
- `AppButton` - 8px radius. `variant="primary" | "ghost"`, `size="sm"` (36px), `"md"` (40px) or `"lg"` (46px).
- `AppField` + `AppInput` / `AppSelect` - 13px semibold label; 44px field, 12px radius, hairline border, blue focus ring.
- `AppSegmented` - panel bg, 10px radius, 4px padding; selected item white with soft shadow.
- `AppSteps` - Photos, Edit, Export, Share. Done shows a green check, current is a white pill with a blue number.
- `AppSwitch` - 52x32, blue when on.
- `AppSectionLabel` - uppercase, semibold, 0.06em tracking, body color.
- `AppInfoBox` - soft-blue, 18px radius.
- `AppThumb` - 8px radius, inner ring and soft shadow.
- `AppTag` - plain blue text, or `chip` for a white chip with a hairline border (`selected` turns border and text blue). Never a tinted blue box.

Rules: all selection and active states use blue. Keep the small colored icons on the inspector tiles. No page uses these yet; switching pages over (including setting the four ad steps' background to panel) comes next.
