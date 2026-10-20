import React, { useRef, useEffect } from "react";
import * as THREE from "three";

// =============================================================================
// Helper: Build a stay cable between two world-space points
// =============================================================================
function makeCable(scene, p1, p2, mat, cables) {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  const geom = new THREE.CylinderGeometry(0.055, 0.055, len, 5);
  const mesh = new THREE.Mesh(geom, mat.clone());
  mesh.position.copy(mid);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  scene.add(mesh);
  cables.push(mesh);
}

export default function Bridge3D({
  waterLevel,
  scourDepth,
  simState,
  vibrationRMS,
  selectedSensor,
  onSelectSensor
}) {
  const containerRef = useRef(null);
  const stateRef = useRef({ waterLevel, scourDepth, simState, vibrationRMS, selectedSensor });
  useEffect(() => {
    stateRef.current = { waterLevel, scourDepth, simState, vibrationRMS, selectedSensor };
  }, [waterLevel, scourDepth, simState, vibrationRMS, selectedSensor]);

  useEffect(() => {
    if (!containerRef.current) return;

    // ─── Scene ────────────────────────────────────────────────────────────────
    const W = containerRef.current.clientWidth  || 800;
    const H = containerRef.current.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1220);
    scene.fog = new THREE.FogExp2(0x0a1220, 0.012);

    // ─── Camera ───────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(48, W / H, 0.1, 200);
    camera.position.set(23, 15, 35);
    camera.lookAt(0, 1.5, 0);

    // ─── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // ─── Lights ───────────────────────────────────────────────────────────────
    scene.add(new THREE.HemisphereLight(0x9fc5ff, 0x101827, 1.4));
    scene.add(new THREE.AmbientLight(0xc8d5f0, 0.6));

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(15, 30, 20);
    sun.castShadow = true;
    scene.add(sun);

    // warm gold fill from front-left
    const fillL = new THREE.PointLight(0xf59e0b, 4, 40);
    fillL.position.set(-14, 12, 8);
    scene.add(fillL);

    // cool blue-teal backlight
    const fillR = new THREE.PointLight(0x06b6d4, 2.5, 40);
    fillR.position.set(14, 8, -8);
    scene.add(fillR);

    // pylon crown lights
    const crownL = new THREE.PointLight(0xfbbf24, 2.0, 16);
    crownL.position.set(-9, 14, 0);
    scene.add(crownL);

    const crownR = new THREE.PointLight(0xfbbf24, 2.0, 16);
    crownR.position.set(9, 14, 0);
    scene.add(crownR);

    // ─── Scene Grid (ground plane) ────────────────────────────────────────────
    const grid = new THREE.GridHelper(100, 60, 0x101520, 0x0c1018);
    grid.position.y = -7;
    scene.add(grid);

    // River banks give the twin scale and make changes in water level easier to read.
    const bankMat = new THREE.MeshStandardMaterial({ color: 0x121a1d, roughness: 0.95, metalness: 0.05 });
    [-1, 1].forEach((side) => {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(52, 2, 5), bankMat);
      bank.position.set(0, -5.8, side * 12.5);
      bank.receiveShadow = true;
      scene.add(bank);
    });

    // ─── Materials ────────────────────────────────────────────────────────────
    const matConcrete = new THREE.MeshStandardMaterial({ color: 0x4b5a70, roughness: 0.72, metalness: 0.18 });
    const matDeckTop  = new THREE.MeshStandardMaterial({ color: 0x303d52, roughness: 0.62, metalness: 0.28 });
    const matSteel    = new THREE.MeshStandardMaterial({ color: 0x516174, roughness: 0.35, metalness: 0.72 });
    const matBarrier  = new THREE.MeshStandardMaterial({ color: 0x53647a, roughness: 0.55, metalness: 0.45 });
    const matCable    = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.3, roughness: 0.2 });
    const matFoundation = new THREE.MeshStandardMaterial({ color: 0x26374b, roughness: 0.88, metalness: 0.12 });

    // ─── Deck ─────────────────────────────────────────────────────────────────
    const DECK_L   = 38;  // total deck length along X
    const DECK_W   = 3.8; // deck width along Z
    const PYLON_X  = 8.5; // pylon position ±X
    const DECK_Y   = 0;   // deck sits at Y=0

    const deckGeom = new THREE.BoxGeometry(DECK_L, 0.65, DECK_W);
    const deckMesh = new THREE.Mesh(deckGeom, matDeckTop);
    deckMesh.castShadow = true;
    deckMesh.receiveShadow = true;
    scene.add(deckMesh);

    // Dashed road centre line makes deck orientation instantly readable.
    const roadMarkMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    for (let x = -17; x <= 17; x += 3) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.025, 0.13), roadMarkMat);
      mark.position.set(x, 0.34, 0);
      scene.add(mark);
    }

    // side crash barriers
    const bGeom = new THREE.BoxGeometry(DECK_L, 0.35, 0.22);
    [-1, 1].forEach((s) => {
      const b = new THREE.Mesh(bGeom, matBarrier);
      b.position.set(0, 0.35, s * (DECK_W / 2 - 0.09));
      scene.add(b);
    });

    // Navigation beacons along the deck improve depth perception in the night-control-room view.
    const beaconMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 1.5 });
    for (let x = -16; x <= 16; x += 4) {
      [-1, 1].forEach((side) => {
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), beaconMat);
        beacon.position.set(x, 0.62, side * 1.72);
        scene.add(beacon);
      });
    }

    // ─── H-Frame Pylons ───────────────────────────────────────────────────────
    const PYLON_H     = 13;  // height above deck
    const LEG_SEP_Z   = 1.6; // half-gap between legs on Z axis
    const CROSS_Y     = 2.5; // crossbeam height above deck

    const pylons = []; // {group, towerX, legL, legR}

    [-PYLON_X, PYLON_X].forEach((tx) => {
      const grp = new THREE.Group();
      grp.position.set(tx, 0, 0);
      scene.add(grp);

      // left leg (−Z)
      const legLGeom = new THREE.BoxGeometry(0.65, PYLON_H + 4, 0.65);
      const legL = new THREE.Mesh(legLGeom, matConcrete);
      legL.position.set(0, PYLON_H / 2 - 2, -LEG_SEP_Z);
      legL.castShadow = true;
      grp.add(legL);

      // right leg (+Z)
      const legR = new THREE.Mesh(legLGeom, matConcrete);
      legR.position.set(0, PYLON_H / 2 - 2, LEG_SEP_Z);
      legR.castShadow = true;
      grp.add(legR);

      // crossbeam connecting legs
      const cbGeom = new THREE.BoxGeometry(0.65, 0.55, LEG_SEP_Z * 2 + 0.65);
      const cb = new THREE.Mesh(cbGeom, matSteel);
      cb.position.set(0, CROSS_Y, 0);
      grp.add(cb);

      // pylon cap / head
      const capGeom = new THREE.BoxGeometry(0.9, 1.5, LEG_SEP_Z * 2 + 0.9);
      const cap = new THREE.Mesh(capGeom, matSteel);
      cap.position.set(0, PYLON_H - 0.75, 0);
      grp.add(cap);

      // foundation pier below deck/water
      const pierGeom = new THREE.BoxGeometry(2.4, 6.5, LEG_SEP_Z * 2 + 1.8);
      const pier = new THREE.Mesh(pierGeom, matFoundation);
      pier.position.set(0, -3.8, 0);
      grp.add(pier);

      pylons.push({ grp, towerX: tx });
    });

    // ─── Stay Cables ──────────────────────────────────────────────────────────
    // Cables run in the XY plane (side-view silhouette).
    // Front cable at z = +DECK_W/2 - 0.3
    // Back  cable at z = -(DECK_W/2 - 0.3)
    const cables = [];
    const CABLE_TOP_Y = PYLON_H - 1.5; // anchor height on pylon
    const CABLE_DECK_Y = 0.35;         // anchor height on deck

    // anchor offsets along deck from each pylon (negative = toward bridge end, positive = toward centre)
    const leftAnchors  = [-15, -12, -9.5, -7, -4.5, -2.5];  // left pylon fans these toward left end
    const rightAnchors = [ 15,  12,  9.5,  7,  4.5,  2.5];  // right pylon fans these toward right end

    [{ tx: -PYLON_X, anchors: leftAnchors }, { tx: PYLON_X, anchors: rightAnchors }].forEach(({ tx, anchors }) => {
      anchors.forEach((offset) => {
        const dx = tx + offset; // world-X of deck anchor (both sides fan out + inward)
        [-1, 1].forEach((zSide) => {
          const cz = zSide * (DECK_W / 2 - 0.3);
          const top  = new THREE.Vector3(tx, CABLE_TOP_Y, 0);
          const base = new THREE.Vector3(dx, CABLE_DECK_Y, cz);
          makeCable(scene, top, base, matCable, cables);
        });
      });
    });

    // ─── Water ────────────────────────────────────────────────────────────────
    const waterSegs = 40;
    const waterGeom = new THREE.PlaneGeometry(50, 20, waterSegs, waterSegs);
    waterGeom.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x07111e,
      transparent: true,
      opacity: 0.75,
      roughness: 0.06,
      metalness: 0.92
    });
    const waterMesh = new THREE.Mesh(waterGeom, waterMat);
    waterMesh.position.set(0, -4.8, 0);
    scene.add(waterMesh);
    const origWaterPos = waterGeom.attributes.position.clone();

    // ─── Vehicles ─────────────────────────────────────────────────────────────
    const vehicleGroup = new THREE.Group();
    scene.add(vehicleGroup);
    let taxiX   = -DECK_L / 2;
    let sedanX  =  DECK_L / 2;
    let prevHeavy = null;

    const buildVehicles = (heavy) => {
      while (vehicleGroup.children.length > 0) vehicleGroup.remove(vehicleGroup.children[0]);
      if (heavy) {
        const cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.85), new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.75 }));
        cab.position.set(0, DECK_Y + 0.8, -0.75);
        vehicleGroup.add(cab);
        const trailer = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.95, 1.0), new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.55 }));
        trailer.position.set(-2.1, DECK_Y + 0.82, -0.75);
        vehicleGroup.add(trailer);
        const load = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 2.6, 10), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 }));
        load.rotateZ(Math.PI / 2);
        load.position.set(-2.1, DECK_Y + 1.5, -0.75);
        vehicleGroup.add(load);
      } else {
        const taxi = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.5, 0.7), new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.6 }));
        taxi.position.set(0, DECK_Y + 0.42, 0.85);
        taxi.name = "taxi";
        vehicleGroup.add(taxi);
        const sedan = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.46, 0.65), new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.55 }));
        sedan.position.set(5, DECK_Y + 0.4, -0.85);
        sedan.name = "sedan";
        vehicleGroup.add(sedan);
      }
    };

    // ─── Sensor Spheres ───────────────────────────────────────────────────────
    const SENSORS = [
      { name: "vibration", pos: new THREE.Vector3(-PYLON_X,  -0.5, 1.8), label: "ACC P3" },
      { name: "strain",    pos: new THREE.Vector3( 0,         0.45,  0), label: "STR" },
      { name: "tilt",      pos: new THREE.Vector3(-PYLON_X,   5.0,  1.0), label: "TLT" },
      { name: "scour",     pos: new THREE.Vector3(-PYLON_X,  -5.0,  0), label: "SCR" },
      { name: "water",     pos: new THREE.Vector3( 4,         -2.5,  2.2), label: "WTR" },
    ];
    const sphereGeom = new THREE.SphereGeometry(0.4, 20, 20);

    const makeLabel = (text) => {
      const c = document.createElement("canvas");
      c.width = 128; c.height = 44;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "rgba(6,7,11,0.92)";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(3, 3, 122, 38, 5);
      } else {
        ctx.rect(3, 3, 122, 38);
      }
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(text, 64, 27);
      const tex = new THREE.CanvasTexture(c);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      sp.scale.set(2.4, 0.85, 1);
      return sp;
    };

    const sensorMeshes = [];
    const sensorLabels = [];
    SENSORS.forEach((s) => {
      const mat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.7, roughness: 0.1 });
      const mesh = new THREE.Mesh(sphereGeom, mat);
      mesh.position.copy(s.pos);
      mesh.userData.sensorName = s.name;
      scene.add(mesh);
      sensorMeshes.push(mesh);

      const lbl = makeLabel(s.label);
      lbl.position.set(s.pos.x, s.pos.y + 0.9, s.pos.z);
      scene.add(lbl);
      sensorLabels.push({ sp: lbl, mesh, base: s.pos.clone() });
    });

    // ─── Mouse / Drag Rotation ────────────────────────────────────────────────
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let rotY = 0.58;
    let rotX = 0.16;
    let curRotY = 0.58;
    let curRotX = 0.16;
    let cameraDistance = 42;

    const onDown = (e) => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; };
    const onMove = (e) => {
      if (!isDragging) return;
      rotY += (e.clientX - prevMouse.x) * 0.005;
      rotX = Math.max(-0.5, Math.min(0.6, rotX + (e.clientY - prevMouse.y) * 0.003));
      prevMouse = { x: e.clientX, y: e.clientY };
    };
    const onUp   = () => { isDragging = false; };
    const onDoubleClick = () => {
      rotY = 0.58;
      rotX = 0.16;
      cameraDistance = 42;
    };

    // Scroll zoom
    const onWheel = (e) => {
      e.preventDefault();
      cameraDistance = Math.max(28, Math.min(56, cameraDistance * (1 + e.deltaY * 0.001)));
    };

    // Raycast click for sensor selection
    const raycaster = new THREE.Raycaster();
    const mouse2d   = new THREE.Vector2();
    const onClick   = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse2d.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse2d.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse2d, camera);
      const hits = raycaster.intersectObjects(sensorMeshes);
      if (hits.length > 0) onSelectSensor(hits[0].object.userData.sensorName);
    };

    const cvs = renderer.domElement;
    cvs.addEventListener("mousedown", onDown);
    cvs.addEventListener("mousemove", onMove);
    cvs.addEventListener("click",     onClick);
    cvs.addEventListener("dblclick",  onDoubleClick);
    cvs.addEventListener("wheel",     onWheel, { passive: false });
    window.addEventListener("mouseup", onUp);

    // ─── Camera orbit pivot ───────────────────────────────────────────────────
    const camPivot = new THREE.Group();
    // We'll rotate pivot in animation instead of bridgeGroup to avoid geometry errors
    scene.add(camPivot);

    // ─── Animation Loop ───────────────────────────────────────────────────────
    let raf;
    const t0 = performance.now();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = (performance.now() - t0) * 0.001;
      const p = stateRef.current;
      const state    = p.simState     || "HEALTHY";
      const vib      = p.vibrationRMS !== undefined ? p.vibrationRMS : 0.02;
      const wl       = p.waterLevel   !== undefined ? p.waterLevel   : 3.0;
      const heavy    = state === "OVERLOAD" || state === "COMBINED_FAILURE";

      curRotY += (rotY - curRotY) * 0.07;
      curRotX += (rotX - curRotX) * 0.07;

      // A fixed padded framing keeps both pylons, the entire deck, and waterline visible.
      const dist = cameraDistance;
      camera.position.x = dist * Math.sin(curRotY) * Math.cos(curRotX);
      camera.position.y = dist * Math.sin(curRotX) + 6;
      camera.position.z = dist * Math.cos(curRotY) * Math.cos(curRotX);
      camera.lookAt(0, 1.5, 0);

      // ── Rebuild vehicles on state change ──────────────────────────────────
      if (heavy !== prevHeavy) { buildVehicles(heavy); prevHeavy = heavy; }

      // ── Move vehicles ─────────────────────────────────────────────────────
      if (heavy) {
        taxiX += 0.02;
        if (taxiX > DECK_L / 2 + 3) taxiX = -DECK_L / 2 - 3;
        vehicleGroup.position.x = taxiX;
      } else {
        taxiX += 0.045;
        if (taxiX > DECK_L / 2 + 3) taxiX = -DECK_L / 2 - 3;
        sedanX -= 0.05;
        if (sedanX < -DECK_L / 2 - 3) sedanX = DECK_L / 2 + 3;
        const tm = vehicleGroup.getObjectByName("taxi");
        const sm = vehicleGroup.getObjectByName("sedan");
        if (tm) tm.position.x = taxiX;
        if (sm) sm.position.x = sedanX;
        vehicleGroup.position.x = 0;
      }

      // ── Deck sag ──────────────────────────────────────────────────────────
      const ax = heavy ? vehicleGroup.position.x : taxiX;
      const sag = Math.abs(ax) < 8 ? (heavy ? -0.18 : -0.025) * ((8 - Math.abs(ax)) / 8) : 0;
      const jitter = (state === "COMBINED_FAILURE" || state === "OVERLOAD")
        ? Math.sin(t * 55) * vib * 2.5
        : 0;
      deckMesh.position.y = sag + jitter;

      // ── Pylon tilt (structural damage simulation) ─────────────────────────
      pylons.forEach(({ grp }, i) => {
        if (state === "COMBINED_FAILURE") {
          grp.rotation.z = (i === 0 ? -1 : 1) * (0.03 + Math.sin(t * 5) * 0.012);
        } else if (state === "MONSOON_SCOUR" && i === 0) {
          grp.rotation.z = -0.018;
        } else {
          grp.rotation.z = 0;
        }
      });

      // ── Cable glow ────────────────────────────────────────────────────────
      cables.forEach((c) => {
        let col = 0xf59e0b; let ei = 0.25;
        if (state === "COMBINED_FAILURE") { col = 0xef4444; ei = 0.25 + 0.65 * Math.abs(Math.sin(t * 7)); }
        else if (state === "OVERLOAD")    { col = 0xf97316; ei = 0.55; }
        else if (state === "MONSOON_SCOUR") { col = 0x06b6d4; ei = 0.35; }
        c.material.color.setHex(col);
        c.material.emissive.setHex(col);
        c.material.emissiveIntensity = ei;
      });

      // ── Sensor color / pulse ──────────────────────────────────────────────
      sensorLabels.forEach(({ sp, mesh, base }) => {
        const sn = mesh.userData.sensorName;
        let col = 0x10b981;
        if (p.selectedSensor === sn) col = 0x22d3ee;
        else if (state === "COMBINED_FAILURE") col = 0xef4444;
        else if (state === "MONSOON_SCOUR" && (sn === "scour" || sn === "water")) col = 0xf97316;
        else if (state === "OVERLOAD" && sn === "strain") col = 0xf59e0b;
        mesh.material.color.setHex(col);
        mesh.material.emissive.setHex(col);
        const spd = state === "COMBINED_FAILURE" ? 9 : 3;
        mesh.material.emissiveIntensity = 0.3 + 0.7 * Math.abs(Math.sin(t * spd));

        const vx = (sn === "vibration" || sn === "tilt")
          ? Math.sin(t * 22) * vib * 0.6 : 0;
        const vy = sn === "strain" ? deckMesh.position.y : 0;
        mesh.position.set(base.x + vx, base.y + vy, base.z);
        sp.position.set(base.x + vx, base.y + vy + 0.9, base.z);
      });

      // ── Water waves ───────────────────────────────────────────────────────
      const wh = (state === "MONSOON_SCOUR" || state === "COMBINED_FAILURE") ? 0.38 : 0.1;
      const ws = (state === "MONSOON_SCOUR" || state === "COMBINED_FAILURE") ? 6   : 2.5;
      const posAttr = waterGeom.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const u = origWaterPos.getX(i);
        const v = origWaterPos.getZ(i);
        posAttr.setY(i, origWaterPos.getY(i) + Math.sin(u * 0.3 + t * ws) * Math.cos(v * 0.3 + t * ws) * wh);
      }
      posAttr.needsUpdate = true;
      waterGeom.computeVertexNormals();

      const targetWY = -5.5 + ((wl - 1.5) / 8) * 3.0;
      waterMesh.position.y += (targetWY - waterMesh.position.y) * 0.05;
      waterMesh.material.color.setHex(
        (state === "MONSOON_SCOUR" || state === "COMBINED_FAILURE") ? 0x0c1828 : 0x060e18
      );
      waterMesh.material.opacity = (state === "MONSOON_SCOUR" || state === "COMBINED_FAILURE") ? 0.85 : 0.65;

      renderer.render(scene, camera);
    };

    animate();

    // ─── Resize ───────────────────────────────────────────────────────────────
    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth  || 800;
      const h = containerRef.current.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // ─── Cleanup ──────────────────────────────────────────────────────────────
    const container = containerRef.current;
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize",   onResize);
      window.removeEventListener("mouseup",  onUp);
      cvs.removeEventListener("mousedown",   onDown);
      cvs.removeEventListener("mousemove",   onMove);
      cvs.removeEventListener("click",       onClick);
      cvs.removeEventListener("dblclick",    onDoubleClick);
      cvs.removeEventListener("wheel",       onWheel);
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []); // eslint-disable-line

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      title="Drag to orbit • Scroll to zoom • Double-click to reset view • Click a sensor marker for details"
      style={{ cursor: "grab", minHeight: "100%", touchAction: "none" }}
    />
  );
}
