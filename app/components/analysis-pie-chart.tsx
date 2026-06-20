"use client";

export type PieSlice = {
  label: string;
  value: number;
  color: string;
};

type AnalysisPieChartProps = {
  slices: PieSlice[];
  total: number;
  size?: number;
};

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function describeSlice(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

export function AnalysisPieChart({
  slices,
  total,
  size = 240,
}: AnalysisPieChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const innerRadius = size * 0.22;
  const sum = slices.reduce((acc, slice) => acc + slice.value, 0);

  let cursor = -Math.PI / 2;
  const paths = slices
    .filter((slice) => slice.value > 0)
    .map((slice) => {
      const angle = (slice.value / sum) * Math.PI * 2;
      const start = cursor;
      const end = cursor + angle;
      cursor = end;
      return {
        ...slice,
        d: describeSlice(cx, cy, radius, start, end),
        percent: sum > 0 ? (slice.value / sum) * 100 : 0,
      };
    });

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
      <div className="relative shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="drop-shadow-[0_0_24px_rgba(16,185,129,0.12)]"
          role="img"
          aria-label="Analysis distribution pie chart"
        >
          <defs>
            <filter id="pie-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodOpacity="0.35" />
            </filter>
          </defs>

          {sum === 0 ? (
            <>
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke="#1e293b"
                strokeWidth={radius - innerRadius}
              />
              <circle cx={cx} cy={cy} r={innerRadius} fill="#0b0f14" />
            </>
          ) : (
            paths.map((slice, index) => (
              <path
                key={slice.label}
                d={slice.d}
                fill={slice.color}
                filter="url(#pie-glow)"
                className="origin-center transition-opacity hover:opacity-90"
                style={{ animationDelay: `${index * 80}ms` }}
              />
            ))
          )}

          <circle cx={cx} cy={cy} r={innerRadius} fill="#0b0f14" />
          <circle
            cx={cx}
            cy={cy}
            r={innerRadius}
            fill="none"
            stroke="#1e293b"
            strokeWidth="1"
          />
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            className="fill-slate-500 text-[10px] font-medium"
            style={{ fontSize: 10 }}
          >
            总计
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            className="fill-slate-100 text-[18px] font-semibold"
            style={{ fontSize: 18, fontWeight: 600 }}
          >
            {total.toLocaleString("zh-CN")}
          </text>
        </svg>
      </div>

      <ul className="w-full min-w-[200px] space-y-3 lg:w-auto lg:pt-4">
        {slices.map((slice) => {
          const percent =
            sum > 0 ? ((slice.value / sum) * 100).toFixed(1) : "0.0";
          return (
            <li
              key={slice.label}
              className="flex items-center justify-between gap-4 rounded-lg border border-slate-800/80 bg-[#080c10]/60 px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-xs text-slate-300">{slice.label}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-slate-100">
                  {slice.value.toLocaleString("zh-CN")}
                </span>
                <span className="ml-2 text-[11px] text-slate-500">{percent}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
