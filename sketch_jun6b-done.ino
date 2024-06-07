#include <Arduino.h>
#include <TinyGPS++.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// Provide the token generation process info.
#include "addons/TokenHelper.h"
// Provide the RTDB payload printing info and other helper functions.
#include "addons/RTDBHelper.h"

// Insert your network credentials
#define WIFI_SSID "NadiZ Phone"
#define WIFI_PASSWORD "12345678"

// Insert Firebase project API Key
#define API_KEY "AIzaSyALqvFhmgmS1LMknNvcqpvLsxZdTniecTQ"

// Insert RTDB URL
#define DATABASE_URL "https://esp32-gps-e89ee-default-rtdb.firebaseio.com" 

// Define Firebase Data object
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long sendDataPrevMillis = 0;
bool signupOK = false;

TinyGPSPlus gps;
HardwareSerial gpsSerial(1);

void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600, SERIAL_8N1, 4, 5); // Assuming RX=16 and TX=17 for GPS module
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.println();
  Serial.print("Connected with IP: ");
  Serial.println(WiFi.localIP());
  Serial.println();

  // Assign the API key
  config.api_key = API_KEY;
  // Assign the RTDB URL
  config.database_url = DATABASE_URL;

  // Sign up
  int retryCount = 0;
  const int maxRetries = 5;
  while (!signupOK && retryCount < maxRetries) {
    if (Firebase.signUp(&config, &auth, "", "")) {
      Serial.println("Firebase sign-up successful");
      signupOK = true;
    } else {
      Serial.printf("Firebase sign-up error: %s\n", config.signer.signupError.message.c_str());
      retryCount++;
      delay(2000); // Wait before retrying
    }
  }

  if (!signupOK) {
    Serial.println("Firebase sign-up failed after multiple attempts");
    return; // Stop execution if sign-up fails
  }

  // Assign the callback function for the long-running token generation task
  config.token_status_callback = tokenStatusCallback; // see addons/TokenHelper.h
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  if (Firebase.ready() && signupOK && (millis() - sendDataPrevMillis > 15000 || sendDataPrevMillis == 0)) {
    sendDataPrevMillis = millis();
    if (gps.location.isUpdated()) {
      float latitude = gps.location.lat();
      float longitude = gps.location.lng();

      // Write GPS data to the database
      if (Firebase.RTDB.setFloat(&fbdo, "/gps/latitude", latitude)) {
        Serial.println("Latitude data sent successfully");
      } else {
        Serial.printf("Failed to send latitude data: %s\n", fbdo.errorReason().c_str());
      }

      if (Firebase.RTDB.setFloat(&fbdo, "/gps/longitude", longitude)) {
        Serial.println("Longitude data sent successfully");
      } else {
        Serial.printf("Failed to send longitude data: %s\n", fbdo.errorReason().c_str());
      }
    }
  } else {
    if (!signupOK) {
      Serial.println("Firebase sign-up not successful");
    }
    if (!Firebase.ready()) {
      Serial.println("Firebase not ready");
    }
  }

  // Print Wi-Fi status
  Serial.print("Wi-Fi status: ");
  Serial.println(WiFi.status());
  delay(5000); // Adjust delay as needed for your debugging purposes
}
