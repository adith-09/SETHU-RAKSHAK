from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
import os

from generator import BridgeTelemetryGenerator
from models import VibrationAnomalyDetector, BridgeVisionInspector, SHMDecisionFusionEngine

app = FastAPI(title="Setu Rakshak SHM API", description="Bilingual Structural Health Monitoring Backend")

# Enable CORS for React frontend (default local port is 5173)
allowed_origins = [origin.strip() for origin in os.getenv(
    "FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    """Lightweight readiness check for deployments and the frontend."""
    return {"status": "ok", "service": "setu-rakshak-api"}

# Instantiate core engines
generator = BridgeTelemetryGenerator()
# Save the LSTM model file inside the backend directory or root
model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lstm_shm.pth")
detector = VibrationAnomalyDetector(model_path=model_path)
vision = BridgeVisionInspector()
fusion = SHMDecisionFusionEngine()

# Current global visual state of the bridge inspection camera
current_vision_case = "healthy"

# In-memory history of recent metrics for charts
telemetry_history = []
MAX_HISTORY_LEN = 30

class StateChangeRequest(BaseModel):
    state: str

class VisionChangeRequest(BaseModel):
    case_name: str

@app.get("/api/bridge/info")
def get_bridge_info():
    """
    Returns structural and geographical metadata for the digital twin anchor (Naini Bridge).
    """
    return {
        "name": "New Naini Bridge (Prayagraj)",
        "name_hi": "नया नैनी सेतु (प्रयागराज)",
        "structure_type": "Cable-Stayed Bridge with Concrete Deck",
        "structure_type_hi": "कंक्रीट डेक के साथ केबल-स्टेड पुल",
        "nh_route": "NH-30 (Connects Prayagraj to Rewa)",
        "nh_route_hi": "राष्ट्रीय राजमार्ग - 30 (प्रयागराज को रीवा से जोड़ता है)",
        "built_year": 2004,
        "total_length_m": 1510,
        "main_span_m": 320,
        "piers_monitored": ["P3", "P4", "P5"],
        "cables_monitored": ["C1-East", "C2-East", "C1-West", "C2-West"],
        "coordinates": {"lat": 25.4243, "lng": 81.8562}
    }

@app.post("/api/simulation/state")
def set_simulation_state(req: StateChangeRequest):
    """
    Sets the active monitoring scenario, including wind and corrosion conditions.
    Also adjusts telemetry conditions accordingly.
    """
    state = req.state.upper()
    if state not in ["HEALTHY", "OVERLOAD", "MONSOON_SCOUR", "WIND_GUST", "CORROSION_ALERT", "COMBINED_FAILURE"]:
        raise HTTPException(status_code=400, detail="Invalid simulation state")
        
    generator.set_state(state)
    
    # Automatically adjust corresponding visual damage library cases
    global current_vision_case
    if state == "HEALTHY":
        current_vision_case = "healthy"
        generator.set_monsoon_rainfall(10.0)
    elif state == "OVERLOAD":
        # Temporary overload doesn't immediately crack concrete, but let's show minor cracks
        current_vision_case = "crack_minor"
        generator.set_monsoon_rainfall(12.0)
    elif state == "MONSOON_SCOUR":
        current_vision_case = "spalling_moderate"
        generator.set_monsoon_rainfall(95.0)
    elif state == "WIND_GUST":
        current_vision_case = "healthy"
        generator.set_monsoon_rainfall(20.0)
    elif state == "CORROSION_ALERT":
        current_vision_case = "spalling_moderate"
        generator.set_monsoon_rainfall(55.0)
    elif state == "COMBINED_FAILURE":
        current_vision_case = "exposed_rebar_severe"
        generator.set_monsoon_rainfall(125.0)
        
    return {"status": "success", "current_state": state, "vision_case": current_vision_case}

@app.post("/api/vision/state")
def set_vision_state(req: VisionChangeRequest):
    """
    Manually overrides the camera visual analysis case (healthy, crack_minor, spalling_moderate, exposed_rebar_severe)
    """
    global current_vision_case
    case = req.case_name.lower()
    if case not in ["healthy", "crack_minor", "spalling_moderate", "exposed_rebar_severe"]:
        raise HTTPException(status_code=400, detail="Invalid vision case name")
    current_vision_case = case
    return {"status": "success", "vision_case": current_vision_case}

def generate_fft_spectrum(state: str):
    import numpy as np
    spectrum = []
    frequencies = np.linspace(0.5, 10.0, 20)
    noise_level = 0.05
    if state == "COMBINED_FAILURE":
        noise_level = 0.15
        
    for f in frequencies:
        amp = float(np.random.normal(0, noise_level))
        amp = max(0.01, amp)
        
        if state == "HEALTHY":
            amp += float(0.8 * np.exp(-((f - 4.5) / 0.6) ** 2))
        elif state == "OVERLOAD":
            amp += float(1.2 * np.exp(-((f - 4.5) / 0.5) ** 2))
            amp += float(0.4 * np.exp(-((f - 7.0) / 0.8) ** 2))
        elif state == "MONSOON_SCOUR":
            amp += float(0.75 * np.exp(-((f - 3.25) / 0.6) ** 2))
        elif state == "COMBINED_FAILURE":
            amp += float(0.5 * np.exp(-((f - 2.9) / 0.9) ** 2))
            
        spectrum.append({"freq_hz": float(round(f, 2)), "amplitude": float(round(amp, 4))})
    return spectrum

@app.get("/api/telemetry/live")
def get_live_telemetry():
    """
    Polls the telemetry generator, runs LSTM anomaly detection and sensor fusion,
    records history, and returns a single state snapshot.
    """
    global current_vision_case, telemetry_history
    
    # 1. Get raw telemetry metrics
    telemetry = generator.get_telemetry_snapshot()
    
    # 2. Run PyTorch LSTM autoencoder on the raw vibration window
    vibration_raw = telemetry.pop("vibration_raw", [])
    lstm_res = detector.evaluate(vibration_raw)
    telemetry["lstm_analysis"] = lstm_res
    
    # 3. Fetch visual crack inspection state
    vision_res = vision.analyze_image(current_vision_case)
    telemetry["vision_analysis"] = vision_res
    
    # 4. Run Sensor Fusion Engine to calculate IRC score
    fused_res = fusion.calculate_condition_rating(telemetry, vision_res["irc_visual_rating"])
    telemetry["fusion_analysis"] = fused_res
    
    # Add timestamp in human readable format
    telemetry["time_str"] = time.strftime("%H:%M:%S", time.localtime(telemetry["timestamp"]))
    
    # Keep history for time-series charts (limit to MAX_HISTORY_LEN)
    history_entry = {
        "time": telemetry["time_str"],
        "state": telemetry["state"],
        "vibration_rms": telemetry["vibration_rms_g"],
        "anomaly_score": lstm_res["anomaly_score"],
        "strain": telemetry["deck_strain_microstrain"],
        "water_level": telemetry["water_level_m"],
        "scour_depth": telemetry["scour_depth_m"],
        "traffic_load": telemetry["traffic_load_tonnes"],
        "tilt": telemetry["pier_tilt_degrees"],
        "wind_speed": telemetry["wind_speed_kph"],
        "corrosion_index": telemetry["corrosion_index"],
        "risk_score": fused_res["fused_risk_percentage"]
    }
    
    telemetry_history.append(history_entry)
    if len(telemetry_history) > MAX_HISTORY_LEN:
        telemetry_history.pop(0)
        
    return {
        "current": telemetry,
        "history": telemetry_history,
        "fft_spectrum": generate_fft_spectrum(telemetry["state"])
    }

@app.get("/api/alerts")
def get_active_alerts():
    """
    Scans the latest history telemetry and reports critical alarms.
    """
    if not telemetry_history:
        return []
        
    latest = telemetry_history[-1]
    alerts = []
    
    if latest["traffic_load"] > 40.0:
        alerts.append({
            "id": "alert_overload",
            "type": "WARNING",
            "message_en": f"IRC:6 Overload Load Alert: Heavy Load ({latest['traffic_load']}t) on Deck",
            "message_hi": f"IRC:6 ओवरलोड भार चेतावनी: डेक पर भारी भार ({latest['traffic_load']} टन)",
            "timestamp": time.strftime("%H:%M:%S")
        })
    if latest["water_level"] > 8.0:
        alerts.append({
            "id": "alert_flood",
            "type": "CRITICAL",
            "message_en": f"Monsoon Flood Alert: River Water Level at Danger Mark ({latest['water_level']}m)",
            "message_hi": f"मानसून बाढ़ चेतावनी: खतरे के निशान पर नदी का जल स्तर ({latest['water_level']} मीटर)",
            "timestamp": time.strftime("%H:%M:%S")
        })
    if latest["scour_depth"] > 3.0:
        alerts.append({
            "id": "alert_scour",
            "type": "CRITICAL",
            "message_en": f"Pier Scour Alert: Pier Foundation Scour Depth critical ({latest['scour_depth']}m)",
            "message_hi": f"पियर कटाव चेतावनी: पियर नींव कटाव गहराई गंभीर ({latest['scour_depth']} मीटर)",
            "timestamp": time.strftime("%H:%M:%S")
        })
    if latest["tilt"] > 0.15:
        alerts.append({
            "id": "alert_tilt",
            "type": "CRITICAL",
            "message_en": f"Tilt Meter Warning: Pier tilt angle exceeds threshold ({latest['tilt']}°)",
            "message_hi": f"झुकाव मीटर चेतावनी: पियर झुकाव कोण सीमा से अधिक ({latest['tilt']}°)",
            "timestamp": time.strftime("%H:%M:%S")
        })
    if latest["anomaly_score"] > 0.5:
        alerts.append({
            "id": "alert_vibration",
            "type": "WARNING",
            "message_en": "LSTM Anomaly Alert: Unhealthy vibration frequency detected in pier accelerometer",
            "message_hi": "LSTM विसंगति चेतावनी: पियर एक्सेलेरोमीटर में अस्वस्थ कंपन आवृत्ति पाई गई",
            "timestamp": time.strftime("%H:%M:%S")
        })
    if latest.get("wind_speed", 0) > 60.0:
        alerts.append({"id": "alert_wind", "type": "WARNING", "message_en": f"High-wind alert: cross-wind speed {latest['wind_speed']} km/h", "message_hi": "तेज हवा की चेतावनी: पुल पर तेज अनुप्रस्थ हवा", "timestamp": time.strftime("%H:%M:%S")})
    if latest.get("corrosion_index", 0) > 0.5:
        alerts.append({"id": "alert_corrosion", "type": "WARNING", "message_en": "Corrosion monitoring alert: elevated reinforcement degradation index", "message_hi": "संक्षारण निगरानी चेतावनी: सुदृढीकरण क्षरण सूचकांक बढ़ा हुआ है", "timestamp": time.strftime("%H:%M:%S")})
        
    return alerts
