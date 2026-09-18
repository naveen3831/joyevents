import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../../config/app_theme.dart';
import '../../config/api_config.dart';
import '../../services/merchant_service.dart';

class CreateEditEventScreen extends StatefulWidget {
  final String? eventId;
  final Map<String, dynamic>? initialData;

  const CreateEditEventScreen({
    super.key,
    this.eventId,
    this.initialData,
  });

  bool get isEditing => eventId != null;

  @override
  State<CreateEditEventScreen> createState() => _CreateEditEventScreenState();
}

class _CreateEditEventScreenState extends State<CreateEditEventScreen> {
  final _formKey = GlobalKey<FormState>();
  final _merchantService = MerchantService();
  final _picker = ImagePicker();

  bool _loading = false;

  // Form fields
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _maxAttendeesCtrl = TextEditingController();
  String _category = 'Music';
  String _eventType = 'Ticketed';
  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;
  File? _imageFile;

  final List<String> _categories = [
    'Music',
    'Sports',
    'Food & Drink',
    'Arts & Culture',
    'Business',
    'Technology',
    'Health & Wellness',
    'Education',
    'Other'
  ];
  final List<String> _eventTypes = ['Ticketed', 'Full Service'];

  @override
  void initState() {
    super.initState();
    _prefillFromInitialData();
  }

  void _prefillFromInitialData() {
    final d = widget.initialData;
    if (d == null) return;
    _titleCtrl.text = d['title']?.toString() ?? '';
    _descCtrl.text = d['description']?.toString() ?? '';
    _locationCtrl.text = d['location']?.toString() ?? '';
    _priceCtrl.text = d['price']?.toString() ?? '';
    _maxAttendeesCtrl.text = d['maxAttendees']?.toString() ?? '';
    if (d['category'] != null && _categories.contains(d['category'].toString())) {
      _category = d['category'].toString();
    }
    if (d['eventType'] != null && _eventTypes.contains(d['eventType'].toString())) {
      _eventType = d['eventType'].toString();
    }
    final dateStr = d['date']?.toString() ?? '';
    if (dateStr.isNotEmpty) {
      try {
        final dt = DateTime.parse(dateStr);
        _selectedDate = dt;
        _selectedTime = TimeOfDay(hour: dt.hour, minute: dt.minute);
      } catch (_) {}
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _locationCtrl.dispose();
    _priceCtrl.dispose();
    _maxAttendeesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.light(primary: AppTheme.primaryColor),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _selectedDate = picked);
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime ?? const TimeOfDay(hour: 18, minute: 0),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.light(primary: AppTheme.primaryColor),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _selectedTime = picked);
  }

  Future<void> _pickImage() async {
    final xfile = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
      maxWidth: 1200,
    );
    if (xfile != null) setState(() => _imageFile = File(xfile.path));
  }

  void _showCategoryBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _CategoryBottomSheet(
        selectedCategory: _category,
        categories: _categories,
        onSelect: (selected) {
          setState(() => _category = selected);
        },
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select an event date'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      final dt = DateTime(
        _selectedDate!.year,
        _selectedDate!.month,
        _selectedDate!.day,
        _selectedTime?.hour ?? 0,
        _selectedTime?.minute ?? 0,
      );

      final formData = FormData.fromMap({
        'title': _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'location': _locationCtrl.text.trim(),
        'price': _priceCtrl.text.trim(),
        'maxAttendees': _maxAttendeesCtrl.text.trim(),
        'category': _category,
        'eventType': _eventType,
        'date': dt.toIso8601String(),
        if (_imageFile != null)
          'image': await MultipartFile.fromFile(
            _imageFile!.path,
            filename: 'event_cover.jpg',
          ),
      });

      if (widget.isEditing) {
        await _merchantService.updateEvent(widget.eventId!, formData);
      } else {
        await _merchantService.createEvent(formData);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(widget.isEditing ? 'Event updated successfully!' : 'Event created successfully!'),
          backgroundColor: AppTheme.successColor,
        ));
        context.pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Text(
          widget.isEditing ? 'Edit Event' : 'Create Event',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w700),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 16,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Event Cover Image
              _buildSectionHeading('Event Cover'),
              const SizedBox(height: 8),
              _buildCoverImageUploader(),

              const SizedBox(height: 24),

              // Basic Information
              _buildSectionHeading('Basic Information'),
              const SizedBox(height: 12),

              _buildFieldLabel('EVENT TITLE', isRequired: true),
              TextFormField(
                controller: _titleCtrl,
                style: _inputTextStyle(),
                decoration: _inputDecoration(
                  hintText: 'e.g. Summer Music Festival 2026',
                  prefixIcon: const Icon(Icons.event_outlined),
                ),
                validator: (v) => v == null || v.trim().isEmpty ? 'Please enter event title' : null,
              ),

              const SizedBox(height: 14),

              _buildFieldLabel('CATEGORY', isRequired: true),
              _buildCategorySelectorField(),

              const SizedBox(height: 14),

              _buildFieldLabel('EVENT TYPE', isRequired: true),
              _buildEventTypeSelector(),

              const SizedBox(height: 14),

              _buildFieldLabel('DESCRIPTION'),
              TextFormField(
                controller: _descCtrl,
                minLines: 4,
                maxLines: 6,
                style: _inputTextStyle(),
                decoration: _inputDecoration(
                  hintText: 'Tell customers about your event, highlights, and experience...',
                  prefixIcon: const Padding(
                    padding: EdgeInsets.only(bottom: 56),
                    child: Icon(Icons.description_outlined),
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Schedule
              _buildSectionHeading('Schedule'),
              const SizedBox(height: 12),
              _buildSchedulePicker(),

              const SizedBox(height: 24),

              // Location
              _buildSectionHeading('Location'),
              const SizedBox(height: 12),
              _buildFieldLabel('VENUE / LOCATION', isRequired: true),
              TextFormField(
                controller: _locationCtrl,
                style: _inputTextStyle(),
                decoration: _inputDecoration(
                  hintText: 'e.g. Palace Grounds, Bengaluru',
                  prefixIcon: const Icon(Icons.location_on_outlined),
                ),
                validator: (v) => v == null || v.trim().isEmpty ? 'Please enter location' : null,
              ),

              const SizedBox(height: 24),

              // Pricing & Capacity
              _buildSectionHeading('Pricing & Capacity'),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildFieldLabel('BASE PRICE (₹)', isRequired: true),
                        TextFormField(
                          controller: _priceCtrl,
                          keyboardType: TextInputType.number,
                          style: _inputTextStyle(),
                          decoration: _inputDecoration(
                            hintText: '0 for free',
                            prefixIcon: const Icon(Icons.currency_rupee_rounded),
                          ),
                          validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildFieldLabel('MAX ATTENDEES'),
                        TextFormField(
                          controller: _maxAttendeesCtrl,
                          keyboardType: TextInputType.number,
                          style: _inputTextStyle(),
                          decoration: _inputDecoration(
                            hintText: 'e.g. 500',
                            prefixIcon: const Icon(Icons.people_outline_rounded),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 32),

              // Submit Primary CTA Button
              _buildSubmitButton(),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeading(String title) {
    return Text(
      title,
      style: GoogleFonts.poppins(
        fontSize: 15,
        fontWeight: FontWeight.w700,
        color: AppTheme.textColor,
      ),
    );
  }

  Widget _buildFieldLabel(String label, {bool isRequired = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              color: AppTheme.subtitleColor,
              letterSpacing: 0.5,
            ),
          ),
          if (isRequired)
            const Text(
              ' *',
              style: TextStyle(color: AppTheme.errorColor, fontWeight: FontWeight.bold),
            ),
        ],
      ),
    );
  }

  Widget _buildCoverImageUploader() {
    final existingImageUrl = widget.isEditing
        ? ApiConfig.resolveImageUrl(widget.initialData?['image']?.toString())
        : '';
    final hasImage = _imageFile != null || existingImageUrl.isNotEmpty;

    return GestureDetector(
      onTap: _pickImage,
      child: AspectRatio(
        aspectRatio: 16 / 9,
        child: Container(
          decoration: BoxDecoration(
            color: AppTheme.inputFillColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: _imageFile != null ? AppTheme.primaryColor : AppTheme.borderColor,
              width: _imageFile != null ? 1.5 : 1,
            ),
            boxShadow: hasImage ? AppTheme.cardShadow : null,
          ),
          clipBehavior: Clip.antiAlias,
          child: hasImage
              ? Stack(
                  fit: StackFit.expand,
                  children: [
                    if (_imageFile != null)
                      Image.file(_imageFile!, fit: BoxFit.cover)
                    else
                      Image.network(
                        existingImageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _buildImagePlaceholder(),
                      ),
                    Positioned(
                      bottom: 10,
                      right: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryColor,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.2),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.edit_outlined, size: 14, color: Colors.white),
                            const SizedBox(width: 4),
                            Text(
                              'Change Image',
                              style: GoogleFonts.poppins(
                                color: Colors.white,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                )
              : _buildImagePlaceholder(),
        ),
      ),
    );
  }

  Widget _buildImagePlaceholder() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: const BoxDecoration(
            color: AppTheme.tintVioletBg,
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.cloud_upload_outlined,
            color: AppTheme.primaryColor,
            size: 28,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          'Upload event cover',
          style: GoogleFonts.poppins(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppTheme.textColor,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          'JPG / PNG • recommended 16:9',
          style: GoogleFonts.poppins(
            fontSize: 12,
            color: AppTheme.subtitleColor,
          ),
        ),
      ],
    );
  }

  Widget _buildCategorySelectorField() {
    return GestureDetector(
      onTap: _showCategoryBottomSheet,
      child: Container(
        height: 52,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: AppTheme.inputFillColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.borderColor),
        ),
        child: Row(
          children: [
            const Icon(Icons.category_outlined, size: 20, color: AppTheme.subtitleColor),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                _category,
                style: GoogleFonts.poppins(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.textColor,
                ),
              ),
            ),
            const Icon(Icons.keyboard_arrow_down_rounded, color: AppTheme.subtitleColor, size: 22),
          ],
        ),
      ),
    );
  }

  Widget _buildEventTypeSelector() {
    return Row(
      children: _eventTypes.map((type) {
        final isSelected = _eventType == type;
        final isTicketed = type == 'Ticketed';

        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(right: isTicketed ? 6 : 0, left: isTicketed ? 0 : 6),
            child: Material(
              color: isSelected ? AppTheme.tintVioletBg : Colors.white,
              borderRadius: BorderRadius.circular(14),
              child: InkWell(
                onTap: () => setState(() => _eventType = type),
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  height: 52,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isSelected ? AppTheme.primaryColor : AppTheme.borderColor,
                      width: isSelected ? 1.5 : 1,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        isTicketed
                            ? Icons.confirmation_number_outlined
                            : Icons.auto_awesome_outlined,
                        size: 18,
                        color: isSelected ? AppTheme.primaryColor : AppTheme.subtitleColor,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        type,
                        style: GoogleFonts.poppins(
                          fontSize: 13.5,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected ? AppTheme.primaryColor : AppTheme.textColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildSchedulePicker() {
    final dateFormatted = _selectedDate == null
        ? 'Select Date'
        : '${_selectedDate!.day} ${_monthName(_selectedDate!.month)} ${_selectedDate!.year}';

    final timeFormatted = _selectedTime == null
        ? 'Select Time'
        : _selectedTime!.format(context);

    return Row(
      children: [
        Expanded(
          child: GestureDetector(
            onTap: _pickDate,
            child: Container(
              height: 52,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: AppTheme.inputFillColor,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.borderColor),
              ),
              child: Row(
                children: [
                  const Icon(Icons.calendar_today_outlined,
                      size: 18, color: AppTheme.subtitleColor),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      dateFormatted,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                        color: _selectedDate == null
                            ? const Color(0xFF94A3B8)
                            : AppTheme.textColor,
                        fontSize: 13.5,
                        fontWeight: _selectedDate == null
                            ? FontWeight.w400
                            : FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: GestureDetector(
            onTap: _pickTime,
            child: Container(
              height: 52,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: AppTheme.inputFillColor,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.borderColor),
              ),
              child: Row(
                children: [
                  const Icon(Icons.access_time_outlined,
                      size: 18, color: AppTheme.subtitleColor),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      timeFormatted,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.poppins(
                        color: _selectedTime == null
                            ? const Color(0xFF94A3B8)
                            : AppTheme.textColor,
                        fontSize: 13.5,
                        fontWeight: _selectedTime == null
                            ? FontWeight.w400
                            : FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSubmitButton() {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: Ink(
          decoration: BoxDecoration(
            gradient: AppTheme.gradientPrimary,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: AppTheme.primaryColor.withOpacity(0.28),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: InkWell(
            onTap: _loading ? null : _submit,
            borderRadius: BorderRadius.circular(14),
            splashColor: Colors.white.withOpacity(0.15),
            child: Center(
              child: _loading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          widget.isEditing ? 'Save Changes' : 'Create Event',
                          style: GoogleFonts.poppins(
                            fontSize: 15.5,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Icon(
                          Icons.arrow_forward_rounded,
                          size: 18,
                          color: Colors.white,
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }

  TextStyle _inputTextStyle() => GoogleFonts.poppins(
        fontSize: 13.5,
        color: AppTheme.textColor,
        fontWeight: FontWeight.w400,
      );

  InputDecoration _inputDecoration({
    required String hintText,
    Widget? prefixIcon,
  }) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: GoogleFonts.poppins(
        fontSize: 13,
        color: const Color(0xFF94A3B8),
      ),
      filled: true,
      fillColor: AppTheme.inputFillColor,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      prefixIcon: prefixIcon != null
          ? IconTheme(
              data: const IconThemeData(
                color: AppTheme.subtitleColor,
                size: 20,
              ),
              child: prefixIcon,
            )
          : null,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppTheme.borderColor),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppTheme.borderColor),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppTheme.primaryColor, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppTheme.errorColor),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppTheme.errorColor, width: 1.5),
      ),
    );
  }

  String _monthName(int month) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return months[month - 1];
  }
}

class _CategoryBottomSheet extends StatefulWidget {
  final String selectedCategory;
  final List<String> categories;
  final ValueChanged<String> onSelect;

  const _CategoryBottomSheet({
    required this.selectedCategory,
    required this.categories,
    required this.onSelect,
  });

  @override
  State<_CategoryBottomSheet> createState() => _CategoryBottomSheetState();
}

class _CategoryBottomSheetState extends State<_CategoryBottomSheet> {
  final _searchCtrl = TextEditingController();
  String _query = '';

  static const Map<String, IconData> _categoryIcons = {
    'Music': Icons.music_note_rounded,
    'Sports': Icons.sports_soccer_rounded,
    'Food & Drink': Icons.restaurant_rounded,
    'Arts & Culture': Icons.palette_rounded,
    'Business': Icons.business_center_rounded,
    'Technology': Icons.computer_rounded,
    'Health & Wellness': Icons.favorite_rounded,
    'Education': Icons.school_rounded,
    'Other': Icons.category_rounded,
  };

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = widget.categories
        .where((c) => c.toLowerCase().contains(_query.toLowerCase()))
        .toList();

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.72,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 12),
          Container(
            width: 38,
            height: 4.5,
            decoration: BoxDecoration(
              color: const Color(0xFFCBD5E1),
              borderRadius: BorderRadius.circular(2.25),
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Select Category',
                      style: GoogleFonts.poppins(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textColor,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20),
                      onPressed: () => Navigator.pop(context),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
                Text(
                  'Choose a category for your event',
                  style: GoogleFonts.poppins(
                    fontSize: 12.5,
                    color: AppTheme.subtitleColor,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (val) => setState(() => _query = val.trim()),
              style: GoogleFonts.poppins(fontSize: 13.5, color: AppTheme.textColor),
              decoration: InputDecoration(
                hintText: 'Search categories...',
                hintStyle: GoogleFonts.poppins(fontSize: 13, color: const Color(0xFF94A3B8)),
                prefixIcon: const Icon(Icons.search_rounded, size: 20, color: AppTheme.subtitleColor),
                filled: true,
                fillColor: AppTheme.inputFillColor,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.borderColor),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.borderColor),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.primaryColor, width: 1.5),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          const Divider(height: 1, color: AppTheme.borderColor),
          Flexible(
            child: filtered.isEmpty
                ? Padding(
                    padding: const EdgeInsets.all(28.0),
                    child: Text(
                      'No categories match "$_query"',
                      style: GoogleFonts.poppins(color: AppTheme.subtitleColor, fontSize: 13),
                    ),
                  )
                : ListView.separated(
                    shrinkWrap: true,
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 4),
                    itemBuilder: (context, index) {
                      final cat = filtered[index];
                      final isSelected = cat == widget.selectedCategory;
                      final icon = _categoryIcons[cat] ?? Icons.category_rounded;

                      return Material(
                        color: isSelected ? AppTheme.tintVioletBg : Colors.transparent,
                        borderRadius: BorderRadius.circular(14),
                        child: InkWell(
                          onTap: () {
                            widget.onSelect(cat);
                            Navigator.pop(context);
                          },
                          borderRadius: BorderRadius.circular(14),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            child: Row(
                              children: [
                                Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppTheme.primaryColor.withOpacity(0.15)
                                        : AppTheme.inputFillColor,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(
                                    icon,
                                    size: 18,
                                    color: isSelected
                                        ? AppTheme.primaryColor
                                        : AppTheme.subtitleColor,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    cat,
                                    style: GoogleFonts.poppins(
                                      fontSize: 14,
                                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                      color: isSelected ? AppTheme.primaryColor : AppTheme.textColor,
                                    ),
                                  ),
                                ),
                                if (isSelected)
                                  const Icon(
                                    Icons.check_circle_rounded,
                                    size: 20,
                                    color: AppTheme.primaryColor,
                                  ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}
