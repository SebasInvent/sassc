import 'dart:convert';
import 'package:http/http.dart' as http;

class AppointmentService {
  final String _baseUrl = 'http://10.0.2.2:3001';

  Future<List<dynamic>> getMyAppointments(String token) async {
    final url = Uri.parse('$_baseUrl/fhir/Appointment/my-appointments');

    try {
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> appointments = json.decode(response.body);
        return appointments;
      } else {
        print('Error al obtener citas: ${response.body}');
        return [];
      }
    } catch (e) {
      print('Error de red: $e');
      return [];
    }
  }
}
