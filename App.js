import React, { useState } from "react";
import { View, Text, Button } from "react-native";
import Server from "./components/Server";
import Client from "./components/Client";

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