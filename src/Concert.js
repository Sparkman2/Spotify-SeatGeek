import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Concert.css'

const Concerts = ({ artistName }) => {
    const [concerts, setConcerts] = useState([]);

    useEffect(() => {
        if (artistName) {
            fetchConcerts(artistName);
        }
    }, [artistName]);

    const fetchConcerts = async (artist) => {
        try {
            const response = await axios.get(`http://localhost:3000/search-concerts?artist=${encodeURIComponent(artist)}`);
            setConcerts(response.data.events || []);
        } catch (error) {
            console.error('Error fetching concerts:', error);
            setConcerts([]);
        }
    };

    const formatDate = (datetime) => {
        const date = new Date(datetime);
        const day = date.toLocaleDateString('en-US', {weekday: 'short'});
        const time = date.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true});
        return <span className="concert-time">{`${day} · ${time}`}</span>;
    };


    return (
        <div className="concerts-section">
            <p className="concert_title"> All {artistName} Concerts</p>
            <div className="concerts-container">
                    {concerts.length > 0 ? (
                        concerts.map((concert, index) => (
                            <div key={index} className="concert-button" onClick={() => window.open(concert.url, '_blank')}>
                                <div className="concert-info">
                                <span className="concert-date">
                                    {new Date(concert.datetime_local).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </span>
                                    <span className="concert-title">{concert.title}</span>
                                </div>
                                <div className="concert-details">
                                    {formatDate(concert.datetime_local)} <span
                                    className="venue-info">{concert.venue.name} - {concert.venue.city}, {concert.venue.state}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="no-concerts-message">No concerts found for {artistName}</p>
                    )}
            </div>
        </div>
    );
};
export default Concerts;
