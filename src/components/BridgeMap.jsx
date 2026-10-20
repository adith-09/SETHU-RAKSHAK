import React, { useEffect, useRef } from "react";

export default function BridgeMap({ simState, telemetry }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    // Check if Leaflet L is loaded globally from index.html CDN
    const L = window.L;
    if (!L || !mapContainerRef.current) return;

    // Initialize Map instance if it doesn't exist
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([25.4290, 81.8600], 12); // Centered on Prayagraj bridges area

      // Standard OSM Tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
      
      // Define custom icon generators
      const getColoredDotIcon = (color, pulse = false) => {
        return L.divIcon({
          className: "custom-map-icon",
          html: `<div class="relative flex items-center justify-center">
            ${pulse ? `<span class="animate-ping absolute inline-flex h-5 w-5 rounded-full opacity-60" style="background-color: ${color};"></span>` : ""}
            <span class="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-slate-900" style="background-color: ${color};"></span>
          </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
      };

      // Add regional markers
      // 1. New Naini Bridge (Our Dynamic SHM Anchor)
      const nainiMarker = L.marker([25.4243, 81.8562], {
        icon: getColoredDotIcon("#10b981", true)
      }).addTo(map);
      nainiMarker.bindPopup(`
        <div style="font-family: sans-serif; color: #1e293b; padding: 4px;">
          <h4 style="margin: 0 0 4px 0; color: #0f172a; font-weight: 700;">NEW NAINI BRIDGE (NH-30)</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">Prayagraj, Uttar Pradesh</p>
          <div style="background: #f1f5f9; padding: 6px; border-radius: 4px; font-size: 11px;">
            <strong>Structure:</strong> Cable-Stayed Deck<br/>
            <strong>Built Year:</strong> 2004<br/>
            <strong>Live Health Status:</strong> <span id="popup-status" style="font-weight: bold; color: #10b981;">SAFE</span>
          </div>
        </div>
      `);
      markersRef.current.naini = nainiMarker;

      // 2. Shastri Bridge (Varanasi Connect, NH-2)
      const shastriMarker = L.marker([25.4526, 81.8845], {
        icon: getColoredDotIcon("#10b981")
      }).addTo(map);
      shastriMarker.bindPopup(`
        <div style="font-family: sans-serif; color: #1e293b; padding: 4px;">
          <h4 style="margin: 0 0 4px 0; color: #0f172a;">SHASTRI BRIDGE (NH-2)</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">OSM Telemetry Active</p>
          <div style="background: #f1f5f9; padding: 6px; border-radius: 4px; font-size: 11px;">
            <strong>Type:</strong> Continuous Concrete Box Girder<br/>
            <strong>Rating:</strong> Class 1 (Priscilla Condition)
          </div>
        </div>
      `);

      // 3. Old Naini Bridge (Double-Deck Steel Truss, Built 1865)
      const oldNainiMarker = L.marker([25.4285, 81.8596], {
        icon: getColoredDotIcon("#f59e0b") // Yellow maintenance caution
      }).addTo(map);
      oldNainiMarker.bindPopup(`
        <div style="font-family: sans-serif; color: #1e293b; padding: 4px;">
          <h4 style="margin: 0 0 4px 0; color: #0f172a;">OLD NAINI BRIDGE (Rail-Road)</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">Truss corrosion check recommended</p>
          <div style="background: #f1f5f9; padding: 6px; border-radius: 4px; font-size: 11px;">
            <strong>Age:</strong> 161 years old (Steel Truss)<br/>
            <strong>Status:</strong> Class 3 (Moderate Oxidation distress)
          </div>
        </div>
      `);
      
      // 4. Phaphamau Bridge (NH-96, Ganges River north)
      const phaphamauMarker = L.marker([25.5036, 81.8601], {
        icon: getColoredDotIcon("#10b981")
      }).addTo(map);
      phaphamauMarker.bindPopup(`
        <div style="font-family: sans-serif; color: #1e293b; padding: 4px;">
          <h4 style="margin: 0 0 4px 0; color: #0f172a;">PHAPHAMAU BRIDGE</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">Substructure status</p>
          <div style="background: #f1f5f9; padding: 6px; border-radius: 4px; font-size: 11px;">
            <strong>Type:</strong> Balanced Cantilever concrete deck<br/>
            <strong>Status:</strong> Class 1 (Safe)
          </div>
        </div>
      `);
    }

    // Update markers based on current live state parameters
    if (mapInstanceRef.current && markersRef.current.naini) {
      const L = window.L;
      const cur = telemetry?.current;
      
      let statusColor = "#10b981"; // safe green
      let statusText = "SAFE (Class 0/1)";
      
      if (simState === "OVERLOAD") {
        statusColor = "#f59e0b"; // yellow
        statusText = "LOAD WARNING (Class 2)";
      } else if (simState === "MONSOON_SCOUR") {
        statusColor = "#f97316"; // orange
        statusText = "MONSOON SCOUR (Class 3)";
      } else if (simState === "COMBINED_FAILURE") {
        statusColor = "#ef4444"; // red
        statusText = "CRITICAL FAIL (Class 5)";
      }

      // Re-create icons dynamically
      const activeIcon = L.divIcon({
        className: "custom-map-icon",
        html: `<div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full opacity-70" style="background-color: ${statusColor};"></span>
          <span class="relative inline-flex rounded-full h-4.5 w-4.5 border-2 border-slate-900" style="background-color: ${statusColor};"></span>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      markersRef.current.naini.setIcon(activeIcon);
      
      // Update popups dynamically
      const vibrationValue = cur ? `${cur.vibration_rms_g} g (RMS)` : "N/A";
      const strainValue = cur ? `${cur.deck_strain_microstrain} με` : "N/A";
      const waterValue = cur ? `${cur.water_level_m} m` : "N/A";
      const scourValue = cur ? `${cur.scour_depth_m} m` : "N/A";

      markersRef.current.naini.setPopupContent(`
        <div style="font-family: sans-serif; color: #1e293b; padding: 4px; width: 200px;">
          <h4 style="margin: 0 0 2px 0; color: #0f172a; font-weight: 700; font-size: 13px;">NEW NAINI BRIDGE (NH-30)</h4>
          <p style="margin: 0 0 6px 0; font-size: 10px; color: #64748b;">Prayagraj, Uttar Pradesh</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px; border-radius: 4px; font-size: 11px; line-height: 1.4;">
            <strong>Vibration RMS:</strong> ${vibrationValue}<br/>
            <strong>Deck Strain:</strong> ${strainValue}<br/>
            <strong>Water Level:</strong> ${waterValue}<br/>
            <strong>Scour Depth:</strong> ${scourValue}<br/>
            <hr style="margin: 4px 0; border: none; border-top: 1px solid #e2e8f0;"/>
            <strong>Decision State:</strong> <span style="font-weight: bold; color: ${statusColor};">${statusText}</span>
          </div>
        </div>
      `);
      // Leaflet needs an explicit size refresh when the operator switches from 3D view.
      const resizeTimer = window.setTimeout(() => mapInstanceRef.current?.invalidateSize(), 0);
      return () => window.clearTimeout(resizeTimer);
    }

  }, [simState, telemetry]);

  return (
    <div className="w-full h-full relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl min-h-[420px]">
      
      {/* Map Element */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full min-h-[420px]"
        style={{ 
          filter: "invert(92%) hue-rotate(185deg) brightness(88%) contrast(90%)" // Beautiful futuristic radar inversion!
        }} 
      />
      
      {/* Geographical tag overlay */}
      <div className="absolute top-3 left-3 pointer-events-none bg-slate-900/95 border border-slate-800 text-[10px] text-teal-400 font-mono py-1 px-3 rounded shadow-md z-[1000] flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
        <span>REGIONAL NHAI INFRASTRUCTURE MAP (PRAYAGRAJ CORRIDOR)</span>
      </div>

      <div className="absolute bottom-3 right-3 pointer-events-none bg-slate-900/90 text-[10px] text-slate-400 font-mono py-1.5 px-3 rounded z-[1000] border border-slate-800/80">
        📌 Click bridge markers to display sensor data
      </div>
    </div>
  );
}
