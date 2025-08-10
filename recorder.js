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

// Check if the browser supports the necessary codecs
async function checkCodecSupport() {
    const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm'
    ];

    for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
            return mimeType;
        }
    }
    throw new Error('No supported mime types found');
}

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
        const supportedMimeType = await checkCodecSupport();
        const options = {
            mimeType: supportedMimeType,
            videoBitsPerSecond: 25000000, // 25 Mbps
            audioBitsPerSecond: 128000 // 128 kbps for audio
        };

        mediaRecorder = new MediaRecorder(stream, options);
        recordedChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());

            // Ensure we have chunks to process
            if (recordedChunks.length === 0) {
                status.textContent = 'Error: No data recorded';
                return;
            }

            // Create blob and verify its size
            const blob = new Blob(recordedChunks, { type: supportedMimeType });
            if (blob.size === 0) {
                status.textContent = 'Error: Recording is empty';
                return;
            }

            try {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                a.href = url;
                a.download = `recording-${timestamp}.webm`;
                document.body.appendChild(a); // Append to body to ensure it works
                a.click();
                document.body.removeChild(a); // Clean up
                URL.revokeObjectURL(url);
                status.textContent = `Recording saved! (${(blob.size / (1024 * 1024)).toFixed(2)} MB)`;
            } catch (error) {
                status.textContent = 'Error saving recording: ' + error.message;
                console.error('Error saving:', error);
            }

            recordingIndicator.style.display = 'none';
            startBtn.disabled = false;
            stopBtn.disabled = true;
        };

        // Start recording with smaller chunk interval for better reliability
        mediaRecorder.start(100); // Create chunks every 100ms
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
