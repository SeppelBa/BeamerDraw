const video = document.getElementById('camera');
const imageInput = document.getElementById('imageInput');
const overlay = document.getElementById('overlay-image');
const opacitySlider = document.getElementById('opacitySlider');

let stream;
let flashlightOn = false;

let posX = 0;
let posY = 0;
let scale = 1;
let rotation = 0;

async function startCamera() {
  try {
    // 1. Kamera fest auf die Hauptlinse erzwingen (verhindert Linsensprung)
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { exact: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });

    video.srcObject = stream;

    // 2. Fokus auf manuell setzen, um "Pumpen" des Bildes zu verhindern
    const track = stream.getVideoTracks()[0];
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    if (caps.focusMode && caps.focusMode.includes('manual')) {
        await track.applyConstraints({ advanced: [{ focusMode: 'manual' }] });
    }

  } catch (err) {
    alert("Kamera konnte nicht gestartet werden (oder Linsenzugriff verweigert).");
    console.error(err);
  }
}

startCamera();

imageInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    overlay.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

opacitySlider.addEventListener('input', () => {
  overlay.style.opacity = opacitySlider.value;
});

function updateTransform() {
  overlay.style.transform =
    `translate(${posX}px, ${posY}px) scale(${scale}) rotate(${rotation}deg)`;
}

document.getElementById('rotateLeft').onclick = () => {
  rotation -= 5;
  updateTransform();
};

document.getElementById('rotateRight').onclick = () => {
  rotation += 5;
  updateTransform();
};

document.getElementById('resetBtn').onclick = () => {
  posX = 0;
  posY = 0;
  scale = 1;
  rotation = 0;
  updateTransform();
};

document.getElementById('flashToggle').onclick = async () => {
  try {
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};

    if (!capabilities.torch) {
      alert("Taschenlampe nicht unterstützt.");
      return;
    }

    flashlightOn = !flashlightOn;
    await track.applyConstraints({ advanced: [{ torch: flashlightOn }] });

  } catch (err) {
    console.error(err);
  }
};

let startX = 0;
let startY = 0;
let dragging = false;

overlay.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    dragging = true;
    startX = e.touches[0].clientX - posX;
    startY = e.touches[0].clientY - posY;
  }
});

overlay.addEventListener('touchmove', e => {
  e.preventDefault();

  if (e.touches.length === 1 && dragging) {
    posX = e.touches[0].clientX - startX;
    posY = e.touches[0].clientY - startY;
    updateTransform();
  }

  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    scale = Math.min(Math.max(Math.sqrt(dx*dx + dy*dy) / 200, 0.2), 5);
    updateTransform();
  }
});

overlay.addEventListener('touchend', () => {
  dragging = false;
});
