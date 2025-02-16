import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import * as Network from 'expo-network';
import * as Location from 'expo-location';

export default function App() {
  // 'mode' puede ser: 'menu', 'server' o 'client'
  const [mode, setMode] = useState('menu');
  const [serverIp, setServerIp] = useState('');
  const [ws, setWs] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Desconectado');
  const [messages, setMessages] = useState([]);
  const [clientMessage, setClientMessage] = useState('');

  // Cuando se entra en modo "server", se obtiene la IP local del dispositivo
  useEffect(() => {
    if (mode === 'server') {
      getOwnIp();
    }
    return () => {
      if (ws) ws.close();
    };
  }, [mode]);

  const getOwnIp = async () => {
    const ip = await Network.getIpAddressAsync();
    setServerIp(ip);
  };

  // Función para conectarse como "Servidor"
  // En este modo, la app se conecta a un servidor WebSocket en ws://[su propia IP]:8080
  // (Se asume que ya hay un servidor WebSocket corriendo en ese dispositivo o en la red)
  const connectAsServer = () => {
    const url = 'ws://${serverIp}:8080';
    const socket = new WebSocket(url);

    socket.onopen = () => {
      console.log('Servidor: Conectado a WS');
      setConnectionStatus('Conectado');
  
    };

    socket.onmessage = (event) => {
      console.log('Servidor: Mensaje recibido:', event.data);
      setMessages(prev => [...prev, event.data]);
    };

    socket.onerror = (error) => {
      console.error('Servidor: Error en WS:', error);
      setConnectionStatus('Error');
    };

    socket.onclose = () => {
      console.log('Servidor: Conexión WS cerrada');
      setConnectionStatus('Desconectado');
    };

    setWs(socket);
  };

  // Función para conectarse como "Cliente"
  // El usuario debe ingresar la IP del dispositivo servidor.
  const connectAsClient = () => {
    if (!serverIp) {
      Alert.alert('Error', 'Ingresa la IP del servidor.');
      return;
    }
    const url = 'ws://${serverIp}:8080';
    const socket = new WebSocket(url);

    socket.onopen = () => {
      console.log('Cliente: Conectado a WS');
      setConnectionStatus('Conectado');
      Alert.alert('Conexión', 'Conectado correctamente al servidor.');
    };

    socket.onmessage = (event) => {
      console.log('Cliente: Mensaje recibido:', event.data);
      // Aquí se podría actualizar un estado para mostrar mensajes, si se desea.
    };

    socket.onerror = (error) => {
      console.error('Cliente: Error en WS:', error);
      setConnectionStatus('Error');
      Alert.alert('Error', 'Error al conectar con el servidor.');
    };

    socket.onclose = () => {
      console.log('Cliente: Conexión WS cerrada');
      setConnectionStatus('Desconectado');
      Alert.alert('Conexión', 'Conexión con el servidor cerrada.');
    };

    setWs(socket);
  };

  // Función para enviar mensaje (desde cliente)
  const sendClientMessage = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(clientMessage);
      setClientMessage('');
    } else {
      Alert.alert('Error', 'La conexión no está abierta.');
    }
  };

  // Función para enviar la ubicación (desde cliente)
  const sendClientLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Permiso de ubicación denegado');
      return;
    }
    let loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    const locMessage = 'Ubicación: Latitud ${latitude}, Longitud ${longitude}';
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(locMessage);
    } else {
      Alert.alert('Error', 'La conexión no está abierta.');
    }
  };

  // Función para desconectar y regresar al menú principal
  const disconnectAndGoBack = () => {
    if (ws) ws.close();
    setWs(null);
    setConnectionStatus('Desconectado');
    setMode('menu');
    setServerIp('');
    setMessages([]);
  };

  // Renderizamos según el modo
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
        {!ws ? (
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
        {!ws ? (
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