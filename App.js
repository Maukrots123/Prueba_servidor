import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import TcpSocket from "react-native-tcp-socket";
import { NetworkInfo } from "react-native-network-info";
import * as Location from 'expo-location';

export default function App() {
  const [screen, setScreen] = useState("home");

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {screen === "home" && (
        <>
          <Text style={{ fontSize: 20, marginBottom: 20 }}>Selecciona un modo:</Text>
          <Button title="Servidor" onPress={() => setScreen("server")} />
          <View style={{ height: 10 }} />
          <Button title="Cliente" onPress={() => setScreen("client")} />
        </>
      )}
      {screen === "server" && <Server onBack={() => setScreen("home")} />}
      {screen === "client" && <Client onBack={() => setScreen("home")} />}
    </View>
  );
}

// ================= SERVIDOR ===================
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
        } else {
          setReceivedText((prev) => prev + message);
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

// ================= CLIENTE ===================
function Client({ onBack }) {
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
    const coords = `LOC:${location.coords.latitude},${location.coords.longitude}`;
    socket.write(coords);
    Alert.alert("Ubicación Enviada", coords);
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
        </>
      ) : (
        <>
          <Text style={{ fontSize: 18 }}>Cliente - Escribe algo:</Text>
          {error && <Text style={{ color: "red" }}>{error}</Text>}
          <TextInput
            style={{ borderWidth: 1, padding: 10, marginTop: 10, width: "80%" }}
            value={text}
            onChangeText={(value) => {
              if (!socket || error) return;
              socket.write(`MSG:${value}`);
              setText(value);
            }}
          />
          <Button title="Enviar Ubicación" onPress={sendLocation} />
          <Button title="Salir" onPress={() => { socket.destroy(); onBack(); }} />
        </>
      )}
    </View>
  );
}