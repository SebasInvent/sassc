import 'dart:convert';
import 'package:http/http.dart' as http;

class AuthService {
  // La URL base de tu backend. Asegúrate de que tu emulador/dispositivo pueda acceder a ella.
  // Para el emulador de Android, usa '10.0.2.2' para referirte al localhost de tu máquina.
  final String _baseUrl = 'http://10.0.2.2:3001';

  Future<String?> loginPatient(String docType, String docNumber) async {
    final url = Uri.parse('$_baseUrl/auth/patient/login');

    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'docType': docType, 'docNumber': docNumber}),
      );

      if (response.statusCode == 201) {
        final responseData = json.decode(response.body);
        return responseData['access_token'];
      } else {
        // Manejar errores de login (ej. credenciales inválidas)
        print('Error de login: ${response.body}');
        return null;
      }
    } catch (e) {
      // Manejar errores de red
      print('Error de red: $e');
      return null;
    }
  }
}
