import 'package:flutter/material.dart';

import 'app_state.dart';
import 'katiba_app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final state = AppState();
  await state.initialize();
  runApp(KatibaApp(state: state));
}
