import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import PlaybackControls from './PlaybackControls';
import NowPlaying from './NowPlaying';
import './SpotifyAuth.css';
import Concerts from './Concert';

const SpotifyAuth = () => {
    const [token, setToken] = useState(localStorage.getItem('spotify_token'));
    const [refreshToken, setRefreshToken] = useState(localStorage.getItem('spotify_refresh_token'));
    const [refresh, setRefresh] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [artistImage, setArtistImage] = useState('');
    const [currentTrackId, setCurrentTrackId] = useState(null);
    const [nextArtistImage, setNextArtistImage] = useState('');
    const [showArtistImage, setShowArtistImage] = useState(false);
    const [currentArtist, setCurrentArtist] = useState('');
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        const hash = window.location.hash.substring(1).split('&').reduce((initial, item) => {
            let parts = item.split('=');
            initial[parts[0]] = decodeURIComponent(parts[1]);
            return initial;
        }, {});

        if (hash.access_token) {
            localStorage.setItem('spotify_token', hash.access_token);
            setToken(hash.access_token);
            if (hash.refresh_token) {
                localStorage.setItem('spotify_refresh_token', hash.refresh_token);
                setRefreshToken(hash.refresh_token);
            }
        }

        if (!token) {
            window.location.href = 'http://localhost:3000/login';
        }
    }, [token]);

    const refreshTokenIfNeeded = async () => {
        if (!refreshToken) return;
        try {
            const response = await axios.get(`http://localhost:3000/refresh_token?refresh_token=${refreshToken}`);
            const { access_token } = response.data;
            localStorage.setItem('spotify_token', access_token);
            setToken(access_token);
        } catch (error) {
            console.error('Error refreshing token', error);
            localStorage.removeItem('spotify_token');
            localStorage.removeItem('spotify_refresh_token');
            window.location.href = 'http://localhost:3000/login';
        }
    };

    const checkTokenValidity = async () => {
        if (!token) return;
        try {
            await axios.get('https://api.spotify.com/v1/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            if (error.response && error.response.status === 401) {
                await refreshTokenIfNeeded();
            }
        }
    };

    useEffect(() => {
        checkTokenValidity();
    }, [token]);

    const handlePlaybackError = async (error) => {
        if (error.response && error.response.status === 401) {
            await refreshTokenIfNeeded();
        } else {
            console.error('Error controlling playback', error);
        }
    };

    const getUserProfile = async () => {
        try {
            const response = await axios.get('https://api.spotify.com/v1/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setUserProfile(response.data);
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    };

    useEffect(() => {
        if (token) {
            getUserProfile();
        }
    }, [token]);

    const handleLogout = useCallback(() => {
        localStorage.removeItem('spotify_token');
        localStorage.removeItem('spotify_refresh_token');
        setUserProfile(null);
        window.location.href = 'http://localhost:3000/login';
    }, []);

    const getCurrentTrack = async () => {
        if (!token) return;
        try {
            const response = await axios.get(`http://localhost:3000/current_playing?token=${encodeURIComponent(token)}`);
            if (response.data && response.data.item) {
                if (response.data.item.id !== currentTrackId) {
                    setCurrentTrackId(response.data.item.id);
                    fetchArtistImage(response.data.item.artists[0].id);
                    setCurrentArtist(response.data.item.artists[0].name);
                }
            }
        } catch (error) {
            console.error('Error fetching currently playing track:', error);
        }
    };

    const fetchArtistImage = async (artistId) => {
        try {
            const response = await axios.get(`http://localhost:3000/artist/${artistId}?token=${encodeURIComponent(token)}`);
            const images = response.data.images;
            let newImageUrl = '';
            if (images && images.length > 1) {
                newImageUrl = images[0].url;
            } else if (images.length > 0) {
                newImageUrl = images[0].url;
            }

            const imageToLoad = new Image();
            imageToLoad.src = newImageUrl;
            imageToLoad.onload = () => {
                if (newImageUrl !== artistImage) {
                    setNextArtistImage(newImageUrl);
                    setShowArtistImage(true);
                }
            };
        } catch (error) {
            console.error('Error fetching artist image:', error);
        }
    };

    const playMusic = async () => {
        try {
            await axios.put('http://localhost:3000/play', { token: token });
            setIsPlaying(true);
        } catch (error) {
            handlePlaybackError(error);
        }
    };

    const pauseMusic = async () => {
        try {
            await axios.put('http://localhost:3000/pause', { token: token });
            setIsPlaying(false);
        } catch (error) {
            handlePlaybackError(error);
        }
    };

    const togglePlayPause = async () => {
        if (isPlaying) {
            await pauseMusic();
        } else {
            await playMusic();
        }
        setIsPlaying(!isPlaying);
    };

    const nextTrack = async () => {
        try {
            await axios.post('http://localhost:3000/next', { token: token });
            setRefresh((prev) => prev + 1);
        } catch (error) {
            handlePlaybackError(error);
        }
    };

    const previousTrack = async () => {
        try {
            await axios.post('http://localhost:3000/previous', { token: token });
            setRefresh((prev) => prev + 1);
        } catch (error) {
            handlePlaybackError(error);
        }
    };

    useEffect(() => {
        if (nextArtistImage && nextArtistImage !== artistImage) {
            setShowArtistImage(true);

            const timeout = setTimeout(() => {
                setArtistImage(nextArtistImage);
                setShowArtistImage(false);
            }, 1000);

            return () => clearTimeout(timeout);
        }
    }, [nextArtistImage]);

    useEffect(() => {
        getCurrentTrack();
    }, [token, refresh]);

    useEffect(() => {
        const trackCheckInterval = setInterval(() => {
            getCurrentTrack();
        }, 1000);

        return () => clearInterval(trackCheckInterval);
    }, [token, currentTrackId]);

    return (
        <div className="spotify-auth">
            <div className="current-artist-image" style={{ backgroundImage: `url(${artistImage})`, opacity: showArtistImage ? 0 : 1 }}></div>
            <div className="next-artist-image" style={{ backgroundImage: `url(${nextArtistImage})`, opacity: showArtistImage ? 1 : 0 }}></div>
            {!token ? (
                <div>
                    <h2>Please log in to Spotify</h2>
                    <button onClick={() => window.location.href = 'http://localhost:3000/login'}>
                        Log in with Spotify
                    </button>
                </div>
            ) : (
                <div className="content">
                    <div className="now-playing-container">
                        <NowPlaying token={token} key={refresh} isPlaying={isPlaying} />
                    </div>
                    <div className="playback-controls-container">
                        <PlaybackControls
                            token={token}
                            onTogglePlayPause={togglePlayPause}
                            onNext={nextTrack}
                            onPrevious={previousTrack}
                            isPlaying={isPlaying}
                        />
                    </div>
                    <div className="concerts-container">
                        <Concerts artistName={currentArtist} />
                    </div>
                    {userProfile && (
                        <div className="user-profile">
                            <div className="user-name">Hi {userProfile.display_name}!</div>
                            <img src={userProfile.images[1]?.url} alt={userProfile.display_name} className="user-image" />
                            <div onClick={handleLogout} className="logout-button">Logout</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SpotifyAuth;
