import React from 'react';
import './PlaybackControls.css'; // Import the CSS file
import pausebutton from './pause.png';
import playbutton from './play.png';
import previousbutton from './previous.png';
import nextbutton from './next.png';

const PlaybackControls = ({ onTogglePlayPause, onNext, onPrevious, isPlaying }) => {
    return (
        <div className="playback-controls">
            <button onClick={onPrevious}>
                <img src={previousbutton} alt="Previous" />
            </button>
            <button onClick={onTogglePlayPause} className="play-button">
                <img
                    src={isPlaying ? playbutton : pausebutton}
                    alt={isPlaying ? 'Play' : 'Pause'}
                />
            </button>
            <button onClick={onNext}>
                <img src={nextbutton} alt="Next" />
            </button>
        </div>
    );
};

export default PlaybackControls;
