/**
 * Self-contained HTML for the in-WebView / iframe face detection page.
 *
 * FIX: removed @mediapipe/camera_utils (that CDN version is broken).
 *      Replaced with a native requestAnimationFrame loop — more reliable.
 *
 * Loads only:
 *   @mediapipe/face_mesh  (WASM + JS, self-hosted via locateFile → CDN)
 *
 * All log steps are both:
 *   • shown in the on-screen #log div (visible in the iframe/WebView)
 *   • sent as postMessage({ type:'log', message }) so you can read them
 *     in the React Native / browser console via onMessage
 */
export const FACE_CAMERA_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#0f172a;overflow:hidden;
  font-family:system-ui,-apple-system,sans-serif;color:#f1f5f9}

/* camera fills the entire viewport */
#cam-box{position:fixed;inset:0;background:#000}
video{position:absolute;inset:0;width:100%;height:100%;
  object-fit:cover;transform:scaleX(-1)}
canvas#ov{position:absolute;inset:0;width:100%;height:100%;
  pointer-events:none;transform:scaleX(-1)}

/* oval guide — centred, responsive */
#oval-guide{
  position:absolute;top:50%;left:50%;
  transform:translate(-50%,-54%);
  width:min(54vw,200px);
  aspect-ratio:3/4;
  border:2.5px solid rgba(148,163,184,0.45);
  border-radius:50%;pointer-events:none;transition:border-color .25s}
#oval-guide.face {border-color:rgba(34,197,94,0.85)}
#oval-guide.blink{border-color:#f59e0b}

/* hint text at the bottom */
#tip{position:absolute;bottom:24px;left:0;right:0;text-align:center;
  font-size:13px;font-weight:700;color:#fff;
  text-shadow:0 1px 6px rgba(0,0,0,.9);letter-spacing:.3px}

/* status pill — hidden */
#status-bar{display:none}
.dot{display:none}

/* hide wrap; we go full-screen directly */
#wrap{display:contents}
#log-panel{display:none}
</style>
</head>
<body>
<div id="wrap">
  <div id="cam-box">
    <video id="vid" autoplay muted playsinline></video>
    <canvas id="ov"></canvas>
    <div id="oval-guide"></div>
    <div id="tip">Starting…</div>
  </div>
</div>

<script>
(function(){
'use strict';

/* ═══════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════ */
var FM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619';
/* NOTE: camera_utils CDN is broken — we use RAF instead (see frameLoop) */

var L_EYE       = [33,160,158,133,153,144];
var R_EYE       = [362,385,387,263,373,380];
var EAR_THRESH  = 0.22;   /* < this = eyes closed          */
var CLOSED_MIN  = 2;      /* consecutive closed frames needed */
var CAPTURE_LAG = 80;     /* ms after eye-open to snap photo  */

/* ═══════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════ */
var captured     = false;
var closedCount  = 0;
var eyeWasClosed = false;
var frameCount   = 0;
var rafId        = null;
var fm           = null;   /* FaceMesh instance */

/* ═══════════════════════════════════════════════════
   DOM
═══════════════════════════════════════════════════ */
var vid      = document.getElementById('vid');
var guide    = document.getElementById('oval-guide');
var tip      = document.getElementById('tip');

/* ═══════════════════════════════════════════════════
   LOGGING  (console + postMessage only — no on-screen output)
═══════════════════════════════════════════════════ */
function log(msg, level){
  level = level || 'info';
  postUp({type:'log', level:level, message:msg});
}

function logOk  (m){ log(m,'ok');    }
function logWarn(m){ log(m,'warn');  }
function logErr (m){ log(m,'error'); }

/* ═══════════════════════════════════════════════════
   postMessage bridge (RN WebView + iframe parent)
═══════════════════════════════════════════════════ */
function postUp(obj){
  var s = JSON.stringify(obj);
  if(window.ReactNativeWebView){
    window.ReactNativeWebView.postMessage(s);
  } else {
    try{ window.parent.postMessage(s,'*'); }catch(e){}
    try{ window.postMessage(s,'*'); }catch(e){}
  }
}

/* ═══════════════════════════════════════════════════
   UI helpers
═══════════════════════════════════════════════════ */
function showFatal(msg){
  logErr(msg);
  tip.textContent = '⚠ Error';
  tip.style.color = '#f87171';
  postUp({type:'error', message:msg});
}

/* ═══════════════════════════════════════════════════
   EAR math
═══════════════════════════════════════════════════ */
function dist(a,b){
  return Math.sqrt((a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y));
}
function ear(lm,idx){
  var p = idx.map(function(i){ return lm[i]; });
  return (dist(p[1],p[5])+dist(p[2],p[4]))/(2*dist(p[0],p[3]));
}

/* ═══════════════════════════════════════════════════
   Capture frame → send base64 JPEG
═══════════════════════════════════════════════════ */
function capture(){
  if(captured) return;
  captured = true;
  if(rafId){ cancelAnimationFrame(rafId); rafId=null; }

  tip.textContent = '📸 Capturing…';

  try{
    var cap = document.createElement('canvas');
    cap.width  = vid.videoWidth  || 640;
    cap.height = vid.videoHeight || 480;

    var ctx = cap.getContext('2d');
    /* flip back to natural (un-mirrored) for server */
    ctx.translate(cap.width,0);
    ctx.scale(-1,1);
    ctx.drawImage(vid,0,0);

    var dataUrl = cap.toDataURL('image/jpeg',0.88);

    tip.textContent = '✓ Sending…';
    postUp({type:'photo', data:dataUrl});
  }catch(e){
    showFatal('Capture failed: '+(e&&e.message||String(e)));
  }
}

/* ═══════════════════════════════════════════════════
   FaceMesh results → EAR blink detection
═══════════════════════════════════════════════════ */
function onResults(res){
  if(captured) return;

  var lms = res && res.multiFaceLandmarks;
  var hasFace = lms && lms.length > 0;

  if(!hasFace){
    guide.className = '';
    tip.textContent = 'Position your face in the oval';
    closedCount  = 0;
    eyeWasClosed = false;
    return;
  }

  guide.className = 'face';
  var lm  = lms[0];
  var lEAR = ear(lm, L_EYE);
  var rEAR = ear(lm, R_EYE);
  var avg  = (lEAR + rEAR) / 2;
  frameCount++;

  if(avg < EAR_THRESH){
    closedCount++;
    if(closedCount === CLOSED_MIN){
      eyeWasClosed = true;
      guide.className = 'blink';
      tip.textContent = '👁 Blinking…';
    }
  } else {
    if(eyeWasClosed){
      setTimeout(capture, CAPTURE_LAG);
    }
    eyeWasClosed = false;
    closedCount  = 0;
    if(!captured){
      tip.textContent = 'Blink once to verify';
      guide.className = 'face';
    }
  }
}

/* ═══════════════════════════════════════════════════
   RAF frame loop  (replaces broken camera_utils)
═══════════════════════════════════════════════════ */
function frameLoop(){
  if(captured){ return; }
  if(fm && vid.readyState >= 2 && vid.videoWidth > 0){
    fm.send({image: vid}).catch(function(){});
  }
  rafId = requestAnimationFrame(frameLoop);
}

/* ═══════════════════════════════════════════════════
   Script loader
═══════════════════════════════════════════════════ */
function loadScript(src){
  return new Promise(function(resolve, reject){
    var s = document.createElement('script');
    s.src = src;
    s.onload  = resolve;
    s.onerror = function(){ reject(new Error('Script load failed: '+src)); };
    document.head.appendChild(s);
  });
}

/* ═══════════════════════════════════════════════════
   BOOT sequence
═══════════════════════════════════════════════════ */
async function boot(){
  /* 1 — load FaceMesh JS */
  try{
    await loadScript(FM_CDN+'/face_mesh.js');
  }catch(e){
    showFatal('face_mesh.js load error: '+(e&&e.message));
    return;
  }

  /* 2 — camera */
  var stream;
  try{
    stream = await navigator.mediaDevices.getUserMedia({
      video:{ facingMode:'user', width:{ideal:640}, height:{ideal:480} },
      audio:false
    });
  }catch(e){
    showFatal('Camera error ('+e.name+'): '+e.message);
    return;
  }

  vid.srcObject = stream;
  await new Promise(function(r){ vid.onloadedmetadata = r; });

  /* 3 — FaceMesh init */
  try{
    fm = new window.FaceMesh({
      locateFile: function(f){ return FM_CDN+'/'+f; }
    });
    fm.setOptions({
      maxNumFaces:      1,
      refineLandmarks:  true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence:  0.5
    });
    fm.onResults(onResults);
    await fm.send({image:vid});
  }catch(e){
    showFatal('FaceMesh init error: '+(e&&e.message));
    return;
  }

  /* 4 — start RAF loop */
  tip.textContent = 'Look straight and blink once';
  frameLoop();
}

boot().catch(function(e){
  showFatal('Unhandled boot error: '+(e&&e.message||String(e)));
});

})();
</script>
</body>
</html>`;
