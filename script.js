// Function to calculate the distance between two coordinates using the Haversine formula
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
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

// Function to calculate the distance and update the HTML
async function calculateDistance() {
    try {
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
        document.getElementById('result').innerHTML = `Distance: ${distance.toFixed(2)} km`;
    } catch (error) {
        console.error("Error getting location or calculating distance:", error);
        document.getElementById('result').innerHTML = "Error: " + error.message;
    }
}
