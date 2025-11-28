import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class AuthProvider with ChangeNotifier {
  String? _token;
  final AuthService _authService = AuthService();

  String? get token => _token;
  bool get isAuthenticated => _token != null;

  Future<bool> login(String docType, String docNumber) async {
    final token = await _authService.loginPatient(docType, docNumber);
    if (token != null) {
      _token = token;
      notifyListeners(); // Notifica a los widgets que el estado cambió
      return true;
    }
    return false;
  }

  void logout() {
    _token = null;
    notifyListeners();
  }
}
