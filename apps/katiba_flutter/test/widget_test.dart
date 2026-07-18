import 'package:flutter_test/flutter_test.dart';
import 'package:katiba_os_flutter/app_state.dart';
import 'package:katiba_os_flutter/katiba_app.dart';

void main() {
  testWidgets('Katiba OS shows a secure startup state', (tester) async {
    await tester.pumpWidget(KatibaApp(state: AppState()));
    expect(find.text('Opening your secure workspace'), findsOneWidget);
    expect(find.text('Katiba OS'), findsNothing);
  });
}
