import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from generator import BridgeTelemetryGenerator
from models import VibrationAnomalyDetector, BridgeVisionInspector, SHMDecisionFusionEngine

def test_pipeline():
    print("=== Testing Setu Rakshak AI Pipeline ===")
    
    # 1. Telemetry Generator
    generator = BridgeTelemetryGenerator()
    snapshot = generator.get_telemetry_snapshot()
    print(f"Generated healthy snapshot state: {snapshot['state']}")
    print(f"Vibration RMS: {snapshot['vibration_rms_g']}g, Peak: {snapshot['vibration_peak_g']}g")
    
    # 2. Vibration LSTM Detector
    # This will train a quick model if lstm_shm.pth doesn't exist
    detector = VibrationAnomalyDetector(model_path="test_lstm_shm.pth")
    eval_res = detector.evaluate(snapshot["vibration_raw"])
    print(f"Vibration evaluation on healthy signal: Anomaly Score={eval_res['anomaly_score']}, Is Anomaly={eval_res['is_anomaly']}")
    
    # 3. Vision Inspector
    vision = BridgeVisionInspector()
    vision_res = vision.analyze_image("minor crack")
    print(f"Vision evaluation for minor crack: IRC rating={vision_res['irc_visual_rating']}, Detections={vision_res['detections']}")
    
    # 4. Fusion Engine
    fusion = SHMDecisionFusionEngine()
    fused_res = fusion.calculate_condition_rating(snapshot, vision_res["irc_visual_rating"])
    print(f"Fused System Rating: IRC Rating={fused_res['irc_condition_rating']}, Risk={fused_res['fused_risk_percentage']}%, Status={fused_res['status']}")
    
    # Clean up test model
    if os.path.exists("test_lstm_shm.pth"):
        os.remove("test_lstm_shm.pth")
        print("Cleaned up test model file.")
        
    print("=== Pipeline Test Successful ===")

if __name__ == "__main__":
    test_pipeline()
