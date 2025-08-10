let mediaRecorder;
let recordedChunks = [];
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const status = document.getElementById('status');
const recordingIndicator = document.getElementById('recordingIndicator');

const videoConstraints = {
    video: {
        width: 1920,
        height: 1080,
        frameRate: { ideal: 60 }
    }
};

startBtn.addEventListener('click', async () => {
    try {
        // Get screen capture with system audio
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: videoConstraints,
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });

        // Filter out audio tracks that might be from microphone
        const audioTracks = stream.getAudioTracks();
        audioTracks.forEach(track => {
            if (track.label.toLowerCase().includes('microphone')) {
                track.enabled = false;
            }
        });

        // Configure MediaRecorder with high quality settings
        const options = {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 25000000, // 25 Mbps
        };

        mediaRecorder = new MediaRecorder(stream, options);
        recordedChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            a.href = url;
            a.download = `recording-${timestamp}.webm`;
            a.click();
            URL.revokeObjectURL(url);
            status.textContent = 'Recording saved!';
            recordingIndicator.style.display = 'none';
            startBtn.disabled = false;
            stopBtn.disabled = true;
        };

        // Start recording
        mediaRecorder.start(1000); // Create chunks every second
        status.textContent = 'Recording...';
        recordingIndicator.style.display = 'block';
        startBtn.disabled = true;
        stopBtn.disabled = false;

        // Handle stream stop
        stream.getVideoTracks()[0].onended = () => {
            if (mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
            }
        };
    } catch (error) {
        console.error('Error:', error);
        status.textContent = 'Error starting recording. Please try again.';
    }
});

stopBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
});
