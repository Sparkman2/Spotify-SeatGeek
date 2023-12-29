import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './NowPlaying.css';

const NowPlaying = ({ token, isPlaying }) => {
    const [currentTrack, setCurrentTrack] = useState(null);
    const [trackPosition, setTrackPosition] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentTrackId, setCurrentTrackId] = useState(null);

    const getCurrentTrack = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`http://localhost:3000/current_playing?token=${encodeURIComponent(token)}`);
            setCurrentTrack(response.data);
            setTrackPosition(response.data.progress_ms);
            setCurrentTrackId(response.data.item.id);
            setError(null);
        } catch (error) {
            console.error('Error fetching currently playing track:', error);
            setError(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const trackChangeCheckInterval = setInterval(async () => {
            if (token) {
                const response = await axios.get(`http://localhost:3000/current_playing?token=${encodeURIComponent(token)}`);
                if (response.data && response.data.item.id !== currentTrackId) {
                    getCurrentTrack();
                }
            }
        }, 1000);
        return () => clearInterval(trackChangeCheckInterval);
    }, [token, currentTrackId]);

    const formatTime = (ms) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    useEffect(() => {
        if (token) {
            getCurrentTrack();
        }
    }, [token]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (token && currentTrack && isPlaying) {
                setTrackPosition((prevPosition) => prevPosition + 1000);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [token, currentTrack, isPlaying]);

    const handleSliderChange = async (event) => {
        const newPosition = parseInt(event.target.value, 10);
        setTrackPosition(newPosition);
        try {
            await axios.put('http://localhost:3000/seek', { token, position_ms: newPosition });
        } catch (error) {
            console.error('Error seeking in track:', error);
        }
    };

    useEffect(() => {
        if (currentTrack && currentTrack.item) {
            const progressPercent = (trackPosition / currentTrack.item.duration_ms) * 100;
            document.documentElement.style.setProperty('--progress-percent', `${progressPercent}%`);
        }
    }, [trackPosition, currentTrack]);

    if (error) {
        return <div>Error: {error.message}</div>;
    }

    if (!currentTrack || !currentTrack.is_playing) {
        return <div></div>;
    }

    return (
        <div className="now-playing">
            <div className="track-container">
                <img src={currentTrack.item.album.images[0].url} alt={currentTrack.item.name} className="album-art" />
                <div className="track-details">
                    <strong>{currentTrack.item.name}</strong>
                    <p>{currentTrack.item.artists.map(artist => artist.name).join(', ')}</p>
                </div>
            </div>
            <div className="slider-container">
                <span>{formatTime(trackPosition)}</span>
                <input
                    type="range"
                    min="0"
                    max={currentTrack ? currentTrack.item.duration_ms : 0}
                    value={trackPosition}
                    onChange={handleSliderChange}
                />
                <span>{currentTrack ? formatTime(currentTrack.item.duration_ms) : '0:00'}</span>
            </div>
        </div>
    );
};

export default NowPlaying;
