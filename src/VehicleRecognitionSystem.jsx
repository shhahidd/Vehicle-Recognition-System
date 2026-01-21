import { motion, AnimatePresence } from "framer-motion";
import Tesseract from "tesseract.js";
import React, { useState, useEffect } from "react";
import {
  Upload,
  Scan,
  Car,
  Palette,
  FileText,
  MapPin,
  Activity,
  Shield,
  Menu,
  X,
  Eye,
  EyeOff,
  ChevronDown
} from "lucide-react";
import { Boxes } from "./ui/background-boxes";
import { EvervaultCard, Icon } from "./ui/evervault-card";
import { cn } from "./lib/utils";
import { fetchRTOData } from "./services/rtoService";
import { saveDetection } from "./services/detectionService";
import { checkAdminCredentials, fetchAllDetections } from "./services/adminService";



/* ---------------- WELCOME DIALOG COMPONENT ---------------- */
const WelcomeDialog = ({ name, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000); // Auto close after 3s
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed bottom-8 right-8 z-50 pointer-events-none"
    >
      <div className="glass border border-cyan-500/30 bg-slate-900/90 p-6 rounded-xl shadow-2xl shadow-cyan-500/10 flex items-center gap-4 min-w-[300px]">
        <div className="h-12 w-12 rounded-full bg-cyan-500/10 border border-cyan-500/50 flex items-center justify-center">
          <Shield className="text-cyan-400 w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-mono font-bold text-white tracking-wide">WELCOME BACK</h3>
          <p className="text-cyan-400 font-mono text-sm tracking-wider uppercase">&gt; {name}</p>
        </div>
      </div>
    </motion.div>
  );
};


const VehicleRecognitionSystem = () => {



  /* ---------------- BASIC STATE ---------------- */
  const [page, setPage] = useState("home");
  const [status, setStatus] = useState("Idle");

  /* ---------------- IMAGE STATE ---------------- */
  const [imageFile, setImageFile] = useState(null);
  const [imageURL, setImageURL] = useState(null);

  /* ---------------- OUTPUT STATE ---------------- */
  const [output, setOutput] = useState({
    vehicle: "--",
    color: "--",
    plate: "--",
    rto: "--"
  });

  /* ---------------- RTO DATA STATE ---------------- */
  const [rtoStates, setRtoStates] = useState({});
  const [rtoDistricts, setRtoDistricts] = useState({});

  useEffect(() => {
    const loadRTOData = async () => {
      const { rtoStates, rtoDistricts } = await fetchRTOData();
      setRtoStates(rtoStates || {});
      setRtoDistricts(rtoDistricts || {});
    };
    loadRTOData();
  }, []);

  /* ---------------- DEBUG STATE ---------------- */
  const [inferenceTime, setInferenceTime] = useState(null);
  /* ---------------- API CONFIG ---------------- */
  const ROBOFLOW_API_KEY = import.meta.env.VITE_ROBOFLOW_API_KEY;


  const MODEL_VEHICLE = "car_name-mshpx/2";
  const MODEL_COLOR = "color-u7k6u/2";
  const MODEL_CAR = "car-detect-mceyl/4";
  const MODEL_PLATE = "numplate-man88/2";

  /* ---------------- HELPER: PREPROCESS IMAGE ---------------- */
  const preprocessImage = (canvas) => {
    const width = canvas.width;
    const height = canvas.height;

    // 1. Upscale (3x) - Sufficient for OCR without adding too much noise
    const scaleFactor = 3;
    const scaledCanvas = document.createElement("canvas");
    scaledCanvas.width = width * scaleFactor;
    scaledCanvas.height = height * scaleFactor;
    const scaledCtx = scaledCanvas.getContext("2d");

    // Smooth scaling settings
    scaledCtx.imageSmoothingEnabled = true;
    scaledCtx.imageSmoothingQuality = "high";
    scaledCtx.drawImage(canvas, 0, 0, width, height, 0, 0, scaledCanvas.width, scaledCanvas.height);

    // 2. Grayscale & Contrast Stretching
    const imageData = scaledCtx.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height);
    const data = imageData.data;
    const grayData = new Uint8Array(data.length / 4);

    // Step A: Convert to Grayscale
    let minVal = 255;
    let maxVal = 0;

    for (let i = 0; i < data.length; i += 4) {
      // Standard luminance formula
      const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      const grayInt = Math.floor(gray);
      grayData[i / 4] = grayInt;

      if (grayInt < minVal) minVal = grayInt;
      if (grayInt > maxVal) maxVal = grayInt;
    }

    // Step B: Contrast Stretching (Normalization)
    // This ensures we use the full 0-255 dynamic range
    const range = maxVal - minVal;
    if (range > 0) {
      for (let i = 0; i < grayData.length; i++) {
        // Apply contrast stretching and update the image data directly
        const newVal = Math.floor(((grayData[i] - minVal) / range) * 255);
        const idx = i * 4;
        data[idx] = newVal;     // R
        data[idx + 1] = newVal; // G
        data[idx + 2] = newVal; // B
      }
    } else {
      // Fallback if range is 0 (solid color image)
      for (let i = 0; i < grayData.length; i++) {
        const val = grayData[i];
        const idx = i * 4;
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
      }
    }

    scaledCtx.putImageData(imageData, 0, 0);

    // 3. Add Padding (White Border) - Helps Tesseract
    const finalCanvas = document.createElement("canvas");
    const padding = 20;
    finalCanvas.width = scaledCanvas.width + (padding * 2);
    finalCanvas.height = scaledCanvas.height + (padding * 2);
    const finalCtx = finalCanvas.getContext("2d");

    finalCtx.fillStyle = "#FFFFFF";
    finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    finalCtx.drawImage(scaledCanvas, padding, padding);

    return finalCanvas.toDataURL("image/png");
  };

  /* ---------------- HELPER: CROP IMAGE ---------------- */
  const cropImage = (imageElement, box) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Use full bounding box from model without tightening
    const x = box.x - box.width / 2;
    const y = box.y - box.height / 2;
    const w = box.width;
    const h = box.height;

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(imageElement, x, y, w, h, 0, 0, w, h);
    return canvas;
  };

  /* ---------------- HELPER: FILE TO BASE64 ---------------- */
  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });


  const runRoboflow = async () => {
    if (!imageFile) {
      alert("Please upload an image first");
      return;
    }

    setInferenceTime(null);

    try {
      const startTime = performance.now();
      const imgElement = document.getElementById("preview-image");
      const fullBase64 = await toBase64(imageFile);
      const base64Body = fullBase64.split(',')[1];

      // Initial State
      setOutput({
        vehicle: "Analyzing...",
        color: "Analyzing...",
        plate: "Analyzing...",
        rto: "Analyzing..."
      });
      setStatus("Processing...");

      // Helper for API calls
      const fetchModel = async (model) => {
        const res = await fetch(`/api/roboflow/${model}?api_key=${ROBOFLOW_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: base64Body
        });
        if (!res.ok) throw new Error("Service unreachable");
        return res.json();
      };


      // Parallel Execution
      const vehiclePromise = (async () => {
        const t0 = performance.now();
        const data = await fetchModel(MODEL_VEHICLE);
        const t1 = performance.now();
        setInferenceTime(Math.round(t1 - t0));
        return data;
      })();

      const colorPromise = fetchModel(MODEL_COLOR);

      const platePromise = (async () => {
        try {
          let pData = await fetchModel(MODEL_PLATE);
          if (pData.predictions?.[0]) return pData.predictions[0];
          // Fallback
          let pData2 = await fetchModel(MODEL_CAR);
          return pData2.predictions?.[0];
        } catch {
          return null;
        }
      })();

      const [vData, cData, plateBox] = await Promise.all([vehiclePromise, colorPromise, platePromise]);

      // Process Results
      const vehicleClass = vData.predictions?.[0]?.class || "Unknown";

      const colorClass = cData.predictions?.[0]?.class || "Unknown";


      let finalPlate = "Not Found";
      let finalRto = "N/A";


      if (plateBox) {
        // Crop & Preprocess
        const cropCanvas = cropImage(imgElement, plateBox);
        const processedDataUrl = preprocessImage(cropCanvas);

        // OCR
        const { data: { text } } = await Tesseract.recognize(
          processedDataUrl,
          'eng',
          {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-', // Allow hyphens
            tessedit_pageseg_mode: '7',
          }
        );

        console.log("OCR Original Text:", text);

        let rawText = text.replace(/[^A-Z0-9]/g, "");
        console.log("OCR Cleaned Text:", rawText);

        const strictMatch = rawText.match(/([A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{3,4})/);

        let plateStr = null;
        if (strictMatch) {
          plateStr = strictMatch[0];
        } else if (rawText.length >= 4 && rawText.length <= 12) {
          // Fallback: Return what we have if it looks somewhat like a plate
          plateStr = rawText + "?";
        }

        finalPlate = plateStr || "Unclear";

        // RTO Logic
        const textToAnalyze = finalPlate !== "Unclear" ? finalPlate.replace("?", "") : rawText;
        if (textToAnalyze && textToAnalyze.length >= 2) {
          const stateCode = textToAnalyze.substring(0, 2);
          const districtCode = textToAnalyze.length >= 4 ? textToAnalyze.substring(0, 4) : null;
          const district = districtCode ? rtoDistricts[districtCode] : null;
          const state = rtoStates[stateCode];

          if (district && state) finalRto = `${district}, ${state}`;
          else if (state) finalRto = state;
          else finalRto = "Unknown Region";
        }
      }

      const finalOutput = {
        vehicle: vehicleClass,
        color: colorClass,
        plate: finalPlate,
        rto: finalRto
      };

      setOutput(finalOutput);
      const endTime = performance.now();
      setInferenceTime(Math.round(endTime - startTime));
      setStatus("Analysis Complete");

      // Save to DB
      if (finalOutput.plate && finalOutput.plate !== "Unclear" && finalOutput.plate !== "Not Found") {
        setStatus("Saving to Database...");
        const saveResult = await saveDetection({
          car_name: finalOutput.vehicle,
          color: finalOutput.color,
          plate_number: finalOutput.plate,
          rto: finalOutput.rto
        });
        if (saveResult.success) setStatus("Saved Successfully");
        else setStatus(`Save Failed: ${saveResult.error}`);
      }

    } catch (err) {
      console.error(err);
      setStatus("Error: " + err.message);
    }
  };

  /* ---------------- NAVBAR ---------------- */
  const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
      <nav className="w-full mb-12 border-b border-white/5 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-2 w-2 bg-cyan-500 rounded-full animate-pulse" />
            <span className="text-sm font-mono tracking-[0.2em] text-slate-200">
              VEHICLE RECOGNITION <span className="text-slate-700 text-[10px] ml-2"></span>
            </span>
          </div>

          {/* DESKTOP MENU */}
          <div className="hidden md:flex gap-12 text-slate-500 text-xs font-mono tracking-widest">
            {["home", "analyze", "admin"].map((item) => (
              <button
                key={item}
                onClick={() => setPage(item)}
                className={cn(
                  "hover:text-cyan-400 transition-colors uppercase",
                  page === item ? "text-cyan-400" : ""
                )}
              >
                {item}
              </button>
            ))}
          </div>

          {/* MOBILE TOGGLE */}
          <button
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* MOBILE MENU OVERLAY */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden bg-slate-900/50 border-t border-white/5 mt-4"
            >
              <div className="flex flex-col gap-4 py-4 text-slate-500 text-xs font-mono tracking-widest">
                {["home", "analyze", "admin"].map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setPage(item);
                      setIsMenuOpen(false);
                    }}
                    className={cn(
                      "hover:text-cyan-400 transition-colors uppercase text-left pl-4 py-2 border-l-2 border-transparent hover:border-cyan-500/50 hover:bg-white/5",
                      page === item ? "text-cyan-400 border-cyan-500" : ""
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    );
  };

  /* ---------------- HOME PAGE ---------------- */
  const HomePage = () => (
    <div className="space-y-16 pb-20">
      {/* HERO SECTION */}
      <div className="min-h-[28rem] h-auto relative w-full overflow-hidden bg-slate-900 flex flex-col items-center justify-center rounded-2xl border border-white/10 shadow-2xl shadow-cyan-900/20 py-12 md:py-0">
        <div className="absolute inset-0 w-full h-full bg-slate-900 z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />
        <Boxes />
        <div className="relative z-20 flex flex-col items-center">
          <div className="h-1 w-24 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mb-8" />
          <h1 className={cn("text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 relative z-20 tracking-tight")}>
            Vehicle Recognition System
          </h1>
        </div>
      </div>

      {/* INTRO TEXT */}
      <div className="max-w-7xl mx-auto text-center px-6">
        <p className="text-xl md:text-2xl text-slate-200 leading-relaxed font-light">
          This project presents an <span className="text-cyan-400 font-normal">advanced vehicle detection system</span> built using deep learning and the Roboflow platform. It enables accurate <span className="text-purple-400 font-normal">identification and localization</span> of multiple vehicle types from images using object detection techniques. Roboflow is utilized for dataset annotation, preprocessing, augmentation, and model training, ensuring efficiency and scalability. The system is suitable for applications in <span className="text-green-400 font-normal">traffic monitoring, surveillance, and intelligent transportation systems</span>
        </p>
        <div className="h-px w-32 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto mt-8" />
      </div>

      {/* FEATURE GRID */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting Line (Visual only) */}
          <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent -z-10 hidden md:block" />

          {/* DETECT */}
          <div className="border border-white/10 bg-slate-900/20 backdrop-blur-sm flex flex-col items-start p-6 relative min-h-[24rem] md:min-h-[34rem] h-auto group hover:border-cyan-500/30 transition-colors duration-500 rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <Icon className="absolute h-6 w-6 -top-3 -left-3 text-cyan-500/50" />
            <Icon className="absolute h-6 w-6 -bottom-3 -left-3 text-cyan-500/50" />
            <Icon className="absolute h-6 w-6 -top-3 -right-3 text-cyan-500/50" />
            <Icon className="absolute h-6 w-6 -bottom-3 -right-3 text-cyan-500/50" />

            <div className="flex justify-between w-full mb-6 items-center z-10">
              <span className="text-xs font-mono text-cyan-400 tracking-[0.2em]">DETECT</span>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                <span className="text-[10px] font-mono text-cyan-500/70 uppercase">ONLINE</span>
              </div>
            </div>

            <div className="w-full flex-grow flex items-center justify-center relative z-10 my-4">
              <EvervaultCard text="DETECTION" variant="detection" className="h-full w-full" />
            </div>

            <h2 className="text-white mt-auto text-lg font-medium tracking-wide font-mono z-10">
              &gt; OBJECT ID
            </h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed z-10 border-l-2 border-cyan-500/30 pl-3">
              Advanced computer vision algorithms to detect vehicle classes with high precision.
            </p>
          </div>

          {/* RECOGNIZE */}
          <div className="border border-white/10 bg-slate-900/20 backdrop-blur-sm flex flex-col items-start p-6 relative min-h-[24rem] md:min-h-[34rem] h-auto group hover:border-purple-500/30 transition-colors duration-500 rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <Icon className="absolute h-6 w-6 -top-3 -left-3 text-purple-500/50" />
            <Icon className="absolute h-6 w-6 -bottom-3 -left-3 text-purple-500/50" />
            <Icon className="absolute h-6 w-6 -top-3 -right-3 text-purple-500/50" />
            <Icon className="absolute h-6 w-6 -bottom-3 -right-3 text-purple-500/50" />

            <div className="flex justify-between w-full mb-6 items-center z-10">
              <span className="text-xs font-mono text-purple-400 tracking-[0.2em]">RECOGNIZE</span>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                <span className="text-[10px] font-mono text-purple-500/70 uppercase">Active</span>
              </div>
            </div>

            <div className="w-full flex-grow flex items-center justify-center relative z-10 my-4">
              <EvervaultCard text="RECOGNITION" variant="recognition" className="h-full w-full" />
            </div>

            <h2 className="text-white mt-auto text-lg font-medium tracking-wide font-mono z-10">
              &gt; PLATE OCR
            </h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed z-10 border-l-2 border-purple-500/30 pl-3">
              Deep learning optical character recognition to digitize number plates instantly.
            </p>
          </div>

          {/* ANALYZE */}
          <div className="border border-white/10 bg-slate-900/20 backdrop-blur-sm flex flex-col items-start p-6 relative min-h-[24rem] md:min-h-[34rem] h-auto group hover:border-green-500/30 transition-colors duration-500 rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <Icon className="absolute h-6 w-6 -top-3 -left-3 text-green-500/50" />
            <Icon className="absolute h-6 w-6 -bottom-3 -left-3 text-green-500/50" />
            <Icon className="absolute h-6 w-6 -top-3 -right-3 text-green-500/50" />
            <Icon className="absolute h-6 w-6 -bottom-3 -right-3 text-green-500/50" />

            <div className="flex justify-between w-full mb-6 items-center z-10">
              <span className="text-xs font-mono text-green-400 tracking-[0.2em]">ANALYZE</span>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[10px] font-mono text-green-500/70 uppercase">Inference</span>
              </div>
            </div>

            <div className="w-full flex-grow flex items-center justify-center relative z-10 my-4">
              <EvervaultCard text="ATTRIBUTES" variant="attributes" className="h-full w-full" />
            </div>

            <h2 className="text-white mt-auto text-lg font-medium tracking-wide font-mono z-10">
              &gt; META DATA
            </h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed z-10 border-l-2 border-green-500/30 pl-3">
              Classify vehicle attributes such as color, make, and model type analysis.
            </p>
          </div>
        </div>
      </div>

      {/* SYSTEM ARCHITECTURE SECTION */}
      <div className="max-w-7xl mx-auto mt-24 relative">
        <div className="flex items-center justify-center gap-4 mb-16">
          <div className="hidden md:block h-px w-24 bg-gradient-to-l from-cyan-500/50 to-transparent" />
          <div className="flex flex-col items-center">
            <h2 className="text-3xl md:text-5xl font-mono uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-purple-400 font-bold mb-2">
              System Core
            </h2>
            <span className="text-xs font-mono text-slate-500 tracking-widest uppercase">
              Architecture & Specifications
            </span>
          </div>
          <div className="hidden md:block h-px w-24 bg-gradient-to-r from-purple-500/50 to-transparent" />
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative z-10">
          {/* Module 1: Core Vision */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl opacity-20 group-hover:opacity-60 blur transition duration-500"></div>
            <div className="relative p-8 rounded-2xl bg-black border border-white/10 h-full flex flex-col">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity size={100} className="text-cyan-500" />
              </div>

              <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-6 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                <Car className="text-cyan-400" size={24} />
              </div>

              <h3 className="text-xl font-bold text-white mb-2 font-mono tracking-tight">
                DEEP LEARNING
              </h3>
              <div className="w-12 h-1 bg-cyan-500 mb-6 rounded-full" />

              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Powered by state-of-the-art <strong>Convolutional Neural Networks (CNNs)</strong>.
              </p>
              <p className="text-slate-500 text-xs leading-relaxed text-justify mt-auto font-mono">
                &gt; Real-time object detection<br />
                &gt; Robust against occlusion<br />
                &gt; Multi-scale inference
              </p>
            </div>
          </div>

          {/* Module 2: ANPR & Classification */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl opacity-20 group-hover:opacity-60 blur transition duration-500"></div>
            <div className="relative p-8 rounded-2xl bg-black border border-white/10 h-full flex flex-col">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Scan size={100} className="text-purple-500" />
              </div>

              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-6 border border-purple-500/20 group-hover:scale-110 transition-transform">
                <FileText className="text-purple-400" size={24} />
              </div>

              <h3 className="text-xl font-bold text-white mb-2 font-mono tracking-tight">
                ANPR & ATTRIBUTES
              </h3>
              <div className="w-12 h-1 bg-purple-500 mb-6 rounded-full" />

              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                High-precision <strong>License Plate Recognition</strong> and entity classification.
              </p>
              <p className="text-slate-500 text-xs leading-relaxed text-justify mt-auto font-mono">
                &gt; Region-specific regex<br />
                &gt; Vehicle make & model<br />
                &gt; Color analysis
              </p>
            </div>
          </div>

          {/* Module 3: Scalability */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl opacity-20 group-hover:opacity-60 blur transition duration-500"></div>
            <div className="relative p-8 rounded-2xl bg-black border border-white/10 h-full flex flex-col">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Shield size={100} className="text-green-500" />
              </div>

              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-6 border border-green-500/20 group-hover:scale-110 transition-transform">
                <MapPin className="text-green-400" size={24} />
              </div>

              <h3 className="text-xl font-bold text-white mb-2 font-mono tracking-tight">
                SMART MOBILITY
              </h3>
              <div className="w-12 h-1 bg-green-500 mb-6 rounded-full" />

              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Designed for <strong>Intelligent Transportation Systems (ITS)</strong> and surveillance.
              </p>
              <p className="text-slate-500 text-xs leading-relaxed text-justify mt-auto font-mono">
                &gt; Traffic management<br />
                &gt; Automated tolling<br />
                &gt; Law enforcement
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ---------------- ANALYZE PAGE ---------------- */
  const AnalyzePage = () => (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="glass rounded-xl p-1 border border-white/10 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/20"></div>
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-mono tracking-widest text-cyan-400">INPUT STATION</h2>
            <div className="h-2 w-2 bg-cyan-500 rounded-full animate-ping"></div>
          </div>

          <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 flex flex-col items-center justify-center transition-colors hover:border-cyan-500/50 hover:bg-slate-900/50 relative">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                setImageFile(file);
                setImageURL(URL.createObjectURL(file));
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />

            {imageURL ? (
              <div className="flex flex-col gap-4 w-full">
                <img
                  id="preview-image"
                  src={imageURL}
                  alt="Preview"
                  className="max-h-64 object-contain rounded border border-slate-700 mx-auto"
                />

              </div>
            ) : (
              <div className="text-center space-y-2 pointer-events-none">
                <Upload className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                <p className="text-sm font-mono text-slate-400">DROP IMAGE FILE</p>
                <p className="text-xs text-slate-600 uppercase tracking-wide">Supports JPG, PNG</p>
              </div>
            )}
          </div>

          <button
            onClick={runRoboflow}
            className="w-full py-4 rounded bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 font-mono tracking-widest hover:bg-cyan-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase text-sm"
          >
            <Scan size={18} />
            Analyze
          </button>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <span>STATUS:</span>
            <span className={cn("text-cyan-400", status !== "Idle" && "animate-pulse")}>{status}</span>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-1 border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-purple-500/20"></div>
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-sm font-mono tracking-widest text-purple-400">ANALYSIS DATA</h2>
            <Activity size={16} className="text-purple-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "VEHICLE CLASS", icon: Car, value: output.vehicle, color: "text-cyan-400" },
              { label: "COLOR DETECT", icon: Palette, value: output.color, color: "text-purple-400" },
              { label: "PLATE NUMBER", icon: FileText, value: output.plate, color: "text-green-400" },
              { label: "REG REGION", icon: MapPin, value: output.rto, color: "text-pink-400" }
            ].map((item, i) => (
              <div key={i} className="bg-slate-900/50 p-4 rounded border border-white/5 relative group hover:border-white/20 transition-colors">
                <item.icon className={cn("absolute top-3 right-3 w-4 h-4 opacity-50", item.color)} />
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">{item.label}</p>
                <p className={cn("text-lg font-mono font-bold tracking-tight text-white", item.value === "Pending..." && "animate-pulse")}>
                  {item.value || "---"}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-white/5">
            <p className="text-[10px] text-slate-600 font-mono text-center">
              {inferenceTime && <span>INFERENCE TIME: <span className="text-cyan-400">{inferenceTime}ms</span></span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  /* ---------------- ADMIN LOGIN ---------------- */
  const AdminPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
      setLoading(true);
      setError(null);
      const result = await checkAdminCredentials(username, password);
      setLoading(false);

      if (result.success) {
        setWelcomeName(result.user?.username || username); // Use DB username if available
        setShowWelcome(true);
        setPage("dashboard"); // Go to dashboard
      } else {
        setError("ACCESS DENIED: INVALID CREDENTIALS");
      }
    };

    return (
      <div className="max-w-md w-full mx-auto glass rounded-xl border border-white/10 p-8 relative overflow-hidden mt-10 md:mt-20">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20"></div>

        <div className="text-center mb-10">
          <Shield className="w-12 h-12 text-red-500/50 mx-auto mb-4" />
          <h2 className="text-xl font-mono tracking-[0.2em] text-white">SECURE ACCESS</h2>
          <p className="text-xs text-slate-500 mt-2 font-mono">AUTHORIZED PERSONNEL ONLY</p>
        </div>

        <div className="space-y-4">
          <div className="group relative flex items-center w-full bg-slate-900/50 border border-slate-700 rounded py-3 px-4 transition-colors focus-within:border-red-500/50">
            <span className="text-slate-600 font-mono text-xs whitespace-nowrap mr-2">USER ID &gt;</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full bg-transparent border-none p-0 text-slate-300 font-mono text-sm focus:outline-none focus:ring-0"
              placeholder="ENTER ID"
            />
          </div>
          <div className="group relative flex items-center w-full bg-slate-900/50 border border-slate-700 rounded py-3 px-4 transition-colors focus-within:border-red-500/50">
            <span className="text-slate-600 font-mono text-xs whitespace-nowrap mr-2">PASSWORD &gt;</span>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full bg-transparent border-none p-0 text-slate-300 font-mono text-sm focus:outline-none focus:ring-0 pr-8"
              placeholder="ENTER KEY"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 text-slate-500 hover:text-cyan-400 focus:outline-none transition-colors"
            >
              {showPassword ? <EyeOff size={18} className="text-cyan-500" /> : <Eye size={18} className="text-cyan-500" />}
            </button>
          </div>

          {error && <p className="text-red-500 text-xs font-mono text-center animate-pulse">{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 bg-red-500/10 border border-red-500/50 text-red-500 font-mono tracking-widest hover:bg-red-500/20 transition-all uppercase text-sm mt-6 disabled:opacity-50">
            {loading ? "AUTHENTICATING..." : "AUTHENTICATE"}
          </button>

          <button onClick={() => setPage("home")} className="w-full text-slate-600 text-xs hover:text-slate-400 mt-4">CANCEL</button>
        </div>
      </div>
    );
  };

  /* ---------------- ADMIN DASHBOARD ---------------- */
  const DashboardPage = () => {
    const [detections, setDetections] = useState([]);
    const [loading, setLoading] = useState(true);

    // Unified Search State
    const [searchCategory, setSearchCategory] = useState("All"); // All, Vehicle, Color, Region, Date
    const [searchValue, setSearchValue] = useState("");

    // Sort State
    const [sortBy, setSortBy] = useState("newest");

    // Visible Columns (Keep state default true, but hidden UI for cleaner look as per request)
    const [visibleColumns] = useState({
      id: true, timestamp: true, plate: true, vehicle: true, color: true, rto: true
    });

    useEffect(() => {
      const loadData = async () => {
        const { success, data } = await fetchAllDetections();
        if (success) setDetections(data);
        setLoading(false);
      };
      loadData();
    }, []);

    // Derived Data
    const uniqueVehicles = [...new Set(detections.map(d => d.car_name).filter(Boolean))];
    const uniqueColors = [...new Set(detections.map(d => d.color).filter(Boolean))];
    const uniqueRTOs = [...new Set(detections.map(d => d.rto).filter(Boolean))];

    // Filter Logic
    const filteredDetections = detections.filter(d => {
      if (searchCategory === "All") {
        const searchLower = searchValue.toLowerCase();
        return !searchValue ||
          d.plate_number.toLowerCase().includes(searchLower) ||
          d.detection_id.toString().includes(searchLower) ||
          d.car_name.toLowerCase().includes(searchLower) ||
          d.color.toLowerCase().includes(searchLower) ||
          d.rto.toLowerCase().includes(searchLower);
      }

      if (searchCategory === "Vehicle") {
        return !searchValue || d.car_name === searchValue;
      }

      if (searchCategory === "Color") {
        return !searchValue || d.color === searchValue;
      }

      if (searchCategory === "Region") {
        return !searchValue || d.rto === searchValue;
      }

      if (searchCategory === "Date") {
        return !searchValue || d.detected_at.includes(searchValue);
      }

      return true;
    });

    // Sort Logic
    const sortedDetections = [...filteredDetections].sort((a, b) => {
      if (sortBy === "newest") return parseInt(b.detection_id) - parseInt(a.detection_id);
      if (sortBy === "oldest") return parseInt(a.detection_id) - parseInt(b.detection_id);
      return 0;
    });

    return (
      <div className="space-y-8 pb-20">
        {/* HERO SECTION */}
        <div className="min-h-[20rem] h-auto relative w-full overflow-hidden bg-slate-900 flex flex-col items-center justify-center rounded-2xl border border-white/10 shadow-2xl shadow-red-900/20 py-8 md:py-0">
          <div className="absolute inset-0 w-full h-full bg-slate-900 z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />
          <Boxes />
          <div className="relative z-20 flex flex-col items-center">
            <div className="h-1 w-24 bg-gradient-to-r from-transparent via-red-500 to-transparent mb-8" />
            <h1 className={cn("text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 relative z-20 tracking-tight")}>
              Secure Terminal
            </h1>
            <p className="mt-4 text-slate-400 font-mono text-sm tracking-[0.3em] uppercase opacity-70">
              Authorized Access  Admin Level 1
            </p>
          </div>
        </div>

        {/* DATA TABLE SECTION */}
        <div className="max-w-7xl mx-auto glass rounded-xl border border-white/10 p-6 relative min-h-[50vh] overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20"></div>

          <div className="flex flex-col gap-6 mb-8">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-xl font-mono text-white tracking-widest flex items-center gap-2">
                  <Activity className="text-red-500" size={20} />
                  DETECTION LOGS
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-1">LIVE DATABASE FEED  READ ONLY</p>
              </div>

              <button onClick={() => setPage("home")} className="px-6 py-2 border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-white rounded transition-all text-xs font-mono tracking-wider flex items-center gap-2">
                <Shield size={14} />
                EXIT
              </button>
            </div>

            {/* UNIFIED SEARCH BAR (Amazon Style) */}

            <div className="w-full flex justify-center">
              <div className="flex flex-col md:flex-row w-full max-w-4xl h-auto md:h-12 rounded-lg overflow-hidden border border-white/20 shadow-lg shadow-black/50">
                {/* CATEGORY SELECTOR */}
                <div className="bg-slate-800 border-b md:border-b-0 md:border-r border-white/10 px-4 flex items-center shrink-0 h-10 md:h-auto">
                  <select
                    value={searchCategory}
                    onChange={(e) => {
                      setSearchCategory(e.target.value);
                      setSearchValue(""); // Reset value when category changes
                    }}
                    className="bg-transparent text-slate-300 font-mono text-sm focus:outline-none cursor-pointer appearance-none pr-8 relative z-10 w-full md:w-auto"
                  >
                    <option value="All" className="bg-slate-800">All Categories</option>
                    <option value="Vehicle" className="bg-slate-800">Vehicle Type</option>
                    <option value="Color" className="bg-slate-800">Vehicle Color</option>
                    <option value="Region" className="bg-slate-800">RTO Region</option>
                    <option value="Date" className="bg-slate-800">Date/Time</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-8 md:right-auto md:ml-[-20px] pointer-events-none text-slate-500" />
                </div>

                {/* SEARCH INPUT AREA */}
                <div className="flex-1 bg-slate-900/80 relative flex items-center h-10 md:h-auto">
                  {/* Dynamic Input based on Category */}
                  {searchCategory === "Vehicle" ? (
                    <select
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      className="w-full h-full bg-transparent px-4 text-white font-mono focus:outline-none cursor-pointer"
                    >
                      <option value="" className="bg-slate-900">Select Vehicle...</option>
                      {uniqueVehicles.map(v => <option key={v} value={v} className="bg-slate-900">{v}</option>)}
                    </select>
                  ) : searchCategory === "Color" ? (
                    <select
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      className="w-full h-full bg-transparent px-4 text-white font-mono focus:outline-none cursor-pointer"
                    >
                      <option value="" className="bg-slate-900">Select Color...</option>
                      {uniqueColors.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                    </select>
                  ) : searchCategory === "Region" ? (
                    <select
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      className="w-full h-full bg-transparent px-4 text-white font-mono focus:outline-none cursor-pointer"
                    >
                      <option value="" className="bg-slate-900">Select Region...</option>
                      {uniqueRTOs.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      placeholder={searchCategory === "All" ? "Search ID, Plate, Vehicle..." : `Search ${searchCategory}...`}
                      className="w-full h-full bg-transparent px-4 text-white font-mono placeholder:text-slate-600 focus:outline-none"
                    />
                  )}
                </div>

                {/* SEARCH BUTTON (Visual Only - Search is reactive) */}
                <div className="bg-red-500 hover:bg-red-600 transition-colors px-6 flex items-center justify-center cursor-pointer h-10 md:h-auto hidden md:flex">
                  <Scan size={20} className="text-white" />
                </div>
              </div>
            </div>

            {/* Sort Controls (Subtle) */}
            <div className="flex justify-end pr-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono text-slate-500">Sort Order:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent text-xs font-mono text-red-400 focus:outline-none cursor-pointer border-b border-red-500/30 pb-1"
                >
                  <option value="newest" className="bg-slate-900">Newest First</option>
                  <option value="oldest" className="bg-slate-900">Oldest First</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin"></div>
              <p className="text-slate-500 font-mono text-sm animate-pulse tracking-widest">DECRYPTING SECURE RECORDS...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs font-mono text-slate-500 border-b border-white/10 uppercase tracking-wider">
                    {visibleColumns.id && <th className="p-4">ID REF</th>}
                    {visibleColumns.timestamp && <th className="p-4">TIMESTAMP</th>}
                    {visibleColumns.plate && <th className="p-4">PLATE ID</th>}
                    {visibleColumns.vehicle && <th className="p-4">VEHICLE CLASS</th>}
                    {visibleColumns.color && <th className="p-4">COLOR</th>}
                    {visibleColumns.rto && <th className="p-4">RTO REGION</th>}
                  </tr>
                </thead>
                <tbody className="text-sm font-mono text-slate-300">
                  {sortedDetections.map((d) => (
                    <tr key={d.detection_id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      {visibleColumns.id && <td className="p-4 text-red-400 font-bold group-hover:text-red-300">#{d.detection_id}</td>}
                      {visibleColumns.timestamp && <td className="p-4 text-slate-400">{d.detected_at}</td>}
                      {visibleColumns.plate && <td className="p-4 text-white font-mono tracking-wide">{d.plate_number}</td>}
                      {visibleColumns.vehicle && <td className="p-4 text-cyan-300">{d.car_name}</td>}
                      {visibleColumns.color && (
                        <td className="p-4 flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: d.color }}></div>
                          <span className="capitalize">{d.color}</span>
                        </td>
                      )}
                      {visibleColumns.rto && <td className="p-4 text-xs text-slate-500">{d.rto}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedDetections.length === 0 && (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-lg mt-4 bg-slate-900/30">
                  <p className="text-slate-600 font-mono tracking-widest">NO RECORDS MATCH FILTERS</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ---------------- RENDER ---------------- */
  // Global State for Welcome Dialog
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-6">
      <Navbar />
      {page === "home" && <HomePage />}
      {page === "analyze" && <AnalyzePage />}
      {page === "admin" && <AdminPage />}
      {page === "dashboard" && <DashboardPage />}
      {page === "vision" && <HomePage />}

      <AnimatePresence>
        {showWelcome && (
          <WelcomeDialog
            name={welcomeName}
            onClose={() => setShowWelcome(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}; // End Component
export default VehicleRecognitionSystem;
