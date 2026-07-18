typedef Json = Map<String, dynamic>;

enum UserRole { claimant, paralegal, lawyer }

extension UserRoleX on UserRole {
  String get apiName => name;
  String get label => switch (this) {
    UserRole.claimant => 'Citizen',
    UserRole.paralegal => 'Paralegal',
    UserRole.lawyer => 'Lawyer',
  };

  String get workspace => switch (this) {
    UserRole.claimant => 'My justice workspace',
    UserRole.paralegal => 'Case preparation workspace',
    UserRole.lawyer => 'Professional review workspace',
  };

  static UserRole parse(String value) => UserRole.values.firstWhere(
    (role) => role.name == value,
    orElse: () => UserRole.claimant,
  );
}

class KatibaUser {
  const KatibaUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.initials,
  });

  final String id;
  final String name;
  final String email;
  final UserRole role;
  final String initials;

  factory KatibaUser.fromJson(Json json) => KatibaUser(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    email: json['email'] as String? ?? '',
    role: UserRoleX.parse(json['role'] as String? ?? 'claimant'),
    initials: json['initials'] as String? ?? '',
  );
}

class EvidenceItem {
  const EvidenceItem({
    required this.id,
    required this.name,
    required this.type,
    required this.category,
    required this.size,
    required this.addedAt,
    required this.verified,
  });

  final String id;
  final String name;
  final String type;
  final String category;
  final int size;
  final DateTime addedAt;
  final bool verified;

  factory EvidenceItem.fromJson(Json json) => EvidenceItem(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? 'Evidence item',
    type: json['type'] as String? ?? 'application/octet-stream',
    category: json['category'] as String? ?? 'other',
    size: (json['size'] as num?)?.toInt() ?? 0,
    addedAt:
        DateTime.tryParse(json['addedAt'] as String? ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
    verified: json['verified'] as bool? ?? false,
  );
}

class TimelineItem {
  const TimelineItem({
    required this.id,
    required this.date,
    required this.title,
    required this.detail,
    required this.confidence,
  });

  final String id;
  final String date;
  final String title;
  final String detail;
  final int confidence;

  factory TimelineItem.fromJson(Json json) => TimelineItem(
    id: json['id'] as String? ?? '',
    date: json['date'] as String? ?? '',
    title: json['title'] as String? ?? '',
    detail: json['detail'] as String? ?? '',
    confidence: (json['confidence'] as num?)?.toInt() ?? 0,
  );
}

class LegalIssue {
  const LegalIssue({
    required this.id,
    required this.severity,
    required this.title,
    required this.detail,
    this.action,
  });

  final String id;
  final String severity;
  final String title;
  final String detail;
  final String? action;

  factory LegalIssue.fromJson(Json json) => LegalIssue(
    id: json['id'] as String? ?? '',
    severity: json['severity'] as String? ?? 'attention',
    title: json['title'] as String? ?? '',
    detail: json['detail'] as String? ?? '',
    action: json['action'] as String?,
  );
}

class CitationItem {
  const CitationItem({
    required this.id,
    required this.label,
    required this.source,
    required this.section,
    required this.url,
    required this.proposition,
  });

  final String id;
  final String label;
  final String source;
  final String section;
  final String url;
  final String proposition;

  factory CitationItem.fromJson(Json json) => CitationItem(
    id: json['id'] as String? ?? '',
    label: json['label'] as String? ?? '',
    source: json['source'] as String? ?? '',
    section: json['section'] as String? ?? '',
    url: json['url'] as String? ?? '',
    proposition: json['proposition'] as String? ?? '',
  );
}

class AuditItem {
  const AuditItem({
    required this.id,
    required this.action,
    required this.actor,
    required this.detail,
    required this.createdAt,
  });

  final String id;
  final String action;
  final String actor;
  final String detail;
  final DateTime createdAt;

  factory AuditItem.fromJson(Json json) => AuditItem(
    id: json['id'] as String? ?? '',
    action: json['action'] as String? ?? '',
    actor: json['actor'] as String? ?? '',
    detail: json['detail'] as String? ?? '',
    createdAt:
        DateTime.tryParse(json['createdAt'] as String? ?? '') ??
        DateTime.fromMillisecondsSinceEpoch(0),
  );
}

class CaseRecord {
  const CaseRecord({
    required this.id,
    required this.reference,
    required this.claimantName,
    required this.respondentName,
    required this.amount,
    required this.currency,
    required this.claimType,
    required this.story,
    required this.language,
    required this.courtStation,
    required this.status,
    required this.completeness,
    required this.summary,
    required this.nextAction,
    required this.aiMode,
    required this.evidence,
    required this.timeline,
    required this.issues,
    required this.citations,
    required this.audit,
  });

  final String id;
  final String reference;
  final String claimantName;
  final String respondentName;
  final int amount;
  final String currency;
  final String claimType;
  final String story;
  final String language;
  final String courtStation;
  final String status;
  final int completeness;
  final String summary;
  final String nextAction;
  final String aiMode;
  final List<EvidenceItem> evidence;
  final List<TimelineItem> timeline;
  final List<LegalIssue> issues;
  final List<CitationItem> citations;
  final List<AuditItem> audit;

  factory CaseRecord.fromJson(Json json) => CaseRecord(
    id: json['id'] as String? ?? '',
    reference: json['reference'] as String? ?? '',
    claimantName: json['claimantName'] as String? ?? '',
    respondentName: json['respondentName'] as String? ?? '',
    amount: (json['amount'] as num?)?.toInt() ?? 0,
    currency: json['currency'] as String? ?? 'KES',
    claimType: json['claimType'] as String? ?? '',
    story: json['story'] as String? ?? '',
    language: json['language'] as String? ?? 'en',
    courtStation: json['courtStation'] as String? ?? '',
    status: json['status'] as String? ?? 'draft',
    completeness: (json['completeness'] as num?)?.toInt() ?? 0,
    summary: json['summary'] as String? ?? '',
    nextAction: json['nextAction'] as String? ?? '',
    aiMode: json['aiMode'] as String? ?? 'demo',
    evidence: _list(json['evidence']).map(EvidenceItem.fromJson).toList(),
    timeline: _list(json['timeline']).map(TimelineItem.fromJson).toList(),
    issues: _list(json['issues']).map(LegalIssue.fromJson).toList(),
    citations: _list(json['citations']).map(CitationItem.fromJson).toList(),
    audit: _list(json['audit']).map(AuditItem.fromJson).toList(),
  );

  String get amountLabel => '$currency ${_withCommas(amount)}';
  String get statusLabel => status
      .split('_')
      .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');
}

class DashboardStats {
  const DashboardStats({
    required this.activeCases,
    required this.readyForReview,
    required this.evidenceItems,
    required this.averageReadiness,
    required this.peopleGuided,
    required this.packsCreated,
  });

  final int activeCases;
  final int readyForReview;
  final int evidenceItems;
  final int averageReadiness;
  final int peopleGuided;
  final int packsCreated;

  factory DashboardStats.fromJson(Json json) {
    final impact = json['impact'] is Map
        ? Map<String, dynamic>.from(json['impact'] as Map)
        : <String, dynamic>{};
    return DashboardStats(
      activeCases: (json['activeCases'] as num?)?.toInt() ?? 0,
      readyForReview: (json['readyForReview'] as num?)?.toInt() ?? 0,
      evidenceItems: (json['evidenceItems'] as num?)?.toInt() ?? 0,
      averageReadiness: (json['averageReadiness'] as num?)?.toInt() ?? 0,
      peopleGuided: (impact['peopleGuided'] as num?)?.toInt() ?? 0,
      packsCreated: (impact['packsCreated'] as num?)?.toInt() ?? 0,
    );
  }
}

List<Json> _list(dynamic value) => value is List
    ? value
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList()
    : <Json>[];

String _withCommas(int value) {
  final text = value.toString();
  return text.replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (match) => ',');
}
