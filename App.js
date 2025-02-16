import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import * as Network from 'expo-network';
import * as Location from 'expo-location';

export default function App() {
  const [mode, setMode] = useState('menu');
  const [serverIp, setServerIp] = useState('');
  const [ws, setWs] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Desconectado');
  const [messages, setMessages] = useState([]);
  const [clientMessage, setClientMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Estado para controlar el indicador de carga

  useEffect(() => {
    if (mode === 'server') {
      getOwnIp();
    }
    return () => {
      if (ws) ws.close();
    };
  }, [mode]);

  const getOwnIp = async () => {
    try {
      setIsLoading(true);
      const ip = await Network.getIpAddressAsync();
      setServerIp(ip);
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la IP local.');
    } finally {
      setIsLoading(false);
    }
  };

  const connectAsServer = () => {
    setIsLoading(true);
    const url = ` ws://${serverIp}:8080`;
    const socket = new WebSocket(url);

    socket.onopen = () => {
      setConnectionStatus('Conectado');
      setIsLoading(false);
    };

    socket.onmessage = (event) => {
      setMessages(prev => [...prev, event.data]);
    };

    socket.onerror = (error) => {
      setConnectionStatus('Error');
      setIsLoading(false);
      Alert.alert('Error de conexión', 'No se pudo conectar al servidor.');
    };

    socket.onclose = () => {
      setConnectionStatus('Desconectado');
      setIsLoading(false);
    };

    setWs(socket);
  };

  const connectAsClient = () => {
    if (!serverIp) {
      Alert.alert('Error', 'Ingresa la IP del servidor.');
      return;
    }

    setIsLoading(true);
    const url = ` ws://${serverIp}:8080`;
    const socket = new WebSocket(url);

    socket.onopen = () => {
      setConnectionStatus('Conectado');
      setIsLoading(false);
      Alert.alert('Conexión', 'Conectado correctamente al servidor.');
    };

    socket.onmessage = (event) => {
      console.log('Cliente: Mensaje recibido:', event.data);
    };

    socket.onerror = (error) => {
      setConnectionStatus('Error');
      setIsLoading(false);
      Alert.alert('Error de conexión', 'No se pudo conectar al servidor.');
    };

    socket.onclose = () => {
      setConnectionStatus('Desconectado');
      setIsLoading(false);
      Alert.alert('Conexión', 'Conexión cerrada.');
    };

    setWs(socket);
  };

  const sendClientMessage = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(clientMessage);
      setClientMessage('');
    } else {
      Alert.alert('Error', 'La conexión no está abierta.');
    }
  };

  const sendClientLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Permiso de ubicación denegado');
      return;
    }
    let loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    const locMessage = `Ubicación: Latitud ${latitude}, Longitud ${longitude}`;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(locMessage);
    } else {
      Alert.alert('Error', 'La conexión no está abierta.');
    }
  };

  const disconnectAndGoBack = () => {
    if (ws) ws.close();
    setWs(null);
    setConnectionStatus('Desconectado');
    setMode('menu');
    setServerIp('');
    setMessages([]);
  };

  if (mode === 'menu') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Seleccione Modo</Text>
        <Button title="Servidor" onPress={() => setMode('server')} />
        <View style={styles.spacer} />
        <Button title="Cliente" onPress={() => setMode('client')} />
      </View>
    );
  }

  if (mode === 'server') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Modo Servidor</Text>
        <Text style={styles.label}>IP del Servidor: {serverIp}</Text>
        <Text style={styles.label}>Estado de Conexión: {connectionStatus}</Text>
        <View style={styles.spacer} />
        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : !ws ? (
          <Button title="Conectar (Esperar mensajes)" onPress={connectAsServer} />
        ) : null}
        <View style={styles.spacer} />
        <ScrollView style={styles.messagesContainer}>
          {messages.map((msg, index) => (
            <Text key={index} style={styles.messageText}>{msg}</Text>
          ))}
        </ScrollView>
        <View style={styles.spacer} />
        <Button title="Regresar al menú principal" onPress={disconnectAndGoBack} />
      </View>
    );
  }

  if (mode === 'client') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Modo Cliente</Text>
        <Text style={styles.label}>Estado de Conexión: {connectionStatus}</Text>
        <TextInput
          style={styles.input}
          placeholder="Ingresa IP del Servidor"
          value={serverIp}
          onChangeText={setServerIp}
          autoCapitalize="none"
        />
        <View style={styles.spacer} />
        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : !ws ? (
          <Button title="Conectar al Servidor" onPress={connectAsClient} />
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje"
              value={clientMessage}
              onChangeText={setClientMessage}
              onSubmitEditing={sendClientMessage}
            />
            <View style={styles.spacer} />
            <Button title="Enviar Mensaje" onPress={sendClientMessage} />
            <View style={styles.spacer} />
            <Button title="Enviar mi ubicación" onPress={sendClientLocation} />
          </>
        )}
        <View style={styles.spacer} />
        <Button title="Regresar al menú principal" onPress={disconnectAndGoBack} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    marginVertical: 10,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    width: '100%',
    marginBottom: 10,
    paddingHorizontal: 10,
    textAlign: 'center',
  },
  spacer: {
    height: 15,
  },
  messagesContainer: {
    width: '100%',
    maxHeight: 200,
    borderWidth: 1,
    borderColor: 'gray',
    padding: 10,
    marginVertical: 10,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 5,
  },
});