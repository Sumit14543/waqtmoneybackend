import React, { useEffect, useRef, useState } from "react";
import { Video, CheckCircle, X, Upload, Circle, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/Components/Navbar";
import Footer from "@/Components/Footer";
import UserProgress from "./UserProgress";

import { API_BASE_URL } from "@/config/api";

const getStoredApplicationId = () =>
  sessionStorage.getItem("applicationId") || localStorage.getItem("applicationId") || "";

const readJsonResponse = async (res: Response) => {
  const text = await res.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: "Server returned an invalid response" };
  }
};

const VideoVerification: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const previewTimerRef = useRef<number | null>(null);
  const autoStartedRef = useRef(false);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoFileName, setVideoFileName] = useState("customer-video-kyc.webm");
  const [seconds, setSeconds] = useState(20);
  const [customerName, setCustomerName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const phrase =
    `Hello, My name is ${customerName || "customer"}, I am availing a short term personal loan from Waqt Money and I authorize the NBFC to visit and contact me at my residence or workplace in case of default in repayment by me.`;

  const clearRecordingTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearPreviewTimer = () => {
    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  };

  const stopCamera = () => {
    clearPreviewTimer();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  };

  const schedulePreviewAutoStop = () => {
    clearPreviewTimer();

    previewTimerRef.current = window.setTimeout(() => {
      stopCamera();
    }, 30000);
  };

  const attachStreamToVideo = async () => {
    const video = videoRef.current;
    const mediaStream = streamRef.current;

    if (!video || !mediaStream) return;

    video.srcObject = mediaStream;

    try {
      await video.play();
    } catch (playError) {
      console.error("Video KYC camera play error:", playError);
    }
  };

  const startCamera = async () => {
    setError("");

    if (streamRef.current) {
      await attachStreamToVideo();
      schedulePreviewAutoStop();
      return streamRef.current;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not supported in this browser.");
      return null;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);

      requestAnimationFrame(() => {
        void attachStreamToVideo();
      });
      schedulePreviewAutoStop();

      return mediaStream;
    } catch (cameraError) {
      console.error("Video KYC camera error:", cameraError);
      setError("Camera and microphone permission is required for video KYC.");
      return null;
    }
  };

  useEffect(() => {
    const applicationId = getStoredApplicationId();
    if (!applicationId) return;

    const loadCustomerName = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/application/${applicationId}`, {
          credentials: "include",
        });
        const result = await readJsonResponse(response);
        const name =
          result.data?.full_name ||
          result.data?.name ||
          result.data?.customer_name ||
          "";

        if (response.ok && name) {
          setCustomerName(String(name).trim());
        }
      } catch (error) {
        console.error("Customer name fetch error:", error);
      }
    };

    loadCustomerName();
  }, []);

  useEffect(() => {
    if (stream) {
      void attachStreamToVideo();
    }
  }, [stream]);

  useEffect(() => {
    if (autoStartedRef.current) return;

    autoStartedRef.current = true;
    void startCamera();

    return () => {
      clearRecordingTimer();
      clearPreviewTimer();
      stopCamera();
    };
    // Auto-start camera once when the KYC page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    setVideoUrl(null);
    setVideoBlob(null);
    setVideoFileName("customer-video-kyc.webm");
    setError("");
    setSeconds(20);
    clearPreviewTimer();

    const mediaStream = streamRef.current || (await startCamera());
    if (!mediaStream) return;

    chunksRef.current = [];

    const recorder = new MediaRecorder(mediaStream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setVideoBlob(blob);
      setVideoFileName("customer-video-kyc.webm");
      setVideoUrl(url);

      stopCamera();
    };

    recorder.start();
    setRecording(true);

    let timeLeft = 20;

    clearRecordingTimer();
    timerRef.current = window.setInterval(() => {
      timeLeft -= 1;
      setSeconds(timeLeft);

      if (timeLeft <= 0) {
        clearRecordingTimer();
        stopRecording();
      }
    }, 1000);
  };

  const stopRecording = () => {
    clearRecordingTimer();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const retakeVideo = () => {
    setVideoUrl(null);
    setVideoBlob(null);
    setVideoFileName("customer-video-kyc.webm");
    setError("");
    setSeconds(20);
    void startCamera();
  };

  const removeVideo = () => {
    setVideoUrl(null);
    setVideoBlob(null);
    setVideoFileName("customer-video-kyc.webm");
    setError("");
    setSeconds(20);
    void startCamera();
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Please upload only a video file.");
      return;
    }

    const url = URL.createObjectURL(file);
    clearRecordingTimer();
    stopCamera();
    setRecording(false);
    setVideoBlob(file);
    setVideoFileName(file.name);
    setError("");
    setVideoUrl(url);
  };

  const submitVideo = async () => {
    if (loading) return;

    const applicationId = getStoredApplicationId();

    if (!applicationId) {
      setError("Application session not found. Please start again.");
      return;
    }

    if (!videoBlob) {
      setError("Please record or upload video first.");
      return;
    }

    const formData = new FormData();
    formData.append("id", applicationId);
    formData.append("video", videoBlob, videoFileName);

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/application/upload-video-kyc`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const result = await readJsonResponse(response);

      if (!response.ok) {
        setError(result.message || "Video KYC upload failed");
        return;
      }

      navigate(result.data?.nextPath || "/user/loan-status");
    } catch (uploadError) {
      console.error("Video KYC upload error:", uploadError);
      setError("Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6fa]">
      <Navbar />

      <div className="flex-1 px-3 pb-16 pt-24 sm:px-4 md:pt-28">
        <UserProgress activeStep={8} />

        <div className="relative mx-auto w-full max-w-[974px] rounded-[22px] border border-[#dfe7f2] bg-white p-4 shadow-[0_18px_60px_rgba(32,56,85,0.10)] sm:p-7 md:p-10">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row">
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
            <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[18px] bg-purple-100 sm:h-[70px] sm:w-[70px] sm:rounded-[20px]">
              <Video className="w-8 h-8 text-purple-700 fill-purple-700" />
            </div>

            <div>
              <h2 className="text-[22px] font-bold text-black sm:text-[26px]">
                Video Verification
              </h2>

              <p className="mt-3 text-[15px] leading-6 text-purple-700 sm:mt-6 sm:text-[17px]">
                Record a 20-second video introduction or{" "}
                <label className="bg-blue-600 text-white px-1 cursor-pointer">
                  upload
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleUpload}
                  />
                </label>{" "}
                a video file
              </p>
            </div>
          </div>

          {videoUrl && (
            <div className="hidden md:flex items-center gap-8">
              <div className="px-4 py-2 rounded-full bg-green-50 text-green-700 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Completed
              </div>

              <CheckCircle className="w-10 h-10 text-green-500 fill-green-100" />
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center sm:mt-9">
          <div className="relative aspect-[4/5] w-full max-w-[560px] overflow-hidden rounded-[18px] border border-gray-300 bg-gray-200 shadow-xl sm:aspect-[4/3] md:h-[420px] md:aspect-auto">
            {!videoUrl ? (
              <video
                ref={videoRef}
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={previewRef}
                src={videoUrl}
                controls
                className="w-full h-full object-cover"
              />
            )}

            {videoUrl && (
              <button
                onClick={removeVideo}
                className="absolute top-5 right-5 w-12 h-12 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-black transition"
              >
                <X className="w-7 h-7" />
              </button>
            )}

            {!videoUrl && !recording && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-semibold">
                {stream ? "" : "Camera preview will appear here"}
              </div>
            )}

            <div className="absolute bottom-3 left-3 right-3 hidden rounded-[14px] bg-black/75 p-3 text-white sm:bottom-5 sm:left-5 sm:right-5 sm:block sm:p-4">
              <h4 className="flex items-center gap-2 text-[16px] font-bold text-yellow-300">
                Say this phrase:
              </h4>
              <p className="mt-2 text-[14px] leading-6">"{phrase}"</p>
            </div>
          </div>

          <div className="mt-3 w-full rounded-2xl border border-purple-100 bg-purple-50/80 p-3 text-left text-slate-800 sm:hidden">
            <h4 className="text-sm font-extrabold text-purple-700">
              Say this phrase:
            </h4>
            <p className="mt-2 text-[13px] font-medium leading-5">
              "{phrase}"
            </p>
          </div>

          {recording && (
            <div className="mt-3 text-center text-sm font-bold text-red-600 sm:mt-4 sm:text-base">
              Recording... {seconds}s left
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <div className="mt-5 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-4">
            {!recording && !videoUrl && (
              <button
                onClick={startRecording}
                className="flex justify-center gap-3 rounded-full bg-red-500 px-6 py-3 text-base font-bold text-white shadow-lg hover:bg-red-600 sm:px-8 sm:py-4 sm:text-lg"
              >
                <Circle className="w-4 h-4 fill-white" />
                Start Recording
              </button>
            )}

            {recording && (
              <button
                onClick={stopRecording}
                className="rounded-full bg-black px-6 py-3 text-base font-bold text-white shadow-lg hover:bg-gray-800 sm:px-8 sm:py-4 sm:text-lg"
              >
                Stop Recording
              </button>
            )}

            {videoUrl && (
              <>
                <button
                  onClick={retakeVideo}
                  className="flex justify-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-base font-bold text-white shadow-lg hover:bg-orange-600 sm:px-7 sm:py-4 sm:text-lg"
                >
                  <RotateCcw className="w-5 h-5" />
                  Retake
                </button>

                <button
                  type="button"
                  onClick={submitVideo}
                  disabled={loading}
                  className="flex justify-center gap-2 rounded-full bg-green-600 px-6 py-3 text-base font-bold text-white shadow-lg hover:bg-green-700 sm:px-7 sm:py-4 sm:text-lg"
                >
                  <Upload className="w-5 h-5" />
                  {loading ? "Uploading..." : "Submit Video"}
                </button>
              </>
            )}
          </div>
        </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default VideoVerification;
