import 'package:flutter_test/flutter_test.dart';
import 'package:katiba_os_flutter/models.dart';

void main() {
  test('case records parse API data and format legal-work labels', () {
    final record = CaseRecord.fromJson({
      'id': 'case-1',
      'reference': 'KO-2026-001',
      'claimantName': 'Amina Wanjiku',
      'respondentName': 'MetroBuild Supplies',
      'amount': 86000,
      'currency': 'KES',
      'claimType': 'Unpaid goods or services',
      'story': 'Goods were delivered and the balance remains unpaid.',
      'language': 'en',
      'courtStation': 'Milimani Small Claims Court',
      'status': 'ready_for_review',
      'completeness': 82,
      'summary': 'The evidence supports delivery and part payment.',
      'nextAction': 'Add the respondent service address.',
      'aiMode': 'openai',
      'evidence': [
        {
          'id': 'evidence-1',
          'name': 'invoice.pdf',
          'type': 'application/pdf',
          'category': 'agreement',
          'size': 1024,
          'addedAt': '2026-07-18T09:00:00.000Z',
          'verified': true,
        },
      ],
      'timeline': <Map<String, dynamic>>[],
      'issues': <Map<String, dynamic>>[],
      'citations': <Map<String, dynamic>>[],
      'audit': <Map<String, dynamic>>[],
    });

    expect(record.amountLabel, 'KES 86,000');
    expect(record.statusLabel, 'Ready For Review');
    expect(record.evidence.single.verified, isTrue);
    expect(record.aiMode, 'openai');
  });

  test('dashboard statistics include nested impact metrics', () {
    final stats = DashboardStats.fromJson({
      'activeCases': 3,
      'readyForReview': 2,
      'evidenceItems': 14,
      'averageReadiness': 78,
      'impact': {'peopleGuided': 11, 'packsCreated': 4},
    });

    expect(stats.activeCases, 3);
    expect(stats.averageReadiness, 78);
    expect(stats.peopleGuided, 11);
    expect(stats.packsCreated, 4);
  });
}
