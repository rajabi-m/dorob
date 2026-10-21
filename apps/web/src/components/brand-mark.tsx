type LogoShape = { kind: "path" | "circle"; d?: string; cx?: number; cy?: number; r?: number; fill: string; stroke: string; strokeWidth: number };
type Logo = { id: string; name: string; description: string; viewBox: string; shapes: LogoShape[] };
type LogoColors = { primary: string; ink: string; accent: string; surface: string };

const selectedLogo: Logo = {
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
  };

function paint(role: string, colors?: LogoColors) {
  if (role === "none") return "none";
  if (colors) return colors[role as keyof LogoColors];
  return `var(--ds-${role === "surface" ? "logo-surface" : role}, currentColor)`;
}

export function BrandMark({ className = "" }: { className?: string }) {
  const logo = selectedLogo;
  return (
    <svg className={className} viewBox={logo.viewBox} fill="none" aria-hidden="true" focusable="false">
      {logo.shapes.map((shape, i) => {
        const props = { fill: paint(shape.fill), stroke: paint(shape.stroke), strokeWidth: shape.strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
        return shape.kind === "circle" ? <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} {...props} /> : <path key={i} d={shape.d} {...props} />;
      })}
    </svg>
  );
}

export function brandSvg(colors: LogoColors) {
  const logo = selectedLogo;
  const shapes = logo.shapes.map(shape => {
    const geometry = shape.kind === "circle" ? `cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}"` : `d="${shape.d}"`;
    return `<${shape.kind} ${geometry} fill="${paint(shape.fill, colors)}" stroke="${paint(shape.stroke, colors)}" stroke-width="${shape.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${logo.viewBox}" role="img"><title>${logo.name} — دورُب</title>${shapes}</svg>`;
}
