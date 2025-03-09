import React, { useState, useEffect } from "react";
import { View, Text, Button } from "react-native";
import TcpSocket from "react-native-tcp-socket";
import { NetworkInfo } from "react-native-network-info";

export default function Server({ onBack }) {
  const [receivedText, setReceivedText] = useState("");
  const [location, setLocation] = useState(null);
  const [server, setServer] = useState(null);
  const [serverIP, setServerIP] = useState("Obteniendo...");

  useEffect(() => {
    NetworkInfo.getIPAddress().then(setServerIP);

    const newServer = TcpSocket.createServer((socket) => {
      console.log("Cliente conectado:", socket.remoteAddress);

      socket.on("data", (data) => {
        const message = data.toString().trim();
        const parts = message.split(",");

        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const [lat, lon] = parts;
          setLocation({ lat, lon });
        } else {
          setReceivedText(message);
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
      {location && (
        <Text>
          Ubicación:{"\n"}Latitud: {location.lat}{"\n"}Longitud: {location.lon}
        </Text>
      )}
      <Button title="Salir" onPress={() => { server.close(); onBack(); }} />
    </View>
  );
}