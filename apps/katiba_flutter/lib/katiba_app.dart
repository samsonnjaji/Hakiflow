import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'app_state.dart';
import 'katiba_theme.dart';
import 'models.dart';
import 'voice_service.dart';

class KatibaApp extends StatelessWidget {
  const KatibaApp({super.key, required this.state});

  final AppState state;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Katiba OS',
      theme: buildKatibaTheme(),
      home: ListenableBuilder(
        listenable: state,
        builder: (context, _) {
          if (state.initializing) return const _Splash();
          return state.signedIn
              ? _Workspace(state: state)
              : _LoginScreen(state: state);
        },
      ),
    );
  }
}

class _Splash extends StatelessWidget {
  const _Splash();

  @override
  Widget build(BuildContext context) => const Scaffold(
    body: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _Mark(size: 64),
          SizedBox(height: 22),
          Text('Opening your secure workspace'),
          SizedBox(height: 18),
          SizedBox(width: 180, child: LinearProgressIndicator()),
        ],
      ),
    ),
  );
}

class _Mark extends StatelessWidget {
  const _Mark({this.size = 44});
  final double size;

  @override
  Widget build(BuildContext context) => Semantics(
    label: 'Katiba OS',
    image: true,
    child: ClipRRect(
      borderRadius: BorderRadius.circular(size * .24),
      child: Image.asset(
        'assets/branding/katiba_app_icon.png',
        width: size,
        height: size,
        fit: BoxFit.cover,
        filterQuality: FilterQuality.high,
      ),
    ),
  );
}

class _LoginScreen extends StatefulWidget {
  const _LoginScreen({required this.state});
  final AppState state;

  @override
  State<_LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<_LoginScreen> {
  late final TextEditingController _apiController;
  UserRole _role = UserRole.claimant;

  @override
  void initState() {
    super.initState();
    _apiController = TextEditingController(text: widget.state.api.baseUrl);
  }

  @override
  void dispose() {
    _apiController.dispose();
    super.dispose();
  }

  Future<void> _enter() async {
    try {
      await widget.state.login(_role, apiUrl: _apiController.text);
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 920;
            final form = ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 570),
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Image.asset(
                      'assets/branding/katiba_wordmark.png',
                      width: 250,
                      height: 84,
                      fit: BoxFit.contain,
                      alignment: Alignment.centerLeft,
                      filterQuality: FilterQuality.high,
                    ),
                    const SizedBox(height: 54),
                    Text(
                      'Choose your legal workspace.',
                      style: Theme.of(context).textTheme.displaySmall,
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'Every role sees the same trusted case record, with permissions appropriate to their work.',
                    ),
                    const SizedBox(height: 28),
                    ...UserRole.values.map(
                      (role) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _RoleCard(
                          role: role,
                          selected: _role == role,
                          onTap: () => setState(() => _role = role),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _apiController,
                      keyboardType: TextInputType.url,
                      decoration: const InputDecoration(
                        labelText: 'Katiba OS API URL',
                        prefixIcon: Icon(Icons.dns_outlined),
                        helperText:
                            'Android emulator uses http://10.0.2.2:8787',
                      ),
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: widget.state.busy ? null : _enter,
                        icon: widget.state.busy
                            ? const SizedBox.square(
                                dimension: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.arrow_forward_rounded),
                        label: Text(
                          'Open ${_role.label.toLowerCase()} workspace',
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    const Row(
                      children: [
                        Icon(Icons.lock_outline, size: 17),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Signed sessions · case-level access · human approval',
                            style: TextStyle(fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
            if (!wide) return Center(child: form);
            return Row(
              children: [
                Expanded(child: Center(child: form)),
                Expanded(
                  child: Container(
                    color: KatibaColors.deepGreen,
                    padding: const EdgeInsets.all(64),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const _Mark(size: 84),
                        const SizedBox(height: 28),
                        Text(
                          'Evidence in.\nAccountable legal action out.',
                          style: Theme.of(context).textTheme.displaySmall
                              ?.copyWith(color: Colors.white, fontSize: 48),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'The intelligent legal operating system for East Africa.',
                          style: TextStyle(
                            color: Color(0xFFD4E8E0),
                            fontSize: 21,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 54),
                        const _TrustLine(
                          icon: Icons.fact_check_outlined,
                          title: 'Explainable',
                          copy:
                              'Every AI finding links back to facts and sources.',
                        ),
                        const _TrustLine(
                          icon: Icons.groups_2_outlined,
                          title: 'Human-led',
                          copy:
                              'Paralegals and lawyers keep professional authority.',
                        ),
                        const _TrustLine(
                          icon: Icons.shield_outlined,
                          title: 'Auditable',
                          copy:
                              'Actions, evidence and approvals have a visible trail.',
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.role,
    required this.selected,
    required this.onTap,
  });
  final UserRole role;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final detail = switch (role) {
      UserRole.claimant =>
        'Tell your story, add evidence and follow your case.',
      UserRole.paralegal => 'Prepare records, resolve gaps and route reviews.',
      UserRole.lawyer => 'Review legal grounding and approve final positions.',
    };
    final icon = switch (role) {
      UserRole.claimant => Icons.person_outline,
      UserRole.paralegal => Icons.fact_check_outlined,
      UserRole.lawyer => Icons.gavel_outlined,
    };
    return Material(
      color: selected ? KatibaColors.mint : KatibaColors.paper,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(
          color: selected ? KatibaColors.green : KatibaColors.border,
          width: selected ? 2 : 1,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: selected
                    ? KatibaColors.green
                    : KatibaColors.ivory,
                foregroundColor: selected ? Colors.white : KatibaColors.ink,
                child: Icon(icon),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      role.label,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(detail),
                  ],
                ),
              ),
              if (selected)
                const Icon(Icons.check_circle, color: KatibaColors.green),
            ],
          ),
        ),
      ),
    );
  }
}

class _TrustLine extends StatelessWidget {
  const _TrustLine({
    required this.icon,
    required this.title,
    required this.copy,
  });
  final IconData icon;
  final String title;
  final String copy;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 24),
    child: Row(
      children: [
        Icon(icon, color: const Color(0xFF9DD4BF), size: 30),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                copy,
                style: const TextStyle(
                  color: Color(0xFFC7DDD5),
                  fontFamily: 'Arial',
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _Workspace extends StatefulWidget {
  const _Workspace({required this.state});
  final AppState state;

  @override
  State<_Workspace> createState() => _WorkspaceState();
}

class _WorkspaceState extends State<_Workspace> {
  int index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      _DashboardPage(state: widget.state),
      _ContractPage(state: widget.state),
      _PlatformPage(state: widget.state),
      _SettingsPage(state: widget.state),
    ];
    const destinations = [
      NavigationDestination(
        icon: Icon(Icons.work_outline),
        selectedIcon: Icon(Icons.work),
        label: 'Cases',
      ),
      NavigationDestination(
        icon: Icon(Icons.description_outlined),
        selectedIcon: Icon(Icons.description),
        label: 'Contract',
      ),
      NavigationDestination(
        icon: Icon(Icons.hub_outlined),
        selectedIcon: Icon(Icons.hub),
        label: 'Platform',
      ),
      NavigationDestination(
        icon: Icon(Icons.settings_outlined),
        selectedIcon: Icon(Icons.settings),
        label: 'Settings',
      ),
    ];
    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            if (constraints.maxWidth < 900) return pages[index];
            return Row(
              children: [
                NavigationRail(
                  backgroundColor: KatibaColors.deepGreen,
                  indicatorColor: KatibaColors.green,
                  selectedIconTheme: const IconThemeData(color: Colors.white),
                  unselectedIconTheme: const IconThemeData(
                    color: Color(0xFFBBD4CB),
                  ),
                  selectedLabelTextStyle: const TextStyle(
                    color: Colors.white,
                    fontFamily: 'Arial',
                    fontWeight: FontWeight.w700,
                  ),
                  unselectedLabelTextStyle: const TextStyle(
                    color: Color(0xFFBBD4CB),
                    fontFamily: 'Arial',
                  ),
                  selectedIndex: index,
                  onDestinationSelected: (value) =>
                      setState(() => index = value),
                  labelType: NavigationRailLabelType.all,
                  leading: const Padding(
                    padding: EdgeInsets.symmetric(vertical: 20),
                    child: _Mark(),
                  ),
                  destinations: destinations
                      .map(
                        (item) => NavigationRailDestination(
                          icon: item.icon,
                          selectedIcon: item.selectedIcon,
                          label: Text(item.label),
                        ),
                      )
                      .toList(),
                ),
                Expanded(child: pages[index]),
              ],
            );
          },
        ),
      ),
      bottomNavigationBar: MediaQuery.sizeOf(context).width < 900
          ? NavigationBar(
              selectedIndex: index,
              onDestinationSelected: (value) => setState(() => index = value),
              destinations: destinations,
            )
          : null,
    );
  }
}

class _DashboardPage extends StatelessWidget {
  const _DashboardPage({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final user = state.user!;
    final stats = state.stats;
    return RefreshIndicator(
      onRefresh: state.refresh,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: _PageHeader(
              eyebrow: user.role.workspace,
              title: user.role == UserRole.claimant
                  ? 'Good morning, ${user.name.split(' ').first}.'
                  : 'Client matter review',
              copy: user.role == UserRole.claimant
                  ? 'Your evidence is organized. Here is the clearest next step.'
                  : 'AI organizes the record. You make the professional judgment.',
              initials: user.initials,
              action: user.role == UserRole.claimant
                  ? FilledButton.icon(
                      onPressed: () => _openIntake(context),
                      icon: const Icon(Icons.add),
                      label: const Text('Start a claim'),
                    )
                  : null,
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
            sliver: SliverGrid(
              delegate: SliverChildListDelegate([
                _StatCard(
                  label: 'Active cases',
                  value: '${stats?.activeCases ?? 0}',
                  icon: Icons.folder_open_outlined,
                  tint: KatibaColors.mint,
                ),
                _StatCard(
                  label: 'Ready for review',
                  value: '${stats?.readyForReview ?? 0}',
                  icon: Icons.fact_check_outlined,
                  tint: KatibaColors.sand,
                ),
                _StatCard(
                  label: 'Evidence items',
                  value: '${stats?.evidenceItems ?? 0}',
                  icon: Icons.attach_file,
                  tint: const Color(0xFFE4EDF3),
                ),
                _StatCard(
                  label: 'Average readiness',
                  value: '${stats?.averageReadiness ?? 0}%',
                  icon: Icons.donut_large,
                  tint: const Color(0xFFECE9F4),
                ),
              ]),
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 300,
                mainAxisExtent: 142,
                crossAxisSpacing: 14,
                mainAxisSpacing: 14,
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(24, 6, 24, 12),
            sliver: SliverToBoxAdapter(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    user.role == UserRole.claimant
                        ? 'My cases'
                        : 'Cases requiring attention',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  Text(
                    '${state.cases.length} total',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ),
          if (state.cases.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: Text('No cases in this workspace yet.')),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 40),
              sliver: SliverList.separated(
                itemCount: state.cases.length,
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 12),
                itemBuilder: (context, index) => _CaseCard(
                  record: state.cases[index],
                  onTap: () => _openCase(context, state.cases[index]),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _openIntake(BuildContext context) async {
    final created = await Navigator.of(context).push<CaseRecord>(
      MaterialPageRoute(builder: (_) => _IntakePage(state: state)),
    );
    if (created != null && context.mounted) _openCase(context, created);
  }

  void _openCase(BuildContext context, CaseRecord record) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => _CasePage(state: state, initial: record),
      ),
    );
  }
}

class _PageHeader extends StatelessWidget {
  const _PageHeader({
    required this.eyebrow,
    required this.title,
    required this.copy,
    required this.initials,
    this.action,
  });
  final String eyebrow;
  final String title;
  final String copy;
  final String initials;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(26, 28, 26, 24),
    child: Wrap(
      alignment: WrapAlignment.spaceBetween,
      runSpacing: 18,
      children: [
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                eyebrow.toUpperCase(),
                style: const TextStyle(
                  color: KatibaColors.green,
                  fontSize: 12,
                  fontFamily: 'Arial',
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 8),
              Text(title, style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 8),
              Text(copy),
            ],
          ),
        ),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (action != null) ...[action!, const SizedBox(width: 12)],
            CircleAvatar(
              radius: 22,
              backgroundColor: KatibaColors.green,
              foregroundColor: Colors.white,
              child: Text(
                initials,
                style: const TextStyle(
                  fontFamily: 'Arial',
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      ],
    ),
  );
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.tint,
  });
  final String label;
  final String value;
  final IconData icon;
  final Color tint;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(9),
            decoration: BoxDecoration(
              color: tint,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: KatibaColors.ink, size: 20),
          ),
          const Spacer(),
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              fontFamily: 'Arial',
              fontSize: 10,
              color: KatibaColors.slate,
              fontWeight: FontWeight.w800,
              letterSpacing: .5,
            ),
          ),
          const SizedBox(height: 4),
          Text(value, style: Theme.of(context).textTheme.headlineSmall),
        ],
      ),
    ),
  );
}

class _CaseCard extends StatelessWidget {
  const _CaseCard({required this.record, required this.onTap});
  final CaseRecord record;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: KatibaColors.mint,
              foregroundColor: KatibaColors.deepGreen,
              child: Text(
                record.claimantName
                    .split(' ')
                    .take(2)
                    .map((part) => part[0])
                    .join(),
                style: const TextStyle(
                  fontFamily: 'Arial',
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    record.claimantName,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 4),
                  Text('${record.reference} · ${record.claimType}'),
                  const SizedBox(height: 10),
                  LinearProgressIndicator(
                    value: record.completeness / 100,
                    minHeight: 6,
                    borderRadius: BorderRadius.circular(6),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 18),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  record.amountLabel,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                _StatusChip(record.statusLabel),
              ],
            ),
            const SizedBox(width: 6),
            const Icon(Icons.chevron_right),
          ],
        ),
      ),
    ),
  );
}

class _StatusChip extends StatelessWidget {
  const _StatusChip(this.label);
  final String label;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: KatibaColors.mint,
      borderRadius: BorderRadius.circular(40),
    ),
    child: Text(
      label,
      style: const TextStyle(
        fontFamily: 'Arial',
        fontSize: 11,
        fontWeight: FontWeight.w800,
        color: KatibaColors.deepGreen,
      ),
    ),
  );
}

class _CasePage extends StatefulWidget {
  const _CasePage({required this.state, required this.initial});
  final AppState state;
  final CaseRecord initial;

  @override
  State<_CasePage> createState() => _CasePageState();
}

class _CasePageState extends State<_CasePage> {
  late CaseRecord record = widget.initial;
  final voice = VoiceService();
  bool working = false;
  bool speaking = false;

  @override
  void dispose() {
    unawaited(voice.dispose());
    super.dispose();
  }

  Future<void> _speak() async {
    setState(() => speaking = true);
    try {
      final audio = await widget.state.api.speak(
        '${record.summary} Next action: ${record.nextAction}',
      );
      await voice.play(audio);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => speaking = false);
    }
  }

  Future<void> _mutate(Future<CaseRecord?> Function() action) async {
    setState(() => working = true);
    try {
      final next = await action();
      if (next != null && mounted) setState(() => record = next);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => working = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: Text(record.reference),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(child: _StatusChip(record.statusLabel)),
            ),
          ],
          bottom: const TabBar(
            isScrollable: true,
            tabs: [
              Tab(text: 'Overview'),
              Tab(text: 'Evidence'),
              Tab(text: 'AI analysis'),
              Tab(text: 'Activity'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _CaseOverview(record: record),
            _EvidenceView(record: record),
            _AnalysisView(record: record),
            _ActivityView(record: record),
          ],
        ),
        bottomNavigationBar: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Wrap(
              alignment: WrapAlignment.center,
              spacing: 10,
              runSpacing: 10,
              children: [
                FilledButton.icon(
                  onPressed: working
                      ? null
                      : () => _mutate(() => widget.state.analyze(record)),
                  icon: const Icon(Icons.auto_awesome),
                  label: const Text('Analyze evidence'),
                ),
                OutlinedButton.icon(
                  onPressed: () => launchUrl(
                    widget.state.api.packUri(record.id),
                    mode: LaunchMode.externalApplication,
                  ),
                  icon: const Icon(Icons.picture_as_pdf_outlined),
                  label: const Text('Open PDF pack'),
                ),
                OutlinedButton.icon(
                  onPressed: speaking ? null : _speak,
                  icon: speaking
                      ? const SizedBox.square(
                          dimension: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.volume_up_outlined),
                  label: const Text('Listen'),
                ),
                if (widget.state.isProfessional)
                  OutlinedButton.icon(
                    onPressed: working
                        ? null
                        : () => _mutate(
                            () => widget.state.setStatus(record, 'approved'),
                          ),
                    icon: const Icon(Icons.verified_outlined),
                    label: const Text('Approve'),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CaseOverview extends StatelessWidget {
  const _CaseOverview({required this.record});
  final CaseRecord record;

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(22),
    children: [
      _HeroCard(record: record),
      const SizedBox(height: 16),
      _SectionCard(
        title: 'What the evidence says',
        icon: Icons.fact_check_outlined,
        child: Text(record.summary),
      ),
      const SizedBox(height: 16),
      _SectionCard(
        title: 'Next best action',
        icon: Icons.route_outlined,
        tint: KatibaColors.sand,
        child: Text(record.nextAction),
      ),
      const SizedBox(height: 16),
      _SectionCard(
        title: 'Claimant story',
        icon: Icons.format_quote_outlined,
        child: Text(record.story),
      ),
    ],
  );
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.record});
  final CaseRecord record;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(22),
      child: Wrap(
        alignment: WrapAlignment.spaceBetween,
        runSpacing: 16,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                record.claimType.toUpperCase(),
                style: const TextStyle(
                  fontFamily: 'Arial',
                  color: KatibaColors.green,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '${record.claimantName} v ${record.respondentName}',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(record.courtStation),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                record.amountLabel,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text('${record.completeness}% ready'),
            ],
          ),
        ],
      ),
    ),
  );
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.icon,
    required this.child,
    this.tint = KatibaColors.mint,
  });
  final String title;
  final IconData icon;
  final Widget child;
  final Color tint;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: tint,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 20),
              ),
              const SizedBox(width: 12),
              Text(title, style: Theme.of(context).textTheme.titleLarge),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    ),
  );
}

class _EvidenceView extends StatelessWidget {
  const _EvidenceView({required this.record});
  final CaseRecord record;

  @override
  Widget build(BuildContext context) => ListView.separated(
    padding: const EdgeInsets.all(22),
    itemCount: record.evidence.length,
    separatorBuilder: (context, index) => const SizedBox(height: 12),
    itemBuilder: (context, index) {
      final item = record.evidence[index];
      return Card(
        child: ListTile(
          contentPadding: const EdgeInsets.all(16),
          leading: CircleAvatar(
            backgroundColor: KatibaColors.mint,
            child: Icon(
              item.type.contains('pdf')
                  ? Icons.picture_as_pdf_outlined
                  : Icons.insert_drive_file_outlined,
            ),
          ),
          title: Text(
            item.name,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          subtitle: Text(
            '${item.category} · ${(item.size / 1024).toStringAsFixed(1)} KB',
          ),
          trailing: Icon(
            item.verified ? Icons.verified : Icons.schedule,
            color: item.verified ? KatibaColors.green : KatibaColors.gold,
          ),
        ),
      );
    },
  );
}

class _AnalysisView extends StatelessWidget {
  const _AnalysisView({required this.record});
  final CaseRecord record;

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(22),
    children: [
      Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(
          color: KatibaColors.deepGreen,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'KATIBA AI ANALYSIS',
              style: TextStyle(
                color: Color(0xFF9FD4C0),
                fontFamily: 'Arial',
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              record.summary,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 19,
                fontFamily: 'Georgia',
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              '${record.completeness}% readiness · ${record.aiMode == 'openai' ? 'OpenAI structured analysis' : 'safe deterministic mode'}',
              style: const TextStyle(
                color: Color(0xFFD4E8E0),
                fontFamily: 'Arial',
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      ...record.issues.map(
        (issue) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _SectionCard(
            title: issue.title,
            icon: issue.severity == 'strength'
                ? Icons.check_circle_outline
                : Icons.warning_amber,
            tint: issue.severity == 'strength'
                ? KatibaColors.mint
                : KatibaColors.sand,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(issue.detail),
                if (issue.action != null) ...[
                  const SizedBox(height: 10),
                  Text(
                    issue.action!,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      color: KatibaColors.green,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
      if (record.citations.isNotEmpty)
        _SectionCard(
          title: 'Vetted legal sources',
          icon: Icons.menu_book_outlined,
          child: Column(
            children: record.citations
                .map(
                  (citation) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(citation.label),
                    subtitle: Text('${citation.source} · ${citation.section}'),
                    trailing: const Icon(Icons.open_in_new),
                    onTap: () => launchUrl(
                      Uri.parse(citation.url),
                      mode: LaunchMode.externalApplication,
                    ),
                  ),
                )
                .toList(),
          ),
        ),
    ],
  );
}

class _ActivityView extends StatelessWidget {
  const _ActivityView({required this.record});
  final CaseRecord record;

  @override
  Widget build(BuildContext context) => ListView.separated(
    padding: const EdgeInsets.all(22),
    itemCount: record.audit.length,
    separatorBuilder: (context, index) => const SizedBox(height: 12),
    itemBuilder: (context, index) {
      final item = record.audit[index];
      return Card(
        child: ListTile(
          contentPadding: const EdgeInsets.all(16),
          leading: const CircleAvatar(
            backgroundColor: KatibaColors.mint,
            child: Icon(Icons.history),
          ),
          title: Text(item.action),
          subtitle: Text('${item.actor}\n${item.detail}'),
          isThreeLine: true,
        ),
      );
    },
  );
}

class _IntakePage extends StatefulWidget {
  const _IntakePage({required this.state});
  final AppState state;

  @override
  State<_IntakePage> createState() => _IntakePageState();
}

class _IntakePageState extends State<_IntakePage> {
  final key = GlobalKey<FormState>();
  final voice = VoiceService();
  late final claimant = TextEditingController(
    text: widget.state.user?.name ?? '',
  );
  final respondent = TextEditingController();
  final address = TextEditingController();
  final amount = TextEditingController();
  final story = TextEditingController();
  final evidenceName = TextEditingController(text: 'Supporting document.pdf');
  String claimType = 'Unpaid goods or services';
  String court = 'Milimani Small Claims Court';
  String language = 'en';
  String category = 'agreement';
  bool consent = false;
  bool working = false;
  bool voiceBusy = false;

  @override
  void dispose() {
    for (final controller in [
      claimant,
      respondent,
      address,
      amount,
      story,
      evidenceName,
    ]) {
      controller.dispose();
    }
    unawaited(voice.dispose());
    super.dispose();
  }

  Future<void> _toggleVoice() async {
    if (voiceBusy) return;
    try {
      if (!voice.recording) {
        await voice.start();
        if (mounted) setState(() {});
        return;
      }
      setState(() => voiceBusy = true);
      final audio = await voice.stop();
      final transcript = await widget.state.api.transcribe(
        audio,
        language: language,
      );
      final prefix = story.text.trim().isEmpty ? '' : '${story.text.trim()} ';
      story.text = '$prefix${transcript.trim()}';
      story.selection = TextSelection.collapsed(offset: story.text.length);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => voiceBusy = false);
    }
  }

  Future<void> _submit() async {
    if (!(key.currentState?.validate() ?? false) || !consent) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Complete the required details and record consent.'),
        ),
      );
      return;
    }
    setState(() => working = true);
    try {
      final created = await widget.state.createClaim({
        'claimantName': claimant.text.trim(),
        'respondentName': respondent.text.trim(),
        'respondentAddress': address.text.trim(),
        'amount': int.parse(amount.text.replaceAll(',', '')),
        'claimType': claimType,
        'story': story.text.trim(),
        'language': language,
        'courtStation': court,
        'consent': true,
        'evidence': [
          {
            'name': evidenceName.text.trim(),
            'type': 'application/pdf',
            'size': 12000,
            'category': category,
          },
        ],
      });
      if (mounted) Navigator.of(context).pop(created);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => working = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Start a claim')),
    body: Form(
      key: key,
      child: ListView(
        padding: const EdgeInsets.all(22),
        children:
            [
                  Text(
                    'Tell us what happened.',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Plain language is enough. Katiba OS will organize the record and show what still needs review.',
                  ),
                  const SizedBox(height: 24),
                  _RequiredField(controller: claimant, label: 'Your full name'),
                  _RequiredField(
                    controller: respondent,
                    label: 'Respondent name',
                  ),
                  TextFormField(
                    controller: address,
                    decoration: const InputDecoration(
                      labelText: 'Respondent service address',
                    ),
                  ),
                  const SizedBox(height: 14),
                  _RequiredField(
                    controller: amount,
                    label: 'Amount claimed (KES)',
                    keyboardType: TextInputType.number,
                  ),
                  DropdownButtonFormField<String>(
                    initialValue: claimType,
                    decoration: const InputDecoration(labelText: 'Claim type'),
                    items:
                        [
                              'Unpaid goods or services',
                              'Money lent and unpaid',
                              'Damaged movable property',
                              'Unpaid professional services',
                            ]
                            .map(
                              (value) => DropdownMenuItem(
                                value: value,
                                child: Text(value),
                              ),
                            )
                            .toList(),
                    onChanged: (value) => setState(() => claimType = value!),
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: story,
                    minLines: 5,
                    maxLines: 9,
                    decoration: const InputDecoration(
                      labelText: 'What happened?',
                      hintText:
                          'Include dates, agreements, payments, delivery and what remains unresolved.',
                    ),
                    validator: (value) => (value?.trim().length ?? 0) < 40
                        ? 'Please add at least 40 characters.'
                        : null,
                  ),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: OutlinedButton.icon(
                      onPressed: voiceBusy ? null : _toggleVoice,
                      icon: voiceBusy
                          ? const SizedBox.square(
                              dimension: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Icon(
                              voice.recording
                                  ? Icons.stop_circle_outlined
                                  : Icons.mic_none,
                            ),
                      label: Text(
                        voiceBusy
                            ? 'Transcribing…'
                            : voice.recording
                            ? 'Stop and transcribe'
                            : 'Tell your story by voice',
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<String>(
                    initialValue: language,
                    decoration: const InputDecoration(labelText: 'Language'),
                    items: const [
                      DropdownMenuItem(value: 'en', child: Text('English')),
                      DropdownMenuItem(value: 'sw', child: Text('Kiswahili')),
                    ],
                    onChanged: (value) => setState(() => language = value!),
                  ),
                  const SizedBox(height: 14),
                  DropdownButtonFormField<String>(
                    initialValue: court,
                    decoration: const InputDecoration(
                      labelText: 'Court station',
                    ),
                    items:
                        [
                              'Milimani Small Claims Court',
                              'Mombasa Small Claims Court',
                              'Kisumu Small Claims Court',
                            ]
                            .map(
                              (value) => DropdownMenuItem(
                                value: value,
                                child: Text(value),
                              ),
                            )
                            .toList(),
                    onChanged: (value) => setState(() => court = value!),
                  ),
                  const SizedBox(height: 28),
                  Text(
                    'First evidence item',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  _RequiredField(controller: evidenceName, label: 'File name'),
                  DropdownButtonFormField<String>(
                    initialValue: category,
                    decoration: const InputDecoration(
                      labelText: 'Evidence category',
                    ),
                    items:
                        [
                              'agreement',
                              'payment',
                              'communication',
                              'delivery',
                              'identity',
                              'other',
                            ]
                            .map(
                              (value) => DropdownMenuItem(
                                value: value,
                                child: Text(value),
                              ),
                            )
                            .toList(),
                    onChanged: (value) => setState(() => category = value!),
                  ),
                  const SizedBox(height: 18),
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    value: consent,
                    onChanged: (value) =>
                        setState(() => consent = value ?? false),
                    title: const Text(
                      'I consent to purpose-specific case analysis.',
                    ),
                    subtitle: const Text(
                      'The demo records this consent in the case audit trail.',
                    ),
                    controlAffinity: ListTileControlAffinity.leading,
                  ),
                  const SizedBox(height: 18),
                  FilledButton.icon(
                    onPressed: working ? null : _submit,
                    icon: const Icon(Icons.arrow_forward),
                    label: const Text('Create secure case'),
                  ),
                ]
                .expand(
                  (widget) => [
                    widget,
                    if (widget is TextFormField || widget is _RequiredField)
                      const SizedBox(height: 14),
                  ],
                )
                .toList(),
      ),
    ),
  );
}

class _RequiredField extends StatelessWidget {
  const _RequiredField({
    required this.controller,
    required this.label,
    this.keyboardType,
  });
  final TextEditingController controller;
  final String label;
  final TextInputType? keyboardType;

  @override
  Widget build(BuildContext context) => TextFormField(
    controller: controller,
    keyboardType: keyboardType,
    decoration: InputDecoration(labelText: label),
    validator: (value) =>
        (value?.trim().isEmpty ?? true) ? 'This field is required.' : null,
  );
}

class _ContractPage extends StatelessWidget {
  const _ContractPage({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final contract = state.contract ?? const <String, dynamic>{};
    final findings = contract['findings'] is List
        ? (contract['findings'] as List)
              .whereType<Map>()
              .map((item) => Map<String, dynamic>.from(item))
              .toList()
        : <Json>[];
    final upcoming = contract['upcoming'] is List
        ? (contract['upcoming'] as List)
              .whereType<Map>()
              .map((item) => Map<String, dynamic>.from(item))
              .toList()
        : <Json>[];
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        _PageHeader(
          eyebrow: 'Katiba OS · Contract Engine',
          title: 'Turn legal text into an obligation map.',
          copy:
              'Upload, extract, compare and review without losing the clause-level source.',
          initials: state.user!.initials,
        ),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(22),
            child: Wrap(
              spacing: 28,
              runSpacing: 18,
              alignment: WrapAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      contract['name'] as String? ?? 'Demo agreement',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 6),
                    Text(contract['summary'] as String? ?? ''),
                  ],
                ),
                _Gauge(value: (contract['health'] as num?)?.toInt() ?? 0),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Risks requiring review',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 12),
        ...findings.map(
          (item) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: _SectionCard(
              title: item['title'] as String? ?? '',
              icon: item['level'] == 'high'
                  ? Icons.error_outline
                  : Icons.warning_amber,
              tint: item['level'] == 'high'
                  ? const Color(0xFFF6E1DA)
                  : KatibaColors.sand,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Clause ${item['clause']} · ${(item['level'] as String? ?? '').toUpperCase()}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      color: KatibaColors.green,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(item['detail'] as String? ?? ''),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        _SectionCard(
          title: 'First 30 days',
          icon: Icons.calendar_month_outlined,
          child: Column(
            children: upcoming
                .map(
                  (item) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(item['action'] as String? ?? ''),
                    subtitle: Text('${item['owner']} · ${item['due']}'),
                  ),
                )
                .toList(),
          ),
        ),
        const SizedBox(height: 32),
      ],
    );
  }
}

class _Gauge extends StatelessWidget {
  const _Gauge({required this.value});
  final int value;

  @override
  Widget build(BuildContext context) => SizedBox.square(
    dimension: 104,
    child: Stack(
      alignment: Alignment.center,
      children: [
        CircularProgressIndicator(
          value: value / 100,
          strokeWidth: 9,
          color: KatibaColors.gold,
          backgroundColor: KatibaColors.border,
        ),
        Text('$value', style: Theme.of(context).textTheme.headlineSmall),
      ],
    ),
  );
}

class _PlatformPage extends StatelessWidget {
  const _PlatformPage({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final data = state.platform ?? const <String, dynamic>{};
    final engines =
        (data['engines'] as List?)?.cast<String>() ?? const <String>[];
    final clients =
        (data['clients'] as List?)?.cast<String>() ?? const <String>[];
    final trust = (data['trust'] as List?)?.cast<String>() ?? const <String>[];
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        _PageHeader(
          eyebrow: 'Hybrid platform',
          title: 'One trust layer. Four legal engines.',
          copy:
              'Web and Flutter clients use the same API, permissions, case record and audit history.',
          initials: state.user!.initials,
        ),
        Wrap(
          spacing: 14,
          runSpacing: 14,
          children: engines
              .map(
                (engine) => SizedBox(
                  width: 280,
                  height: 170,
                  child: _SectionCard(
                    title:
                        '${engine[0].toUpperCase()}${engine.substring(1)} Engine',
                    icon: switch (engine) {
                      'justice' => Icons.balance_outlined,
                      'contract' => Icons.description_outlined,
                      'compliance' => Icons.policy_outlined,
                      _ => Icons.fact_check_outlined,
                    },
                    child: Text(switch (engine) {
                      'justice' =>
                        'Stories and evidence become reviewable access-to-justice packs.',
                      'contract' =>
                        'Clauses become risks, obligations and reviewer decisions.',
                      'compliance' =>
                        'Rules become controls, owners and evidence.',
                      _ => 'Files become chronology, checksums and provenance.',
                    }),
                  ),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 24),
        _SectionCard(
          title: 'Cross-platform clients',
          icon: Icons.devices_outlined,
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: clients.map((item) => Chip(label: Text(item))).toList(),
          ),
        ),
        const SizedBox(height: 14),
        _SectionCard(
          title: 'Shared trust controls',
          icon: Icons.shield_outlined,
          child: Column(
            children: trust
                .map(
                  (item) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(
                      Icons.check_circle,
                      color: KatibaColors.green,
                    ),
                    title: Text(item),
                  ),
                )
                .toList(),
          ),
        ),
        const SizedBox(height: 30),
      ],
    );
  }
}

class _SettingsPage extends StatefulWidget {
  const _SettingsPage({required this.state});
  final AppState state;

  @override
  State<_SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<_SettingsPage> {
  late final controller = TextEditingController(text: widget.state.api.baseUrl);

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(24),
    children: [
      _PageHeader(
        eyebrow: 'Configuration',
        title: 'Secure connection settings',
        copy:
            'The OpenAI key stays on the API server. The app stores only its signed Katiba OS session.',
        initials: widget.state.user!.initials,
      ),
      _SectionCard(
        title: 'API endpoint',
        icon: Icons.dns_outlined,
        child: Column(
          children: [
            TextField(
              controller: controller,
              decoration: const InputDecoration(labelText: 'Render API URL'),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () async {
                  final messenger = ScaffoldMessenger.of(context);
                  await widget.state.configureApi(controller.text);
                  if (mounted) {
                    messenger.showSnackBar(
                      const SnackBar(content: Text('API URL saved.')),
                    );
                  }
                },
                child: const Text('Save endpoint'),
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 14),
      _SectionCard(
        title: 'Signed-in role',
        icon: Icons.badge_outlined,
        child: ListTile(
          contentPadding: EdgeInsets.zero,
          leading: CircleAvatar(
            backgroundColor: KatibaColors.green,
            foregroundColor: Colors.white,
            child: Text(widget.state.user!.initials),
          ),
          title: Text(widget.state.user!.name),
          subtitle: Text(
            '${widget.state.user!.role.label} · ${widget.state.user!.email}',
          ),
        ),
      ),
      const SizedBox(height: 14),
      OutlinedButton.icon(
        onPressed: widget.state.logout,
        icon: const Icon(Icons.logout),
        label: const Text('Leave demo'),
      ),
    ],
  );
}
