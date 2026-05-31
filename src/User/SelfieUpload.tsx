import React, { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, RefreshCcw, Video } from "lucide-react";

type SelfieUploadProps = {
  file: File | null;
  error?: string;
  onCapture: (file: File | null) => void;
};

const SelfieUpload = ({ file, error, onCapture }: SelfieUploadProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoStartedRef = useRef(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const attachStreamToVideo = useCallback(async () => {
    const video = videoRef.current;
    const stream = streamRef.current;

    if (!video || !stream) return;

    video.srcObject = stream;

    try {
      await video.play();
    } catch (playError) {
      console.error("Selfie camera play error:", playError);
     
    }
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    stopCamera();
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError("");
    setPreviewUrl("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraReady(false);
      setCameraError("Camera is not supported in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      stopCamera();
      streamRef.current = stream;
      setCameraReady(true);

      requestAnimationFrame(() => {
        void attachStreamToVideo();
      });
    } catch (error) {
      console.error("Selfie camera error:", error);
      setCameraReady(false);
      setCameraError("Camera permission is required to capture selfie");
    }
  }, [attachStreamToVideo, stopCamera]);

  useEffect(() => {
    if (cameraReady) {
      void attachStreamToVideo();
    }
  }, [attachStreamToVideo, cameraReady]);

  useEffect(() => {
    if (autoStartedRef.current || file) return;

    autoStartedRef.current = true;
    void startCamera();
  }, [file, startCamera]);

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("Camera is not ready yet");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Unable to capture selfie");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Unable to capture selfie");
          return;
        }

        const selfieFile = new File([blob], `selfie-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        onCapture(selfieFile);
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  };

  const retakeSelfie = () => {
    onCapture(null);
    setPreviewUrl("");
    void startCamera();
  };

  return (
    <div className="rounded-2xl border border-[#dfe7f2] bg-[#fbfdff] p-4">
      <div className="flex min-h-[260px] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#d8c5ff] bg-white text-center">
        {previewUrl ? (
          <img src={previewUrl} alt="Selfie preview" className="h-[260px] w-full object-cover" />
        ) : cameraReady ? (
          <video
            ref={videoRef}
            muted
            playsInline
            className="h-[260px] w-full bg-black object-cover"
          />
        ) : (
          <div className="px-4 py-8">
            <Video className="mx-auto h-9 w-9 text-[#8048e2]" />
            <p className="mt-3 text-sm font-bold text-[#071d3a]">Live camera selfie</p>
            <p className="mt-1 text-xs font-medium text-[#718096]">Start camera to continue</p>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {!cameraReady && !file && (
          <button
            type="button"
            onClick={() => void startCamera()}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#8048e2] text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.18)]"
          >
            <Video className="h-4 w-4" />
            Start Camera
          </button>
        )}

        {cameraReady && (
          <button
            type="button"
            onClick={captureSelfie}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#8048e2] text-sm font-bold text-white shadow-[0_9px_18px_rgba(128,72,226,0.18)] sm:col-span-2"
          >
            <Camera className="h-4 w-4" />
            Capture Selfie
          </button>
        )}

        {file && (
          <button
            type="button"
            onClick={retakeSelfie}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#d8c5ff] bg-white text-sm font-bold text-[#8048e2] sm:col-span-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Retake Selfie
          </button>
        )}
      </div>

      {file && (
        <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#0c8f53]">
          <CheckCircle2 className="h-4 w-4" />
          {file.name}
        </p>
      )}

      {cameraError && <p className="mt-2 text-xs font-medium text-red-500">{cameraError}</p>}
      {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
};

export default SelfieUpload;
