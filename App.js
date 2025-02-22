import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, TextInput, Alert, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import * as Network from 'expo-network';
import * as Location from 'expo-location';

export default function App() {
  const [mode, setMode] = useState('menu');
  const [serverIp, setServerIp] = useState('');
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Desconectado');
  const [isLoading, setIsLoading] = useState(false);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [message, setMessage] = useState('');
  const [receivedMessages, setReceivedMessages] = useState([]);

  useEffect(() => {
    return () => {
      if (socket) {
        socket.destroy();
        setSocket(null);
      }
    };
  }, [socket]);

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
    if (status !== 'granted') {
      Alert.alert('Error', 'Se requiere permiso para acceder a la ubicación.');
      return false;
    }
    return true;
  };

  const getLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
      Alert.alert('Éxito', 'Ubicación obtenida correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación');
    }
  };

  const startServer = () => {
    if (!serverIp) {
      Alert.alert('Error', 'La IP del servidor no está configurada');
      return;
    }

    setIsLoading(true);
    const server = TcpSocket.createServer((clientSocket) => {
      clientSocket.on('data', (data) => {
        const receivedData = data.toString();
        setReceivedMessages(prev => [...prev, receivedData]);
      });

      clientSocket.on('close', () => {
        console.log('Cliente desconectado');
      });
    });

    server.on('error', (error) => {
      Alert.alert('Error', 'Error del servidor: ${error.message}');
      setIsLoading(false);
    });

    server.listen(5000, serverIp, () => {
      console.log('Servidor activo en:', serverIp);
      setConnectionStatus('Esperando conexiones...');
      setIsLoading(false);
      setSocket(server);
    });
  };

  const connectAsClient = () => {
    if (!serverIp) {
      Alert.alert('Error', 'Ingresa la IP del servidor');
      return;
    }

    setIsLoading(true);
    const client = TcpSocket.createConnection({ port: 5000, host: serverIp }, () => {
      setMode('client_connected');
      setIsLoading(false);
      setSocket(client);
    });

    client.on('error', (error) => {
      Alert.alert('Error', 'Error de conexión: ${error.message}');
      setIsLoading(false);
    });
  };

  const sendData = (data) => {
    if (socket) {
      socket.write(data);
      setMessage('');
    }
  };

  const sendLocation = () => {
    if (latitude && longitude) {
      sendData('[UBICACIÓN] Lat: ${latitude}, Long: ${longitude}');
    } else {
      Alert.alert('Error', 'Primero obtén tu ubicación');
    }
  };

  const disconnect = () => {
    if (socket) {
      socket.destroy();
      setSocket(null);
    }
    setReceivedMessages([]);
    setMode('menu');
    setServerIp('');
  };

  return (
    <View style={styles.container}>
      {mode === 'menu' && (
        <>
          <Text style={styles.title}>Seleccione Modo</Text>
          <Button title="Servidor" onPress={() => { setMode('server'); getOwnIp(); }} />
          <View style={styles.spacer} />
          <Button title="Cliente" onPress={() => setMode('client')} />
        </>
      )}

      {mode === 'server' && (
        <>
          <Text style={styles.title}>Modo Servidor</Text>
          <Text style={styles.subtitle}>IP: {serverIp}</Text>
          <Text style={styles.status}>Estado: {connectionStatus}</Text>
          
          {isLoading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            !socket && <Button title="Iniciar Servidor" onPress={startServer} />
          )}

          <ScrollView style={styles.messagesContainer}>
            {receivedMessages.map((msg, index) => (
              <Text key={index} style={styles.message}>{msg}</Text>
            ))}
          </ScrollView>

          <Button title="Volver al menú" onPress={disconnect} />
        </>
      )}

      {mode === 'client' && (
        <>
          <Text style={styles.title}>Modo Cliente</Text>
          <TextInput
            style={styles.input}
            placeholder="IP del servidor"
            value={serverIp}
            onChangeText={setServerIp}
            autoCapitalize="none"
          />
          
          {isLoading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <Button title="Conectar" onPress={connectAsClient} />
          )}
          
          <Button title="Volver" onPress={disconnect} />
        </>
      )}

      {mode === 'client_connected' && (
        <>
          <Text style={styles.title}>Modo Cliente - Conectado</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje"
            value={message}
            onChangeText={setMessage}
          />
          
          <Button title="Enviar Mensaje" onPress={() => sendData(message)} />
          
          <TouchableOpacity style={styles.button} onPress={getLocation}>
            <Text style={styles.buttonText}>Obtener Ubicación</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={sendLocation}>
            <Text style={styles.buttonText}>Enviar Ubicación</Text>
          </TouchableOpacity>
          
          <Button title="Desconectar" onPress={disconnect} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10
  },
  status: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    marginVertical: 10
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  spacer: {
    height: 15
  },
  messagesContainer: {
    flex: 1,
    marginVertical: 20,
    width: '100%'
  },
  message: {
    fontSize: 16,
    backgroundColor: '#f0f0f0',
    padding: 10,
    marginVertical: 5,
    borderRadius: 5
  }
});