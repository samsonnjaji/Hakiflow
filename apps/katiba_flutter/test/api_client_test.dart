import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:katiba_os_flutter/api_client.dart';
import 'package:katiba_os_flutter/models.dart';

void main() {
  test('demo login uses the configured API and parses the role', () async {
    final client = MockClient((request) async {
      expect(request.url.toString(), 'https://api.katiba.test/api/auth/demo');
      expect(request.method, 'POST');
      expect(jsonDecode(request.body), {'role': 'lawyer'});
      return http.Response(
        jsonEncode({
          'token': 'signed-token',
          'user': {
            'id': 'lawyer-david',
            'name': 'David Mwangi',
            'email': 'david@katiba.test',
            'role': 'lawyer',
            'initials': 'DM',
          },
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    });
    final api = KatibaApi(
      baseUrl: 'https://api.katiba.test///',
      client: client,
    );

    final result = await api.login(UserRole.lawyer);

    expect(result.token, 'signed-token');
    expect(result.user.role, UserRole.lawyer);
    expect(result.user.name, 'David Mwangi');
    api.close();
  });

  test('API errors preserve a safe server message and status code', () async {
    final client = MockClient(
      (_) async => http.Response(
        jsonEncode({'message': 'Professional role required'}),
        403,
        headers: {'content-type': 'application/json'},
      ),
    );
    final api = KatibaApi(baseUrl: 'https://api.katiba.test', client: client);

    expect(
      () => api.updateStatus('case-1', 'approved'),
      throwsA(
        isA<ApiException>()
            .having((error) => error.statusCode, 'statusCode', 403)
            .having(
              (error) => error.message,
              'message',
              'Professional role required',
            ),
      ),
    );
    api.close();
  });
}
