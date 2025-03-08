import React, { useState, useEffect } from "react";
import { View, Text, Button, TextInput, PermissionsAndroid } from "react-native";
import TcpSocket from "react-native-tcp-socket";
import Geolocation from "@react-native-community/geolocation";
import { NetworkInfo } from "react-native-network-info";

export default function App() {
  const [screen, setScreen] = useState(null);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {!screen && (
        <>
          <Button title="Iniciar como Servidor" onPress={() => setScreen("server")} />
          <Button title="Iniciar como Cliente" onPress={() => setScreen("client")} />
        </>
      )}
      {screen === "server" && <Server onBack={() => setScreen(null)} />}
      {screen === "client" && <Client onBack={() => setScreen(null)} />}
    </View>
  );
}

// ========================= SERVIDOR =========================
function Server({ onBack }) {
  const [receivedText, setReceivedText] = useState("");
  const [location, setLocation] = useState(null);
  const [server, setServer] = useState(null);
  const [serverIP, setServerIP] = useState("Obteniendo...");

  useEffect(() => {
    NetworkInfo.getIPAddress().then(setServerIP);

    const newServer = TcpSocket.createServer((socket) => {
      console.log("Cliente conectado:", socket.remoteAddress);

      socket.on("data", (data) => {
        const message = data.toString();
        if (message.startsWith("LOC:")) {
          const [lat, lon] = message.replace("LOC:", "").split(",");
          setLocation({ lat, lon });
        } else if (message.startsWith("ADD:")) {
          setReceivedText((prev) => prev + message.replace("ADD:", ""));
        } else if (message === "DEL") {
          setReceivedText((prev) => prev.slice(0, -1));
        }
      });

      socket.on("error", (error) => console.log("Error:", error));
      socket.on("close", () => console.log("Cliente desconectado"));
    });

    newServer.listen({ port: 8080, host: "0.0.0.0" }, () =>
      console.log("Servidor iniciado en el puerto 8080")
    );

    setServer(newServer);

    return () => newServer.close();
  }, []);

  return (
    <View style={{ padding: 20, alignItems: "center" }}>
      <Text style={{ fontSize: 18 }}>Servidor en ejecución</Text>
      <Text style={{ marginTop: 10 }}>IP del servidor: {serverIP}</Text>
      <Text style={{ marginTop: 10 }}>Texto recibido: {receivedText}</Text>
      {location && <Text>Ubicación: {location.lat}, {location.lon}</Text>}
      <Button title="Salir" onPress={() => { server.close(); onBack(); }} />
    </View>
  );
}

// ========================= CLIENTE =========================
function Client({ onBack }) {
  const [text, setText] = useState("");
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const client = TcpSocket.createConnection(
      { port: 8080, host: "192.168.1.101" }, // Cambia por la IP del servidor
      () => console.log("Conectado al servidor")
    );

    setSocket(client);

    obtenerUbicacion(client);

    return () => client.destroy();
  }, []);

  const handleTextChange = (value) => {
    if (!socket) return;

    if (value.length > text.length) {
      const newChar = value.slice(-1);
      socket.write(`ADD:${newChar}`);
    } else if (value.length < text.length) {
      socket.write("DEL");
    }

    setText(value);
  };

  const obtenerUbicacion = async (client) => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        Geolocation.getCurrentPosition(
          (position) => {
            const coords = `LOC:${position.coords.latitude},${position.coords.longitude}`;
            client.write(coords);
          },
          (error) => console.log("Error obteniendo ubicación:", error),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      } else {
        console.log("Permiso de ubicación denegado");
      }
    } catch (err) {
      console.warn(err);
    }
  };

  return (
    <View style={{ padding: 20, alignItems: "center" }}>
      <Text style={{ fontSize: 18 }}>Cliente - Escribe algo:</Text>
      <TextInput
        style={{ borderWidth: 1, padding: 10, marginTop: 10, width: "80%" }}
        value={text}
        onChangeText={handleTextChange}
        autoFocus
      />
      <Button title="Salir" onPress={() => { socket.destroy(); onBack(); }} />
    </View>
  );
}