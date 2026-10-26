/* AUTHORSHIP KEY: [STUDENT] existing project structure | [AI-FIX] reliability fixes. */
"use strict";

let stream = null;
let videoElement = null;
let widget = null;
let greeting = null;
let pipWindow = null;

document.addEventListener("DOMContentLoaded", () => {
  videoElement = document.getElementById("webcam");
  widget = document.getElementById("widget-video");
  greeting = document.getElementById("widget-greeting");

  const endButton = document.getElementById("end-feed-button");
  if (endButton) endButton.addEventListener("click", stopCamera);

  if (!videoElement || !widget || !greeting) {
    console.error("Kairn camera: required widget elements were not found.");
  }
});

function showVideo() {
  if (!greeting || !widget) return;
  greeting.classList.add("hidden");
  widget.classList.remove("hidden");
}

function showGreeting() {
  if (!widget || !greeting) return;
  widget.classList.add("hidden");
  greeting.classList.remove("hidden");
}

async function ensureCamera() {
  if (!videoElement) throw new Error("The webcam video element is missing.");
  if (videoElement.srcObject) return videoElement.srcObject;

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access is unavailable. Use a supported browser and a secure context (HTTPS or localhost).");
  }

  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: false
  });
  videoElement.srcObject = stream;
  await videoElement.play().catch(() => {});
  return stream;
}

async function startCamera() {
  try {
    await ensureCamera();
    showVideo();
  } catch (error) {
    console.error("Error accessing the camera:", error);
    alert(error.message || "Could not access the camera. Check browser permissions and try again.");
  }
}

function stopCamera() {
  const activeStream = videoElement?.srcObject || stream;
  if (activeStream) {
    activeStream.getTracks().forEach((track) => track.stop());
  }
  if (videoElement) videoElement.srcObject = null;
  stream = null;

  if (pipWindow && !pipWindow.closed) pipWindow.close();
  pipWindow = null;
  showGreeting();
}

async function launchWidget() {
  if (!("documentPictureInPicture" in window)) {
    alert("Document Picture-in-Picture is not supported in this browser. Use the page widget instead.");
    return;
  }

  let newPipWindow = null;
  try {
    // Request the PiP window before prompting for camera access so the click activation is preserved.
    newPipWindow = await window.documentPictureInPicture.requestWindow({
      width: 360,
      height: 260
    });
    pipWindow = newPipWindow;

    for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
      const copy = newPipWindow.document.createElement("link");
      copy.rel = "stylesheet";
      copy.href = link.href;
      newPipWindow.document.head.appendChild(copy);
    }

    // Copy any inline styles needed by the widget. External CSS is linked above.
    const inlineStyle = document.createElement("style");
    inlineStyle.textContent = `
      html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
      body { position: relative; }
      #widget-video { position: fixed !important; inset: 0 !important; width: 100% !important; height: 100% !important; border-radius: 0 !important; }
      #widget-video video { width: 100%; height: 100%; object-fit: cover; }
    `;
    newPipWindow.document.head.appendChild(inlineStyle);

    await ensureCamera();
    newPipWindow.document.body.appendChild(widget);
    widget.classList.remove("hidden");
    await videoElement.play().catch(() => {});

    newPipWindow.addEventListener("pagehide", () => {
      pipWindow = null;
      // The widget may have been removed by page teardown; only restore if the home container exists.
      const home = document.getElementById("camera-widget");
      if (home && widget) home.appendChild(widget);
      if (videoElement?.srcObject) showVideo();
      else showGreeting();
    }, { once: true });
  } catch (error) {
    console.error("Error launching Picture-in-Picture widget:", error);
    if (newPipWindow && !newPipWindow.closed) newPipWindow.close();
    pipWindow = null;
    alert(error.message || "Could not launch the mirror widget.");
  }
}
