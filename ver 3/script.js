// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyALqvFhmgmS1LMknNvcqpvLsxZdTniecTQ",
    authDomain: "esp32-gps-e89ee.firebaseapp.com",
    databaseURL: "https://esp32-gps-e89ee-default-rtdb.firebaseio.com",
    projectId: "esp32-gps-e89ee",
    storageBucket: "esp32-gps-e89ee.appspot.com",
    messagingSenderId: "272927632154",
    appId: "1:272927632154:web:72f94dd3692a948af8daa3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Utility function to calculate the distance between two coordinates using the Haversine formula
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);  // deg2rad below
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    const d = R * c; // Distance in km
    return d * 1000; // Convert to meters
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Function to update the range value
function updateRangeValue() {
    const range = document.getElementById('range').value;
    document.getElementById('rangeValue').textContent = range;
}

// Function to fetch location from Firebase
async function fetchLocationFromFirebase() {
    try {
        const snapshot = await database.ref('/gps').once('value');
        const location = snapshot.val();
        console.log('Fetched location from Firebase:', location);
        if (!location) {
            throw new Error('No location data available in Firebase.');
        }
        return {
            latitude: location.latitude,
            longitude: location.longitude
        };
    } catch (error) {
        console.error('Error fetching location from Firebase:', error);
        throw error;
    }
}

// Main container functionality
async function calculateMainContainerDistance() {
    try {
        const range = document.getElementById('range').value;

        // Get user's current location
        const position = await getCurrentPosition();
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        console.log('User position:', { latitude: userLat, longitude: userLon });

        // Fetch location from Firebase
        const firebaseLocation = await fetchLocationFromFirebase();
        const firebaseLat = firebaseLocation.latitude;
        const firebaseLon = firebaseLocation.longitude;
        console.log('Firebase position:', { latitude: firebaseLat, longitude: firebaseLon });

        // Calculate the distance
        const distance = getDistanceFromLatLonInKm(userLat, userLon, firebaseLat, firebaseLon);
        
        // Display the result
        document.getElementById('result').innerHTML = `Distance: ${distance.toFixed(2)} meters`;

        // Check if the distance is within the specified range
        const statusElement = document.getElementById('status');
        const mainContainer = document.getElementById('mainContainer'); // Get the main container
        if (distance <= range) {
            statusElement.innerHTML = "In Range";
            statusElement.className = "in-range";
            mainContainer.style.border = "1px solid green"; // In range, border is green
        } else {
            statusElement.innerHTML = "Out of Range";
            statusElement.className = "out-of-range";
            mainContainer.style.border = "1px solid red"; // Out of range, border is red
            playAlertSound();
        }
    } catch (error) {
        console.error("Error getting location or calculating distance:", error);
        document.getElementById('result').innerHTML = "Error: " + error.message;
    }

    // Repeat the function after a short delay
    setTimeout(calculateMainContainerDistance, 5000); // Repeat every 5 seconds
}

// Function to get the current position of the user
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        } else {
            reject(new Error("Geolocation is not supported by this browser."));
        }
    });
}

// Function to play an alert sound
let audio = null; // Initialize audio variable
function playAlertSound() {
    if (!audio || audio.paused) { // Check if audio is not playing
        audio = new Audio('alert.mp3');
        audio.play();
    }
}

// Function to stop the audio alert
function stopAlertSound() {
    if (audio) {
        audio.pause();
    }
}

// Initialize the range value and start calculating distance for the main container
document.addEventListener('DOMContentLoaded', () => {
    updateRangeValue();
    calculateMainContainerDistance();
    initMap(); // Initialize the map
});

// Variables for lock state and database location for geolocation container
let locked = false;
let databaseLocation = null;

// Function to fetch location from Firebase when locked
async function fetchDatabaseLocation() {
    try {
        const snapshot = await database.ref('/gps').once('value');
        const location = snapshot.val();
        console.log('Fetched location from Firebase:', location);
        if (!location) {
            throw new Error('No location data available in Firebase.');
        }
        return {
            latitude: location.latitude,
            longitude: location.longitude
        };
    } catch (error) {
        console.error('Error fetching location from Firebase:', error);
        throw error;
    }
}

// Function to check if the database location moves 10 meters from current location when locked
function checkDatabaseLocation() {
    if (locked && databaseLocation) {
        // Fetch location from Firebase
        fetchDatabaseLocation().then(location => {
            const distanceFromLocked = getDistanceFromLatLonInKm(location.latitude, location.longitude, databaseLocation.latitude, databaseLocation.longitude);
            const statusText = document.getElementById('statusText');
            const rangeFromLocked = document.getElementById('rangeFromLocked');
            if (distanceFromLocked > 10) { // 10 meters
                // Database location has moved more than 10 meters
                statusText.textContent = 'Not Safe';
                rangeFromLocked.textContent = `Out of Range from Locked Location: ${distanceFromLocked.toFixed(2)} meters`;
                document.getElementById('geolocation').style.border = '1px solid red'; // Change border color
                playAlertSound();
            } else {
                // Database location is within 10 meters
                statusText.textContent = 'Safe';
                rangeFromLocked.textContent = `In Range from Locked Location: ${distanceFromLocked.toFixed(2)} meters`;
                document.getElementById('geolocation').style.border = '1px solid green'; // Change border color
            }
        }).catch(error => {
            console.error('Error fetching database location:', error);
        });
    }
}

// Function to toggle lock state
function toggleLock() {
    const button = document.getElementById('toggleButton');
    const statusText = document.getElementById('statusText');
    const lockedLocationText = document.getElementById('lockedLocation');

    if (!locked) {
        // Lock functionality
        fetchDatabaseLocation().then(location => {
            button.textContent = 'Unlock';
            locked = true;
            databaseLocation = location;
            statusText.textContent = 'Safe';
            lockedLocationText.textContent = `Locked Location: (${databaseLocation.latitude}, ${databaseLocation.longitude})`;
        }).catch(error => {
            console.error('Error fetching database location:', error);
        });
    } else {
        // Unlock functionality
        button.textContent = 'Lock';
        locked = false;
        databaseLocation = null;
        statusText.textContent = 'Safe';
        lockedLocationText.textContent = ''; // Clear the locked location display
        document.getElementById('geolocation').style.border = '1px solid green'; // Reset border color
    }
}

// Initialize mute button functionality
document.addEventListener('DOMContentLoaded', () => {
    const muteButton = document.getElementById('muteButton');
    muteButton.addEventListener('click', stopAlertSound);
    checkDatabaseLocation();
    setInterval(checkDatabaseLocation, 5000); // Check every 5 seconds
});

// Initialize the map
let map;
let marker;

function initMap() {
    map = L.map('map').setView([0, 0], 13); // Set initial view

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    marker = L.marker([0, 0]).addTo(map); // Initialize marker

    updateMap(); // Initial map update
    setInterval(updateMap, 5000); // Update map every 5 seconds
}

// Function to update the map with the latest database location
function updateMap() {
    fetchDatabaseLocation().then(location => {
        map.setView([location.latitude, location.longitude], 13); // Update map center
        marker.setLatLng([location.latitude, location.longitude]); // Update marker position
    }).catch(error => {
        console.error('Error updating map:', error);
    });
}
