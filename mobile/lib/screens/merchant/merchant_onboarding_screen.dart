import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/app_theme.dart';
import '../../models/user_model.dart';
import '../../services/auth_service.dart';
import '../../services/merchant_service.dart';
import '../../utils/currency_formatter.dart';
import '../../widgets/location_autocomplete.dart';

class MerchantOnboardingScreen extends StatefulWidget {
  const MerchantOnboardingScreen({super.key});

  @override
  State<MerchantOnboardingScreen> createState() => _MerchantOnboardingScreenState();
}

class _MerchantOnboardingScreenState extends State<MerchantOnboardingScreen> {
  final _authService = AuthService();
  final _merchantService = MerchantService();
  final _formKey = GlobalKey<FormState>();
  final _payFormKey = GlobalKey<FormState>();

  bool _submittingDetails = false;
  bool _submittingPayment = false;
  bool _refreshingStatus = false;

  // Step 1 Form Controllers
  final _businessNameCtrl = TextEditingController();
  final _expYearsCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();

  final List<String> _availableEventTypes = [
    'Wedding',
    'Birthday',
    'Corporate',
    'Concert',
    'Festival',
    'Exhibition',
    'Private Party',
    'Anniversary',
  ];
  final List<String> _selectedEventTypes = [];

  final List<String> _availableServiceTypes = [
    'Catering',
    'Photography',
    'Videography',
    'Decoration',
    'Sound System',
    'Lighting',
    'Live Music',
    'DJ',
    'Anchor/Host',
    'Security',
  ];
  final List<String> _selectedServiceTypes = [];

  // Step 3 Payment Form Controllers
  final _cardNumberCtrl = TextEditingController();
  final _expiryCtrl = TextEditingController();
  final _cvvCtrl = TextEditingController();
  final _cardholderCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _prefillDetails();
  }

  void _prefillDetails() {
    final user = _authService.currentUser;
    if (user?.merchantDetails != null) {
      final details = user!.merchantDetails!;
      _businessNameCtrl.text = details['businessName']?.toString() ?? '';
      _expYearsCtrl.text = details['experienceYears']?.toString() ?? '';
      _descCtrl.text = details['businessDescription']?.toString() ?? '';
      _addressCtrl.text = details['address']?.toString() ?? '';

      if (details['eventTypes'] is List) {
        _selectedEventTypes.clear();
        _selectedEventTypes.addAll((details['eventTypes'] as List).map((e) => e.toString()));
      }
      if (details['serviceTypes'] is List) {
        _selectedServiceTypes.clear();
        _selectedServiceTypes.addAll((details['serviceTypes'] as List).map((s) => s.toString()));
      }
    }
  }

  @override
  void dispose() {
    _businessNameCtrl.dispose();
    _expYearsCtrl.dispose();
    _descCtrl.dispose();
    _addressCtrl.dispose();
    _cardNumberCtrl.dispose();
    _expiryCtrl.dispose();
    _cvvCtrl.dispose();
    _cardholderCtrl.dispose();
    super.dispose();
  }

  Future<void> _refreshStatus() async {
    setState(() => _refreshingStatus = true);
    try {
      final user = await _authService.getMe();
      if (mounted) {
        _prefillDetails();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Account status updated: ${user?.merchantStatus ?? 'Pending'}'),
          backgroundColor: AppTheme.successColor,
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString()),
          backgroundColor: AppTheme.errorColor,
        ));
      }
    } finally {
      if (mounted) setState(() => _refreshingStatus = false);
    }
  }

  Future<void> _submitDetails() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submittingDetails = true);

    try {
      final exp = int.tryParse(_expYearsCtrl.text.trim()) ?? 0;
      final payload = {
        'businessName': _businessNameCtrl.text.trim(),
        'businessDescription': _descCtrl.text.trim(),
        'experienceYears': exp,
        'address': _addressCtrl.text.trim(),
        'eventTypes': _selectedEventTypes,
        'serviceTypes': _selectedServiceTypes,
      };

      final res = await _merchantService.submitOnboardingDetails(payload);
      if (res['user'] != null) {
        await _authService.updateUser(UserModel.fromJson(res['user'] as Map<String, dynamic>));
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Business details submitted successfully! Profile under review.'),
          backgroundColor: AppTheme.successColor,
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString()),
          backgroundColor: AppTheme.errorColor,
        ));
      }
    } finally {
      if (mounted) setState(() => _submittingDetails = false);
    }
  }

  Future<void> _payQuotation() async {
    if (!_payFormKey.currentState!.validate()) return;
    setState(() => _submittingPayment = true);

    try {
      final payload = {
        'cardNumber': _cardNumberCtrl.text.trim(),
        'cardholderName': _cardholderCtrl.text.trim(),
        'expiryDate': _expiryCtrl.text.trim(),
        'cvv': _cvvCtrl.text.trim(),
      };

      final res = await _merchantService.payOnboardingQuotation(payload);
      if (res['user'] != null) {
        await _authService.updateUser(UserModel.fromJson(res['user'] as Map<String, dynamic>));
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Payment processed successfully! Waiting for admin activation.'),
          backgroundColor: AppTheme.successColor,
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString()),
          backgroundColor: AppTheme.errorColor,
        ));
      }
    } finally {
      if (mounted) setState(() => _submittingPayment = false);
    }
  }

  String _currentStep(UserModel? user) {
    if (user == null) return 'details_pending';
    final status = user.merchantStatus;
    if (status != null && status.isNotEmpty) return status;

    if (user.merchantDetails != null && user.merchantDetails!['businessName'] != null) {
      return user.quotationAmount > 0 ? 'quotation_sent' : 'details_submitted';
    }
    return 'details_pending';
  }

  @override
  Widget build(BuildContext context) {
    final user = _authService.currentUser;
    final step = _currentStep(user);

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Text(
          'Merchant Setup',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w700, fontSize: 18, color: AppTheme.textColor),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        actions: [
          IconButton(
            icon: _refreshingStatus
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.refresh_rounded, color: AppTheme.primaryColor),
            onPressed: _refreshingStatus ? null : _refreshStatus,
            tooltip: 'Refresh Status',
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppTheme.errorColor),
            onPressed: () => _authService.logout(),
            tooltip: 'Logout',
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refreshStatus,
          color: AppTheme.primaryColor,
          child: Column(
            children: [
              // Scrollable Main Content Body
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Branded Introduction & Progress Card
                      _buildBrandedIntroCard(step),

                      const SizedBox(height: 20),

                      // Step Content
                      if (step == 'details_pending')
                        _buildStep1DetailsForm()
                      else if (step == 'details_submitted')
                        _buildStep2ReviewPending(user)
                      else if (step == 'quotation_sent')
                        _buildStep3PayQuotation(user)
                      else if (step == 'paid')
                        _buildStep4PaidActivation(user),

                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),

              // Safe-area-aware Bottom Action Container
              if (step == 'details_pending')
                _buildBottomCTA(
                  label: 'Save & Continue',
                  loading: _submittingDetails,
                  onPressed: _submitDetails,
                )
              else if (step == 'quotation_sent')
                _buildBottomCTA(
                  label: 'Pay ${formatINR(user?.quotationAmount ?? 0.0)} & Activate',
                  loading: _submittingPayment,
                  onPressed: _payQuotation,
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBrandedIntroCard(String currentStep) {
    int stepNum = 1;
    double progress = 0.25;
    String stepTitle = 'Business Details';

    if (currentStep == 'details_submitted') {
      stepNum = 2;
      progress = 0.50;
      stepTitle = 'Profile Review';
    } else if (currentStep == 'quotation_sent') {
      stepNum = 3;
      progress = 0.75;
      stepTitle = 'Pay Quotation';
    } else if (currentStep == 'paid') {
      stepNum = 4;
      progress = 1.0;
      stepTitle = 'Account Activation';
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.tintVioletBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryColor.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.storefront_rounded,
                  color: AppTheme.primaryColor,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Set up your business',
                      style: GoogleFonts.poppins(
                        fontSize: 16.5,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textColor,
                      ),
                    ),
                    Text(
                      'Complete your profile to get activated on JoyEvents.',
                      style: GoogleFonts.poppins(
                        fontSize: 12,
                        color: AppTheme.subtitleColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),
          const SizedBox(height: 14),

          // Progress Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Step $stepNum of 4 · $stepTitle',
                style: GoogleFonts.poppins(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.primaryColor,
                ),
              ),
              Text(
                '${(progress * 100).toInt()}%',
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.subtitleColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Progress Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 5,
              backgroundColor: Colors.white,
              valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
            ),
          ),

          const SizedBox(height: 12),

          // Compact Step Breadcrumb Pills
          Row(
            children: [
              _buildStepPill(1, '1. Details', currentStepNumber: stepNum),
              _buildStepConnector(isDone: stepNum > 1),
              _buildStepPill(2, '2. Review', currentStepNumber: stepNum),
              _buildStepConnector(isDone: stepNum > 2),
              _buildStepPill(3, '3. Quote', currentStepNumber: stepNum),
              _buildStepConnector(isDone: stepNum > 3),
              _buildStepPill(4, '4. Activate', currentStepNumber: stepNum),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStepPill(int number, String title, {required int currentStepNumber}) {
    final isCurrent = number == currentStepNumber;
    final isDone = number < currentStepNumber;

    Color bg = Colors.white;
    Color fg = AppTheme.subtitleColor;

    if (isCurrent) {
      bg = AppTheme.primaryColor;
      fg = Colors.white;
    } else if (isDone) {
      bg = AppTheme.successColor.withValues(alpha: 0.15);
      fg = AppTheme.successColor;
    }

    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 4),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Center(
          child: Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.poppins(
              fontSize: 10,
              fontWeight: (isCurrent || isDone) ? FontWeight.w700 : FontWeight.w500,
              color: fg,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStepConnector({required bool isDone}) {
    return Container(
      width: 8,
      height: 1.5,
      color: isDone ? AppTheme.successColor : const Color(0xFFCBD5E1),
    );
  }

  Widget _buildStep1DetailsForm() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Group 1: Business Information
          _buildSectionHeader('Business Information'),
          const SizedBox(height: 12),

          _buildFieldLabel('BUSINESS / COMPANY NAME *'),
          TextFormField(
            controller: _businessNameCtrl,
            style: _inputTextStyle(),
            decoration: _inputDecoration(
              hintText: 'e.g. Royal Celebrations Ltd.',
              prefixIcon: const Icon(Icons.business_rounded),
            ),
            validator: (v) {
              if (v == null || v.trim().isEmpty) return 'Business name is required';
              if (v.trim().length > 50) return 'Name cannot exceed 50 characters';
              return null;
            },
          ),

          const SizedBox(height: 14),

          _buildFieldLabel('YEARS OF EXPERIENCE *'),
          TextFormField(
            controller: _expYearsCtrl,
            keyboardType: TextInputType.number,
            style: _inputTextStyle(),
            decoration: _inputDecoration(
              hintText: 'e.g. 5',
              prefixIcon: const Icon(Icons.badge_outlined),
            ),
            validator: (v) {
              if (v == null || v.trim().isEmpty) return 'Years of experience is required';
              final exp = int.tryParse(v.trim());
              if (exp == null || exp < 0 || exp > 80) return 'Experience must be between 0 and 80 years';
              return null;
            },
          ),

          const SizedBox(height: 24),

          // Group 2: About Your Business
          _buildSectionHeader('About Your Business'),
          const SizedBox(height: 12),

          _buildFieldLabel('BUSINESS ADDRESS / LOCATION *'),
          LocationAutocomplete(
            controller: _addressCtrl,
            label: 'BUSINESS ADDRESS / LOCATION',
            hintText: 'e.g. 123 MG Road, Suite 400',
            isRequired: true,
            validator: (v) {
              if (v == null || v.trim().isEmpty) return 'Business address is required';
              if (v.trim().length > 150) return 'Address cannot exceed 150 characters';
              return null;
            },
          ),

          const SizedBox(height: 14),

          _buildFieldLabel('BUSINESS DESCRIPTION *'),
          TextFormField(
            controller: _descCtrl,
            minLines: 2,
            maxLines: 4,
            style: _inputTextStyle(),
            decoration: _inputDecoration(
              hintText: 'Describe your services, team size, specializations, etc.',
              prefixIcon: const Padding(
                padding: EdgeInsets.only(bottom: 30),
                child: Icon(Icons.description_outlined),
              ),
            ),
            validator: (v) {
              if (v == null || v.trim().isEmpty) return 'Business description is required';
              if (v.trim().length > 1000) return 'Description cannot exceed 1000 characters';
              return null;
            },
          ),

          const SizedBox(height: 24),

          // Group 3: Events Selection
          _buildSectionHeader('What events do you handle?', subtitle: 'Select all that apply'),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _availableEventTypes.map((t) {
              final isSel = _selectedEventTypes.contains(t);
              return FilterChip(
                label: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (isSel) const Icon(Icons.check_rounded, size: 14, color: AppTheme.primaryColor),
                    if (isSel) const SizedBox(width: 4),
                    Text(t),
                  ],
                ),
                selected: isSel,
                onSelected: (sel) {
                  setState(() {
                    if (sel) {
                      _selectedEventTypes.add(t);
                    } else {
                      _selectedEventTypes.remove(t);
                    }
                  });
                },
                backgroundColor: Colors.white,
                selectedColor: AppTheme.tintVioletBg,
                showCheckmark: false,
                side: BorderSide(
                  color: isSel ? AppTheme.primaryColor : AppTheme.borderColor,
                  width: isSel ? 1.5 : 1,
                ),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                labelStyle: GoogleFonts.poppins(
                  fontSize: 12,
                  fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                  color: isSel ? AppTheme.primaryColor : AppTheme.textColor,
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 24),

          // Group 4: Services Selection
          _buildSectionHeader('What services do you offer?', subtitle: 'Select all that apply'),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _availableServiceTypes.map((t) {
              final isSel = _selectedServiceTypes.contains(t);
              return FilterChip(
                label: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (isSel) const Icon(Icons.check_rounded, size: 14, color: AppTheme.primaryColor),
                    if (isSel) const SizedBox(width: 4),
                    Text(t),
                  ],
                ),
                selected: isSel,
                onSelected: (sel) {
                  setState(() {
                    if (sel) {
                      _selectedServiceTypes.add(t);
                    } else {
                      _selectedServiceTypes.remove(t);
                    }
                  });
                },
                backgroundColor: Colors.white,
                selectedColor: AppTheme.tintVioletBg,
                showCheckmark: false,
                side: BorderSide(
                  color: isSel ? AppTheme.primaryColor : AppTheme.borderColor,
                  width: isSel ? 1.5 : 1,
                ),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                labelStyle: GoogleFonts.poppins(
                  fontSize: 12,
                  fontWeight: isSel ? FontWeight.w700 : FontWeight.w500,
                  color: isSel ? AppTheme.primaryColor : AppTheme.textColor,
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildStep2ReviewPending(UserModel? user) {
    final details = user?.merchantDetails;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.borderColor),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.access_time_filled_rounded, color: Color(0xFFF59E0B), size: 38),
          ),
          const SizedBox(height: 14),
          Text(
            'Profile Under Review',
            style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textColor),
          ),
          const SizedBox(height: 6),
          Text(
            'Thank you for submitting your business details! Our admin team is currently reviewing your profile to set up your onboarding quotation.',
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(fontSize: 12.5, color: AppTheme.subtitleColor, height: 1.4),
          ),
          const SizedBox(height: 20),

          if (details != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.inputFillColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.borderColor),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Submitted Details Preview', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textColor)),
                  const SizedBox(height: 6),
                  Text('Business Name: ${details['businessName'] ?? 'N/A'}', style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textColor)),
                  Text('Experience: ${details['experienceYears'] ?? 0} years', style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textColor)),
                  Text('Location: ${details['address'] ?? 'N/A'}', style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textColor)),
                ],
              ),
            ),

          const SizedBox(height: 20),

          OutlinedButton.icon(
            onPressed: _refreshingStatus ? null : _refreshStatus,
            icon: _refreshingStatus
                ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.refresh_rounded, size: 18),
            label: Text('Check Status', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppTheme.primaryColor),
              foregroundColor: AppTheme.primaryColor,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStep3PayQuotation(UserModel? user) {
    final quoteAmount = user?.quotationAmount ?? 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Quote Summary Card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.3)),
            boxShadow: AppTheme.cardShadow,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.tintVioletBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text('ONBOARDING QUOTE', style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.primaryColor)),
              ),
              const SizedBox(height: 10),
              Text(
                'Setup Quotation Received',
                style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textColor),
              ),
              const SizedBox(height: 4),
              Text(
                'To activate your merchant account and access all premium dashboard tools, please pay the setup quotation amount.',
                style: GoogleFonts.poppins(fontSize: 12.5, color: AppTheme.subtitleColor),
              ),
              const SizedBox(height: 14),
              const Divider(height: 1),
              const SizedBox(height: 12),
              Text('Amount Due', style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.subtitleColor)),
              Text(
                formatINR(quoteAmount),
                style: GoogleFonts.poppins(fontSize: 26, fontWeight: FontWeight.w800, color: AppTheme.primaryColor),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20),

        // Checkout Card Form
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppTheme.borderColor),
            boxShadow: AppTheme.cardShadow,
          ),
          child: Form(
            key: _payFormKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.credit_card_rounded, color: AppTheme.primaryColor),
                    const SizedBox(width: 8),
                    Text('Dummy Card Payment', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w700, color: AppTheme.textColor)),
                  ],
                ),
                Text('Simulated secure transaction for setup activation', style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.subtitleColor)),
                const SizedBox(height: 16),

                _buildFieldLabel('CARD NUMBER'),
                TextFormField(
                  controller: _cardNumberCtrl,
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

                const SizedBox(height: 14),

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
                                return 'MM/YY format required';
                              }
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

                const SizedBox(height: 14),

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
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStep4PaidActivation(UserModel? user) {
    final quoteAmount = user?.quotationAmount ?? 0.0;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.borderColor),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.successColor.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check_circle_rounded, color: AppTheme.successColor, size: 38),
          ),
          const SizedBox(height: 14),
          Text(
            'Payment Verified',
            style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textColor),
          ),
          const SizedBox(height: 6),
          Text(
            'Thank you! Your setup payment of ${formatINR(quoteAmount)} has been processed successfully.',
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(fontSize: 12.5, color: AppTheme.subtitleColor, height: 1.4),
          ),
          const SizedBox(height: 6),
          Text(
            'Our admin team is now performing final account checks to activate your dashboard. We appreciate your patience!',
            textAlign: TextAlign.center,
            style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.subtitleColor, height: 1.4),
          ),
          const SizedBox(height: 20),

          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: AppTheme.tintVioletBg,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.3)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryColor)),
                const SizedBox(width: 8),
                Text('Waiting for Admin Activation', style: GoogleFonts.poppins(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppTheme.primaryColor)),
              ],
            ),
          ),

          const SizedBox(height: 20),

          OutlinedButton.icon(
            onPressed: _refreshingStatus ? null : _refreshStatus,
            icon: _refreshingStatus
                ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.refresh_rounded, size: 18),
            label: Text('Refresh Status', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppTheme.primaryColor),
              foregroundColor: AppTheme.primaryColor,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomCTA({
    required String label,
    required bool loading,
    required VoidCallback onPressed,
  }) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 14),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: AppTheme.borderColor)),
      ),
      child: SizedBox(
        width: double.infinity,
        height: 52,
        child: ElevatedButton(
          onPressed: loading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
            elevation: 0,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          child: loading
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      label,
                      style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward_rounded, size: 18, color: Colors.white),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, {String? subtitle}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: GoogleFonts.poppins(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: AppTheme.textColor,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: GoogleFonts.poppins(
              fontSize: 12,
              color: AppTheme.subtitleColor,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildFieldLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        label,
        style: GoogleFonts.poppins(
          fontSize: 11.5,
          fontWeight: FontWeight.w600,
          color: AppTheme.subtitleColor,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  TextStyle _inputTextStyle() => GoogleFonts.poppins(fontSize: 13.5, color: AppTheme.textColor);

  InputDecoration _inputDecoration({required String hintText, Widget? prefixIcon}) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: GoogleFonts.poppins(fontSize: 13, color: const Color(0xFF94A3B8)),
      filled: true,
      fillColor: AppTheme.inputFillColor,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      prefixIcon: prefixIcon != null ? IconTheme(data: const IconThemeData(color: AppTheme.subtitleColor, size: 20), child: prefixIcon) : null,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.borderColor)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.borderColor)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppTheme.primaryColor, width: 1.5)),
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
