import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Activity, AlertTriangle, AlertOctagon, Gauge, Play, Volume2, VolumeX, Languages,
  ShieldAlert, Anchor, BookOpen, ChevronRight, RefreshCw, MapPin, Eye, FileText,
  HardDrive, Shield, Wifi, MessageSquareWarning, CheckCircle2, Cpu, Wrench, Download, BarChart2
} from "lucide-react";
import { i18n } from "./i18n";
import { API_BASE_URL } from "./config";
import LiveInspectionCamera from "./components/LiveInspectionCamera";
import PierConditionSchematic from "./components/PierConditionSchematic";
import Bridge3D from "./components/Bridge3D";
import BridgeMap from "./components/BridgeMap";
import AnomalyRadarChart from "./components/AnomalyRadarChart";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, LineChart, Line, Legend
} from "recharts";

export default function App() {
  const [lang, setLang] = useState("en");
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, analytics, pitch, demo
  const [visualMode, setVisualMode] = useState("3d"); // 3d, map
  const [chartMode, setChartMode] = useState("history"); // history, fft, correlation
  const [rightPanelMode, setRightPanelMode] = useState("radar"); // radar, alerts, inspection
  const [selectedSensor, setSelectedSensor] = useState("vibration");
  
  const [telemetry, setTelemetry] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [pitchSlide, setPitchSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Custom interactive diagnostics state for sensors
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [diagnosticCompleted, setDiagnosticCompleted] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState("");

  // Modals
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Audio refs
  const audioCtxRef = useRef(null);
  const alarmIntervalRef = useRef(null);

  const t = i18n[lang];

  // Fetch Telemetry Data
  const fetchData = useCallback(async () => {
    try {
      const telRes = await fetch(`${API_BASE_URL}/api/telemetry/live`);
      const alertRes = await fetch(`${API_BASE_URL}/api/alerts`);
      
      if (!telRes.ok || !alertRes.ok) {
        throw new Error("Failed to connect to backend");
      }
      
      const telData = await telRes.json();
      const alertData = await alertRes.json();
      
      setTelemetry(telData);
      setAlerts(alertData);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Setu Rakshak API server offline.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Update simulation state
  const changeSimState = async (state) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/simulation/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Error setting simulation state:", err);
    }
  };

  // Run mock sensor diagnostics
  const runSensorDiagnostic = (sensor) => {
    setDiagnosticRunning(true);
    setDiagnosticCompleted(false);
    setDiagnosticResult("");

    setTimeout(() => {
      setDiagnosticRunning(false);
      setDiagnosticCompleted(true);
      
      const isDanger = telemetry?.current?.state === "COMBINED_FAILURE";
      
      switch (sensor) {
        case "vibration":
          setDiagnosticResult(
            isDanger 
              ? "LSTM AUTOENCODER ERROR: Natural frequency decay detected (2.92 Hz). Severe pylon structural loss!" 
              : "LSTM AUTOENCODER NOMINAL: Natural frequency at 4.50 Hz. Reconstruction MSE within 0.0024."
          );
          break;
        case "strain":
          setDiagnosticResult(
            isDanger 
              ? "FATIGUE WARNING: Deck tension exceeds threshold (420 με). Stop heavy trailer transport!" 
              : "STRAIN COMPLIANT: Baseline microstrain nominal. Elastic deck recovery under limits."
          );
          break;
        case "tilt":
          setDiagnosticResult(
            isDanger 
              ? "MEMS DANGER: Pier rotational tilt is 0.2800° (Safety limit: 0.1500°). Critical foundation support shift!" 
              : "MEMS TILT OK: Baselines zeroed. Dynamic tilt is 0.0110°."
          );
          break;
        case "scour":
          setDiagnosticResult(
            isDanger 
              ? "SONAR CRITICAL: Pier bed scour at 4.10m. Bedrock foundation layer is exposed!" 
              : "SONAR OK: Bed elevation nominal (0.22m scour)."
          );
          break;
        case "water":
          setDiagnosticResult(
            isDanger 
              ? "FLOOD EMERGENCY: Water clearance at danger level (8.80m). Hydraulic thrust exceeds safety tolerances!" 
              : "RADAR NOMINAL: Free-board water height clearance at 2.40m."
          );
          break;
        default:
          setDiagnosticResult("Diagnostics completed.");
      }
    }, 1200);
  };

  // Reset diagnostic panel when sensor changes
  useEffect(() => {
    setDiagnosticRunning(false);
    setDiagnosticCompleted(false);
    setDiagnosticResult("");
  }, [selectedSensor]);

  // Web Audio Alarm Synthesizer
  const playAlarmSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(950, ctx.currentTime);
      osc1.frequency.linearRampToValueAtTime(550, ctx.currentTime + 0.2);
      osc1.frequency.linearRampToValueAtTime(950, ctx.currentTime + 0.4);
      
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(160, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.45);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.45);
      osc2.stop(ctx.currentTime + 0.45);
    } catch (e) {
      console.error("Audio error: ", e);
    }
  }, [soundEnabled]);

  // Sound Alarm Loop
  useEffect(() => {
    const hasCritical = alerts.some(a => a.type === "CRITICAL");
    if (hasCritical && soundEnabled) {
      if (!alarmIntervalRef.current) {
        alarmIntervalRef.current = setInterval(playAlarmSound, 500);
      }
    } else {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    }
    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    };
  }, [alerts, soundEnabled, playAlarmSound]);

  useEffect(() => () => {
    audioCtxRef.current?.close();
  }, []);

  const getMetricData = (sensorName) => {
    if (!telemetry || !telemetry.current) return { value: "-", detail: "", status: "SAFE" };
    const cur = telemetry.current;
    
    switch (sensorName) {
      case "vibration":
        return {
          title: t.sensor_vibration,
          value: `${cur.vibration_rms_g} g`,
          detail: `Freq: ${cur.natural_frequency_hz} Hz | Peak: ${cur.vibration_peak_g} g`,
          status: cur.lstm_analysis.is_anomaly ? "DANGER" : "SAFE",
          key: "vibration_rms",
          chartTitle: "Vibration Amplitude (RMS g)",
          battery: 98,
          rssi: "-64 dBm",
          snr: "42 dB",
          desc: lang === "en" 
            ? "VIBRO-ACCELEROMETER: Measures natural resonant frequency of Pier 3. Soil scour or foundation degradation shifts natural frequencies downward." 
            : "वाइब्रो-एक्सेलेरोमीटर: पियर 3 की प्राकृतिक अनुनाद आवृत्ति को मापता है। पियर नींव के कटाव से आवृत्ति कम हो जाती है।",
          actionLabel: lang === "en" ? "Run LSTM Autoencoder Anomaly Test" : "LSTM विसंगति परीक्षण चलाएं"
        };
      case "strain":
        return {
          title: t.sensor_strain,
          value: `${cur.deck_strain_microstrain} με`,
          detail: `Load: ${cur.traffic_load_tonnes} T (IRC Limits: 40T)`,
          status: cur.irc_compliance.overload_violation ? "WARN" : "SAFE",
          key: "strain",
          chartTitle: "Deck Microstrain (Tension)",
          battery: 92,
          rssi: "-72 dBm",
          snr: "38 dB",
          desc: lang === "en" 
            ? "STRAIN GAUGE: Monitors dynamic tensile strain on the main span. Triggers warnings if heavy cargo exceeds IRC:6 loading standards." 
            : "तनाव गेज: मुख्य डेक पर गतिशील तनाव की निगरानी करता है। भारी मालवाहक वाहनों द्वारा सीमा पार करने पर चेतावनी देता है।",
          actionLabel: lang === "en" ? "Analyze Tensile Deformation" : "डेक तनाव विकृति का विश्लेषण करें"
        };
      case "tilt":
        return {
          title: t.sensor_tilt,
          value: `${cur.pier_tilt_degrees}°`,
          detail: `Max Permissible: 0.1500°`,
          status: cur.irc_compliance.tilt_warning ? "DANGER" : "SAFE",
          key: "tilt",
          chartTitle: "Pier Rotation Tilt (Degrees)",
          battery: 95,
          rssi: "-68 dBm",
          snr: "45 dB",
          desc: lang === "en" 
            ? "MEMS TILT METER: Detects angular inclination and structural tilt of the main pylon. Alerts if rotation exceeds NHAI limits." 
            : "झुकाव मीटर: मुख्य पिलर के कोणीय झुकाव का पता लगाता है। NHAI सीमा से अधिक झुकाव होने पर सचेत करता है।",
          actionLabel: lang === "en" ? "Calibrate Gyroscopic Baselines" : "जाइरोस्कोपिक बेसलाइन को कैलिब्रेट करें"
        };
      case "scour":
        return {
          title: t.sensor_scour,
          value: `${cur.scour_depth_m} m`,
          detail: `Monsoon limit: 3.0m`,
          status: cur.scour_depth_m > 3.0 ? "DANGER" : (cur.scour_depth_m > 2.0 ? "WARN" : "SAFE"),
          key: "scour_depth",
          chartTitle: "Foundation Bed Scour Depth (m)",
          battery: 89,
          rssi: "-78 dBm",
          snr: "32 dB",
          desc: lang === "en" 
            ? "SONAR SCOUR SENSOR: Measures sand bed scour levels around the underwater pier foundation to prevent bridge collapse." 
            : "सोनार कटाव सेंसर: पुल ढहने से रोकने के लिए पानी के नीचे पियर नींव के आसपास मिट्टी के कटाव को मापता है।",
          actionLabel: lang === "en" ? "Trigger Sonar Depth Sounding" : "सोनार गहराई ध्वनि पिंग शुरू करें"
        };
      case "water":
        return {
          title: t.sensor_water,
          value: `${cur.water_level_m} m`,
          detail: `Danger Mark: 8.0m | Rain: ${cur.monsoon_rainfall_mm} mm/d`,
          status: cur.irc_compliance.monsoon_danger_water ? "DANGER" : "SAFE",
          key: "water_level",
          chartTitle: "Under-deck River Level (m)",
          battery: 94,
          rssi: "-70 dBm",
          snr: "40 dB",
          desc: lang === "en" 
            ? "RADAR LEVEL GAUGE: Measures flood water clearance height. Correlates water levels with scour sonar profiles." 
            : "रडार स्तर गेज: बाढ़ के पानी की निकासी ऊंचाई को मापता है। पानी के स्तर को सोनार डेटा से मिलाता है।",
          actionLabel: lang === "en" ? "Check Free-Board Clearance" : "फ्री-बोर्ड निकासी की जांच करें"
        };
      default:
        return {};
    }
  };

  const exportCSV = () => {
    if (!history) return;
    const headers = ['time','vibration_rms','strain','tilt','scour_depth','water_level','anomaly_score','risk_score'];
    const rows = history.map(h => [
      h.time, h.vibration_rms, h.strain, h.tilt, h.scour_depth, h.water_level, h.anomaly_score, h.risk_score
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'setu_rakshak_telemetry.csv'; a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const selectedMetric = getMetricData(selectedSensor);

  const _renderVisionFeed = () => {
    if (!telemetry || !telemetry.current) return null;
    const { vision_analysis } = telemetry.current;
    
    let crackPath = null;
    let spallingPoints = null;
    let exposedRebar = false;
    let concreteBg = "#1c1e24";
    
    if (telemetry.current.state === "OVERLOAD") {
      crackPath = "M 80 180 Q 150 160 220 140";
    } else if (telemetry.current.state === "MONSOON_SCOUR") {
      crackPath = "M 80 180 Q 150 160 220 140 T 320 90";
      spallingPoints = "80,80 120,70 140,110 90,120";
    } else if (telemetry.current.state === "COMBINED_FAILURE") {
      crackPath = "M 50 200 C 130 180, 200 130, 250 80 M 120 220 Q 200 190 280 200";
      spallingPoints = "100,50 250,55 240,160 90,140";
      exposedRebar = true;
      concreteBg = "#13151a";
    }

    return (
      <div className="video-container group">
        <div className="absolute top-2 left-2 z-10 font-mono text-[9px] text-red-500 bg-slate-950/80 px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span>LIVE CAM_P3_S</span>
        </div>
        
        <svg viewBox="0 0 400 250" className="w-full h-full">
          <rect x="0" y="0" width="400" height="250" fill={concreteBg} />
          <circle cx="200" cy="125" r="30" stroke="rgba(245, 158, 11, 0.15)" strokeWidth="1" fill="none" />
          <line x1="200" y1="80" x2="200" y2="170" stroke="rgba(245, 158, 11, 0.15)" strokeWidth="0.5" />
          <line x1="150" y1="125" x2="250" y2="125" stroke="rgba(245, 158, 11, 0.15)" strokeWidth="0.5" />

          {telemetry.current.state === "MONSOON_SCOUR" && (
            <rect x="0" y="210" width="400" height="40" fill="#1b2a4a" fillOpacity="0.55" />
          )}
          {telemetry.current.state === "COMBINED_FAILURE" && (
            <rect x="0" y="195" width="400" height="55" fill="#15213b" fillOpacity="0.75" />
          )}

          {spallingPoints && (
            <polygon points={spallingPoints} fill="#0d0e12" stroke="#2a2e38" strokeWidth="1" />
          )}

          {exposedRebar && (
            <>
              <line x1="120" y1="60" x2="120" y2="150" stroke="#7e4325" strokeWidth="3.5" />
              <line x1="150" y1="58" x2="150" y2="148" stroke="#7e4325" strokeWidth="3.5" strokeDasharray="3,1" />
              <line x1="180" y1="62" x2="180" y2="152" stroke="#99522d" strokeWidth="3.5" />
              <line x1="210" y1="55" x2="210" y2="145" stroke="#7e4325" strokeWidth="3.5" />
            </>
          )}

          {crackPath && (
            <path d={crackPath} fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" filter="drop-shadow(0px 0px 1.5px #f59e0b)" />
          )}
        </svg>

        <div className="scan-line"></div>
        <div className="video-overlay">
          {vision_analysis.detections.map((det, idx) => (
            <div 
              key={idx} 
              className="bbox animate-pulse" 
              style={{
                left: `${(det.bbox[0] / 400) * 100}%`,
                top: `${(det.bbox[1] / 250) * 100}%`,
                width: `${(det.bbox[2] / 400) * 100}%`,
                height: `${(det.bbox[3] / 250) * 100}%`,
              }}
            >
              <span className="bbox-label">
                {det.label} ({(det.confidence * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 text-center text-white">
        <AlertOctagon size={64} className="text-amber-500 animate-pulse mb-4" />
        <h1 className="text-2xl font-bold font-display text-white mb-2">Setu Rakshak - Link Offline</h1>
        <p className="text-slate-400 max-w-md mb-6">{error}</p>
        <button 
          onClick={fetchData} 
          className="control-btn active px-6 py-2 flex items-center gap-2"
        >
          <RefreshCw size={18} /> Retry Connection
        </button>
      </div>
    );
  }

  if (loading || !telemetry) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-amber-500">
        <Activity className="animate-spin mb-4" size={48} />
        <h2 className="font-display font-semibold text-xs tracking-widest font-mono">CONNECTING TO SHM FIELD ACQUISITION GATEWAY...</h2>
      </div>
    );
  }

  const { current, history, fft_spectrum } = telemetry;
  const hasCriticalAlerts = alerts.some(a => a.type === "CRITICAL");
  const isDangerActive = current.state === "COMBINED_FAILURE";
  const dataAgeSeconds = Math.max(0, Math.round(Date.now() / 1000 - current.timestamp));
  const operationalMetrics = [
    ["Data age", `${dataAgeSeconds}s`, dataAgeSeconds < 3 ? "good" : "warn"], ["Sampling", "1 Hz", "good"], ["Packet loss", "0.02%", "good"], ["Link latency", "42 ms", "good"],
    ["Ambient", `${current.ambient_temp_c}°C`, "neutral"], ["Rainfall", `${current.monsoon_rainfall_mm} mm/d`, current.monsoon_rainfall_mm > 80 ? "warn" : "good"], ["Wind", `${current.wind_speed_kph ?? 0} km/h`, current.wind_speed_kph > 60 ? "warn" : "good"], ["Corrosion", `${Math.round((current.corrosion_index ?? 0) * 100)}%`, current.corrosion_index > 0.5 ? "danger" : "good"], ["Load", `${current.traffic_load_tonnes} t`, current.irc_compliance.overload_violation ? "danger" : "neutral"], ["Frequency", `${current.natural_frequency_hz} Hz`, current.lstm_analysis.is_anomaly ? "warn" : "good"],
  ];
  const recentSamples = history.slice(-8);
  const riskChange = recentSamples.length > 1 ? current.fusion_analysis.fused_risk_percentage - recentSamples[0].risk_score : 0;
  const scenarioInfo = {
    HEALTHY: { title: "Normal operation", description: "Baseline traffic and stable river conditions. Use it to establish a safe reference signal.", response: "Continue monitoring" },
    OVERLOAD: { title: "IRC:6 overload", description: "Simulates a heavy vehicle crossing above the configured deck-load limit.", response: "Inspect deck strain and restrict heavy traffic" },
    MONSOON_SCOUR: { title: "Monsoon scour", description: "Simulates high water, rainfall, foundation-bed erosion, and a natural-frequency shift.", response: "Inspect pier foundation and hydraulic conditions" },
    WIND_GUST: { title: "High-wind monitoring", description: "Simulates cross-wind gusts that increase deck movement and aerodynamic vibration.", response: "Review wind limits and inspect restraint systems" },
    CORROSION_ALERT: { title: "Corrosion monitoring", description: "Simulates elevated reinforcement corrosion and early concrete deterioration risk.", response: "Schedule close visual inspection and rehabilitation planning" },
    COMBINED_FAILURE: { title: "Combined critical failure", description: "Simulates simultaneous overload, flood scour, tilt, and visual deterioration.", response: "Activate emergency traffic restriction" },
  }[current.state];
  const analyticsSensors = [
    { key: "vibration_rms", label: "Vibration", value: current.vibration_rms_g, max: 0.30, unit: "g" },
    { key: "strain", label: "Deck strain", value: current.deck_strain_microstrain, max: 600, unit: "με" },
    { key: "tilt", label: "Pier tilt", value: current.pier_tilt_degrees, max: 0.30, unit: "°" },
    { key: "scour_depth", label: "Scour depth", value: current.scour_depth_m, max: 5, unit: "m" },
    { key: "water_level", label: "Water level", value: current.water_level_m, max: 10, unit: "m" },
  ];
  const rollingStats = analyticsSensors.map((sensor) => {
    const values = history.slice(-20).map((sample) => sample[sensor.key]).filter(Number.isFinite);
    const average = values.length ? values.reduce((total, value) => total + value, 0) / values.length : sensor.value;
    return { ...sensor, min: Math.min(...values, sensor.value), average, maxValue: Math.max(...values, sensor.value) };
  });
  const riskDistribution = [
    { label: "Safe", range: "0–24", color: "#10b981", count: history.filter((sample) => sample.risk_score < 25).length },
    { label: "Watch", range: "25–44", color: "#fbbf24", count: history.filter((sample) => sample.risk_score >= 25 && sample.risk_score < 45).length },
    { label: "Warning", range: "45–74", color: "#f97316", count: history.filter((sample) => sample.risk_score >= 45 && sample.risk_score < 75).length },
    { label: "Critical", range: "75–100", color: "#ef4444", count: history.filter((sample) => sample.risk_score >= 75).length },
  ];

  return (
    <div className={`dashboard-container ${hasCriticalAlerts ? "critical-pulse-bg" : ""}`}>
      
      {/* 1. HEADER HUD */}
      <header className="header-bar glass-panel">
        <div className="header-brand flex items-center gap-3">
          <Shield className="text-amber-500" size={26} />
          <div>
            <h1 className="text-base font-black font-display tracking-wider text-white flex items-center gap-2">
              {t.title} 
              <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                IRC:SP:35 AUDIT
              </span>
            </h1>
            <p className="text-[9px] text-slate-500 tracking-wider font-semibold uppercase font-mono">{t.nhai_dept}</p>
          </div>
        </div>

        <nav className="header-nav flex items-center gap-1.5 ml-4" aria-label="Primary navigation">
          <button onClick={() => setActiveTab("dashboard")} className={`control-btn h-[26px] ${activeTab === "dashboard" ? "active" : ""}`}>
            <Gauge size={13} /> Dashboard
          </button>
          <button onClick={() => setActiveTab("analytics")} className={`control-btn h-[26px] ${activeTab === "analytics" ? "active" : ""}`}>
            <BarChart2 size={13} /> Analytics
          </button>
          <button onClick={() => setActiveTab("pitch")} className={`control-btn h-[26px] ${activeTab === "pitch" ? "active" : ""}`}>
            <BookOpen size={13} /> Pitch
          </button>
          <button onClick={() => setActiveTab("demo")} className={`control-btn h-[26px] ${activeTab === "demo" ? "active" : ""}`}>
            <Play size={13} /> Demo
          </button>
        </nav>

        {/* Global HUD Stats */}
        <div className="header-actions flex items-center gap-3">
          {activeTab === "dashboard" && (
            <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded mr-2">
              <button 
                onClick={() => setVisualMode("3d")}
                className={`text-[9px] px-2.5 py-1 rounded font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  visualMode === "3d" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                <Anchor size={11} /> {lang === "en" ? "3D Twin Frame" : "3D फ्रेम"}
              </button>
              <button 
                onClick={() => setVisualMode("map")}
                className={`text-[9px] px-2.5 py-1 rounded font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  visualMode === "map" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                <MapPin size={11} /> {lang === "en" ? "Regional Map" : "नक्शा"}
              </button>
            </div>
          )}
          <div className="hidden lg:flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded border border-slate-900 text-[9px] font-mono">
            <div>
              <span className="text-slate-600 block font-bold uppercase">CORRIDOR</span>
              <span className="text-slate-300 font-bold">PRAYAGRAJ (NH-30)</span>
            </div>
            <div className="border-l border-slate-900 pl-2.5">
              <span className="text-slate-600 block font-bold uppercase">LINK STATUS</span>
              <span className="text-teal-400 font-bold">NOMINAL</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded border border-slate-900 font-mono">
            <span className="text-[8px] text-slate-600 font-bold">IRC GRADE:</span>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: current.fusion_analysis.status_color }} />
            <span className="font-extrabold text-[10px]" style={{ color: current.fusion_analysis.status_color }}>
              CLASS {current.fusion_analysis.irc_condition_rating} ({current.fusion_analysis.status})
            </span>
          </div>

          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`control-btn h-[26px] ${soundEnabled ? "active" : ""}`}
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>

          <button 
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="control-btn active h-[26px]"
          >
            <Languages size={12} /> {t.lang_toggle}
          </button>
        </div>
      </header>

      {/* 3. STRUCTURED DASHBOARD GRID */}
      {activeTab === "dashboard" && (
        <main className="main-grid">
          
          {/* COLUMN A: Telemetry Sensors & Diagnostics */}
          <section className="flex flex-col gap-2.5 min-h-0">
            
            {/* Fused Risk Gauge */}
            {(() => {
              const riskPct = current.fusion_analysis.fused_risk_percentage;
              const gaugeColor = riskPct >= 75 ? "#ef4444" : riskPct >= 45 ? "#f97316" : "#10b981";
              const conicStop = Math.round(riskPct * 3.6); // degrees
              return (
                <div className="glass-panel p-3 flex gap-3 items-center">
                  {/* Conic gradient dial */}
                  <div
                    className="w-[72px] h-[72px] rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `conic-gradient(${gaugeColor} 0deg, ${gaugeColor} ${conicStop}deg, rgba(30,36,51,0.5) ${conicStop}deg)`,
                      boxShadow: `0 0 18px ${gaugeColor}30`,
                    }}
                  >
                    <div className="w-[54px] h-[54px] rounded-full bg-[#06070a] border border-slate-800 flex flex-col items-center justify-center">
                      <span className="font-display font-black text-sm leading-none" style={{ color: gaugeColor }}>{riskPct}</span>
                      <span className="text-[6px] text-slate-500 font-mono font-bold mt-0.5">RISK %</span>
                    </div>
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-[8px] font-black text-amber-500 uppercase tracking-wider font-display mb-1">Fused Structural Risk Index</p>
                    <p className="text-[9px] font-bold font-mono" style={{ color: gaugeColor }}>
                      {riskPct >= 75 ? "⚠ CRITICAL DANGER" : riskPct >= 45 ? "⚡ WARNING ZONE" : "✓ STRUCTURE NOMINAL"}
                    </p>
                    <p className="text-[8px] text-slate-500 font-mono mt-1">
                      IRC:{current.fusion_analysis.irc_condition_rating} · {current.fusion_analysis.status}
                    </p>
                    {/* LSTM Anomaly Score Ticker */}
                    <div className={`anomaly-ticker mt-1.5 ${current.lstm_analysis.is_anomaly ? "danger" : "safe"}`}>
                      LSTM RECON ERR: <span className="font-bold">{current.lstm_analysis.anomaly_score?.toFixed(4)}</span>
                      {current.lstm_analysis.is_anomaly && <span className="ml-1 text-red-500 animate-pulse font-bold">● ANOMALY</span>}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Sensor Cards with progress bars */}
            <div className="glass-panel flex-grow flex flex-col min-h-0">
              <h2 className="text-[9px] font-black tracking-wider text-amber-500 uppercase mb-2.5 flex items-center gap-1.5 border-b border-slate-900 pb-2">
                <HardDrive size={12} /> {t.structural_telemetry}
                <span className="ml-auto text-slate-600 font-mono text-[8px] normal-case">5 SENSORS ONLINE</span>
              </h2>
              
              <div className="flex-grow overflow-y-auto scroll-panel pr-1">
                {[
                  { key: "vibration", max: 0.30, val: current.vibration_rms_g, unit: "g" },
                  { key: "strain", max: 600, val: current.deck_strain_microstrain, unit: "με" },
                  { key: "tilt", max: 0.30, val: current.pier_tilt_degrees, unit: "°" },
                  { key: "scour", max: 5.0, val: current.scour_depth_m, unit: "m" },
                  { key: "water", max: 10.0, val: current.water_level_m, unit: "m" },
                ].map(({ key, max, val, unit }) => {
                  const metric = getMetricData(key);
                  const isActive = selectedSensor === key;
                  const pct = Math.min(100, (val / max) * 100);
                  const barClass = metric.status === "DANGER" ? "danger" : metric.status === "WARN" ? "warn" : "safe";
                  const dotClass = metric.status === "DANGER" ? "danger" : metric.status === "WARN" ? "warn" : "online";
                  return (
                    <div 
                      key={key}
                      onClick={() => setSelectedSensor(key)}
                      className={`metric-card ${isActive ? "active" : ""} ${barClass}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`sensor-dot ${dotClass}`}></span>
                            <p className="text-[8px] uppercase font-bold tracking-widest text-slate-500 font-mono truncate">{metric.title}</p>
                          </div>
                          <p className="text-sm font-black text-white font-mono">{metric.value}</p>
                          <p className="text-[8px] text-slate-500 font-mono mt-0.5 truncate">{metric.detail}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                          <span className={`text-[7px] font-bold font-mono px-1 py-0.5 rounded ${
                            metric.status === "DANGER" ? "bg-red-500/20 text-red-400" :
                            metric.status === "WARN" ? "bg-orange-500/20 text-orange-400" :
                            "bg-emerald-500/15 text-emerald-400"
                          }`}>{metric.status}</span>
                          {isActive && <ChevronRight size={11} className="text-amber-500" />}
                        </div>
                      </div>
                      {/* Inline progress bar */}
                      <div className="progress-bar-track mt-1.5">
                        <div className={`progress-bar-inner ${barClass}`} style={{ width: `${pct}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[7px] font-mono text-slate-700 mt-0.5">
                        <span>0</span>
                        <span className={barClass === "danger" ? "text-red-600" : "text-slate-600"}>{Math.round(pct)}% of limit</span>
                        <span>{max}{unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sensor RF Link Status */}
            <div className="glass-panel p-3">
              <span className="block text-[8px] font-bold text-amber-500 font-mono mb-2 uppercase flex items-center gap-1.5">
                <Wifi size={10} /> LoRaWAN Mesh Network · Node P3
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-[7px] font-mono text-slate-400 text-center">
                <div className="stat-block">
                  <span className="block text-slate-600 mb-0.5 font-bold uppercase text-[6px]">RSSI</span>
                  <span className="text-slate-300 font-bold text-[8px]">{selectedMetric.rssi}</span>
                </div>
                <div className="stat-block">
                  <span className="block text-slate-600 mb-0.5 font-bold uppercase text-[6px]">SNR</span>
                  <span className="text-slate-300 font-bold text-[8px]">{selectedMetric.snr}</span>
                </div>
                <div className="stat-block">
                  <span className="block text-slate-600 mb-0.5 font-bold uppercase text-[6px]">Batt</span>
                  <div>
                    <span className={`font-bold text-[8px] ${selectedMetric.battery < 20 ? "text-red-400" : "text-emerald-400"}`}>{selectedMetric.battery}%</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* COLUMN B: Digital Twin Visualizer & Charts */}
          <section className="flex flex-col gap-2.5 min-h-0">
            {/* 3D / Map container */}
            <div
              className={`twin-viewport flex-grow flex flex-col min-h-0 relative overflow-hidden rounded border ${
                isDangerActive
                  ? "border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.12)]"
                  : "border-slate-800/70 shadow-[0_0_20px_rgba(0,0,0,0.6)]"
              }`}
              style={{ background: "#05060a" }}
            >
              {/* Top HUD strip */}
              <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-3 py-1.5 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
                <div className="flex items-center gap-2">
                  {visualMode === "3d" ? <Anchor size={11} className="text-amber-500" /> : <MapPin size={11} className="text-amber-500" />}
                  <span className="text-[8px] font-display font-bold text-amber-500 uppercase tracking-widest">
                    {visualMode === "3d" ? "Digital Twin · Naini Bridge NH-30" : "Prayagraj Regional Map"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isDangerActive && (
                    <span className="text-[7px] font-mono font-bold text-red-400 bg-red-950/60 px-2 py-0.5 border border-red-500/40 rounded animate-pulse">
                      ⚠ STRUCTURAL ALERT
                    </span>
                  )}
                  <span className="text-[7px] font-mono text-slate-600 bg-black/40 px-2 py-0.5 border border-slate-800/40 rounded">
                    ID: NHAI-30-0042
                  </span>
                </div>
              </div>

              {/* The actual 3D/map view */}
              <div className="flex-grow w-full h-full">
                {visualMode === "3d" ? (
                  <Bridge3D
                    waterLevel={current.water_level_m}
                    scourDepth={current.scour_depth_m}
                    simState={current.state}
                    vibrationRMS={current.vibration_rms_g}
                    selectedSensor={selectedSensor}
                    onSelectSensor={setSelectedSensor}
                  />
                ) : (
                  <BridgeMap simState={current.state} telemetry={telemetry} />
                )}
              </div>

              {/* Bottom HUD strip */}
              <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-between items-center px-3 py-1.5 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                <div className="flex items-center gap-3">
                  {[
                    { label: "Water", val: `${current.water_level_m}m`, col: current.irc_compliance.monsoon_danger_water ? "#ef4444" : "#06b6d4" },
                    { label: "Scour", val: `${current.scour_depth_m}m`, col: current.scour_depth_m > 3 ? "#ef4444" : "#f97316" },
                    { label: "Vibration", val: `${current.vibration_rms_g}g`, col: current.lstm_analysis.is_anomaly ? "#ef4444" : "#10b981" },
                  ].map(({ label, val, col }) => (
                    <span key={label} className="text-[7px] font-mono flex items-center gap-1">
                      <span className="font-bold" style={{ color: col }}>{label}:</span>
                      <span className="text-slate-300">{val}</span>
                    </span>
                  ))}
                </div>
                <span className="text-[7px] font-mono text-slate-600">Drag to orbit · Scroll to zoom · Double-click resets view</span>
              </div>
            </div>


            {/* Time-Series Charts */}
            <div className="glass-panel flex flex-col justify-between" style={{ height: "200px", minHeight: "200px", flexShrink: 0 }}>
              <div className="flex justify-between items-center border-b border-slate-800/70 pb-1.5 mb-1.5">
                <div className="flex gap-1 bg-slate-950/60 p-0.5 rounded border border-slate-800/60">
                  {[
                    { id: "history", label: "TimeSeries" },
                    { id: "fft",     label: "FFT Spectrum" },
                    { id: "correlation", label: "Hydraulic" },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setChartMode(id)}
                      className={`text-[8px] px-2.5 py-1 rounded font-bold font-mono transition-all tracking-wider ${
                        chartMode === id
                          ? "bg-amber-500 text-slate-950 shadow"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <span className="text-[7px] font-mono text-slate-600 uppercase tracking-wider">
                  {chartMode === "history" ? selectedMetric.chartTitle : chartMode === "fft" ? "Power Spectral Density · Pier Accelerometer" : "River Level vs. Foundation Scour"}
                </span>
              </div>

              <div className="flex-grow min-h-0 w-full text-[8px] font-mono">
                {chartMode === "history" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGold" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.01)" />
                      <XAxis dataKey="time" stroke="#475569" fontSize={8} />
                      <YAxis stroke="#475569" fontSize={8} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f1117", borderColor: "#1e2433", color: "#f1f5f9" }} 
                        labelClassName="text-slate-500 text-[8px]" 
                      />
                      <Area type="monotone" dataKey={selectedMetric.key} stroke="#f59e0b" strokeWidth={1.5} fill="url(#colorGold)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : chartMode === "fft" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fft_spectrum} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.01)" />
                      <XAxis dataKey="freq_hz" stroke="#475569" fontSize={8} unit="Hz" />
                      <YAxis stroke="#475569" fontSize={8} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f1117", borderColor: "#1e2433", color: "#f1f5f9" }} 
                        labelClassName="text-slate-500 text-[8px]" 
                      />
                      <Bar dataKey="amplitude" fill="#06b6d4" radius={[2, 2, 0, 0]} maxBarSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  /* Dual-Axis Monsoon Hydraulics vs Scour Depth Correlation */
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorScour" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.01)" />
                      <XAxis dataKey="time" stroke="#475569" fontSize={8} />
                      
                      {/* Left Y Axis for River Level */}
                      <YAxis yAxisId="left" stroke="#06b6d4" fontSize={8} label={{ value: 'Water (m)', angle: -90, position: 'insideLeft', offset: 10, style: { fill: '#06b6d4', fontSize: '7px' } }} />
                      
                      {/* Right Y Axis for Scour Depth */}
                      <YAxis yAxisId="right" orientation="right" stroke="#f97316" fontSize={8} label={{ value: 'Scour (m)', angle: 90, position: 'insideRight', offset: 10, style: { fill: '#f97316', fontSize: '7px' } }} />
                      
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f1117", borderColor: "#1e2433", color: "#f1f5f9" }} 
                        labelClassName="text-slate-500 text-[8px]" 
                      />
                      
                      <Area yAxisId="left" type="monotone" dataKey="water_level" stroke="#06b6d4" strokeWidth={1.5} fill="url(#colorWater)" name="River Level (m)" />
                      <Area yAxisId="right" type="monotone" dataKey="scour_depth" stroke="#f97316" strokeWidth={1.5} fill="url(#colorScour)" name="Bed Scour (m)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>

          {/* COLUMN C: Analysis Panel (tabbed) */}
          <section className="flex flex-col gap-2.5 min-h-0">

            {/* Vision Camera Feed */}
            <div className="glass-panel flex flex-col gap-2">
              <div className="flex justify-between items-center border-b border-slate-900 pb-1.5 mb-1">
                <h3 className="text-[9px] font-black tracking-wider text-amber-500 uppercase flex items-center gap-1.5">
                  <Eye size={12} /> {t.vision_inspection}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono text-slate-500">
                    IRC Grade <strong className="text-amber-400">{current.vision_analysis.irc_visual_rating}/5</strong>
                  </span>
                  <button
                    onClick={() => setShowAuditModal(true)}
                    className="control-btn text-[7px] py-0.5 px-1.5 h-[18px]"
                  >
                    <FileText size={8} /> Audit
                  </button>
                </div>
              </div>
              <LiveInspectionCamera visionAnalysis={current.vision_analysis} />
              <p className="text-[8px] font-mono text-slate-400 italic px-1">"{current.vision_analysis.description}"</p>
            </div>

            <div className="glass-panel operational-metrics">
              <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2"><h3 className="text-[9px] font-black tracking-wider text-amber-500 uppercase flex items-center gap-1.5"><Activity size={11} /> Operations performance</h3><span className="text-[7px] font-mono text-emerald-400">● STREAM HEALTHY</span></div>
              <div className="operational-metric-grid">{operationalMetrics.map(([label, value, tone]) => <div className={`operational-metric ${tone}`} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
            </div>

            {/* Right Panel Mode Switcher */}
            <div className="flex bg-slate-900/60 border border-slate-800 p-0.5 rounded gap-0.5">
              {[
                { id: "radar", label: "Anomaly Radar", icon: <Activity size={9} /> },
                { id: "inspection", label: "Diagnostics", icon: <Cpu size={9} /> },
                { id: "alerts", label: `Alerts (${alerts.length})`, icon: <AlertTriangle size={9} /> },
              ].map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => setRightPanelMode(id)}
                  className={`flex-1 text-[8px] px-1 py-1 rounded font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                    rightPanelMode === id ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* === TAB: ANOMALY RADAR CHART === */}
            {rightPanelMode === "radar" && (
              <div className="glass-panel flex-grow flex flex-col min-h-0">
                <h3 className="text-[9px] font-black tracking-wider text-amber-500 uppercase flex items-center gap-1.5 border-b border-slate-900 pb-1.5 mb-2">
                  <Activity size={12} /> Multi-Parameter Anomaly Radar · AI Fusion
                </h3>
                <p className="text-[8px] font-mono text-slate-500 mb-2 leading-relaxed">
                  Normalized sensor risk index vs. IRC threshold limits. Pentagon shrinks toward center in healthy operation. Spikes = anomalies.
                </p>
                <div className="flex-grow min-h-[200px]">
                  <AnomalyRadarChart telemetry={telemetry} />
                </div>

                {/* Sensor Health Matrix */}
                <div className="border-t border-slate-900 pt-2 mt-1">
                  <p className="text-[8px] text-amber-500 font-bold font-mono uppercase mb-1.5">Sensor Node Status Matrix</p>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { name: "ACC", status: current.lstm_analysis.is_anomaly ? "danger" : "online" },
                      { name: "STR", status: current.irc_compliance.overload_violation ? "warn" : "online" },
                      { name: "TLT", status: current.irc_compliance.tilt_warning ? "danger" : "online" },
                      { name: "SCR", status: current.scour_depth_m > 3.0 ? "danger" : current.scour_depth_m > 2.0 ? "warn" : "online" },
                      { name: "WTR", status: current.irc_compliance.monsoon_danger_water ? "danger" : "online" },
                    ].map(({ name, status }) => (
                      <div key={name} className="stat-block text-center">
                        <div className="flex justify-center mb-1">
                          <span className={`sensor-dot ${status}`}></span>
                        </div>
                        <p className="text-[7px] font-bold font-mono text-slate-500">{name}</p>
                        <p className={`text-[6px] font-mono mt-0.5 ${
                          status === "danger" ? "text-red-500" : status === "warn" ? "text-orange-400" : "text-emerald-400"
                        }`}>{status.toUpperCase()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* === TAB: SENSOR INSPECTION === */}
            {rightPanelMode === "inspection" && (
              <div className="glass-panel flex-grow flex flex-col gap-2 min-h-0">
                <h3 className="text-[9px] font-black tracking-wider text-amber-500 uppercase flex items-center gap-1.5 border-b border-slate-900 pb-1.5">
                  <Cpu size={12} /> Sensor Inspection Hub
                </h3>
                
                <p className="text-[9px] text-slate-400 font-mono leading-relaxed">
                  {selectedMetric.desc}
                </p>

                <div className="flex flex-col gap-2 mt-1">
                  <button 
                    onClick={() => runSensorDiagnostic(selectedSensor)}
                    disabled={diagnosticRunning}
                    className="control-btn active py-1.5 text-[9px] w-full flex items-center justify-center gap-2"
                  >
                    {diagnosticRunning ? (
                      <><Activity className="animate-spin text-slate-950" size={12} /> Analyzing Field Data...</>
                    ) : (
                      <><Wrench size={12} /> {selectedMetric.actionLabel}</>
                    )}
                  </button>

                  {diagnosticCompleted && (
                    <div className={`p-2 rounded border text-[9px] font-mono leading-normal animate-fadeIn ${
                      diagnosticResult.includes("ERROR") || diagnosticResult.includes("DANGER") || diagnosticResult.includes("WARNING")
                        ? "bg-red-950/20 border-red-500/40 text-red-300"
                        : "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1 font-bold">
                        <CheckCircle2 size={11} className={diagnosticResult.includes("ERROR") || diagnosticResult.includes("DANGER") ? "text-red-400" : "text-emerald-400"} />
                        <span>DIAGNOSTIC REPORT:</span>
                      </div>
                      {diagnosticResult}
                    </div>
                  )}
                </div>

                {/* Risk history sparkline */}
                <div className="mt-auto border-t border-slate-900 pt-2">
                  <p className="text-[8px] text-amber-500 font-bold font-mono uppercase mb-1">Risk Score History</p>
                  <ResponsiveContainer width="100%" height={60}>
                    <AreaChart data={history} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
                      <defs>
                        <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="risk_score" stroke="#ef4444" strokeWidth={1} fill="url(#riskGrad)" />
                      <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={0.5} />
                      <ReferenceLine y={45} stroke="#f97316" strokeDasharray="3 3" strokeWidth={0.5} />
                      <YAxis domain={[0, 100]} stroke="none" tick={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex justify-between text-[7px] font-mono text-slate-700 mt-0.5">
                    <span>0% (Safe)</span>
                    <span className="text-orange-700">45% (Warn)</span>
                    <span className="text-red-700">75% (Critical)</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            )}

            {/* === TAB: ALERT TIMELINE === */}
            {rightPanelMode === "alerts" && (
              <div className="glass-panel flex-grow flex flex-col min-h-0">
                <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2">
                  <h3 className="text-[9px] font-black tracking-wider text-amber-500 uppercase flex items-center gap-1.5">
                    <AlertTriangle size={12} /> {t.active_alarms}
                  </h3>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border font-mono ${
                    alerts.length > 0 ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-slate-900 text-slate-600 border-slate-800"
                  }`}>
                    {alerts.length} active
                  </span>
                </div>

                <div className="flex-grow overflow-y-auto scroll-panel pr-1">
                  {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-700 py-6 gap-2">
                      <ShieldAlert size={28} className="text-slate-800" />
                      <p className="text-[9px] font-mono text-center">{t.no_alarms}</p>
                    </div>
                  ) : (
                    <div className="pl-1">
                      {alerts.map((al, idx) => (
                        <div key={idx} className={`timeline-item ${al.type === "CRITICAL" ? "critical" : "warning"} mb-1`}>
                          <div className="flex-grow">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <AlertOctagon size={9} className={al.type === "CRITICAL" ? "text-red-400" : "text-amber-400"} />
                              <span className="text-[7px] font-bold font-mono text-slate-600 uppercase">{al.type} · {al.timestamp}</span>
                            </div>
                            <p className="text-[9px] text-slate-300 font-mono leading-normal">
                              {lang === "en" ? al.message_en : al.message_hi}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Emergency satellite broadcast */}
                  {isDangerActive && (
                    <div className="mt-3 p-2.5 bg-red-950/20 border border-red-500/30 border-l-4 border-l-red-500 rounded text-red-200 text-[9px] font-mono animate-fadeIn">
                      <div className="flex items-center gap-1.5 mb-1 font-bold text-red-400 uppercase tracking-widest text-[8px]">
                        <MessageSquareWarning size={11} className="animate-pulse text-red-500" />
                        <span>Satellite Emergency Broadcast</span>
                      </div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">SMS → PWD Traffic HQ / DM Prayagraj:</p>
                      <p className="italic text-slate-300 leading-normal">"CRITICAL: Naini Bridge Pier P3 tilt {current.pier_tilt_degrees}° + scour {current.scour_depth_m}m. Halt NH-30 traffic immediately!"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </section>
        </main>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === "analytics" && (
        <main className="flex flex-col flex-grow p-4 min-h-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
              <BarChart2 className="text-amber-500" /> Advanced Analytics
            </h2>
            <button onClick={exportCSV} className="control-btn active px-4 py-2 text-xs flex items-center gap-2">
              <Download size={14} /> Export CSV
            </button>
          </div>
          <div className="analytics-grid">
            {/* Section 1: Sensor Heat Map */}
            <div className="glass-panel p-3 flex flex-col">
              <h3 className="text-[10px] font-black tracking-wider text-amber-500 uppercase mb-2">Sensor Heat Map</h3>
              <div className="flex-grow flex flex-col justify-between">
                {(() => {
                  const recentHistory = history.slice(-20);
                  const HEATMAP_SENSORS = [
                    { key: 'vibration_rms', label: 'Vibration', max: 0.30, unit: 'g' },
                    { key: 'strain',        label: 'Strain',    max: 600,  unit: 'με' },
                    { key: 'tilt',          label: 'Tilt',      max: 0.30, unit: '°' },
                    { key: 'scour_depth',   label: 'Scour',     max: 5.0,  unit: 'm' },
                    { key: 'water_level',   label: 'Water',     max: 10.0, unit: 'm' },
                  ];
                  return (
                    <div className="flex flex-col h-full gap-1">
                      {HEATMAP_SENSORS.map(s => (
                        <div key={s.key} className="flex flex-1 items-center gap-2">
                          <span className="w-16 text-[9px] font-mono text-slate-400">{s.label}</span>
                          <div className="flex-grow flex gap-1 h-full">
                            {recentHistory.map((h, i) => {
                              const pct = Math.min(100, (h[s.key] / s.max) * 100);
                              const color = pct < 40 ? '#10b981' : pct < 70 ? '#f59e0b' : pct < 90 ? '#f97316' : '#ef4444';
                              return (
                                <div key={i} className="flex-1 rounded group relative" style={{ backgroundColor: color, opacity: (pct / 100) * 0.85 + 0.15 }}>
                                  <span className="absolute inset-0 flex items-center justify-center text-[6px] font-mono font-bold text-white opacity-0 group-hover:opacity-100 bg-black/40 rounded">
                                    {Number(h[s.key]).toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
            
            {/* Section 2: Multi-Sensor Line Graph Comparison */}
            <div className="glass-panel p-3 flex flex-col">
              <h3 className="text-[10px] font-black tracking-wider text-amber-500 uppercase mb-2">Normalized Sensor Trends</h3>
              <div className="flex-grow min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history.map(h => ({
                    time: h.time,
                    vibration: (h.vibration_rms / 0.30) * 100,
                    strain: (h.strain / 600) * 100,
                    tilt: (h.tilt / 0.30) * 100,
                    scour: (h.scour_depth / 5.0) * 100,
                    water: (h.water_level / 10.0) * 100
                  }))} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                    <XAxis dataKey="time" stroke="#475569" fontSize={8} />
                    <YAxis stroke="#475569" fontSize={8} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f1117", borderColor: "#1e2433", color: "#f1f5f9", fontSize: '9px' }} />
                    <Legend wrapperStyle={{ fontSize: '9px' }} />
                    <ReferenceLine y={80} stroke="#f97316" strokeDasharray="3 3" />
                    <ReferenceLine y={95} stroke="#ef4444" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="vibration" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="strain" stroke="#06b6d4" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="tilt" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="scour" stroke="#10b981" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="water" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Section 3: Risk Score Trend with Forecast */}
            <div className="glass-panel p-3 flex flex-col">
              <h3 className="text-[10px] font-black tracking-wider text-amber-500 uppercase mb-2">Risk Forecast (Linear Reg.)</h3>
              <div className="flex-grow min-h-0">
                {(() => {
                  const buildForecast = (histData) => {
                    const pts = histData.slice(-5);
                    if (pts.length < 2) return histData;
                    const xs = pts.map((_, i) => i);
                    const ys = pts.map(p => p.risk_score);
                    const n = xs.length;
                    const sx = xs.reduce((a, b) => a + b, 0);
                    const sy = ys.reduce((a, b) => a + b, 0);
                    const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
                    const sx2 = xs.reduce((a, x) => a + x * x, 0);
                    const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
                    const lastVal = ys[ys.length - 1];
                    const forecast = [0, 1, 2, 3, 4, 5].map(i => ({
                      time: `+${i+1}s`,
                      forecast: Math.min(100, Math.max(0, Math.round(lastVal + slope * (i + 1)))),
                      risk_score: null
                    }));
                    if (forecast.length > 0) {
                      forecast[0].risk_score = lastVal;
                    }
                    return [...histData.map(h => ({ ...h, forecast: null })), ...forecast];
                  };
                  const data = buildForecast(history);
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                        <XAxis dataKey="time" stroke="#475569" fontSize={8} />
                        <YAxis stroke="#475569" fontSize={8} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f1117", borderColor: "#1e2433", color: "#f1f5f9", fontSize: '9px' }} />
                        <ReferenceLine y={45} stroke="#f97316" strokeDasharray="3 3" />
                        <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="risk_score" stroke="#ef4444" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="forecast" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>

            {/* Section 4: Structural Parameter Correlation Matrix */}
            <div className="glass-panel p-3 flex flex-col">
              <h3 className="text-[10px] font-black tracking-wider text-amber-500 uppercase mb-2">Sensor Correlation Matrix</h3>
              <div className="flex-grow flex items-center justify-center min-h-0">
                {(() => {
                  const recent = history.slice(-20);
                  const keys = ['vibration_rms', 'strain', 'tilt', 'scour_depth', 'water_level'];
                  const labels = ['VIB', 'STR', 'TLT', 'SCR', 'WTR'];
                  const computeCorr = (arrA, arrB) => {
                    const n = arrA.length;
                    if (n === 0) return 0;
                    const meanA = arrA.reduce((s, v) => s + v, 0) / n;
                    const meanB = arrB.reduce((s, v) => s + v, 0) / n;
                    const num = arrA.reduce((s, v, i) => s + (v - meanA) * (arrB[i] - meanB), 0);
                    const denA = Math.sqrt(arrA.reduce((s, v) => s + (v - meanA) ** 2, 0));
                    const denB = Math.sqrt(arrB.reduce((s, v) => s + (v - meanB) ** 2, 0));
                    return denA === 0 || denB === 0 ? 0 : num / (denA * denB);
                  };
                  return (
                    <div className="grid grid-cols-6 gap-1 w-full h-full max-w-sm max-h-48 mx-auto">
                      <div className="col-span-1"></div>
                      {labels.map(l => <div key={l} className="flex items-center justify-center text-[8px] font-bold text-slate-400">{l}</div>)}
                      {keys.map((k1, i) => (
                        <React.Fragment key={k1}>
                          <div className="flex items-center justify-end pr-2 text-[8px] font-bold text-slate-400">{labels[i]}</div>
                          {keys.map((k2, j) => {
                            let val = 1.0;
                            if (i !== j) {
                              const arrA = recent.map(r => r[k1]);
                              const arrB = recent.map(r => r[k2]);
                              val = computeCorr(arrA, arrB);
                            }
                            let r=50, g=50, b=50;
                            if (val > 0) {
                              r = Math.floor(50 + (val * 205));
                            } else if (val < 0) {
                              b = Math.floor(50 + (-val * 205));
                            }
                            return (
                              <div key={`${k1}-${k2}`} className="flex items-center justify-center text-[8px] font-mono border border-slate-900 rounded-sm font-bold text-white shadow-sm"
                                style={{ backgroundColor: `rgb(${r},${g},${b})` }}>
                                {val.toFixed(2)}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="glass-panel p-3 flex flex-col">
              <h3 className="text-[10px] font-black tracking-wider text-amber-500 uppercase mb-2">Live trend intelligence</h3>
              <div className="grid grid-cols-2 gap-2 flex-grow">
                {[
                  ["Risk momentum", `${riskChange >= 0 ? "+" : ""}${riskChange.toFixed(1)} pts`, riskChange > 8 ? "text-red-400" : riskChange > 2 ? "text-amber-400" : "text-emerald-400", "Change across recent samples"],
                  ["Scour trend", `${current.scour_depth_m > 2 ? "RISING" : "STABLE"}`, current.scour_depth_m > 2 ? "text-amber-400" : "text-emerald-400", "Foundation bed condition"],
                  ["Structural mode", current.lstm_analysis.is_anomaly ? "ANOMALOUS" : "NOMINAL", current.lstm_analysis.is_anomaly ? "text-red-400" : "text-emerald-400", "Vibration autoencoder result"],
                  ["Priority driver", current.scour_depth_m > 3 ? "SCOUR" : current.irc_compliance.overload_violation ? "LOAD" : current.irc_compliance.tilt_warning ? "TILT" : "BASELINE", "text-cyan-400", "Leading condition contributor"],
                ].map(([label, value, color, hint]) => <div key={label} className="stat-block flex flex-col justify-between"><span className="text-[8px] text-slate-500 font-mono uppercase">{label}</span><strong className={`text-xs font-display mt-2 ${color}`}>{value}</strong><span className="text-[7px] text-slate-600 font-mono mt-2">{hint}</span></div>)}
              </div>
            </div>

            <div className="glass-panel p-3 flex flex-col">
              <h3 className="text-[10px] font-black tracking-wider text-amber-500 uppercase mb-2">IRC scenario impact guide</h3>
              <div className="space-y-2 flex-grow overflow-y-auto scroll-panel pr-1">
                {[
                  ["HEALTHY", "Green", "Reference baseline; no action beyond routine monitoring."],
                  ["OVERLOAD", "Amber", "Tests heavy-load response: vibration and deck strain increase."],
                  ["MONSOON_SCOUR", "Orange", "Tests water level, scour depth, and frequency-shift response."],
                  ["WIND_GUST", "Blue", "Tests cross-wind load and aerodynamic deck-response monitoring."],
                  ["CORROSION_ALERT", "Purple", "Tests persistent deterioration monitoring and repair prioritisation."],
                  ["COMBINED_FAILURE", "Red", "Tests the emergency decision workflow with multiple hazards."],
                ].map(([state, level, description]) => <button key={state} onClick={() => { changeSimState(state); setActiveTab("dashboard"); }} className="w-full text-left p-2 border border-slate-800 hover:border-amber-500/50 bg-slate-950/50 transition-colors"><span className="text-[8px] font-bold font-mono text-amber-400">{state} · {level}</span><p className="text-[8px] font-mono text-slate-400 mt-1">{description}</p></button>)}
              </div>
            </div>

            <div className="glass-panel p-3 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-black tracking-wider text-amber-500 uppercase">Threshold headroom</h3>
                <span className="text-[7px] font-mono text-slate-500">LIVE VS. LIMIT</span>
              </div>
              <div className="space-y-3 flex-grow flex flex-col justify-center">
                {analyticsSensors.map((sensor) => {
                  const usage = Math.min(100, (sensor.value / sensor.max) * 100);
                  const color = usage >= 85 ? "#ef4444" : usage >= 60 ? "#f59e0b" : "#10b981";
                  return <div key={sensor.key}>
                    <div className="flex justify-between text-[8px] font-mono mb-1"><span className="text-slate-300">{sensor.label}</span><span style={{ color }}>{sensor.value} {sensor.unit} · {Math.max(0, 100 - usage).toFixed(0)}% headroom</span></div>
                    <div className="h-2 bg-slate-900 border border-slate-800 rounded overflow-hidden"><div className="h-full transition-all duration-500" style={{ width: `${usage}%`, background: color }} /></div>
                  </div>;
                })}
              </div>
            </div>

            <div className="glass-panel p-3 flex flex-col">
              <h3 className="text-[10px] font-black tracking-wider text-amber-500 uppercase mb-2">Rolling sensor statistics</h3>
              <div className="overflow-x-auto flex-grow">
                <table className="w-full text-left font-mono text-[8px]">
                  <thead className="text-slate-500 border-b border-slate-800"><tr><th className="pb-2">Sensor</th><th className="pb-2">Min</th><th className="pb-2">Average</th><th className="pb-2">Max</th></tr></thead>
                  <tbody>{rollingStats.map((sensor) => <tr key={sensor.key} className="border-b border-slate-900/70"><td className="py-2 text-slate-300">{sensor.label}</td><td className="py-2 text-slate-500">{sensor.min.toFixed(2)}</td><td className="py-2 text-teal-300">{sensor.average.toFixed(2)}</td><td className="py-2 text-amber-300">{sensor.maxValue.toFixed(2)} {sensor.unit}</td></tr>)}</tbody>
                </table>
              </div>
              <p className="text-[7px] text-slate-600 font-mono mt-2">Computed from the most recent {Math.min(history.length, 20)} telemetry samples.</p>
            </div>

            <div className="glass-panel p-3 flex flex-col">
              <div className="flex items-center justify-between mb-2"><h3 className="text-[10px] font-black tracking-wider text-amber-500 uppercase">Recent risk events</h3><span className="text-[7px] font-mono text-slate-500">LAST 8 SAMPLES</span></div>
              <div className="space-y-1.5 flex-grow overflow-y-auto scroll-panel pr-1">
                {history.slice(-8).reverse().map((sample, index) => {
                  const prior = history[history.length - 2 - index];
                  const delta = prior ? sample.risk_score - prior.risk_score : 0;
                  const tone = sample.risk_score >= 75 ? "text-red-400" : sample.risk_score >= 45 ? "text-amber-400" : "text-emerald-400";
                  return <div key={`${sample.time}-${index}`} className="flex items-center justify-between gap-2 p-2 bg-slate-950/60 border border-slate-800"><div><p className="text-[8px] font-mono text-slate-300">{sample.time} · {sample.state || "LIVE TELEMETRY"}</p><p className="text-[7px] font-mono text-slate-600">Risk change {delta >= 0 ? "+" : ""}{delta.toFixed(1)} points</p></div><strong className={`text-xs font-display ${tone}`}>{sample.risk_score}%</strong></div>;
                })}
              </div>
            </div>

            <div className="glass-panel p-3 flex flex-col">
              <div className="flex items-center justify-between mb-2"><h3 className="text-[10px] font-black tracking-wider text-amber-500 uppercase">Pier P3 condition map</h3><span className="text-[7px] font-mono text-teal-400">LIVE TWIN</span></div>
              <PierConditionSchematic current={current} />
            </div>

            <div className="glass-panel p-3 flex flex-col">
              <h3 className="text-[10px] font-black tracking-wider text-amber-500 uppercase mb-2">Risk-band distribution</h3>
              <div className="flex-grow flex flex-col justify-center gap-3">
                {riskDistribution.map((band) => {
                  const percentage = history.length ? (band.count / history.length) * 100 : 0;
                  return <div key={band.label}><div className="flex justify-between mb-1 text-[8px] font-mono"><span style={{ color: band.color }}>{band.label} <span className="text-slate-600">({band.range})</span></span><span className="text-slate-300">{band.count} samples · {percentage.toFixed(0)}%</span></div><div className="h-3 rounded bg-slate-900 border border-slate-800 overflow-hidden"><div className="h-full" style={{ width: `${percentage}%`, background: band.color }}/></div></div>;
                })}
              </div>
              <p className="mt-3 text-[7px] font-mono text-slate-600">Shows how recent telemetry is distributed across operational risk bands.</p>
            </div>
          </div>
        </main>
      )}

      {/* PITCH DECK SLIDES */}
      {activeTab === "pitch" && (
        <main className="glass-panel flex-grow flex flex-col items-center justify-center max-w-3xl mx-auto w-full my-4 p-8">
          <div className="w-full flex-grow flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-900 pb-3 mb-6">
                <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  SLIDE {pitchSlide + 1} OF 4
                </span>
                <h2 className="text-xs font-bold font-display text-white">{t.pitch_deck}</h2>
              </div>

              <div className="bg-slate-950/60 p-8 rounded border border-slate-900 shadow-inner min-h-[260px] flex flex-col justify-center">
                <h3 className="text-base font-bold font-display text-amber-500 mb-4 tracking-wider">
                  {pitchSlide === 0 && t.pitch_slide_1_title}
                  {pitchSlide === 1 && t.pitch_slide_2_title}
                  {pitchSlide === 2 && t.pitch_slide_3_title}
                  {pitchSlide === 3 && t.pitch_slide_4_title}
                </h3>
                <p className="text-slate-300 leading-relaxed text-xs font-mono mb-6">
                  {pitchSlide === 0 && t.pitch_slide_1_body}
                  {pitchSlide === 1 && t.pitch_slide_2_body}
                  {pitchSlide === 2 && t.pitch_slide_3_body}
                  {pitchSlide === 3 && t.pitch_slide_4_body}
                </p>

                {pitchSlide === 0 && (
                  <div className="grid grid-cols-3 gap-4 border-t border-slate-900 pt-5 text-center">
                    <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
                      <span className="block text-base font-bold text-white">173,000+</span>
                      <span className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold mt-1">Aging Bridges</span>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
                      <span className="block text-base font-bold text-amber-500">IRC:SP:35</span>
                      <span className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold mt-1">Mandate Act</span>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
                      <span className="block text-base font-bold text-red-500">Morbi / Majerhat</span>
                      <span className="text-[8px] text-slate-500 uppercase tracking-widest font-semibold mt-1">Disasters</span>
                    </div>
                  </div>
                )}
                {pitchSlide === 1 && (
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-900 pt-5 text-left text-[10px]">
                    <div className="flex gap-3 bg-slate-900/60 p-3 rounded border border-slate-800">
                      <Eye className="text-amber-500 flex-shrink-0" size={18} />
                      <div>
                        <span className="block font-bold text-white uppercase tracking-wider text-[9px]">Vision AI Feed</span>
                        <span className="text-[8px] text-slate-400 leading-normal">YOLOv8 fine-tuned to classify concrete cracks.</span>
                      </div>
                    </div>
                    <div className="flex gap-3 bg-slate-900/60 p-3 rounded border border-slate-800">
                      <Activity className="text-amber-500 flex-shrink-0" size={18} />
                      <div>
                        <span className="block font-bold text-white uppercase tracking-wider text-[9px]">LSTM Vibrations</span>
                        <span className="text-[8px] text-slate-400 leading-normal">Autoencoder measures natural frequency shifts.</span>
                      </div>
                    </div>
                  </div>
                )}
                {pitchSlide === 2 && (
                  <div className="grid grid-cols-3 gap-2 border-t border-slate-900 pt-5 text-[9px] text-center">
                    <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                      <span className="block text-white font-bold uppercase mb-1">Fatigue Load</span>
                      <span className="text-slate-400">IRC:6 standards.</span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                      <span className="block text-white font-bold uppercase mb-1">Scour Depth</span>
                      <span className="text-slate-400">Monsoon floods.</span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                      <span className="block text-white font-bold uppercase mb-1">Corrosion Index</span>
                      <span className="text-slate-400">Rust dynamics.</span>
                    </div>
                  </div>
                )}
                {pitchSlide === 3 && (
                  <div className="grid grid-cols-3 gap-4 border-t border-slate-900 pt-5 text-center">
                    <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
                      <span className="block text-base font-bold text-amber-500">80%</span>
                      <span className="text-[8px] text-slate-500 uppercase tracking-widest mt-1">Cost Savings</span>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
                      <span className="block text-base font-bold text-amber-500">No Hardware</span>
                      <span className="text-[8px] text-slate-500 uppercase tracking-widest mt-1">Software-only Layer</span>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded border border-slate-800">
                      <span className="block text-base font-bold text-amber-500">1-Click</span>
                      <span className="text-[8px] text-slate-500 uppercase tracking-widest mt-1">PWD Integration</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 border-t border-slate-900 pt-4">
              <span className="text-[9px] text-slate-500 italic">* Built for IRC:SP:35 regulatory standards</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPitchSlide(prev => Math.max(0, prev - 1))}
                  disabled={pitchSlide === 0}
                  className="control-btn disabled:opacity-40"
                >
                  Previous
                </button>
                <button 
                  onClick={() => setPitchSlide(prev => Math.min(3, prev + 1))}
                  disabled={pitchSlide === 3}
                  className="control-btn active disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* DEMO SEQUENCE WALKTHROUGH */}
      {activeTab === "demo" && (
        <main className="glass-panel flex-grow max-w-3xl mx-auto w-full my-4 p-8 flex flex-col gap-5 overflow-y-auto scroll-panel">
          <div className="border-b border-slate-900 pb-3">
            <h2 className="text-xs font-bold font-display text-white uppercase">{t.demo_script}</h2>
            <p className="text-[10px] text-slate-500 mt-1">Showcase the AI early warning pipeline in sequential stages.</p>
          </div>

          <div className="flex flex-col gap-3 text-slate-300 font-mono text-[11px]">
            {/* Step 1 */}
            <div className="bg-slate-900/40 p-3.5 rounded border border-slate-800 flex gap-3">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center flex-shrink-0">1</span>
              <div>
                <p className="font-bold text-white mb-0.5 text-[10px] uppercase text-amber-500">Baseline Healthy Mode</p>
                <p className="leading-relaxed text-slate-400">{t.demo_step_1}</p>
                <button onClick={() => { setActiveTab("dashboard"); changeSimState("HEALTHY"); }} className="control-btn text-[8px] px-2 py-0.5 mt-2">
                  Launch Step 1
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-900/40 p-3.5 rounded border border-slate-800 flex gap-3">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center flex-shrink-0">2</span>
              <div>
                <p className="font-bold text-white mb-0.5 text-[10px] uppercase text-amber-500">IRC:6 Loading Standards Test</p>
                <p className="leading-relaxed text-slate-400">{t.demo_step_2}</p>
                <button onClick={() => { setActiveTab("dashboard"); changeSimState("OVERLOAD"); }} className="control-btn text-[8px] px-2 py-0.5 mt-2">
                  Launch Step 2
                </button>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-900/40 p-3.5 rounded border border-slate-800 flex gap-3">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center flex-shrink-0">3</span>
              <div>
                <p className="font-bold text-white mb-0.5 text-[10px] uppercase text-amber-500">Monsoon Hydraulic Flooding & Scour</p>
                <p className="leading-relaxed text-slate-400">{t.demo_step_3}</p>
                <button onClick={() => { setActiveTab("dashboard"); changeSimState("MONSOON_SCOUR"); }} className="control-btn text-[8px] px-2 py-0.5 mt-2">
                  Launch Step 3
                </button>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-900/40 p-3.5 rounded border border-slate-800 flex gap-3">
              <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 font-bold flex items-center justify-center flex-shrink-0">4</span>
              <div>
                <p className="font-bold text-white mb-0.5 text-[10px] uppercase text-red-500">Combined Multimodal Integrity Failure</p>
                <p className="leading-relaxed text-slate-400">{t.demo_step_4}</p>
                <button onClick={() => { setActiveTab("dashboard"); changeSimState("COMBINED_FAILURE"); }} className="control-btn text-[8px] px-2 py-0.5 mt-2">
                  Launch Step 4
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* SIMULATION CONTROL — PREMIUM FOOTER */}
      <footer
        className={`scenario-footer p-0 border-t flex items-stretch overflow-hidden ${
          isDangerActive
            ? "border-red-500/50 bg-gradient-to-r from-red-950/40 via-slate-950 to-red-950/20"
            : "border-slate-800/60 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950"
        }`}
        style={{ minHeight: "52px" }}
      >
        {/* Left label */}
        <div className="scenario-footer-label px-4 flex items-center border-r border-slate-800/60 flex-shrink-0">
          <div>
            <p className="text-[7px] font-bold font-mono text-slate-600 uppercase tracking-widest">Simulation Engine</p>
            <p className="text-[8px] font-display font-bold text-amber-500 tracking-wider">{scenarioInfo.title}</p>
            <p className="scenario-explanation">{scenarioInfo.description}</p>
            <p className="text-[7px] font-mono text-teal-400 mt-1">Response: {scenarioInfo.response}</p>
          </div>
        </div>

        {/* Scenario buttons */}
        <div className="scenario-controls flex flex-1 items-center gap-0 overflow-hidden">
          {[
            {
              state: "HEALTHY",
              label: "Normal Operation",
              sublabel: "Baseline · all sensors clear",
              icon: "OK",
              activeClass: "bg-gradient-to-br from-emerald-700 to-emerald-900 text-white border-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.35)]",
              idleClass: "bg-slate-900/70 text-slate-500 border-slate-800/60 hover:border-emerald-700/50 hover:text-emerald-400",
              iconColor: "text-emerald-400"
            },
            {
              state: "OVERLOAD",
              label: "IRC:6 Overload",
              sublabel: "Heavy vehicle · deck strain",
              icon: "LOAD",
              activeClass: "bg-gradient-to-br from-amber-600 to-amber-800 text-slate-950 border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.4)]",
              idleClass: "bg-slate-900/70 text-slate-500 border-slate-800/60 hover:border-amber-700/50 hover:text-amber-400",
              iconColor: "text-amber-400"
            },
            {
              state: "MONSOON_SCOUR",
              label: "Monsoon Scour",
              sublabel: "Floodwater · foundation erosion",
              icon: "RAIN",
              activeClass: "bg-gradient-to-br from-cyan-700 to-blue-900 text-white border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.4)]",
              idleClass: "bg-slate-900/70 text-slate-500 border-slate-800/60 hover:border-cyan-700/50 hover:text-cyan-400",
              iconColor: "text-cyan-400"
            },
            {
              state: "WIND_GUST",
              label: "High Wind",
              sublabel: "Cross-wind · deck response",
              icon: "WIND",
              activeClass: "bg-gradient-to-br from-sky-700 to-blue-950 text-white border-sky-400 shadow-[0_0_18px_rgba(14,165,233,0.4)]",
              idleClass: "bg-slate-900/70 text-slate-500 border-slate-800/60 hover:border-sky-700/50 hover:text-sky-400",
              iconColor: "text-sky-400"
            },
            {
              state: "CORROSION_ALERT",
              label: "Corrosion",
              sublabel: "Rebar · degradation watch",
              icon: "COR",
              activeClass: "bg-gradient-to-br from-violet-700 to-purple-950 text-white border-violet-400 shadow-[0_0_18px_rgba(139,92,246,0.4)]",
              idleClass: "bg-slate-900/70 text-slate-500 border-slate-800/60 hover:border-violet-700/50 hover:text-violet-400",
              iconColor: "text-violet-400"
            },
            {
              state: "COMBINED_FAILURE",
              label: "CRITICAL FAILURE",
              sublabel: "Multi-hazard emergency test",
              icon: "CRIT",
              activeClass: "bg-gradient-to-br from-red-700 to-red-900 text-white border-red-400 shadow-[0_0_22px_rgba(239,68,68,0.55)] animate-pulse",
              idleClass: "bg-slate-900/70 text-slate-500 border-slate-800/60 hover:border-red-700/50 hover:text-red-400",
              iconColor: "text-red-400"
            },
          ].map(({ state, label, sublabel, icon, activeClass, idleClass, iconColor }) => {
            const isActive = current.state === state;
            return (
              <button
                key={state}
                onClick={() => changeSimState(state)}
                aria-pressed={isActive}
                title={`Activate ${label} scenario`}
                className={`scenario-button scenario-${state.toLowerCase()} ${isActive ? "is-active" : ""} flex-1 flex flex-col items-center justify-center py-2 px-3 border-r border-slate-800/40 font-mono transition-all duration-200 ${isActive ? activeClass : idleClass}`}
              >
                <span className={`scenario-icon text-base leading-none mb-0.5 ${isActive ? "text-inherit" : iconColor}`}>{icon}</span>
                <span className="text-[8px] font-display font-bold uppercase tracking-wider leading-none">{label}</span>
                <span className={`text-[7px] mt-0.5 font-mono leading-none ${isActive ? "opacity-80" : "text-slate-600"}`}>{sublabel}</span>
              </button>
            );
          })}
        </div>

        {/* Right: live status ticker */}
        <div className="scenario-status px-4 flex flex-col items-end justify-center border-l border-slate-800/60 flex-shrink-0 min-w-[140px]">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isDangerActive ? "bg-red-500" : "bg-emerald-500"}`}></span>
            <span className={`text-[8px] font-bold font-mono uppercase ${isDangerActive ? "text-red-400" : "text-emerald-400"}`}>
              {isDangerActive ? "DANGER ACTIVE" : "SYSTEM NOMINAL"}
            </span>
          </div>
          <span className="text-[7px] font-mono text-slate-600">{current.time_str} IST</span>
          <span className="text-[7px] font-mono text-slate-700 mt-0.5">© 2026 Setu Rakshak</span>
        </div>
      </footer>

      {/* 5. AUDIT REPORT MODAL */}
      {showAuditModal && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white text-slate-900 w-full max-w-2xl p-6 rounded shadow-2xl relative border-t-8 border-amber-600 font-serif">
            
            <button 
              onClick={() => setShowAuditModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 text-xl font-bold font-sans"
            >
              ✕
            </button>

            <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
              <h3 className="text-sm font-sans font-bold uppercase tracking-widest text-slate-500">NATIONAL HIGHWAYS AUTHORITY OF INDIA</h3>
              <h2 className="text-lg font-sans font-black uppercase text-slate-950 mt-1">BRIDGE HEALTH INSPECTION COMPLIANCE REPORT</h2>
              <p className="text-[10px] text-slate-400 font-mono mt-1">IRC:SP:35-2020 / IRC:114 SPECIFICATIONS</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-4 font-sans bg-slate-100 p-3 rounded">
              <div>
                <p><strong>STRUCTURE ID:</strong> NH-30-UP-Naini-042</p>
                <p><strong>NAME:</strong> New Naini Cable-Stayed Bridge</p>
                <p><strong>RATING DATE:</strong> {new Date().toLocaleDateString()}</p>
              </div>
              <div>
                <p><strong>HIGHWAY SECTION:</strong> Prayagraj Bypass Corridors</p>
                <p><strong>AUDITOR AGENT:</strong> SETU RAKSHAK CORE AI v1.2</p>
                <p><strong>CLASSIFICATION METHOD:</strong> Deep LSTM + YOLO Fusion</p>
              </div>
            </div>

            <h3 className="text-xs font-sans font-bold uppercase text-slate-700 mb-2 border-b border-slate-300 pb-1">Telemetry Sensor Verification</h3>
            <div className="grid grid-cols-3 gap-2 text-xs mb-4 font-mono">
              <div className="p-2 border border-slate-200">
                <span className="text-[9px] text-slate-500 block font-bold font-sans">Vibration RMS</span>
                <span>{current.vibration_rms_g} g</span>
              </div>
              <div className="p-2 border border-slate-200">
                <span className="text-[9px] text-slate-500 block font-bold font-sans">Deck Tensile Strain</span>
                <span>{current.deck_strain_microstrain} με</span>
              </div>
              <div className="p-2 border border-slate-200">
                <span className="text-[9px] text-slate-500 block font-bold font-sans">Foundation Scour</span>
                <span>{current.scour_depth_m} m</span>
              </div>
            </div>

            <h3 className="text-xs font-sans font-bold uppercase text-slate-700 mb-2 border-b border-slate-300 pb-1">Computer Vision Defect Report</h3>
            <div className="text-xs font-sans mb-4 bg-orange-50 p-2.5 rounded border border-orange-200">
              <p><strong>IRC Visual Rating Class:</strong> Grade {current.vision_analysis.irc_visual_rating} / 5</p>
              <p className="mt-1"><strong>Diagnosed Defect:</strong> "{current.vision_analysis.description}"</p>
            </div>

            <h3 className="text-xs font-sans font-bold uppercase text-slate-700 mb-2 border-b border-slate-300 pb-1">Unified Structural Assessment</h3>
            <div className="grid grid-cols-2 gap-4 text-xs mb-6">
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-sans font-bold">Fused Structural Risk Index</span>
                <span className="text-2xl font-bold text-slate-900 font-sans">{current.fusion_analysis.fused_risk_percentage}%</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase font-sans font-bold">Recommended Legal Action</span>
                <span className="text-sm font-bold text-red-600 font-sans uppercase">{current.vision_analysis.recomm_action}</span>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-slate-300 pt-4 font-sans text-[10px]">
              <div className="text-center">
                <div className="w-24 h-6 border-b border-slate-400 mx-auto mb-1"></div>
                <span>AUDIT SYSTEMS OPERATOR</span>
              </div>
              <div className="text-center">
                <div className="w-24 h-6 border-b border-slate-400 mx-auto mb-1 flex items-center justify-center font-bold text-emerald-600 font-mono text-[8px] border border-emerald-400 border-dashed bg-emerald-50 px-1">
                  AI APPROVED
                </div>
                <span>IRC SIGNATURE CERTIFICATION</span>
              </div>
              <div className="text-center">
                <button 
                  onClick={() => window.print()}
                  className="bg-slate-950 text-white font-bold py-1.5 px-3 rounded hover:bg-slate-800 transition-all font-sans"
                >
                  Print Report
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
