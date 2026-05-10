import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Transition() {
    const navigate = useNavigate();
    const videoRef = useRef(null);

    const handleVideoEnd = () => {
        if (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')) {
            navigate('/AppHome');
        } else {
            window.location.href = 'https://app.thermalai.eu';
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden">
            <video 
                ref={videoRef}
                src="/videos/Short clip to open app.mp4" 
                className="w-full h-full object-cover"
                autoPlay 
                playsInline
                onEnded={handleVideoEnd}
            />
            {/* Fallback skip button just in case */}
            <button 
                onClick={handleVideoEnd}
                className="absolute bottom-8 right-8 text-white/50 hover:text-white bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm transition-all"
            >
                Skip
            </button>
        </div>
    );
}
