import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import TcpSocket from "react-native-tcp-socket";
import * as Location from 'expo-location';

export default function Client({ onBack }) {
  const [text, setText] = useState("");
  const [socket, setSocket] = useState(null);
  const [serverIP, setServerIP] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const connectToServer = () => {
    if (!serverIP) {
      Alert.alert("Error", "Ingresa la IP del servidor");
      return;
    }

    const client = TcpSocket.createConnection(
      { port: 8080, host: serverIP },
      () => {
        console.log("Conectado al servidor en", serverIP);
        setIsConnected(true);
      }
    );

    client.on("error", (err) => {
      console.error("Error en cliente:", err.message);
      setError("Error de conexión");
      setIsConnected(false);
    });

    client.on("close", () => {
      console.log("Conexión cerrada");
      setError("Desconectado del servidor");
      setIsConnected(false);
    });

    setSocket(client);
  };

  const sendLocation = async () => {
    if (!socket || !isConnected) return;
    
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso Denegado", "No podemos acceder a la ubicación.");
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    const coords = `${location.coords.latitude},${location.coords.longitude}`;
    socket.write(coords);
    Alert.alert("Ubicación Enviada", `Lat: ${location.coords.latitude}, Lon: ${location.coords.longitude}`);
  };

  return (
    <View style={{ padding: 20, alignItems: "center" }}>
      {!isConnected ? (
        <>
          <Text style={{ fontSize: 18 }}>Ingresa la IP del servidor:</Text>
          <TextInput
            style={{ borderWidth: 1, padding: 10, marginTop: 10, width: "80%" }}
            placeholder="Ejemplo: 192.168.1.101"
            value={serverIP}
            onChangeText={setServerIP}
          />
          <Button title="Conectar" onPress={connectToServer} />
          <View style={{ marginTop: 15 }}>
            <Button title="Salir" onPress={onBack} />
          </View>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 18 }}>Cliente - Escribe algo:</Text>
          {error && <Text style={{ color: "red" }}>{error}</Text>}
          <TextInput
            style={{ borderWidth: 1, padding: 10, marginTop: 10, width: "80%" }}
            value={text}
            onChangeText={(value) => {
              setText(value);
              if (socket && !error) socket.write(value);
            }}
          />
          <View style={{ marginTop: 15 }}>
            <Button title="Enviar Ubicación" onPress={sendLocation} />
          </View>
          <View style={{ marginTop: 20 }}>
            <Button title="Salir" onPress={() => { socket.destroy(); onBack(); }} />
          </View>
        </>
      )}
    </View>
  );
}