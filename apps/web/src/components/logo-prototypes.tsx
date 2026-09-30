type LogoShape = { kind: "path" | "circle"; d?: string; cx?: number; cy?: number; r?: number; fill: string; stroke: string; strokeWidth: number };
type Logo = { id: string; name: string; description: string; viewBox: string; shapes: LogoShape[] };
type LogoColors = { primary: string; ink: string; accent: string; surface: string };

export const logoPrototypes: Logo[] = [
  {
    "id": "sprout",
    "name": "جوانه",
    "description": "کلاه و جوانه؛ رشد با یادگیری",
    "viewBox": "0 0 64 72",
    "shapes": [
      {
        "kind": "path",
        "d": "M32 7C32 16 25 20 19 18C19 10 24 6 32 7Z",
        "fill": "primary",
        "stroke": "none",
        "strokeWidth": 4
      },
      {
        "kind": "path",
        "d": "M35 17C35 9 41 6 48 8C48 15 42 19 35 17Z",
        "fill": "primary",
        "stroke": "none",
        "strokeWidth": 4
      },
      {
        "kind": "path",
        "d": "M6 30L32 20L58 30L32 41Z",
        "fill": "primary",
        "stroke": "none",
        "strokeWidth": 4
      },
      {
        "kind": "path",
        "d": "M17 39V47Q32 61 47 47V39",
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 4
      },
      {
        "kind": "path",
        "d": "M56 32V46",
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 4
      }
    ]
  },
  {
    "id": "book",
    "name": "کتاب",
    "description": "کلاه و کتاب؛ دانش در دسترس",
    "viewBox": "0 0 64 72",
    "shapes": [
      {
        "kind": "path",
        "d": "M7 22L32 10L57 22L32 34Z",
        "fill": "primary",
        "stroke": "none",
        "strokeWidth": 4
      },
      {
        "kind": "path",
        "d": "M13 34Q24 31 32 38Q40 31 51 34V53Q41 50 32 56Q23 50 13 53Z",
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 4
      },
      {
        "kind": "path",
        "d": "M32 39V55",
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 4
      },
      {
        "kind": "path",
        "d": "M56 25V38",
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 4
      }
    ]
  },
  {
    "id": "compare",
    "name": "هم‌سنج",
    "description": "دو کارت آموزشی؛ انتخاب با مقایسه",
    "viewBox": "0 0 64 72",
    "shapes": [
      {
        "kind": "path",
        "d": "M7 24H28V53H7Z",
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 4
      },
      {
        "kind": "path",
        "d": "M36 24H57V53H36Z",
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 4
      },
      {
        "kind": "path",
        "d": "M10 17L22 10L34 17L22 24Z",
        "fill": "primary",
        "stroke": "none",
        "strokeWidth": 4
      },
      {
        "kind": "path",
        "d": "M31 17L43 10L55 17L43 24Z",
        "fill": "primary",
        "stroke": "none",
        "strokeWidth": 4
      },
      {
        "kind": "path",
        "d": "M13 34H22M13 42H19M42 34H51M42 42H48",
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 4
      }
    ]
  },
  {
    "id": "path",
    "name": "مسیر",
    "description": "یک مسیر پیوسته؛ از کشف تا مهارت",
    "viewBox": "0 0 64 72",
    "shapes": [
      {
        "kind": "path",
        "d": "M9 21L32 10L55 21L32 32Z",
        "fill": "primary",
        "stroke": "none",
        "strokeWidth": 4
      },
      {
        "kind": "path",
        "d": "M16 29V35H40Q52 35 52 45Q52 55 40 55H20",
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 4
      },
      {
        "kind": "path",
        "d": "M25 48L18 55L25 62",
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 4
      },
      {
        "kind": "path",
        "d": "M54 23V33",
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 4
      }
    ]
  },
  {
    "id": "dal",
    "name": "دال",
    "description": "حرف «د» و کلاه؛ امضای دورُب",
    "viewBox": "0 0 64 72",
    "shapes": [
      {
        "kind": "path",
        "d": "M10 21L32 10L54 21L32 32Z",
        "fill": "primary",
        "stroke": "none",
        "strokeWidth": 4
      },
      {
        "kind": "path",
        "d": "M39 29L51 43Q56 50 48 55Q43 58 35 58H12V48H34Q40 48 38 44L30 34Z",
        "fill": "primary",
        "stroke": "none",
        "strokeWidth": 4
      },
      {
        "kind": "path",
        "d": "M53 24V35",
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 4
      }
    ]
  },
  {
    "id": "reference",
    "name": "نشان شما",
    "description": "حلقه و کلاه؛ طرح پیشنهادی شما",
    "viewBox": "0 0 64 64",
    "shapes": [
      {
        "kind": "circle",
        "cx": 32,
        "cy": 38,
        "r": 17,
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 9
      },
      {
        "kind": "path",
        "d": "M32 3 57 13 32 23 7 13z",
        "fill": "ink",
        "stroke": "surface",
        "strokeWidth": 2.5
      },
      {
        "kind": "path",
        "d": "M57 13v14",
        "fill": "none",
        "stroke": "ink",
        "strokeWidth": 3
      },
      {
        "kind": "circle",
        "cx": 57,
        "cy": 29,
        "r": 3,
        "fill": "accent",
        "stroke": "none",
        "strokeWidth": 0
      }
    ]
  },
  {
    "id": "orbit",
    "name": "مدار",
    "description": "حلقه‌ی باز؛ نقطه‌ی شروع یادگیری",
    "viewBox": "0 0 64 64",
    "shapes": [
      {
        "kind": "path",
        "d": "M46 29A17 17 0 1 1 32 21",
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 8
      },
      {
        "kind": "path",
        "d": "M32 4L55 14L32 24L9 14Z",
        "fill": "ink",
        "stroke": "surface",
        "strokeWidth": 2.5
      },
      {
        "kind": "path",
        "d": "M55 15V27",
        "fill": "none",
        "stroke": "ink",
        "strokeWidth": 3
      },
      {
        "kind": "circle",
        "cx": 51,
        "cy": 34,
        "r": 4,
        "fill": "accent",
        "stroke": "none",
        "strokeWidth": 0
      }
    ]
  },
  {
    "id": "loops",
    "name": "پیوند",
    "description": "دو حلقه؛ کشف و مقایسه در کنار هم",
    "viewBox": "0 0 64 64",
    "shapes": [
      {
        "kind": "circle",
        "cx": 22,
        "cy": 40,
        "r": 12,
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 7
      },
      {
        "kind": "circle",
        "cx": 42,
        "cy": 40,
        "r": 12,
        "fill": "none",
        "stroke": "ink",
        "strokeWidth": 7
      },
      {
        "kind": "path",
        "d": "M32 5L56 15L32 25L8 15Z",
        "fill": "primary",
        "stroke": "surface",
        "strokeWidth": 2.5
      },
      {
        "kind": "path",
        "d": "M56 16V28",
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 3
      },
      {
        "kind": "circle",
        "cx": 56,
        "cy": 31,
        "r": 3,
        "fill": "accent",
        "stroke": "none",
        "strokeWidth": 0
      }
    ]
  },
  {
    "id": "gateway",
    "name": "درگاه",
    "description": "قاب نرم؛ ورودی دنیای مهارت‌ها",
    "viewBox": "0 0 64 64",
    "shapes": [
      {
        "kind": "path",
        "d": "M19 24H43Q50 24 50 32V47Q50 55 42 55H22Q14 55 14 47V32Q14 24 19 24Z",
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 8
      },
      {
        "kind": "path",
        "d": "M32 4L56 14L32 25L8 14Z",
        "fill": "ink",
        "stroke": "surface",
        "strokeWidth": 2.5
      },
      {
        "kind": "path",
        "d": "M56 15V28",
        "fill": "none",
        "stroke": "ink",
        "strokeWidth": 3
      },
      {
        "kind": "circle",
        "cx": 56,
        "cy": 31,
        "r": 3,
        "fill": "accent",
        "stroke": "none",
        "strokeWidth": 0
      },
      {
        "kind": "path",
        "d": "M26 39L31 44L39 34",
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 3
      }
    ]
  },
  {
    "id": "bloom",
    "name": "شکوفه",
    "description": "حلقه‌ی برگ‌مانند؛ رشد پیوسته",
    "viewBox": "0 0 64 64",
    "shapes": [
      {
        "kind": "path",
        "d": "M48 24V38C48 49 41 56 31 56C21 56 14 49 14 39C14 29 21 22 32 22H48Z",
        "fill": "none",
        "stroke": "primary",
        "strokeWidth": 8
      },
      {
        "kind": "path",
        "d": "M32 4L56 14L32 25L8 14Z",
        "fill": "ink",
        "stroke": "surface",
        "strokeWidth": 2.5
      },
      {
        "kind": "path",
        "d": "M56 15V28",
        "fill": "none",
        "stroke": "ink",
        "strokeWidth": 3
      },
      {
        "kind": "circle",
        "cx": 56,
        "cy": 31,
        "r": 3,
        "fill": "accent",
        "stroke": "none",
        "strokeWidth": 0
      }
    ]
  }
];

function paint(role: string, colors?: LogoColors) {
  if (role === "none") return "none";
  if (colors) return colors[role as keyof LogoColors];
  return `var(--ds-${role === "surface" ? "logo-surface" : role}, currentColor)`;
}

export function LogoPrototype({ index, className = "" }: { index: number; className?: string }) {
  const logo = logoPrototypes[index] ?? logoPrototypes[0];
  return (
    <svg className={className} viewBox={logo.viewBox} fill="none" aria-hidden="true" focusable="false">
      {logo.shapes.map((shape, i) => {
        const props = { fill: paint(shape.fill), stroke: paint(shape.stroke), strokeWidth: shape.strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
        return shape.kind === "circle" ? <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} {...props} /> : <path key={i} d={shape.d} {...props} />;
      })}
    </svg>
  );
}

export function logoSvg(index: number, colors: LogoColors) {
  const logo = logoPrototypes[index] ?? logoPrototypes[0];
  const shapes = logo.shapes.map(shape => {
    const geometry = shape.kind === "circle" ? `cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}"` : `d="${shape.d}"`;
    return `<${shape.kind} ${geometry} fill="${paint(shape.fill, colors)}" stroke="${paint(shape.stroke, colors)}" stroke-width="${shape.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${logo.viewBox}" role="img"><title>${logo.name} — دورُب</title>${shapes}</svg>`;
}
