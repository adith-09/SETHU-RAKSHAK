import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, LoaderCircle } from "lucide-react";

/** Privacy-first local feed: camera access is only requested after operator action. */
export default function LiveInspectionCamera({ visionAnalysis }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("standby");
  const [message, setMessage] = useState("Camera is off — using the digital inspection feed.");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("standby");
    setMessage("Camera is off — using the digital inspection feed.");
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error"); setMessage("This browser does not support live camera access."); return;
    }
    setStatus("connecting"); setMessage("Requesting operator camera access…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus("live"); setMessage("Live local stream. Demo AI overlays follow the active scenario.");
    } catch (error) {
      setStatus("error");
      setMessage(error.name === "NotAllowedError" ? "Camera permission was denied." : "Unable to start the selected camera.");
    }
  };

  useEffect(() => stopCamera, []);
  const isLive = status === "live";

  return <div className="inspection-camera">
    <video ref={videoRef} className={`inspection-camera-video ${isLive ? "is-live" : ""}`} muted playsInline />
    {!isLive && <div className="inspection-camera-placeholder"><Camera size={28} /><span>Digital inspection standby</span></div>}
    {isLive && visionAnalysis.detections.map((det, index) => <div className="inspection-detection" key={`${det.label}-${index}`} style={{ left: `${(det.bbox[0] / 400) * 100}%`, top: `${(det.bbox[1] / 250) * 100}%`, width: `${(det.bbox[2] / 400) * 100}%`, height: `${(det.bbox[3] / 250) * 100}%` }}><span>{det.label} · {(det.confidence * 100).toFixed(0)}%</span></div>)}
    <div className="inspection-camera-toolbar">
      <span className={`camera-state ${isLive ? "live" : status === "error" ? "error" : ""}`}>{status === "connecting" && <LoaderCircle size={11} className="animate-spin" />}{isLive ? "LIVE LOCAL" : status === "error" ? "CAMERA ERROR" : "SIMULATED"}</span>
      <button type="button" onClick={isLive ? stopCamera : startCamera} className="control-btn text-[7px] py-1 px-2">{isLive ? <><CameraOff size={11} /> Stop camera</> : <><Camera size={11} /> Enable camera</>}</button>
    </div>
    <p className="inspection-camera-message">{message}</p>
  </div>;
}
