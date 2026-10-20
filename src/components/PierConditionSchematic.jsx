export default function PierConditionSchematic({ current }) {
  const tiltDanger = current.pier_tilt_degrees > 0.15;
  const scourDanger = current.scour_depth_m > 3;
  const waterDanger = current.water_level_m > 8;
  const vibrationDanger = current.lstm_analysis.is_anomaly;
  const colorFor = (danger, warning = false) => danger ? "#ef4444" : warning ? "#f59e0b" : "#10b981";
  const pierColor = colorFor(tiltDanger, current.pier_tilt_degrees > 0.08);
  const foundationColor = colorFor(scourDanger, current.scour_depth_m > 2);
  const waterColor = colorFor(waterDanger, current.water_level_m > 6);

  return <div className="pier-schematic-wrap">
    <svg viewBox="0 0 420 250" role="img" aria-label="Live Pier 3 condition schematic" className="pier-schematic">
      <defs>
        <linearGradient id="pier-water" x1="0" x2="1"><stop stopColor="#0e7490" stopOpacity=".8"/><stop offset="1" stopColor="#1d4ed8" stopOpacity=".45"/></linearGradient>
        <filter id="pier-glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="420" height="250" fill="#080d16" rx="5"/>
      <path d="M0 43 H420" stroke="#334155" strokeDasharray="5 5"/><text x="12" y="34" fill="#64748b" fontSize="10" fontFamily="monospace">DECK LEVEL</text>
      <rect x="45" y="44" width="330" height="18" rx="3" fill="#334155" stroke="#64748b"/>
      <g transform={`rotate(${tiltDanger ? -2 : -0.4} 210 150)`}>
        <rect x="174" y="62" width="72" height="116" rx="5" fill="#334155" stroke={pierColor} strokeWidth="3" filter="url(#pier-glow)"/>
        <rect x="154" y="177" width="112" height="25" rx="3" fill="#1e293b" stroke={foundationColor} strokeWidth="3"/>
        <rect x="164" y="201" width="92" height="20" rx="3" fill="#172033" stroke={foundationColor} strokeWidth="2"/>
      </g>
      <rect x="0" y={waterDanger ? 132 : 156} width="420" height="94" fill="url(#pier-water)" opacity=".78"/>
      <path d={`M0 ${waterDanger ? 132 : 156} Q45 ${waterDanger ? 126 : 150} 90 ${waterDanger ? 132 : 156} T180 ${waterDanger ? 132 : 156} T270 ${waterDanger ? 132 : 156} T360 ${waterDanger ? 132 : 156} T420 ${waterDanger ? 132 : 156}`} fill="none" stroke={waterColor} strokeWidth="2"/>
      <circle cx="157" cy="94" r="7" fill={colorFor(vibrationDanger)} filter="url(#pier-glow)"/><text x="74" y="97" fill="#cbd5e1" fontSize="10" fontFamily="monospace">ACC · {current.vibration_rms_g} g</text>
      <circle cx="255" cy="119" r="7" fill={pierColor} filter="url(#pier-glow)"/><text x="268" y="122" fill="#cbd5e1" fontSize="10" fontFamily="monospace">TILT · {current.pier_tilt_degrees}°</text>
      <circle cx="275" cy="195" r="7" fill={foundationColor} filter="url(#pier-glow)"/><text x="286" y="198" fill="#cbd5e1" fontSize="10" fontFamily="monospace">SCOUR · {current.scour_depth_m} m</text>
      <text x="12" y={waterDanger ? 148 : 172} fill={waterColor} fontSize="10" fontFamily="monospace">WATER · {current.water_level_m} m</text>
      <text x="12" y="236" fill="#64748b" fontSize="9" fontFamily="monospace">PIER P3 · LIVE CONDITION MAP</text>
    </svg>
    <div className="pier-schematic-legend"><span><i style={{ background: pierColor }}/>Pylon / tilt</span><span><i style={{ background: foundationColor }}/>Foundation / scour</span><span><i style={{ background: waterColor }}/>Hydraulic level</span></div>
  </div>;
}
