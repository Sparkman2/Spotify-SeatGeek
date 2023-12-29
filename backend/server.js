const express = require('express');
const axios = require('axios');
const cors = require('cors');
const querystring = require('querystring');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json()); 

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback'; // Make sure this matches the URI registered on the Spotify dashboard

app.get('/login', (req, res) => {
  const scope = 'user-read-private user-read-email user-read-playback-state streaming user-modify-playback-state user-read-currently-playing user-read-recently-played';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI
    }));
});

app.get('/callback', (req, res) => {
  const code = req.query.code || null;

  axios({
    method: 'post',
    url: 'https://accounts.spotify.com/api/token',
    data: querystring.stringify({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI
    }),
    headers: {
      'Authorization': 'Basic ' + (new Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')),
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
    .then(response => {
    if (response.status === 200) {
      const { access_token, refresh_token } = response.data;
      // Store the refresh token securely and use it to get a new access token when the current one expires
      res.redirect(`http://localhost:3001/#access_token=${access_token}&refresh_token=${refresh_token}`);
    } else {
      // ... existing error handling code ...
    }
  })
  .catch(error => {
    // ... existing error handling code ...
  });
});

// Endpoint to refresh the access token
app.get('/refresh_token', (req, res) => {
  const refreshToken = req.query.refresh_token;
  axios({
    method: 'post',
    url: 'https://accounts.spotify.com/api/token',
    data: querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }),
    headers: {
      'Authorization': 'Basic ' + (new Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')),
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  })
  .then(response => {
    if (response.status === 200) {
      const { access_token } = response.data;
      res.send({ access_token });
    } else {
      res.status(500).send('Error refreshing token');
    }
  })
  .catch(error => {
    res.status(500).send('Error refreshing token');
  });
});

makeSpotifyApiRequest = async (url, method, accessToken) => {
  try {
    const response = await axios({
      method: method,
      url: url,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error in Spotify API Request:', error.message);
    throw error;
  }
};

// Play music
app.put('/play', async (req, res) => {
  try {
    await makeSpotifyApiRequest('https://api.spotify.com/v1/me/player/play', 'PUT', req.body.token);
    res.status(200).send('Playback started');
  } catch (error) {
    res.status(500).send('Error starting playback');
  }
});

// Pause music
app.put('/pause', async (req, res) => {
  try {
    await makeSpotifyApiRequest('https://api.spotify.com/v1/me/player/pause', 'PUT', req.body.token);
    res.status(200).send('Playback paused');
  } catch (error) {
    res.status(500).send('Error pausing playback');
  }
});

// Skip to next track
app.post('/next', async (req, res) => {
  try {
    await makeSpotifyApiRequest('https://api.spotify.com/v1/me/player/next', 'POST', req.body.token);
    res.status(200).send('Skipped to next track');
  } catch (error) {
    res.status(500).send('Error skipping track');
  }
});

// Skip to previous track
app.post('/previous', async (req, res) => {
  try {
    await makeSpotifyApiRequest('https://api.spotify.com/v1/me/player/previous', 'POST', req.body.token);
    res.status(200).send('Skipped to previous track');
  } catch (error) {
    res.status(500).send('Error going to previous track');
  }
});

// Get the currently playing track
app.get('/current_playing', async (req, res) => {
  const accessToken = req.query.token;
  try {
    const spotifyResponse = await makeSpotifyApiRequest('https://api.spotify.com/v1/me/player/currently-playing', 'GET', accessToken);

    console.log('Spotify API Response:', spotifyResponse); // Log the response

    if(spotifyResponse && spotifyResponse.is_playing) {
      res.send(spotifyResponse);
    } else {
      res.status(204).send('No track is currently playing.'); // Handle case where no track is playing
    }
  } catch (error) {
    console.error('Error fetching currently playing track:', error.response || error.message);
    res.status(500).send('Error fetching currently playing track');
  }
});

app.get('/logout', (req, res) => {
    // Here you can handle any server-side logout logic if necessary
    // Redirect to the Spotify login page
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: CLIENT_ID,
            scope: 'user-read-private user-read-email user-read-playback-state streaming',
            redirect_uri: REDIRECT_URI
        }));
});

// Seek to position in currently playing track
app.put('/seek', async (req, res) => {
    const { token, position_ms } = req.body;
    try {
        await makeSpotifyApiRequest(`https://api.spotify.com/v1/me/player/seek?position_ms=${position_ms}`, 'PUT', token);
        res.status(200).send('Seek successful');
    } catch (error) {
        console.error('Error seeking in track:', error.message);
        res.status(500).send('Error seeking in track');
    }
});

// Get artist data
app.get('/artist/:id', async (req, res) => {
  const accessToken = req.query.token;
  const artistId = req.params.id;

  try {
    const artistData = await makeSpotifyApiRequest(`https://api.spotify.com/v1/artists/${artistId}`, 'GET', accessToken);
    res.send(artistData);
  } catch (error) {
    console.error('Error fetching artist data:', error.message);
    res.status(500).send('Error fetching artist data');
  }
});


const SEATGEEK_CLIENT_ID = process.env.SEATGEEK_CLIENT_ID;
const SEATGEEK_CLIENT_SECRET = process.env.SEATGEEK_CLIENT_SECRET;

// Function to make requests to the SeatGeek API
const makeSeatGeekApiRequest = async (artistName) => {
  try {
    const response = await axios.get(`https://api.seatgeek.com/2/events`, {
      params: {
        client_id: SEATGEEK_CLIENT_ID,
        client_secret: SEATGEEK_CLIENT_SECRET,
        q: artistName // 'q' is typically used for search queries, but check SeatGeek API documentation for exact parameter
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error in SeatGeek API Request:', error.message);
    throw error;
  }
};

// Endpoint to search for concerts based on the artist's name
app.get('/search-concerts', async (req, res) => {
  const artistName = req.query.artist;
  if (!artistName) {
    return res.status(400).send('Artist name is required');
  }

  try {
    const eventsData = await makeSeatGeekApiRequest(artistName);
    res.json(eventsData);
  } catch (error) {
    res.status(500).send('Error searching for concerts');
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});