import numpy as np
import time

class BridgeTelemetryGenerator:
    """
    Generates synthetic multi-sensor telemetry for Naini Bridge (Prayagraj).
    Simulates six modes:
      1. HEALTHY: Baseline traffic, safe parameters.
      2. OVERLOAD: Spikes in vibration and deck strain (exceeds IRC:6).
      3. MONSOON_SCOUR: Rising river levels, pier scour depth, natural frequency drop.
      4. COMBINED_FAILURE: Escalating structural decay, high cracks, extreme alerts.
      5. WIND_GUST: High cross-wind and aerodynamic deck response.
      6. CORROSION_ALERT: Accelerated reinforcement-corrosion monitoring condition.
    """
    def __init__(self):
        self.state = "HEALTHY"
        self.monsoon_rainfall = 10.0 # mm/day
        self.scour_depth = 0.2        # meters
        self.water_level = 2.4        # meters
        self.corrosion_index = 0.05   # 0 to 1 scale
        self.ambient_temp = 32.0      # Celsius
        self.base_frequency = 4.5     # Hz (healthy fundamental frequency)
        self.sampling_rate = 50       # Hz
        
    def set_state(self, state: str):
        valid_states = ["HEALTHY", "OVERLOAD", "MONSOON_SCOUR", "WIND_GUST", "CORROSION_ALERT", "COMBINED_FAILURE"]
        if state in valid_states:
            self.state = state
            
    def set_monsoon_rainfall(self, val: float):
        self.monsoon_rainfall = val
        
    def generate_vibration_signal(self, duration_sec=2.0) -> np.ndarray:
        """
        Generates 2 seconds of accelerometer data (sampled at 50Hz).
        Modifies frequency and amplitude depending on structural health state.
        """
        n_samples = int(duration_sec * self.sampling_rate)
        t = np.linspace(0, duration_sec, n_samples)
        
        # Base healthy parameters
        freq1, freq2 = self.base_frequency, 12.0
        amp1, amp2 = 0.02, 0.005
        noise_level = 0.005
        damping = 0.02
        
        if self.state == "HEALTHY":
            # Normal traffic crossings (occasional small bursts)
            traffic_burst = np.sin(2 * np.pi * 0.5 * t) * np.exp(-damping * t) * 0.03
            signal = amp1 * np.sin(2 * np.pi * freq1 * t) + amp2 * np.sin(2 * np.pi * freq2 * t) + traffic_burst
            
        elif self.state == "OVERLOAD":
            # Extreme load vehicle passage (large impact force and high dynamic amplitude)
            # Spikes vibration amplitude up to 0.3g (IRC:6 limits exceeded)
            freq_impact = 3.8
            impact = np.sin(2 * np.pi * freq_impact * t) * np.exp(-1.5 * t) * 0.35
            signal = amp1 * np.sin(2 * np.pi * freq1 * t) + impact
            noise_level = 0.015
            
        elif self.state == "MONSOON_SCOUR":
            # Pier scour causes loss of lateral soil stiffness, reducing natural frequency
            shifted_freq = self.base_frequency * 0.72  # 4.5Hz -> 3.24Hz (severe scour indicator)
            water_flow_buffeting = np.random.normal(0, 0.02, n_samples) # turbulence noise
            signal = 0.04 * np.sin(2 * np.pi * shifted_freq * t) + water_flow_buffeting

        elif self.state == "WIND_GUST":
            gust = np.sin(2 * np.pi * 0.8 * t) * np.random.normal(0.09, 0.015, n_samples)
            signal = 0.035 * np.sin(2 * np.pi * 4.35 * t) + gust
            noise_level = 0.012

        elif self.state == "CORROSION_ALERT":
            signal = 0.03 * np.sin(2 * np.pi * 4.38 * t) + np.random.normal(0, 0.009, n_samples)
            noise_level = 0.008
            
        elif self.state == "COMBINED_FAILURE":
            # Severely degraded state: lower frequency, higher noise, large damping decay
            shifted_freq = self.base_frequency * 0.65  # 2.92Hz
            signal = 0.06 * np.sin(2 * np.pi * shifted_freq * t) + np.random.normal(0, 0.03, n_samples)
            
        # Add random sensor noise
        signal += np.random.normal(0, noise_level, n_samples)
        return signal

    def get_telemetry_snapshot(self) -> dict:
        """
        Returns a single frame of scalar metrics representing environmental,
        mechanical, and structural features.
        """
        # Dynamic drift based on state
        if self.state == "HEALTHY":
            self.water_level = max(1.5, min(3.5, self.water_level + np.random.normal(0, 0.05)))
            self.scour_depth = max(0.1, min(0.5, self.scour_depth + np.random.normal(0, 0.01)))
            self.monsoon_rainfall = max(0.0, min(15.0, self.monsoon_rainfall + np.random.normal(0, 1.0)))
            self.corrosion_index = 0.05
            traffic_load = np.random.choice([8.5, 12.0, 15.6, 24.2, 5.0]) # metric tonnes
            strain = 80.0 + traffic_load * 2.5 + np.random.normal(0, 2.0) # microstrain
            tilt = 0.01 + np.random.normal(0, 0.002) # degrees
            wind_speed = 12.0 + np.random.normal(0, 2.0)
            
        elif self.state == "OVERLOAD":
            self.water_level = max(1.5, min(3.5, self.water_level + np.random.normal(0, 0.05)))
            self.scour_depth = max(0.1, min(0.5, self.scour_depth + np.random.normal(0, 0.01)))
            self.monsoon_rainfall = max(0.0, min(15.0, self.monsoon_rainfall + np.random.normal(0, 1.0)))
            traffic_load = 68.4 + np.random.normal(0, 1.0) # 68-ton heavy trailer (exceeds IRC Class AA/70R limits)
            strain = 350.0 + np.random.normal(0, 10.0)    # severe tension strain
            tilt = 0.08 + np.random.normal(0, 0.005)      # higher tilt angle
            self.corrosion_index = 0.05
            wind_speed = 15.0 + np.random.normal(0, 3.0)
            
        elif self.state == "MONSOON_SCOUR":
            # Severe flooding conditions
            self.water_level = max(7.0, min(9.5, self.water_level + np.random.normal(0.1, 0.05)))
            self.scour_depth = max(2.5, min(4.2, self.scour_depth + np.random.normal(0.05, 0.02)))
            self.monsoon_rainfall = max(80.0, min(150.0, self.monsoon_rainfall + np.random.normal(5.0, 2.0)))
            traffic_load = np.random.choice([10.0, 18.0, 22.0]) # normal/slow traffic in rain
            strain = 100.0 + traffic_load * 2.5 + np.random.normal(0, 3.0)
            tilt = 0.14 + np.random.normal(0, 0.008) # pier tilting slightly under river thrust
            self.corrosion_index = 0.08
            wind_speed = 35.0 + np.random.normal(0, 6.0)

        elif self.state == "WIND_GUST":
            self.water_level = max(2.0, min(4.0, self.water_level + np.random.normal(0, 0.04)))
            self.scour_depth = max(0.2, min(0.8, self.scour_depth + np.random.normal(0, 0.02)))
            self.monsoon_rainfall = max(5.0, min(35.0, self.monsoon_rainfall + np.random.normal(0, 2.0)))
            traffic_load = np.random.choice([8.0, 15.0, 20.0])
            strain = 130.0 + np.random.normal(0, 8.0)
            tilt = 0.07 + np.random.normal(0, 0.01)
            self.corrosion_index = 0.06
            wind_speed = 72.0 + np.random.normal(0, 5.0)

        elif self.state == "CORROSION_ALERT":
            self.water_level = max(2.0, min(4.0, self.water_level + np.random.normal(0, 0.03)))
            self.scour_depth = max(0.2, min(0.9, self.scour_depth + np.random.normal(0, 0.01)))
            self.monsoon_rainfall = max(20.0, min(70.0, self.monsoon_rainfall + np.random.normal(0, 2.0)))
            traffic_load = np.random.choice([10.0, 16.0, 22.0])
            strain = 125.0 + np.random.normal(0, 5.0)
            tilt = 0.03 + np.random.normal(0, 0.004)
            self.corrosion_index = 0.65
            wind_speed = 18.0 + np.random.normal(0, 3.0)
            
        elif self.state == "COMBINED_FAILURE":
            # Combined extreme storm scour + corrosion + heavy trailer crossing
            self.water_level = 8.8 + np.random.normal(0, 0.05)
            self.scour_depth = 4.1 + np.random.normal(0, 0.02)
            self.monsoon_rainfall = 120.0 + np.random.normal(0, 1.0)
            traffic_load = 55.0 + np.random.normal(0, 1.0) # Overloaded vehicle on damaged structure
            strain = 420.0 + np.random.normal(0, 15.0)     # Critical limit
            tilt = 0.28 + np.random.normal(0, 0.01)        # Severe pier tilt (danger of collapse)
            self.corrosion_index = 0.35                    # High corrosion loss
            wind_speed = 85.0 + np.random.normal(0, 8.0)
            
        # Standard safety thresholds
        irc_load_limit = 40.0       # IRC standard max single vehicle load is ~40 tonnes
        max_tilt_allowable = 0.15   # 0.15 degrees
        danger_water_level = 8.0    # 8 meters danger mark
        
        vib_signal = self.generate_vibration_signal()
        vib_rms = np.sqrt(np.mean(vib_signal ** 2))
        vib_peak = np.max(np.abs(vib_signal))
        
        # Est. natural frequency from signal peak FFT (simulated)
        if self.state == "HEALTHY":
            est_frequency = 4.50 + np.random.normal(0, 0.02)
        elif self.state == "OVERLOAD":
            est_frequency = 4.45 + np.random.normal(0, 0.02)
        elif self.state == "MONSOON_SCOUR":
            est_frequency = 3.25 + np.random.normal(0, 0.03)
        elif self.state == "WIND_GUST":
            est_frequency = 4.35 + np.random.normal(0, 0.04)
        elif self.state == "CORROSION_ALERT":
            est_frequency = 4.38 + np.random.normal(0, 0.03)
        else:
            est_frequency = 2.92 + np.random.normal(0, 0.05)

        return {
            "timestamp": time.time(),
            "state": self.state,
            "monsoon_rainfall_mm": float(round(self.monsoon_rainfall, 2)),
            "water_level_m": float(round(self.water_level, 2)),
            "scour_depth_m": float(round(self.scour_depth, 2)),
            "traffic_load_tonnes": float(round(traffic_load, 2)),
            "deck_strain_microstrain": float(round(strain, 2)),
            "pier_tilt_degrees": float(round(tilt, 4)),
            "ambient_temp_c": float(round(self.ambient_temp + np.random.normal(0, 0.1), 1)),
            "wind_speed_kph": float(round(wind_speed, 1)),
            "corrosion_index": float(round(self.corrosion_index, 2)),
            "vibration_rms_g": float(round(vib_rms, 4)),
            "vibration_peak_g": float(round(vib_peak, 4)),
            "natural_frequency_hz": float(round(est_frequency, 2)),
            "vibration_raw": vib_signal.tolist(),
            "irc_compliance": {
                "overload_violation": bool(traffic_load > irc_load_limit),
                "tilt_warning": bool(tilt > max_tilt_allowable),
                "monsoon_danger_water": bool(self.water_level > danger_water_level)
            }
        }
