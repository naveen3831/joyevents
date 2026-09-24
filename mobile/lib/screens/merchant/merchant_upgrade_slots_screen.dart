import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../config/app_theme.dart';
import '../../models/user_model.dart';
import '../../services/app_lifecycle_service.dart';
import '../../services/auth_service.dart';
import '../../services/merchant_service.dart';
import '../../utils/currency_formatter.dart';
import '../../widgets/loading_view.dart';

class MerchantUpgradeSlotsScreen extends StatefulWidget {
  const MerchantUpgradeSlotsScreen({super.key});

  @override
  State<MerchantUpgradeSlotsScreen> createState() => _MerchantUpgradeSlotsScreenState();
}

class _MerchantUpgradeSlotsScreenState extends State<MerchantUpgradeSlotsScreen> {
  final _merchantService = MerchantService();
  final _formKey = GlobalKey<FormState>();

  final _eventsCtrl = TextEditingController(text: '5');
  final _servicesCtrl = TextEditingController(text: '5');
  final _messageCtrl = TextEditingController();

  bool _loading = true;
  bool _submitting = false;

  List<dynamic> _myEvents = [];
  List<dynamic> _myServices = [];
  List<dynamic> _tickets = [];

  // ── Active-request detection ────────────────────────────────────────────────
  // Statuses that block a new submission (mirrors backend activeStatuses):
  // 'pending'        = under admin review
  // 'quotation_sent' = merchant must pay the quote
  // 'paid'           = awaiting admin approval / activation
  static const _blockingStatuses = ['pending', 'quotation_sent', 'paid'];

  /// True when the merchant already has an in-progress upgrade request.
  /// Evaluated from the freshly fetched _tickets list — never from a local bool.
  bool get _hasActiveRequest =>
      _tickets.any((t) => _blockingStatuses.contains((t as Map<String, dynamic>)['status']?.toString()));

  /// The first active (blocking) ticket, or null.
  Map<String, dynamic>? get _activeTicket => _tickets
      .cast<Map<String, dynamic>>()
      .where((t) => _blockingStatuses.contains(t['status']?.toString()))
      .firstOrNull;

  @override
  void initState() {
    super.initState();
    _loadData();
    AppLifecycleService().addResumeCallback(_onAppResumed);
  }

  void _onAppResumed() {
    if (mounted) {
      _loadData();
    }
  }

  @override
  void dispose() {
    AppLifecycleService().removeResumeCallback(_onAppResumed);
    _eventsCtrl.dispose();
    _servicesCtrl.dispose();
    _messageCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      // Reset submitting flag on every reload so that a screen re-open after
      // a crash/restart never leaves the button stuck in a loading state.
      _submitting = false;
    });

    try {
      final results = await Future.wait([
        _merchantService.getMyEvents(),
        _merchantService.getMyServices(),
        _merchantService.getTickets(),
        AuthService().getMe(), // Refresh latest user profile & slot limits automatically
      ]);

      setState(() {
        _myEvents = List<dynamic>.from(results[0] as List);
        _myServices = List<dynamic>.from(results[1] as List);
        _tickets = List<dynamic>.from(results[2] as List);
      });
    } catch (e) {
      // Ignored or logged
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitTicket() async {
    // Guard: re-check active request from the backend-sourced list before
    // submitting. This catches cases where the status changed on another device
    // since the last load, without any roundtrip delay.
    if (_hasActiveRequest) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text(
          'Your upgrade request is currently being processed. You can submit a new request once this one is completed.',
        ),
        backgroundColor: AppTheme.warningColor,
        duration: Duration(seconds: 4),
      ));
      return;
    }

    if (!_formKey.currentState!.validate()) return;

    final reqEv = int.tryParse(_eventsCtrl.text.trim()) ?? 0;
    final reqSe = int.tryParse(_servicesCtrl.text.trim()) ?? 0;

    if (reqEv == 0 && reqSe == 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Please request at least one slot upgrade increase.'),
        backgroundColor: AppTheme.errorColor,
      ));
      return;
    }

    // Set _submitting BEFORE any await so rapid multi-taps are all blocked.
    setState(() => _submitting = true);

    try {
      await _merchantService.raiseTicket({
        'requestedEvents': reqEv,
        'requestedServices': reqSe,
        'message': _messageCtrl.text.trim(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Upgrade ticket request submitted successfully!'),
          backgroundColor: AppTheme.successColor,
        ));
        _messageCtrl.clear();
        // Refresh from backend so the new request appears and the button
        // transitions to blocked state.
        await _loadData();
      }
    } catch (e) {
      if (!mounted) return;

      final msg = e.toString();

      // HTTP 409: a duplicate was detected on the server (e.g. submitted from
      // another device while this screen was open). Refresh the list so the
      // UI reflects the server's actual state, and show the backend message.
      // Do NOT add a phantom entry to _tickets.
      if (msg.contains('upgrade request in progress') || msg.contains('409')) {
        await _loadData();          // Fetch the real active ticket
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(
              msg.replaceFirst(RegExp(r'^Exception:\s*'), ''),
            ),
            backgroundColor: AppTheme.warningColor,
            duration: const Duration(seconds: 5),
          ));
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(msg),
          backgroundColor: AppTheme.errorColor,
        ));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _openPaymentModal(Map<String, dynamic> ticket) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _PayTicketModal(
        ticket: ticket,
        onSuccess: () {
          Navigator.of(ctx).pop();
          _loadData();
          // Update user profile
          context.read<AuthService>().getMe();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthService>().currentUser;
    final maxEv = user?.maxEvents ?? 5;
    final maxSe = user?.maxServices ?? 5;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Text(
          'Raise Upgrade Ticket',
          style: GoogleFonts.poppins(
            fontWeight: FontWeight.w700,
            fontSize: 18,
            color: AppTheme.textColor,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppTheme.textColor),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppTheme.primaryColor),
            onPressed: _loading ? null : _loadData,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: SafeArea(
        child: _loading
            ? const LoadingView()
            : RefreshIndicator(
                onRefresh: _loadData,
                color: AppTheme.primaryColor,
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                  physics: const AlwaysScrollableScrollPhysics(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. Slot Utilization Summary Card
                      _buildSlotLimitsCard(user, maxEv, maxSe),

                      const SizedBox(height: 20),

                      // 2. Request Form Card
                      _buildFormCard(),

                      const SizedBox(height: 24),

                      // 3. Ticket History Section
                      _buildTicketHistorySection(),

                      const SizedBox(height: 30),
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  // ─── 1. Slot Utilization Summary Card ──────────────────────────────────────
  Widget _buildSlotLimitsCard(UserModel? user, int maxEv, int maxSe) {
    final evCount = _myEvents.length;
    final seCount = _myServices.length;

    final evRatio = (maxEv > 0 ? (evCount / maxEv) : 0.0).clamp(0.0, 1.0);
    final seRatio = (maxSe > 0 ? (seCount / maxSe) : 0.0).clamp(0.0, 1.0);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.borderColor),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: const BoxDecoration(
                  color: AppTheme.tintVioletBg,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.confirmation_number_outlined, color: AppTheme.primaryColor, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Listing Slot Allocation',
                      style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textColor),
                    ),
                    Text(
                      'Manage your event & service publishing capacity.',
                      style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.subtitleColor),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(height: 1, color: AppTheme.borderColor),
          const SizedBox(height: 16),

          // Events slot bar
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Events Listed', style: GoogleFonts.poppins(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppTheme.textColor)),
              Text('$evCount / $maxEv slots', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.primaryColor)),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: evRatio,
              minHeight: 6,
              backgroundColor: AppTheme.tintVioletBg,
              valueColor: AlwaysStoppedAnimation<Color>(evRatio >= 1.0 ? AppTheme.errorColor : AppTheme.primaryColor),
            ),
          ),

          const SizedBox(height: 14),

          // Services slot bar
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Services Listed', style: GoogleFonts.poppins(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppTheme.textColor)),
              Text('$seCount / $maxSe slots', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.tintPinkFg)),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: seRatio,
              minHeight: 6,
              backgroundColor: AppTheme.tintPinkBg,
              valueColor: AlwaysStoppedAnimation<Color>(seRatio >= 1.0 ? AppTheme.errorColor : AppTheme.tintPinkFg),
            ),
          ),
        ],
      ),
    );
  }

  // ─── 2. Request Form Card ──────────────────────────────────────────────────
  Widget _buildFormCard() {
    // Derive blocked state from the server-sourced ticket list — not a local bool.
    final blocked = _hasActiveRequest;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.borderColor),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  blocked ? Icons.lock_outline_rounded : Icons.add_task_rounded,
                  color: blocked ? AppTheme.subtitleColor : AppTheme.primaryColor,
                  size: 22,
                ),
                const SizedBox(width: 8),
                Text('Request Additional Slots', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textColor)),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              blocked
                  ? 'A request is already in progress. You can submit a new one once it is resolved.'
                  : 'Submit a request to platform admin to upgrade your listing capacity.',
              style: GoogleFonts.poppins(fontSize: 12, color: blocked ? AppTheme.warningColor : AppTheme.subtitleColor),
            ),

            // ── Active-request banner ──────────────────────────────────────
            if (blocked) ...[
              const SizedBox(height: 16),
              _buildActiveRequestBanner(_activeTicket),
            ] else ...[
              // ── Submission form (only shown when no active request) ──────
              const SizedBox(height: 18),

              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildFieldLabel('ADDITIONAL EVENT SLOTS'),
                        TextFormField(
                          controller: _eventsCtrl,
                          keyboardType: TextInputType.number,
                          style: _inputTextStyle(),
                          maxLength: 3,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(3),
                          ],
                          decoration: _inputDecoration(hintText: 'e.g. 5'),
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) return 'Required';
                            final n = int.tryParse(v.trim());
                            if (n == null || n < 0 || n > 100) return '0 to 100';
                            return null;
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildFieldLabel('ADDITIONAL SERVICE SLOTS'),
                        TextFormField(
                          controller: _servicesCtrl,
                          keyboardType: TextInputType.number,
                          style: _inputTextStyle(),
                          maxLength: 3,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(3),
                          ],
                          decoration: _inputDecoration(hintText: 'e.g. 5'),
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) return 'Required';
                            final n = int.tryParse(v.trim());
                            if (n == null || n < 0 || n > 100) return '0 to 100';
                            return null;
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              _buildFieldLabel('EXPLANATION MESSAGE (OPTIONAL)'),
              TextFormField(
                controller: _messageCtrl,
                minLines: 2,
                maxLines: 4,
                maxLength: 300,
                style: _inputTextStyle(),
                decoration: _inputDecoration(hintText: 'Why do you need more slots? e.g. Scaling up, peak season demand.'),
                validator: (v) {
                  if (v != null && v.trim().length > 300) return 'Max 300 characters';
                  return null;
                },
              ),

              const SizedBox(height: 18),

              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  // onPressed is null (disabled) while _submitting to block rapid taps.
                  onPressed: _submitting ? null : _submitTicket,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: AppTheme.primaryColor.withValues(alpha: 0.5),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                    minimumSize: const Size(0, 48),
                    alignment: Alignment.center,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: _submitting
                      ? Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'Submitting...',
                              style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                            ),
                          ],
                        )
                      : Text(
                          'Submit Upgrade Request',
                          style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ─── Active-Request Banner ─────────────────────────────────────────────────
  Widget _buildActiveRequestBanner(Map<String, dynamic>? ticket) {
    final status = ticket?['status']?.toString() ?? 'pending';

    String statusLabel;
    IconData statusIcon;
    Color accentColor;
    String detail;

    switch (status) {
      case 'quotation_sent':
        statusLabel = 'Quotation Received — Payment Pending';
        statusIcon = Icons.receipt_long_rounded;
        accentColor = AppTheme.primaryColor;
        detail = 'Admin has sent a quotation. Scroll down to the request history and tap \'Pay & Upgrade\' to proceed.';
        break;
      case 'paid':
        statusLabel = 'Payment Received — Awaiting Approval';
        statusIcon = Icons.verified_outlined;
        accentColor = const Color(0xFF1D4ED8);
        detail = 'Your payment has been recorded. An admin will approve and activate your upgraded slots shortly.';
        break;
      default: // 'pending'
        statusLabel = 'Under Admin Review';
        statusIcon = Icons.hourglass_top_rounded;
        accentColor = const Color(0xFFB45309);
        detail = 'Your request has been received and is being reviewed. You will be notified once a quotation is sent.';
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: accentColor.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: accentColor.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(statusIcon, color: accentColor, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  statusLabel,
                  style: GoogleFonts.poppins(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: accentColor,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  detail,
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: AppTheme.textColor,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Your upgrade request is currently being processed. You can submit a new request once this request is completed.',
                  style: GoogleFonts.poppins(
                    fontSize: 11.5,
                    color: AppTheme.subtitleColor,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── 3. Ticket History Section ─────────────────────────────────────────────
  Widget _buildTicketHistorySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Upgrade Request History',
          style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textColor),
        ),
        const SizedBox(height: 4),
        Text(
          'Track status and process payments for approved slot upgrade quotes.',
          style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.subtitleColor),
        ),
        const SizedBox(height: 12),

        if (_tickets.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.borderColor),
            ),
            child: Column(
              children: [
                Icon(Icons.confirmation_number_outlined, size: 40, color: AppTheme.subtitleColor.withValues(alpha: 0.5)),
                const SizedBox(height: 8),
                Text(
                  'No upgrade tickets raised yet',
                  style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textColor),
                ),
                Text(
                  'Use the form above to request additional event or service slots.',
                  style: GoogleFonts.poppins(fontSize: 11.5, color: AppTheme.subtitleColor),
                ),
              ],
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _tickets.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final ticket = _tickets[index] as Map<String, dynamic>;
              // Use the backend-assigned unique _id as the list key so that
              // genuine duplicate records (if any exist from before this fix)
              // each appear exactly once without collisions.
              return KeyedSubtree(
                key: ValueKey(ticket['_id']?.toString() ?? index.toString()),
                child: _buildTicketCard(ticket),
              );
            },
          ),
      ],
    );
  }

  Widget _buildTicketCard(Map<String, dynamic> ticket) {
    final status = ticket['status']?.toString() ?? 'pending';
    final reqEv = ticket['requestedEvents'] ?? 0;
    final reqSe = ticket['requestedServices'] ?? 0;
    final quoteAmt = (ticket['quotationAmount'] as num?)?.toDouble() ?? 0.0;
    final msg = ticket['message']?.toString() ?? '';

    Color badgeBg;
    Color badgeFg;
    String statusLabel;

    switch (status) {
      case 'quotation_sent':
        badgeBg = AppTheme.tintVioletBg;
        badgeFg = AppTheme.primaryColor;
        statusLabel = 'Quotation Received';
        break;
      case 'paid':
        badgeBg = const Color(0xFFDBEAFE);
        badgeFg = const Color(0xFF1D4ED8);
        statusLabel = 'Payment Verified';
        break;
      case 'approved':
        badgeBg = const Color(0xFFDCFCE7);
        badgeFg = const Color(0xFF15803D);
        statusLabel = 'Approved & Activated';
        break;
      default:
        badgeBg = const Color(0xFFFEF3C7);
        badgeFg = const Color(0xFFB45309);
        statusLabel = 'Under Admin Review';
        break;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: status == 'quotation_sent' ? AppTheme.primaryColor.withValues(alpha: 0.4) : AppTheme.borderColor),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  statusLabel.toUpperCase(),
                  style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.w700, color: badgeFg),
                ),
              ),
              if (quoteAmt > 0)
                Text(
                  formatINR(quoteAmt),
                  style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.primaryColor),
                ),
            ],
          ),
          const SizedBox(height: 12),

          Wrap(
            spacing: 8,
            children: [
              if (reqEv > 0)
                Chip(
                  label: Text('+$reqEv Events', style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.primaryColor)),
                  backgroundColor: AppTheme.tintVioletBg,
                  side: BorderSide.none,
                  visualDensity: VisualDensity.compact,
                ),
              if (reqSe > 0)
                Chip(
                  label: Text('+$reqSe Services', style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.tintPinkFg)),
                  backgroundColor: AppTheme.tintPinkBg,
                  side: BorderSide.none,
                  visualDensity: VisualDensity.compact,
                ),
            ],
          ),

          if (msg.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              msg,
              style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.subtitleColor, fontStyle: FontStyle.italic),
            ),
          ],

          if (status == 'quotation_sent') ...[
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              height: 42,
              child: ElevatedButton.icon(
                onPressed: () => _openPaymentModal(ticket),
                icon: const Icon(Icons.payment_rounded, size: 18),
                label: Text('Pay ${formatINR(quoteAmt)} & Upgrade', style: GoogleFonts.poppins(fontWeight: FontWeight.w700, fontSize: 13)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFieldLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        label,
        style: GoogleFonts.poppins(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: AppTheme.subtitleColor,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  TextStyle _inputTextStyle() => GoogleFonts.poppins(fontSize: 13, color: AppTheme.textColor);

  InputDecoration _inputDecoration({required String hintText}) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: GoogleFonts.poppins(fontSize: 12.5, color: const Color(0xFF94A3B8)),
      filled: true,
      fillColor: AppTheme.inputFillColor,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppTheme.borderColor)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppTheme.borderColor)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppTheme.primaryColor, width: 1.5)),
      counterText: '',
    );
  }
}

// ─── Modal Sheet for Paying Ticket Quotation ─────────────────────────────────
class _PayTicketModal extends StatefulWidget {
  final Map<String, dynamic> ticket;
  final VoidCallback onSuccess;

  const _PayTicketModal({required this.ticket, required this.onSuccess});

  @override
  State<_PayTicketModal> createState() => _PayTicketModalState();
}

class _PayTicketModalState extends State<_PayTicketModal> {
  final _merchantService = MerchantService();
  final _formKey = GlobalKey<FormState>();

  final _cardNumCtrl = TextEditingController();
  final _expiryCtrl = TextEditingController();
  final _cvvCtrl = TextEditingController();
  final _cardholderCtrl = TextEditingController();

  bool _submitting = false;

  @override
  void dispose() {
    _cardNumCtrl.dispose();
    _expiryCtrl.dispose();
    _cvvCtrl.dispose();
    _cardholderCtrl.dispose();
    super.dispose();
  }

  Future<void> _payQuotation() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);

    try {
      final ticketId = widget.ticket['_id']?.toString() ?? '';
      await _merchantService.payTicket(ticketId, {
        'cardNumber': _cardNumCtrl.text.trim(),
        'cardholderName': _cardholderCtrl.text.trim(),
        'expiryDate': _expiryCtrl.text.trim(),
        'cvv': _cvvCtrl.text.trim(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Payment processed successfully! Awaiting admin approval.'),
          backgroundColor: AppTheme.successColor,
        ));
        widget.onSuccess();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString()),
          backgroundColor: AppTheme.errorColor,
        ));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final quoteAmt = (widget.ticket['quotationAmount'] as num?)?.toDouble() ?? 0.0;
    final reqEv = widget.ticket['requestedEvents'] ?? 0;
    final reqSe = widget.ticket['requestedServices'] ?? 0;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 14),

                Row(
                  children: [
                    const Icon(Icons.credit_card_rounded, color: AppTheme.primaryColor),
                    const SizedBox(width: 8),
                    Text('Pay Ticket Quotation', style: GoogleFonts.poppins(fontSize: 17, fontWeight: FontWeight.w700, color: AppTheme.textColor)),
                  ],
                ),
                Text(
                  'Upgrade: +$reqEv Events, +$reqSe Services · Amount: ${formatINR(quoteAmt)}',
                  style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.subtitleColor),
                ),
                const SizedBox(height: 16),

                _buildFieldLabel('CARD NUMBER'),
                TextFormField(
                  controller: _cardNumCtrl,
                  keyboardType: TextInputType.number,
                  style: _inputTextStyle(),
                  maxLength: 19,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(16),
                    CardNumberInputFormatter(),
                  ],
                  decoration: _inputDecoration(hintText: '4111 2222 3333 4444', prefixIcon: const Icon(Icons.credit_card)),
                  validator: (v) {
                    if (v == null || v.replaceAll(' ', '').length != 16) return 'Please enter 16-digit card number';
                    return null;
                  },
                ),

                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildFieldLabel('EXPIRY DATE'),
                          TextFormField(
                            controller: _expiryCtrl,
                            keyboardType: TextInputType.number,
                            style: _inputTextStyle(),
                            maxLength: 5,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                              LengthLimitingTextInputFormatter(4),
                              CardExpiryInputFormatter(),
                            ],
                            decoration: _inputDecoration(hintText: 'MM/YY'),
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) return 'Required';
                              if (!RegExp(r'^(0[1-9]|1[0-2])\/\d{2}$').hasMatch(v.trim())) {
                                return 'MM/YY required';
                              }
                              return null;
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildFieldLabel('CVV'),
                          TextFormField(
                            controller: _cvvCtrl,
                            keyboardType: TextInputType.number,
                            obscureText: true,
                            style: _inputTextStyle(),
                            maxLength: 3,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                              LengthLimitingTextInputFormatter(3),
                            ],
                            decoration: _inputDecoration(hintText: '123'),
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) return 'Required';
                              if (v.trim().length < 3) return '3 digits required';
                              return null;
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                _buildFieldLabel('CARDHOLDER NAME'),
                TextFormField(
                  controller: _cardholderCtrl,
                  style: _inputTextStyle(),
                  maxLength: 50,
                  inputFormatters: [
                    LengthLimitingTextInputFormatter(50),
                  ],
                  decoration: _inputDecoration(hintText: 'John Doe', prefixIcon: const Icon(Icons.person_outline)),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Cardholder name is required' : null,
                ),

                const SizedBox(height: 18),

                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _payQuotation,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: _submitting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text(
                            'Pay ${formatINR(quoteAmt)} & Submit',
                            style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                          ),
                  ),
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFieldLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Text(
        label,
        style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.subtitleColor, letterSpacing: 0.5),
      ),
    );
  }

  TextStyle _inputTextStyle() => GoogleFonts.poppins(fontSize: 13, color: AppTheme.textColor);

  InputDecoration _inputDecoration({required String hintText, Widget? prefixIcon}) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: GoogleFonts.poppins(fontSize: 12.5, color: const Color(0xFF94A3B8)),
      filled: true,
      fillColor: AppTheme.inputFillColor,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      prefixIcon: prefixIcon != null ? IconTheme(data: const IconThemeData(color: AppTheme.subtitleColor, size: 18), child: prefixIcon) : null,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppTheme.borderColor)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppTheme.borderColor)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppTheme.primaryColor, width: 1.5)),
      counterText: '',
    );
  }
}

class CardNumberInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    if (newValue.text.isEmpty) return newValue;

    final digitsOnly = newValue.text.replaceAll(RegExp(r'\D'), '');
    final limitedDigits = digitsOnly.length > 16 ? digitsOnly.substring(0, 16) : digitsOnly;

    final buffer = StringBuffer();
    for (int i = 0; i < limitedDigits.length; i++) {
      if (i > 0 && i % 4 == 0) {
        buffer.write(' ');
      }
      buffer.write(limitedDigits[i]);
    }

    final formatted = buffer.toString();
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

class CardExpiryInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    if (newValue.text.isEmpty) return newValue;

    final digitsOnly = newValue.text.replaceAll(RegExp(r'\D'), '');
    final limitedDigits = digitsOnly.length > 4 ? digitsOnly.substring(0, 4) : digitsOnly;

    final buffer = StringBuffer();
    for (int i = 0; i < limitedDigits.length; i++) {
      if (i == 2) {
        buffer.write('/');
      }
      buffer.write(limitedDigits[i]);
    }

    final formatted = buffer.toString();
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
