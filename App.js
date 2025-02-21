import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, TextInput, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import * as Network from 'expo-network';
import * as Location from 'expo-location';

export default function App() {
  const [mode, setMode] = useState('menu');
  const [serverIp, setServerIp] = useState('');
  const [ws, setWs] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Desconectado');
  const [isLoading, setIsLoading] = useState(false);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [message, setMessage] = useState('');
  const [locationPermission, setLocationPermission] = useState(false);

  useEffect(() => {
    if (mode === 'server') {
      getOwnIp();
    }
    if (mode === 'client') {
      getLocationPermission();
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

  const getLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setLocationPermission(true);
    } else {
      Alert.alert('Error', 'Se requiere permiso para acceder a la ubicación.');
    }
  };

  const startServer = () => {
    setIsLoading(true);
    try {
      const server = TcpSocket.createServer((socket) => {
        console.log('Cliente conectado');

        socket.on('data', (data) => {
          console.log('Mensaje recibido:', data.toString());
        });

        socket.on('close', () => {
          console.log('Conexión cerrada');
        });

        socket.write('¡Conexión exitosa!');
      });

      server.listen(5000, serverIp, () => {
        console.log('Servidor iniciado en:', serverIp);
        setConnectionStatus('Servidor activo');
        setIsLoading(false);
      });

      setWs(server);
    } catch (error) {
      console.error('Error al iniciar el servidor:', error);
      Alert.alert('Error', 'No se pudo iniciar el servidor.');
      setIsLoading(false);
    }
  };

  const connectAsClient = () => {
    if (!serverIp) {
      Alert.alert('Error', 'Ingresa la IP del servidor.');
      return;
    }

    setIsLoading(true);
    const client = TcpSocket.createConnection({ port: 5000, host: serverIp }, () => {
      console.log('Conectado al servidor');
      setConnectionStatus('Conectado');
      setIsLoading(false);
      client.write('¡Hola desde el cliente!');
    });

    client.on('data', (data) => {
      console.log('Respuesta del servidor:', data.toString());
      setConnectionStatus('Mensaje recibido: ' + data.toString());
    });

    client.on('error', (err) => {
      setConnectionStatus('Error al conectar');
      setIsLoading(false);
      Alert.alert('Error de conexión', 'No se pudo conectar al servidor.');
    });

    setWs(client);
  };

  const sendMessage = () => {
    if (ws) {
      ws.write(message);
      setMessage('');
    }
  };

  const sendLocation = () => {
    if (latitude && longitude) {
      const locationData = 'Latitud: ${latitude}, Longitud: ${longitude}';
      if (ws) {
        ws.write(locationData);
      }
    } else {
      Alert.alert('Ubicación no disponible', 'No se ha obtenido la ubicación aún.');
    }
  };

  const disconnectAndGoBack = () => {
    if (ws) ws.close();
    setWs(null);
    setConnectionStatus('Desconectado');
    setMode('menu');
    setServerIp('');
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
        ) : (
          !ws && <Button title="Iniciar Servidor" onPress={startServer} />
        )}
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
        ) : (
          !ws && <Button title="Conectar al Servidor" onPress={connectAsClient} />
        )}
        <View style={styles.spacer} />
        {ws && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Escribe tu mensaje"
              value={message}
              onChangeText={setMessage}
            />
            <Button title="Enviar Mensaje" onPress={sendMessage} />
            <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
              <Text style={styles.locationButtonText}>Obtener Ubicación</Text>
            </TouchableOpacity>
            <Button title="Enviar Ubicación" onPress={sendLocation} />
          </>
        )}
        <View style={styles.spacer} />
        <Button title="Regresar al menú principal" onPress={disconnectAndGoBack} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 18, marginVertical: 10 },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, width: '100%', marginBottom: 10, paddingHorizontal: 10, textAlign: 'center' },
  spacer: { height: 15 },
  locationButton: { backgroundColor: '#4CAF50', padding: 10, marginVertical: 10, borderRadius: 5 },
  locationButtonText: { color: '#fff', fontSize: 16 },
});