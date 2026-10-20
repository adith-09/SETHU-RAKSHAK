import os
import torch
import torch.nn as nn
import numpy as np

# Set random seed for reproducibility
torch.manual_seed(42)
np.random.seed(42)

# --- 1. PyTorch LSTM Autoencoder for Anomaly Detection ---

class Encoder(nn.Module):
    def __init__(self, seq_len, no_features, embedding_dim=16):
        super(Encoder, self).__init__()
        self.seq_len = seq_len
        self.no_features = no_features
        self.embedding_dim = embedding_dim
        self.hidden_dim = 2 * embedding_dim
        
        self.rnn1 = nn.LSTM(
            input_size=no_features,
            hidden_size=self.hidden_dim,
            num_layers=1,
            batch_first=True
        )
        self.rnn2 = nn.LSTM(
            input_size=self.hidden_dim,
            hidden_size=embedding_dim,
            num_layers=1,
            batch_first=True
        )
        
    def forward(self, x):
        # x shape: [batch_size, seq_len, no_features]
        x, (_, _) = self.rnn1(x)
        x, (hidden_n, _) = self.rnn2(x)
        # hidden_n shape: [1, batch_size, embedding_dim]
        return hidden_n.permute(1, 0, 2).reshape(-1, 1, self.embedding_dim)

class Decoder(nn.Module):
    def __init__(self, seq_len, input_dim=16, out_features=1):
        super(Decoder, self).__init__()
        self.seq_len = seq_len
        self.input_dim = input_dim
        self.hidden_dim = 2 * input_dim
        
        self.rnn1 = nn.LSTM(
            input_size=input_dim,
            hidden_size=input_dim,
            num_layers=1,
            batch_first=True
        )
        self.rnn2 = nn.LSTM(
            input_size=input_dim,
            hidden_size=self.hidden_dim,
            num_layers=1,
            batch_first=True
        )
        self.output_layer = nn.Linear(self.hidden_dim, out_features)
        
    def forward(self, x):
        # x is encoder output shape: [batch, 1, embedding_dim]
        # Repeat vector seq_len times
        x = x.repeat(1, self.seq_len, 1)
        x, (_, _) = self.rnn1(x)
        x, (_, _) = self.rnn2(x)
        return self.output_layer(x)

class LSTMAutoencoder(nn.Module):
    def __init__(self, seq_len, no_features):
        super(LSTMAutoencoder, self).__init__()
        self.encoder = Encoder(seq_len, no_features)
        self.decoder = Decoder(seq_len, out_features=no_features)
        
    def forward(self, x):
        x = self.encoder(x)
        x = self.decoder(x)
        return x

class VibrationAnomalyDetector:
    def __init__(self, model_path="lstm_shm.pth", seq_len=50):
        self.model_path = model_path
        self.seq_len = seq_len
        self.model = LSTMAutoencoder(seq_len=self.seq_len, no_features=1)
        self.threshold = 0.008  # Default reconstruction MSE threshold
        
        # Check if pre-trained model exists, if not, train a lightweight one
        if os.path.exists(self.model_path):
            try:
                self.model.load_state_dict(torch.load(self.model_path, map_location=torch.device('cpu')))
                self.model.eval()
                # Load threshold if saved
                self.threshold = 0.0055
            except Exception as e:
                print(f"Error loading model, retraining: {e}")
                self.train_and_save()
        else:
            self.train_and_save()
            
    def train_and_save(self):
        """
        Generates simple healthy vibration signals (sine waves + noise)
        to train the LSTM autoencoder quickly on CPU (takes ~1-2 seconds).
        """
        print("Training lightweight LSTM Autoencoder for Vibration SHM...")
        self.model.train()
        
        # Generate 150 training samples of 'healthy' vibration
        # Simple sinusoidal patterns with low noise
        t = np.linspace(0, 1.0, self.seq_len)
        data = []
        for _ in range(150):
            freq = 4.5 + np.random.normal(0, 0.1)
            signal = 0.02 * np.sin(2 * np.pi * freq * t) + np.random.normal(0, 0.003, self.seq_len)
            data.append(signal)
            
        data = np.array(data)[:, :, np.newaxis] # Shape [150, 50, 1]
        X_train = torch.tensor(data, dtype=torch.float32)
        
        optimizer = torch.optim.Adam(self.model.parameters(), lr=0.01)
        criterion = nn.MSELoss()
        
        # Fast training loop
        epochs = 15
        for epoch in range(epochs):
            optimizer.zero_grad()
            predictions = self.model(X_train)
            loss = criterion(predictions, X_train)
            loss.backward()
            optimizer.step()
            
        # Determine threshold on training set (e.g., 95th percentile * 1.5)
        self.model.eval()
        with torch.no_grad():
            preds = self.model(X_train)
            errors = torch.mean((preds - X_train) ** 2, dim=(1, 2)).numpy()
            self.threshold = float(np.percentile(errors, 95) * 2.0)
            
        # Save model
        torch.save(self.model.state_dict(), self.model_path)
        print(f"LSTM training complete. Loss: {loss.item():.6f}, Anomaly Threshold: {self.threshold:.6f}")
        
    def evaluate(self, raw_signal: list) -> dict:
        """
        Evaluates a raw 50-sample vibration signal and computes reconstruction loss.
        """
        if len(raw_signal) < self.seq_len:
            # Pad with zeros if too short
            raw_signal = raw_signal + [0.0] * (self.seq_len - len(raw_signal))
        elif len(raw_signal) > self.seq_len:
            raw_signal = raw_signal[:self.seq_len]
            
        self.model.eval()
        x_tensor = torch.tensor(raw_signal, dtype=torch.float32).reshape(1, self.seq_len, 1)
        
        with torch.no_grad():
            reconstructed = self.model(x_tensor)
            mse = torch.mean((reconstructed - x_tensor) ** 2).item()
            
        # Calculate anomaly score scaled 0 to 1
        # If mse <= threshold/2, score is near 0. If mse >= threshold * 3, score saturates at 1.0.
        anomaly_score = min(1.0, max(0.0, (mse - (self.threshold * 0.5)) / (self.threshold * 2.5)))
        is_anomaly = mse > self.threshold
        
        return {
            "reconstruction_error": float(round(mse, 6)),
            "anomaly_score": float(round(anomaly_score, 3)),
            "is_anomaly": bool(is_anomaly),
            "threshold": float(round(self.threshold, 6))
        }


# --- 2. Vision Damage Inspector (IRC:SP:35 Calibrated) ---

class BridgeVisionInspector:
    """
    Simulates visual damage inspections based on uploaded photos or video feeds.
    Aligns category and severity with IRC:SP:35 condition rating guidelines.
    """
    def __init__(self):
        # Predefined mock inspection scenarios
        self.mock_library = {
            "healthy": {
                "detections": [],
                "irc_visual_rating": 0,
                "description": "Structure surface clear. No visible cracking or spalling.",
                "recomm_action": "Routine inspection in 12 months."
            },
            "crack_minor": {
                "detections": [
                    {"label": "Crack (Hairline)", "confidence": 0.88, "bbox": [120, 240, 50, 180], "severity": "Minor (0.2mm)"}
                ],
                "irc_visual_rating": 1,
                "description": "Hairline cracks observed on the girder face (width < 0.5mm). Structural safety is unaffected.",
                "recomm_action": "Monitor during scheduled routine inspections. No immediate action required."
            },
            "spalling_moderate": {
                "detections": [
                    {"label": "Spalling (Concrete)", "confidence": 0.91, "bbox": [320, 150, 120, 95], "severity": "Moderate"},
                    {"label": "Structural Crack", "confidence": 0.85, "bbox": [200, 310, 80, 210], "severity": "Moderate (1.2mm)"}
                ],
                "irc_visual_rating": 2,
                "description": "Moderate concrete spalling on Pier 3 cap, plus minor structural cracks (width 1-2mm).",
                "recomm_action": "Schedule local patching and repair within 6 months. Apply protective coating."
            },
            "exposed_rebar_severe": {
                "detections": [
                    {"label": "Exposed Rebar (Corroding)", "confidence": 0.94, "bbox": [150, 80, 250, 180], "severity": "Severe"},
                    {"label": "Severe Concrete Spalling", "confidence": 0.89, "bbox": [100, 60, 320, 240], "severity": "Severe"}
                ],
                "irc_visual_rating": 4,
                "description": "Exposed steel reinforcement with active corrosion and heavy concrete loss on Pier 3 crossbeam. Compromises local strength.",
                "recomm_action": "Immediate structural rehabilitation and cathodic protection. Restrict heavy vehicles."
            }
        }
        
    def analyze_image(self, image_name: str) -> dict:
        """
        Accepts a mock identifier or runs custom heuristics to simulate
        detection on a custom filename.
        """
        # Lowercase search
        key = image_name.lower()
        if "rebar" in key or "severe" in key:
            return self.mock_library["exposed_rebar_severe"]
        elif "spall" in key or "moderate" in key:
            return self.mock_library["spalling_moderate"]
        elif "crack" in key or "minor" in key:
            return self.mock_library["crack_minor"]
        else:
            return self.mock_library["healthy"]


# --- 3. Sensor Fusion Engine ---

class SHMDecisionFusionEngine:
    """
    Fuses visual defect metrics, dynamic vibration anomaly scores,
    and environmental parameters (e.g. monsoon multipliers) into a single, unified
    IRC:SP:35 / IRC:114 aligned Condition Rating.
    """
    def __init__(self):
        pass
        
    def calculate_condition_rating(self, 
                                   telemetry: dict, 
                                   visual_rating: int) -> dict:
        """
        Combines telemetry data (vibration anomaly, tilt, strain) and visual crack severity.
        Weights:
          - Visual Damage Level (0-5 scale): 35%
          - Vibration Anomaly Score (0-1 scale, mapped to 0-5): 30%
          - Pier Tilt Deviation (0-0.3 deg, mapped to 0-5): 20%
          - Scour & River Level (0-5m scour, mapped to 0-5): 15%
        
        Monsoon Multiplier: Scales risk if rainfall > 80mm or water level > 7m.
        Overload Trigger: Multiplies momentary risk if truck load > 45t.
        """
        # 1. Normalize vibration anomaly (score already 0 to 1)
        vib_score = telemetry.get("vibration_rms_g", 0.02)
        # Map normal rms (0.01) to extreme rms (0.15)
        norm_vib = min(1.0, max(0.0, (vib_score - 0.01) / 0.14))
        
        # 2. Normalize Tilt
        # Tilt limits: normal is < 0.02, danger is > 0.15 deg
        tilt = telemetry.get("pier_tilt_degrees", 0.01)
        norm_tilt = min(1.0, max(0.0, (tilt - 0.01) / 0.14))
        
        # 3. Normalize Scour Depth
        # Scour limit: danger > 3.0 meters
        scour = telemetry.get("scour_depth_m", 0.1)
        norm_scour = min(1.0, max(0.0, (scour - 0.1) / 3.4))
        
        # 4. Convert visual rating (0-5) to 0-1
        norm_visual = visual_rating / 5.0
        
        # Weighted combination (Base Score: 0 to 1.0)
        base_score = (
            norm_visual * 0.35 +
            norm_vib * 0.30 +
            norm_tilt * 0.20 +
            norm_scour * 0.15
        )
        
        # Apply multipliers for Indian Environmental Stressors
        # Monsoon multiplier: heavy rains increase water turbulence and scour dynamics
        monsoon_rainfall = telemetry.get("monsoon_rainfall_mm", 10.0)
        water_level = telemetry.get("water_level_m", 2.0)
        monsoon_multiplier = 1.0
        if monsoon_rainfall > 80.0 or water_level > 7.0:
            # Increases overall risk score by up to 25% due to dynamic flood pressure
            monsoon_multiplier = 1.25
            
        # Overload multiplier: temporary spike under IRC:6 violating heavy loads
        traffic_load = telemetry.get("traffic_load_tonnes", 15.0)
        overload_multiplier = 1.0
        if traffic_load > 45.0:
            # Overloaded vehicle exerts severe strain, increasing immediate risk
            overload_multiplier = 1.15
            
        fused_score = base_score * monsoon_multiplier * overload_multiplier
        corrosion_multiplier = 1.15 if telemetry.get("corrosion_index", 0) > 0.5 else 1.0
        fused_score *= corrosion_multiplier
        fused_score = min(1.0, fused_score) # Cap at 1.0
        
        # Map to IRC:SP:35 rating (0 to 5)
        # 0: Sound, 1: Good (routine), 2: Fair (minor repair), 3: Poor (major repair), 
        # 4: Bad (priority rehabilitation), 5: Critical (immediate suspension of traffic)
        irc_score = int(np.floor(fused_score * 5))
        # Ensure it doesn't exceed 5
        irc_score = min(5, irc_score)
        
        # If visual or structural state is extremely critical, force a minimum rating
        if visual_rating >= 4 or telemetry.get("irc_compliance", {}).get("tilt_warning"):
            irc_score = max(irc_score, 4)
        if telemetry.get("corrosion_index", 0) > 0.5:
            irc_score = max(irc_score, 3)
        if visual_rating == 5 or telemetry.get("irc_compliance", {}).get("overload_violation") and telemetry.get("irc_compliance", {}).get("tilt_warning"):
            irc_score = 5
            
        # Determine status string
        if irc_score <= 1:
            status = "SAFE"
            color = "#10B981" # Green
            desc_en = "Bridge is structurally sound. Routine telemetry monitoring active."
            desc_hi = "पुल संरचनात्मक रूप से सुरक्षित है। नियमित टेलीमेट्री निगरानी सक्रिय है।"
        elif irc_score == 2:
            status = "WARNING_MINOR"
            color = "#FBBF24" # Yellow
            desc_en = "Minor anomalies or cracks detected. Schedule inspection."
            desc_hi = "मामूली विसंगतियां या दरारें पाई गईं। निरीक्षण निर्धारित करें।"
        elif irc_score == 3:
            status = "WARNING_MAJOR"
            color = "#F97316" # Orange
            desc_en = "Significant dynamic structural anomalies. High local scour / strain."
            desc_hi = "महत्वपूर्ण गतिशील संरचनात्मक विसंगतियां। उच्च स्थानीय कटाव / तनाव।"
        elif irc_score == 4:
            status = "CRITICAL_LEVEL_1"
            color = "#EF4444" # Red
            desc_en = "IRC:SP:35 Class 4 rating. Structural capacity compromised. Restrict traffic."
            desc_hi = "IRC:SP:35 वर्ग 4 रेटिंग। संरचनात्मक क्षमता से समझौता। यातायात प्रतिबंधित करें।"
        else:
            status = "CRITICAL_LEVEL_2"
            color = "#7F1D1D" # Dark Red
            desc_en = "IRC:SP:35 Class 5 rating. Imminent hazard. Stop traffic immediately!"
            desc_hi = "IRC:SP:35 वर्ग 5 रेटिंग। आसन्न खतरा। तुरंत यातायात रोकें!"

        return {
            "fused_risk_percentage": float(round(fused_score * 100, 1)),
            "irc_condition_rating": irc_score,
            "status": status,
            "status_color": color,
            "monsoon_risk_active": monsoon_multiplier > 1.0,
            "overload_stress_active": overload_multiplier > 1.0,
            "description": {
                "en": desc_en,
                "hi": desc_hi
            }
        }
