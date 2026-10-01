/* Data Visualization Charts */

// 1. Smooth Bezier Curve Sparkline with Gradient Glow
export function SmoothWaveSparkline({ color = 'green', height = 36 }) {
  const isGreen = color === 'green';
  const isRed = color === 'red';
  const strokeColor = isGreen ? '#10B981' : isRed ? '#F43F5E' : '#F59E0B';
  const gradientId = `wave-grad-${color}`;

  // Smooth continuous multi-point cubic bezier wave spanning x: 0 to 200
  const pathData = isGreen
    ? "M 0,26 C 30,26 45,14 70,18 C 95,22 120,6 150,12 C 175,16 190,4 200,6"
    : isRed
    ? "M 0,8 C 25,6 45,24 70,16 C 95,8 120,30 150,24 C 175,20 190,32 200,28"
    : "M 0,20 C 30,22 55,10 85,16 C 115,22 140,8 165,14 C 185,18 195,10 200,12";

  const areaData = `${pathData} L 200,40 L 0,40 Z`;

  return (
    <div style={{ width: '100%', height: `${height}px`, overflow: 'hidden' }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 200 40"
        preserveAspectRatio="none"
        fill="none"
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaData} fill={`url(#${gradientId})`} />
        <path d={pathData} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// 2. SVG Donut Allocation Chart
export function DonutAllocationChart({
  mutuals = 0,
  nonFollowers = 0,
  fans = 0,
  size = 110
}) {
  const total = (mutuals + nonFollowers + fans) || 1;
  const pctMutual = Math.round((mutuals / total) * 100);
  const pctNonFollowers = Math.round((nonFollowers / total) * 100);
  const pctFans = 100 - pctMutual - pctNonFollowers;

  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  const strokeMutual = (pctMutual / 100) * circumference;
  const strokeNon = (pctNonFollowers / 100) * circumference;
  const strokeFans = circumference - strokeMutual - strokeNon;

  const offsetNon = -strokeMutual;
  const offsetFans = -(strokeMutual + strokeNon);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          {/* Base track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="rgba(0, 0, 0, 0.05)"
            strokeWidth="11"
          />
          {/* Mutuals Segment (Green) */}
          {strokeMutual > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#10B981"
              strokeWidth="11"
              strokeDasharray={`${strokeMutual} ${circumference}`}
              strokeDashoffset="0"
              strokeLinecap="round"
            />
          )}
          {/* Non-Followers Segment (Red) */}
          {strokeNon > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#F43F5E"
              strokeWidth="11"
              strokeDasharray={`${strokeNon} ${circumference}`}
              strokeDashoffset={offsetNon}
              strokeLinecap="round"
            />
          )}
          {/* Fans Segment (Blue) */}
          {strokeFans > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#3B82F6"
              strokeWidth="11"
              strokeDasharray={`${strokeFans} ${circumference}`}
              strokeDashoffset={offsetFans}
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Center label */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            lineHeight: 1
          }}
        >
          <span style={{ fontSize: '17px', fontWeight: 800, color: '#111827', fontFeatureSettings: 'tnum' }}>
            {pctMutual}%
          </span>
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginTop: '3px' }}>
            Mutual
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px', fontWeight: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10B981' }}></span>
          <span>{mutuals} Mutuals ({pctMutual}%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F43F5E' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#F43F5E' }}></span>
          <span>{nonFollowers} Non-Followers ({pctNonFollowers}%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3B82F6' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#3B82F6' }}></span>
          <span>{fans} Fans</span>
        </div>
      </div>
    </div>
  );
}

// 3. Rounded Activity Bar Chart
export function ActivityBarChart({ height = 48 }) {
  const bars = [
    { height: 35, active: false },
    { height: 60, active: false },
    { height: 45, active: false },
    { height: 80, active: true },
    { height: 50, active: false },
    { height: 95, active: true },
    { height: 65, active: false },
    { height: 40, active: false },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: `${height}px` }}>
      {bars.map((bar, idx) => (
        <div
          key={idx}
          style={{
            flex: 1,
            height: `${bar.height}%`,
            background: bar.active ? '#10B981' : 'rgba(16, 185, 129, 0.18)',
            borderRadius: '4px',
            transition: 'all 0.2s ease'
          }}
        />
      ))}
    </div>
  );
}
