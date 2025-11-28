import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _docNumberController = TextEditingController();
  String _selectedDocType = 'DNI'; // Valor por defecto
  var _isLoading = false;

  Future<void> _submit() async {
    setState(() {
      _isLoading = true;
    });

    final success = await Provider.of<AuthProvider>(
      context,
      listen: false,
    ).login(_selectedDocType, _docNumberController.text);

    if (!success) {
      // ignore: use_build_context_synchronously
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error de inicio de sesión')),
      );
    }

    setState(() {
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Card(
          margin: const EdgeInsets.all(20),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButton<String>(
                  value: _selectedDocType,
                  isExpanded: true,
                  items: <String>['DNI', 'PASSPORT', 'OTHER'].map((
                    String value,
                  ) {
                    return DropdownMenuItem<String>(
                      value: value,
                      child: Text(value),
                    );
                  }).toList(),
                  onChanged: (String? newValue) {
                    setState(() {
                      _selectedDocType = newValue!;
                    });
                  },
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _docNumberController,
                  decoration: const InputDecoration(
                    labelText: 'Número de Documento',
                  ),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 20),
                if (_isLoading)
                  const CircularProgressIndicator()
                else
                  ElevatedButton(
                    onPressed: _submit,
                    child: const Text('Iniciar Sesión'),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
