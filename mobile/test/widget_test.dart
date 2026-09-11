import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';
import 'package:mobile/services/auth_service.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    final authService = AuthService();
    await tester.pumpWidget(JoyEventsApp(authService: authService));
    expect(find.text('JoyEvents'), findsWidgets);
  });
}
