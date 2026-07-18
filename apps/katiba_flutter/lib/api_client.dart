import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import 'models.dart';

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});
  final String message;
  final int? statusCode;
  @override
  String toString() => message;
}

class KatibaApi {
  KatibaApi({required String baseUrl, http.Client? client})
    : baseUrl = _normalize(baseUrl),
      _client = client ?? http.Client();

  String baseUrl;
  String? token;
  final http.Client _client;

  static String _normalize(String value) =>
      value.trim().replaceFirst(RegExp(r'/+$'), '');

  void configure(String value) => baseUrl = _normalize(value);

  Uri _uri(String path) => Uri.parse('$baseUrl/api$path');

  Map<String, String> get _headers => {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    if (token != null && token!.isNotEmpty) 'Authorization': 'Bearer $token',
  };

  Future<dynamic> _request(
    String path, {
    String method = 'GET',
    Object? body,
  }) async {
    final uri = _uri(path);
    final response = switch (method) {
      'POST' => await _client.post(
        uri,
        headers: _headers,
        body: body == null ? null : jsonEncode(body),
      ),
      'PATCH' => await _client.patch(
        uri,
        headers: _headers,
        body: body == null ? null : jsonEncode(body),
      ),
      _ => await _client.get(uri, headers: _headers),
    };
    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message = 'This step did not finish. Your form is still available; check the connection and retry.';
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map && decoded['message'] is String) {
          message = decoded['message'] as String;
        }
      } catch (_) {}
      throw ApiException(message, statusCode: response.statusCode);
    }
    if (response.body.isEmpty) return null;
    return jsonDecode(response.body);
  }

  Future<({String token, KatibaUser user})> login(UserRole role) async {
    final json = Map<String, dynamic>.from(
      await _request('/auth/demo', method: 'POST', body: {'role': role.apiName})
          as Map,
    );
    return (
      token: json['token'] as String,
      user: KatibaUser.fromJson(Map<String, dynamic>.from(json['user'] as Map)),
    );
  }

  Future<KatibaUser> session() async {
    final json = Map<String, dynamic>.from(await _request('/session') as Map);
    return KatibaUser.fromJson(Map<String, dynamic>.from(json['user'] as Map));
  }

  Future<List<CaseRecord>> cases() async => (await _request('/cases') as List)
      .whereType<Map>()
      .map((item) => CaseRecord.fromJson(Map<String, dynamic>.from(item)))
      .toList();

  Future<CaseRecord> caseById(String id) async => CaseRecord.fromJson(
    Map<String, dynamic>.from(await _request('/cases/$id') as Map),
  );

  Future<CaseRecord> analyze(String id) async => CaseRecord.fromJson(
    Map<String, dynamic>.from(
      await _request('/cases/$id/analyze', method: 'POST') as Map,
    ),
  );

  Future<CaseRecord> updateStatus(String id, String status) async =>
      CaseRecord.fromJson(
        Map<String, dynamic>.from(
          await _request(
                '/cases/$id/status',
                method: 'PATCH',
                body: {'status': status},
              )
              as Map,
        ),
      );

  Future<CaseRecord> createCase(Json payload) async => CaseRecord.fromJson(
    Map<String, dynamic>.from(
      await _request('/cases', method: 'POST', body: payload) as Map,
    ),
  );

  Future<DashboardStats> stats() async => DashboardStats.fromJson(
    Map<String, dynamic>.from(await _request('/stats') as Map),
  );

  Future<Json> contract() async =>
      Map<String, dynamic>.from(await _request('/contracts/demo') as Map);

  Future<Json> platform() async =>
      Map<String, dynamic>.from(await _request('/platform') as Map);

  Future<String> transcribe(Uint8List audio, {String language = 'en'}) async {
    final request = http.MultipartRequest('POST', _uri('/voice/transcribe'))
      ..headers['Accept'] = 'application/json'
      ..fields['language'] = language
      ..files.add(
        http.MultipartFile.fromBytes(
          'audio',
          audio,
          filename: 'katiba-voice.wav',
          contentType: MediaType('audio', 'wav'),
        ),
      );
    if (token != null && token!.isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    final streamed = await _client.send(request);
    final response = await http.Response.fromStream(streamed);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(_message(response), statusCode: response.statusCode);
    }
    final json = Map<String, dynamic>.from(jsonDecode(response.body) as Map);
    return json['text'] as String? ?? '';
  }

  Future<Json> extractEvidence(
    Uint8List bytes, {
    required String filename,
    required String mimeType,
  }) async {
    final request = http.MultipartRequest('POST', _uri('/evidence/extract'))
      ..headers['Accept'] = 'application/json'
      ..files.add(
        http.MultipartFile.fromBytes(
          'evidence',
          bytes,
          filename: filename,
          contentType: MediaType.parse(mimeType),
        ),
      );
    if (token != null && token!.isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    final streamed = await _client.send(request);
    final response = await http.Response.fromStream(streamed);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(_message(response), statusCode: response.statusCode);
    }
    try {
      return Map<String, dynamic>.from(jsonDecode(response.body) as Map);
    } catch (_) {
      throw const ApiException(
        'The latest evidence service is not active yet. Deploy the newest Render commit and retry.',
        statusCode: 502,
      );
    }
  }

  Future<Uint8List> speak(String text) async {
    final response = await _client.post(
      _uri('/voice/speak'),
      headers: _headers,
      body: jsonEncode({'text': text}),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(_message(response), statusCode: response.statusCode);
    }
    return response.bodyBytes;
  }

  String _message(http.Response response) {
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map && decoded['message'] is String) {
        return decoded['message'] as String;
      }
    } catch (_) {}
    return 'This step did not finish. Your form is still available; check the connection and retry.';
  }

  Uri packUri(String id) =>
      _uri('/cases/$id/pack').replace(queryParameters: {'token': token ?? ''});

  void close() => _client.close();
}
