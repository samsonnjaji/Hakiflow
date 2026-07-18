import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';
import 'models.dart';

class AppState extends ChangeNotifier {
  AppState({KatibaApi? api}) : api = api ?? KatibaApi(baseUrl: defaultApiUrl());

  final KatibaApi api;
  KatibaUser? user;
  List<CaseRecord> cases = const [];
  DashboardStats? stats;
  Json? contract;
  Json? platform;
  bool initializing = true;
  bool busy = false;
  String? error;

  bool get signedIn => user != null;
  bool get isProfessional => user?.role != UserRole.claimant;

  static String defaultApiUrl() {
    const configured = String.fromEnvironment('KATIBA_API_URL');
    if (configured.isNotEmpty) {
      return configured;
    }
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:8787';
    }
    return 'http://127.0.0.1:8787';
  }

  Future<void> initialize() async {
    final preferences = await SharedPreferences.getInstance();
    api.configure(preferences.getString('katiba_api_url') ?? defaultApiUrl());
    api.token = preferences.getString('katiba_token');
    if (api.token != null) {
      try {
        user = await api.session();
        await refresh();
      } catch (_) {
        await preferences.remove('katiba_token');
        api.token = null;
        user = null;
      }
    }
    initializing = false;
    notifyListeners();
  }

  Future<void> configureApi(String url) async {
    api.configure(url);
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString('katiba_api_url', api.baseUrl);
    notifyListeners();
  }

  Future<void> login(UserRole role, {required String apiUrl}) async {
    await _run(() async {
      await configureApi(apiUrl);
      final result = await api.login(role);
      api.token = result.token;
      user = result.user;
      final preferences = await SharedPreferences.getInstance();
      await preferences.setString('katiba_token', result.token);
      await refresh();
    });
  }

  Future<void> logout() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.remove('katiba_token');
    api.token = null;
    user = null;
    cases = const [];
    stats = null;
    contract = null;
    platform = null;
    error = null;
    notifyListeners();
  }

  Future<void> refresh() async {
    final results = await Future.wait<dynamic>([
      api.cases(),
      api.stats(),
      api.contract(),
      api.platform(),
    ]);
    cases = results[0] as List<CaseRecord>;
    stats = results[1] as DashboardStats;
    contract = results[2] as Json;
    platform = results[3] as Json;
    notifyListeners();
  }

  Future<CaseRecord?> analyze(CaseRecord record) =>
      _caseMutation(() => api.analyze(record.id));

  Future<CaseRecord?> setStatus(CaseRecord record, String status) =>
      _caseMutation(() => api.updateStatus(record.id, status));

  Future<CaseRecord?> createClaim(Json payload) =>
      _caseMutation(() => api.createCase(payload));

  Future<CaseRecord?> _caseMutation(Future<CaseRecord> Function() task) async {
    CaseRecord? result;
    await _run(() async {
      result = await task();
      await refresh();
    });
    return result;
  }

  Future<void> _run(Future<void> Function() task) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      await task();
    } catch (exception) {
      error = exception.toString();
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }
}
