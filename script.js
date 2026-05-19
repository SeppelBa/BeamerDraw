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

async function startCamera(){
  try{
    stream = await navigator.mediaDevices.getUserMedia({
      video:{
        facingMode:{ ideal:'environment' },
        width:{ ideal:1920 },
        height:{ ideal:1080 },
        focusMode:'continuous'
      },
      audio:false
    });

    video.srcObject = stream;

    const track = stream.getVideoTracks()[0];

    const capabilities = track.getCapabilities();

    if(capabilities.focusMode){
      await track.applyConstraints({
        advanced:[{
          focusMode:'continuous'
        }]
      });
    }

  }catch(err){
    alert('Kamera konnte nicht gestartet werden');
    console.error(err);
  }
}

startCamera();

function updateTransform(){
  overlay.style.transform =
    `translate(${posX}px, ${posY}px) scale(${scale}) rotate(${rotation}deg)`;
}

opacitySlider.addEventListener('input',()=>{
  overlay.style.opacity = opacitySlider.value;
});

document.getElementById('rotateLeft').onclick = ()=>{
  rotation -= 5;
  updateTransform();
};

document.getElementById('rotateRight').onclick = ()=>{
  rotation += 5;
  updateTransform();
};

document.getElementById('resetBtn').onclick = ()=>{
  posX = 0;
  posY = 0;
  scale = 1;
  rotation = 0;
  updateTransform();
};

document.getElementById('focusBtn').onclick = async ()=>{
  try{
    const track = stream.getVideoTracks()[0];

    await track.applyConstraints({
      advanced:[{
        focusMode:'continuous'
      }]
    });

    alert('Autofokus aktiviert');
  }catch(err){
    alert('Autofokus nicht unterstützt');
  }
};

document.getElementById('flashToggle').onclick = async ()=>{
  try{
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();

    if(!capabilities.torch){
      alert('Taschenlampe nicht unterstützt');
      return;
    }

    flashlightOn = !flashlightOn;

    await track.applyConstraints({
      advanced:[{ torch:flashlightOn }]
    });

  }catch(err){
    alert('Fehler bei Taschenlampe');
  }
};

imageInput.addEventListener('change',e=>{
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();

  reader.onload = ev=>{
    currentImage.onload = ()=>{
      openCropper();
    };

    currentImage.src = ev.target.result;
  };

  reader.readAsDataURL(file);
});

function openCropper(){
  cropModal.classList.remove('hidden');

  cropCanvas.width = currentImage.width;
  cropCanvas.height = currentImage.height;

  cropCtx.drawImage(currentImage,0,0);

  drawCropArea();
}

let crop = {
  x:50,
  y:50,
  w:300,
  h:300
};

function drawCropArea(){
  cropCtx.clearRect(0,0,cropCanvas.width,cropCanvas.height);
  cropCtx.drawImage(currentImage,0,0);

  cropCtx.strokeStyle = 'red';
  cropCtx.lineWidth = 8;
  cropCtx.strokeRect(crop.x,crop.y,crop.w,crop.h);
}

let dragging = false;

cropCanvas.addEventListener('touchstart',e=>{
  dragging = true;
});

cropCanvas.addEventListener('touchmove',e=>{
  e.preventDefault();

  const rect = cropCanvas.getBoundingClientRect();

  crop.x = (e.touches[0].clientX - rect.left) * (cropCanvas.width / rect.width) - crop.w/2;
  crop.y = (e.touches[0].clientY - rect.top) * (cropCanvas.height / rect.height) - crop.h/2;

  drawCropArea();
});

cropCanvas.addEventListener('touchend',()=>{
  dragging = false;
});

document.getElementById('cropApply').onclick = ()=>{
  const temp = document.createElement('canvas');
  temp.width = crop.w;
  temp.height = crop.h;

  temp.getContext('2d').drawImage(
    currentImage,
    crop.x,crop.y,crop.w,crop.h,
    0,0,crop.w,crop.h
  );

  overlay.src = temp.toDataURL();
  cropModal.classList.add('hidden');
};

document.getElementById('cropCancel').onclick = ()=>{
  cropModal.classList.add('hidden');
};

let startX = 0;
let startY = 0;
let moveImage = false;

overlay.addEventListener('touchstart',e=>{
  if(e.touches.length === 1){
    moveImage = true;
    startX = e.touches[0].clientX - posX;
    startY = e.touches[0].clientY - posY;
  }
});

overlay.addEventListener('touchmove',e=>{
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

overlay.addEventListener('touchend',()=>{
  moveImage = false;
});
