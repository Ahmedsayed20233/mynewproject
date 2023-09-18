#include <SoftwareSerial.h>
#include <DHT.h>

const int motor = 13;
const int Led1 = 7;
const int Led = 12;
const int motor1 = 11;


int percentValue = 0;  

SoftwareSerial bluetoothSerial(2, 3); // RX, TX pins on Arduino

#define DHTPIN 8  // Define the digital pin for the DHT sensor
#define DHTTYPE DHT22  // Change to DHT11 if you're using that sensor
DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  bluetoothSerial.begin(9600); 

  pinMode(motor, OUTPUT);
  pinMode(Led, OUTPUT);
  pinMode(Led1, OUTPUT);

  dht.begin(); // Initialize the DHT sensor
  delay(2000);
}

void loop() {
  // Read soil moisture sensor
  int value = analogRead(A0);
  float Moisture = value * 500.0 / 1023.0;
  Serial.println("Moisture: " + String(Moisture));
  delay(1000);

  // Control motor and LEDs based on moisture value
  if (Moisture < 100) {
    digitalWrite(motor, HIGH);
    digitalWrite(Led, HIGH);
  } else {
    digitalWrite(motor, LOW);
    digitalWrite(Led, LOW);
  }
   
  // Read data from DHT sensor
    


  float temperature = dht.readTemperature();  // Read temperature
  float humidity = dht.readHumidity();

    if (temperature > 20) {
    digitalWrite(motor1, HIGH);
    delay(1000);
  } else {
    digitalWrite(motor1, LOW);
      delay(1000);
    }
  //  if (isnan(temperature) || isnan(humidity)) {
   // Serial.println("Failed to read from DHT sensor!");
    //return; {
    // Send temperature data over Bluetooth
     // Send data to Bluetooth
     
  bluetoothSerial.println ("Temperature: ");
  bluetoothSerial.println(temperature);
  bluetoothSerial.println(" °C");
  bluetoothSerial.println("Humidity: ");
  bluetoothSerial.println(humidity);
  bluetoothSerial.println(" %");

  // Print data to the Serial Monitor (optional)
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" °C");
  Serial.print("Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");
//}
  //} //else {
   // Serial.println("Failed to read from DHT sensor!");
  //}

  // Check for incoming Bluetooth commands
  
  
    // Send the sensor value over Bluetooth
  bluetoothSerial.print("Sensor Value: ");
  bluetoothSerial.println(Moisture);

  // Wait for a short delay before sending another reading
  delay(1000);
  
  if (bluetoothSerial.available()) {
    char command = bluetoothSerial.read();
    // Process the command
    if (command == '1') { // Compare character to '1'
      // Turn on an LED or perform any other action
      digitalWrite(Led1, HIGH);
    } else if (command == '0') { // Compare character to '0'
      // Turn off an LED or perform any other action
      digitalWrite(Led1, LOW);
    }

    // Optionally, send a response back to the mobile device
    bluetoothSerial.println("Command received: " + String(command));
    Serial.println(command);
    delay(1000);  // Wait for 1 second between readings
  }
}
