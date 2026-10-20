import React from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip
} from "recharts";

/**
 * AnomalyRadarChart
 * Displays a spider/radar chart of all 5 structural parameters
 * normalized 0–1 against their danger thresholds.
 */
export default function AnomalyRadarChart({ telemetry }) {
  if (!telemetry || !telemetry.current) return null;
  const cur = telemetry.current;

  // Normalize each sensor reading to a 0–100 scale vs its max "danger" threshold
  const vibrationNorm = Math.min(100, (cur.vibration_rms_g / 0.30) * 100);
  const strainNorm = Math.min(100, (cur.deck_strain_microstrain / 600) * 100);
  const tiltNorm = Math.min(100, (cur.pier_tilt_degrees / 0.30) * 100);
  const scourNorm = Math.min(100, (cur.scour_depth_m / 5.0) * 100);
  const waterNorm = Math.min(100, (cur.water_level_m / 10.0) * 100);

  const data = [
    {
      parameter: "Vibration",
      value: Math.round(vibrationNorm),
      fullMark: 100,
      label: `${cur.vibration_rms_g}g`
    },
    {
      parameter: "Strain",
      value: Math.round(strainNorm),
      fullMark: 100,
      label: `${cur.deck_strain_microstrain}με`
    },
    {
      parameter: "Tilt",
      value: Math.round(tiltNorm),
      fullMark: 100,
      label: `${cur.pier_tilt_degrees}°`
    },
    {
      parameter: "Scour",
      value: Math.round(scourNorm),
      fullMark: 100,
      label: `${cur.scour_depth_m}m`
    },
    {
      parameter: "Water",
      value: Math.round(waterNorm),
      fullMark: 100,
      label: `${cur.water_level_m}m`
    }
  ];

  // Determine overall color based on max normalized value
  const maxNorm = Math.max(vibrationNorm, strainNorm, tiltNorm, scourNorm, waterNorm);
  let radarColor = "#10b981"; // green
  let radarFill = "rgba(16,185,129,0.12)";
  if (maxNorm > 80) {
    radarColor = "#ef4444";
    radarFill = "rgba(239,68,68,0.12)";
  } else if (maxNorm > 50) {
    radarColor = "#f97316";
    radarFill = "rgba(249,115,22,0.12)";
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-950 border border-slate-800 p-2 rounded text-[9px] font-mono shadow-xl">
          <p className="text-amber-500 font-bold uppercase">{item.parameter}</p>
          <p className="text-white">Reading: <span className="text-amber-400">{item.label}</span></p>
          <p className="text-slate-400">Risk Index: <span style={{ color: radarColor }}>{item.value}%</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart outerRadius="70%" data={data}>
          {/* Danger zone rings */}
          <PolarGrid
            gridType="polygon"
            stroke="rgba(255,255,255,0.04)"
            radialLines={true}
          />
          <PolarAngleAxis
            dataKey="parameter"
            tick={{
              fill: "#64748b",
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
              fontWeight: "bold"
            }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Safe zone fill (0-50%) */}
          <Radar
            name="Safe Zone"
            dataKey={() => 50}
            stroke="rgba(16,185,129,0.08)"
            fill="rgba(16,185,129,0.04)"
            strokeDasharray="3 3"
            strokeWidth={0.5}
            dot={false}
            isAnimationActive={false}
          />

          {/* Warning threshold ring (80%) */}
          <Radar
            name="Warning Threshold"
            dataKey={() => 80}
            stroke="rgba(249,115,22,0.15)"
            fill="none"
            strokeDasharray="4 4"
            strokeWidth={0.5}
            dot={false}
            isAnimationActive={false}
          />

          {/* Live sensor readings */}
          <Radar
            name="Live Sensor Data"
            dataKey="value"
            stroke={radarColor}
            fill={radarFill}
            strokeWidth={1.5}
            dot={{ fill: radarColor, r: 3, strokeWidth: 0 }}
            isAnimationActive={true}
            animationDuration={400}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-[8px] font-mono text-slate-500 mt-1">
        <span className="flex items-center gap-1">
          <span className="w-2 h-0.5 bg-emerald-500 inline-block"></span> Safe (&lt;50%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-0.5 bg-orange-500 inline-block border-dashed"></span> Warning (&gt;80%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-0.5 inline-block" style={{ background: radarColor }}></span> Live Data
        </span>
      </div>
    </div>
  );
}
