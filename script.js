let videoWidth, videoHeight;
let canvasRect;
// whether streaming video from the camera.
let streaming = false;

let video = document.getElementById('video');
let canvasOutput = document.getElementById('canvasOutput');
let canvasOutputCtx = canvasOutput.getContext('2d');
let stream = null;

let detectFace = document.getElementById('face');
let detectEye = document.getElementById('eye');

let ball = {
    width: 10,
    height: 10,
    x: 1,
    y: 1,
    directionX: 2.5,
    directionY: 2.5
}


function startCamera() {
    if (streaming) return;
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(function (s) {
            stream = s;
            video.srcObject = s;
            video.play();
        })
        .catch(function (err) {
            console.log("An error occured! " + err);
        });

    video.addEventListener("canplay", function (ev) {
        if (!streaming) {
            videoWidth = video.videoWidth;
            videoHeight = video.videoHeight;
            video.setAttribute("width", videoWidth);
            video.setAttribute("height", videoHeight);
            canvasOutput.width = videoWidth;
            canvasOutput.height = videoHeight;
            streaming = true;
        }
        startVideoProcessing();
    }, false);
}

let faceClassifier = null;
let eyeClassifier = null;

let src = null;
let dstC1 = null;
let dstC3 = null;
let dstC4 = null;

let canvasInput = null;
let canvasInputCtx = null;

let canvasBuffer = null;
let canvasBufferCtx = null;

function startVideoProcessing() {
    if (!streaming) { console.warn("Please startup your webcam"); return; }
    stopVideoProcessing();
    canvasInput = document.createElement('canvas');
    canvasInput.width = videoWidth;
    canvasInput.height = videoHeight;
    canvasInputCtx = canvasInput.getContext('2d');

    canvasBuffer = document.createElement('canvas');
    canvasBuffer.width = videoWidth;
    canvasBuffer.height = videoHeight;
    canvasBufferCtx = canvasBuffer.getContext('2d');

    srcMat = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC4);
    grayMat = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC1);

    faceClassifier = new cv.CascadeClassifier();
    faceClassifier.load('haarcascade_frontalface_default.xml');

    eyeClassifier = new cv.CascadeClassifier();
    eyeClassifier.load('haarcascade_eye.xml');

    canvasRect = document.getElementById("canvasOutput").getBoundingClientRect();
    // console.log(canvasRect.top, canvasRect.right, canvasRect.bottom, canvasRect.left);
    requestAnimationFrame(processVideo);
}

function processVideo() {
    stats.begin();
    canvasInputCtx.drawImage(video, 0, 0, videoWidth, videoHeight);
    let imageData = canvasInputCtx.getImageData(0, 0, videoWidth, videoHeight);
    srcMat.data.set(imageData.data);
    cv.cvtColor(srcMat, grayMat, cv.COLOR_RGBA2GRAY);
    let faces = [];
    let balls = [];
    let eyes = [];
    let size;


    let faceVect = new cv.RectVector();
    let faceMat = new cv.Mat();

    cv.pyrDown(grayMat, faceMat);
    cv.pyrDown(faceMat, faceMat);
    size = faceMat.size();

    faceClassifier.detectMultiScale(faceMat, faceVect);
    for (let i = 0; i < faceVect.size(); i++) {
        let face = faceVect.get(i);
        let ballPos = getBall(face, ball)
        faces.push(new cv.Rect(face.x, face.y, face.width, face.height));
        balls.push(new cv.Rect(ballPos.x, ballPos.y, ballPos.width, ballPos.height));

    }
    faceMat.delete();
    faceVect.delete();

    canvasOutputCtx.drawImage(canvasInput, 0, 0, videoWidth, videoHeight);
    drawResults(canvasOutputCtx, faces, 'red', size);
    drawResults(canvasOutputCtx, eyes, 'yellow', size);
    drawResults(canvasOutputCtx, balls, 'green', size);
    stats.end();
    requestAnimationFrame(processVideo);
}

function getBall(face, ball) {

    let headSide = elementsOverlap(face, ball)

    if (headSide === "left" || headSide === "right") {
        ball.directionX = -1 * ball.directionX;
    } else if (headSide === "top" || headSide === "bottom") {
        ball.directionY = -1 * ball.directionY;
    }

    let side = elementsDontOverlap(canvasRect, ball);

    if (side === "bottom" || side === "top") {
        ball.directionY = -1 * ball.directionY;
    } else if (side === "left" || side === "right") {
        ball.directionX = -1 * ball.directionX;
    }

    ball.x += ball.directionX;
    ball.y += ball.directionY;
    return ball
}

function elementsOverlap(box1, box2) {

    if ((box2.x + box2.width > box1.x) && (box2.x + box2.width < box1.x + box1.width) && ((box2.y > box1.y) && (box2.y < (box1.y + box1.height))) && (box2.y + box2.height > box1.y)) {
        return "left"
    } else if ((box2.x < (box1.x + box1.width)) && (box2.x > box1.x) && ((box2.y > box1.y) && (box2.y < (box1.y + box1.height))) && ((box2.y + box2.height) > box1.y)) {
        return "right"
    } else if ((box2.y + box2.height > box1.y) && (box2.y + box2.height < box1.y + box1.height) && ((box2.x > box1.x) && (box2.x < (box1.x + box1.width))) && (box2.x + box2.width > box1.x)) {
        return "top"
    } else if (box2.y > box1.y + box1.height) {
        return "bottom"
    }

}
function elementsDontOverlap(box1, box2) {

    if ((box1.width / 4) < (box2.x + box2.width)) {
        return "right"
    } else if (box2.x < 1) {
        return "left"
    } else if ((box1.height / 4) < (box2.y + box2.height)) {
        return "bottom"
    } else if (box2.y < 1) {
        return "top"
    }

    return null
}
function drawResults(ctx, results, color, size) {
    for (let i = 0; i < results.length; ++i) {
        let rect = results[i];
        let xRatio = videoWidth / size.width;
        let yRatio = videoHeight / size.height;
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.strokeRect(rect.x * xRatio, rect.y * yRatio, rect.width * xRatio, rect.height * yRatio);
    }
}

function stopVideoProcessing() {
    if (src != null && !src.isDeleted()) src.delete();
    if (dstC1 != null && !dstC1.isDeleted()) dstC1.delete();
    if (dstC3 != null && !dstC3.isDeleted()) dstC3.delete();
    if (dstC4 != null && !dstC4.isDeleted()) dstC4.delete();
}

function stopCamera() {
    if (!streaming) return;
    stopVideoProcessing();
    document.getElementById("canvasOutput").getContext("2d").clearRect(0, 0, width, height);
    video.pause();
    video.srcObject = null;
    stream.getVideoTracks()[0].stop();
    streaming = false;
}

function initUI() {
    stats = new Stats();
    stats.showPanel(0);
    document.getElementById('container').appendChild(stats.dom);
}

function opencvIsReady() {
    console.log('OpenCV.js is ready');
    initUI();
    startCamera();
}