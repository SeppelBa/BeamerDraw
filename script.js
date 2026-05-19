const video = document.getElementById('camera');
const imageInput = document.getElementById('imageInput');
const overlay = document.getElementById('overlay-image');
const opacitySlider = document.getElementById('opacitySlider');

const cropModal = document.getElementById('cropModal');
const cropCanvas = document.getElementById('cropCanvas');
const cropCtx = cropCanvas.getContext('2d');

let stream;
let flashlightOn = false;
let posX = 0;
let posY = 0;
let scale = 1;
let rotation = 0;
let currentImage = new Image();

// --- Kamera Start mit Fokus-Sicherheitsprüfung ---
async function startCamera(){
  try{
    stream = await navigator.mediaDevices.getUserMedia({
      video:{
        facingMode:{ ideal:'environment' },
        width:{ ideal:1920 },
        height:{ ideal:1080 }
      },
      audio:false
    });
    video.srcObject = stream;
  }catch(err){
    console.error(err);
    alert('Kamera konnte nicht gestartet werden');
  }
}
startCamera();

// --- Transformationen ---
function updateTransform(){
  overlay.style.transform = `translate(${posX}px, ${posY}px) scale(${scale}) rotate(${rotation}deg)`;
}

opacitySlider.addEventListener('input',() => overlay.style.opacity = opacitySlider.value);

document.getElementById('rotateLeft').onclick = () => { rotation -= 5; updateTransform(); };
document.getElementById('rotateRight').onclick = () => { rotation += 5; updateTransform(); };
document.getElementById('resetBtn').onclick = () => { posX=0; posY=0; scale=1; rotation=0; updateTransform(); };

// --- Autofokus Fix ---
document.getElementById('focusBtn').onclick = async () => {
  try {
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
    // Prüfen ob Focus unterstützt wird, bevor wir Constraints anwenden
    if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
      await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
    }
  } catch(err) {
    console.error('Autofokus-Fehler:', err);
  }
};

document.getElementById('flashToggle').onclick = async () => {
  try {
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
    if (!capabilities.torch) return;
    flashlightOn = !flashlightOn;
    await track.applyConstraints({ advanced: [{ torch: flashlightOn }] });
  } catch(err) { console.error(err); }
};

// --- Crop Logik mit Resize-Funktion ---
let crop = { x: 50, y: 50, w: 200, h: 200 };
let dragging = false;
let resizing = false;

imageInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    currentImage.onload = openCropper;
    currentImage.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

function openCropper(){
  cropModal.classList.remove('hidden');
  cropCanvas.width = cropCanvas.clientWidth;
  cropCanvas.height = (currentImage.height / currentImage.width) * cropCanvas.width;
  drawCropArea();
}

function drawCropArea(){
  cropCtx.clearRect(0,0,cropCanvas.width,cropCanvas.height);
  cropCtx.drawImage(currentImage, 0, 0, cropCanvas.width, cropCanvas.height);
  cropCtx.strokeStyle = 'red';
  cropCtx.lineWidth = 8;
  cropCtx.strokeRect(crop.x, crop.y, crop.w, crop.h);
  // Zeichne Griffpunkt unten rechts
  cropCtx.fillStyle = 'red';
  cropCtx.fillRect(crop.x + crop.w - 15, crop.y + crop.h - 15, 30, 30);
}

cropCanvas.addEventListener('touchstart', e => {
  const rect = cropCanvas.getBoundingClientRect();
  const tx = (e.touches[0].clientX - rect.left) * (cropCanvas.width / rect.width);
  const ty = (e.touches[0].clientY - rect.top) * (cropCanvas.height / rect.height);
  
  // Wenn der Touch nahe am Griffpunkt (unten rechts) ist, aktiviere Resizing
  if(tx > crop.x + crop.w - 40 && ty > crop.y + crop.h - 40) {
    resizing = true;
  } else {
    dragging = true;
  }
});

cropCanvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = cropCanvas.getBoundingClientRect();
  const tx = (e.touches[0].clientX - rect.left) * (cropCanvas.width / rect.width);
  const ty = (e.touches[0].clientY - rect.top) * (cropCanvas.height / rect.height);

  if(resizing) {
    crop.w = Math.max(50, tx - crop.x);
    crop.h = Math.max(50, ty - crop.y);
  } else if(dragging) {
    crop.x = tx - crop.w / 2;
    crop.y = ty - crop.h / 2;
  }
  drawCropArea();
});

cropCanvas.addEventListener('touchend', () => { dragging = false; resizing = false; });

document.getElementById('cropApply').onclick = () => {
  const temp = document.createElement('canvas');
  temp.width = crop.w; temp.height = crop.h;
  temp.getContext('2d').drawImage(currentImage, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  overlay.src = temp.toDataURL();
  cropModal.classList.add('hidden');
};

document.getElementById('cropCancel').onclick = () => cropModal.classList.add('hidden');

// --- Bild Verschieben/Zoom auf dem Hauptbildschirm ---
let startX = 0, startY = 0, moveImage = false;
overlay.addEventListener('touchstart', e => {
  if(e.touches.length === 1){
    moveImage = true;
    startX = e.touches[0].clientX - posX;
    startY = e.touches[0].clientY - posY;
  }
});

overlay.addEventListener('touchmove', e => {
  e.preventDefault();
  if(e.touches.length === 1 && moveImage){
    posX = e.touches[0].clientX - startX;
    posY = e.touches[0].clientY - startY;
    updateTransform();
  }
  if(e.touches.length === 2){
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    scale = Math.min(Math.max(Math.sqrt(dx*dx + dy*dy)/200,0.2),5);
    updateTransform();
  }
});

overlay.addEventListener('touchend', () => moveImage = false);
