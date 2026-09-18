import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../../config/app_theme.dart';
import '../../config/api_config.dart';
import '../../services/merchant_service.dart';

class CreateEditServiceScreen extends StatefulWidget {
  final String? serviceId;
  final Map<String, dynamic>? initialData;

  const CreateEditServiceScreen({
    super.key,
    this.serviceId,
    this.initialData,
  });

  bool get isEditing => serviceId != null;

  @override
  State<CreateEditServiceScreen> createState() => _CreateEditServiceScreenState();
}

class _CreateEditServiceScreenState extends State<CreateEditServiceScreen> {
  final _formKey = GlobalKey<FormState>();
  final _merchantService = MerchantService();
  final _picker = ImagePicker();
  bool _loading = false;

  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _minGuestsCtrl = TextEditingController();
  final _maxGuestsCtrl = TextEditingController();
  String _category = 'Catering';
  File? _imageFile;
  List<Map<String, dynamic>> _addOns = [];
  List<String> _highlights = [];

  final List<String> _categories = [
    'Catering',
    'Photography',
    'Decoration',
    'Music & DJ',
    'Event Planning',
    'Venue',
    'Transportation',
    'Other'
  ];

  @override
  void initState() {
    super.initState();
    _prefill();
  }

  void _prefill() {
    final d = widget.initialData;
    if (d == null) return;
    _nameCtrl.text = d['name']?.toString() ?? '';
    _descCtrl.text = d['description']?.toString() ?? '';
    _priceCtrl.text = d['basePrice']?.toString() ?? '';
    _minGuestsCtrl.text = d['minGuests']?.toString() ?? '';
    _maxGuestsCtrl.text = d['maxGuests']?.toString() ?? '';
    if (d['category'] != null && _categories.contains(d['category'].toString())) {
      _category = d['category'].toString();
    }
    final rawAddOns = d['addOns'] as List? ?? [];
    _addOns = rawAddOns.map((a) => Map<String, dynamic>.from(a as Map)).toList();
    final rawHighlights = d['highlights'] as List? ?? [];
    _highlights = rawHighlights.map((h) => h.toString()).toList();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _priceCtrl.dispose();
    _minGuestsCtrl.dispose();
    _maxGuestsCtrl.dispose();
    super.dispose();
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
      builder: (ctx) => _ServiceCategoryBottomSheet(
        selectedCategory: _category,
        categories: _categories,
        onSelect: (selected) {
          setState(() => _category = selected);
        },
      ),
    );
  }

  void _openAddHighlightBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _AddHighlightBottomSheet(
        onAdd: (newHighlight) {
          setState(() => _highlights.add(newHighlight));
        },
      ),
    );
  }

  void _openAddEditAddOnBottomSheet({int? index, Map<String, dynamic>? initial}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _AddEditAddOnBottomSheet(
        initialAddOn: initial,
        onSubmit: (addonMap) {
          setState(() {
            if (index != null && index >= 0 && index < _addOns.length) {
              _addOns[index] = addonMap;
            } else {
              _addOns.add(addonMap);
            }
          });
        },
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final map = <String, dynamic>{
        'name': _nameCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'basePrice': _priceCtrl.text.trim(),
        'category': _category,
        if (_minGuestsCtrl.text.trim().isNotEmpty)
          'minGuests': _minGuestsCtrl.text.trim(),
        if (_maxGuestsCtrl.text.trim().isNotEmpty)
          'maxGuests': _maxGuestsCtrl.text.trim(),
      };

      // Serialize addOns and highlights as expected by Node.js backend
      for (int i = 0; i < _addOns.length; i++) {
        map['addOns[$i][name]'] = _addOns[i]['name']?.toString() ?? '';
        map['addOns[$i][price]'] = _addOns[i]['price']?.toString() ?? '0';
      }
      for (int i = 0; i < _highlights.length; i++) {
        map['highlights[$i]'] = _highlights[i];
      }

      if (_imageFile != null) {
        map['image'] = await MultipartFile.fromFile(
          _imageFile!.path,
          filename: 'service_cover.jpg',
        );
        map['coverImage'] = await MultipartFile.fromFile(
          _imageFile!.path,
          filename: 'service_cover.jpg',
        );
      }

      final formData = FormData.fromMap(map);

      if (widget.isEditing) {
        await _merchantService.updateService(widget.serviceId!, formData);
      } else {
        await _merchantService.createService(formData);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(widget.isEditing ? 'Service updated successfully!' : 'Service created successfully!'),
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
          widget.isEditing ? 'Edit Service' : 'Add Service',
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
              // Service Cover Image
              _buildSectionHeading('Service Cover'),
              const SizedBox(height: 8),
              _buildCoverImageUploader(),

              const SizedBox(height: 24),

              // Basic Information
              _buildSectionHeading('Basic Information'),
              const SizedBox(height: 12),

              _buildFieldLabel('SERVICE NAME', isRequired: true),
              TextFormField(
                controller: _nameCtrl,
                style: _inputTextStyle(),
                decoration: _inputDecoration(
                  hintText: 'e.g. Royal Wedding Catering Package',
                  prefixIcon: const Icon(Icons.design_services_outlined),
                ),
                validator: (v) => v == null || v.trim().isEmpty ? 'Please enter service name' : null,
              ),

              const SizedBox(height: 14),

              _buildFieldLabel('CATEGORY', isRequired: true),
              _buildCategorySelectorField(),

              const SizedBox(height: 14),

              _buildFieldLabel('DESCRIPTION'),
              TextFormField(
                controller: _descCtrl,
                minLines: 4,
                maxLines: 6,
                style: _inputTextStyle(),
                decoration: _inputDecoration(
                  hintText: 'Describe your service, what is included, and what customers can expect...',
                  prefixIcon: const Padding(
                    padding: EdgeInsets.only(bottom: 56),
                    child: Icon(Icons.description_outlined),
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Pricing
              _buildSectionHeading('Pricing'),
              const SizedBox(height: 12),
              _buildFieldLabel('BASE PRICE (₹)', isRequired: true),
              TextFormField(
                controller: _priceCtrl,
                keyboardType: TextInputType.number,
                style: _inputTextStyle(),
                decoration: _inputDecoration(
                  hintText: 'e.g. 15000',
                  prefixIcon: const Icon(Icons.currency_rupee_rounded),
                ),
                validator: (v) => v == null || v.trim().isEmpty ? 'Please enter base price' : null,
              ),

              const SizedBox(height: 24),

              // Guest Capacity
              _buildSectionHeading('Guest Capacity'),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildFieldLabel('MIN GUESTS'),
                        TextFormField(
                          controller: _minGuestsCtrl,
                          keyboardType: TextInputType.number,
                          style: _inputTextStyle(),
                          decoration: _inputDecoration(
                            hintText: 'e.g. 10',
                            prefixIcon: const Icon(Icons.people_outline_rounded),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildFieldLabel('MAX GUESTS'),
                        TextFormField(
                          controller: _maxGuestsCtrl,
                          keyboardType: TextInputType.number,
                          style: _inputTextStyle(),
                          decoration: _inputDecoration(
                            hintText: 'e.g. 500',
                            prefixIcon: const Icon(Icons.people_alt_outlined),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // Highlights
              _buildHighlightsSection(),

              const SizedBox(height: 24),

              // Add-Ons
              _buildAddOnsSection(),

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
        ? ApiConfig.resolveImageUrl(widget.initialData?['coverImage']?.toString())
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
                        errorBuilder: (ctx, err, stack) => _buildImagePlaceholder(),
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
                              color: Colors.black.withValues(alpha: 0.2),
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
          'Upload service cover',
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

  Widget _buildHighlightsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildSectionHeading('Highlights'),
            TextButton.icon(
              onPressed: _openAddHighlightBottomSheet,
              icon: const Icon(Icons.add_rounded, size: 18),
              label: Text(
                'Add Highlight',
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
              style: TextButton.styleFrom(
                foregroundColor: AppTheme.primaryColor,
                padding: EdgeInsets.zero,
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          'Add key benefits or features included in this service.',
          style: GoogleFonts.poppins(fontSize: 12.5, color: AppTheme.subtitleColor),
        ),
        const SizedBox(height: 12),
        if (_highlights.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            decoration: BoxDecoration(
              color: AppTheme.inputFillColor,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppTheme.borderColor),
            ),
            child: Column(
              children: [
                const Icon(Icons.stars_outlined, size: 28, color: AppTheme.subtitleColor),
                const SizedBox(height: 6),
                Text(
                  'No highlights added yet',
                  style: GoogleFonts.poppins(
                    fontWeight: FontWeight.w600,
                    fontSize: 13.5,
                    color: AppTheme.textColor,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Tap "+ Add Highlight" to specify key features',
                  style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.subtitleColor),
                ),
              ],
            ),
          )
        else
          Column(
            children: _highlights.asMap().entries.map((entry) {
              final index = entry.key;
              final text = entry.value;
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.borderColor),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.check_circle_rounded,
                      size: 20,
                      color: AppTheme.primaryColor,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        text,
                        style: GoogleFonts.poppins(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w500,
                          color: AppTheme.textColor,
                        ),
                      ),
                    ),
                    GestureDetector(
                      onTap: () => setState(() => _highlights.removeAt(index)),
                      child: const Icon(
                        Icons.close_rounded,
                        size: 18,
                        color: AppTheme.subtitleColor,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
      ],
    );
  }

  Widget _buildAddOnsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildSectionHeading('Add-Ons'),
            TextButton.icon(
              onPressed: () => _openAddEditAddOnBottomSheet(),
              icon: const Icon(Icons.add_rounded, size: 18),
              label: Text(
                'Add Add-On',
                style: GoogleFonts.poppins(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
              style: TextButton.styleFrom(
                foregroundColor: AppTheme.primaryColor,
                padding: EdgeInsets.zero,
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          'Optional extra items or upgrades customers can select.',
          style: GoogleFonts.poppins(fontSize: 12.5, color: AppTheme.subtitleColor),
        ),
        const SizedBox(height: 12),
        if (_addOns.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            decoration: BoxDecoration(
              color: AppTheme.inputFillColor,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppTheme.borderColor),
            ),
            child: Column(
              children: [
                const Icon(Icons.extension_outlined, size: 28, color: AppTheme.subtitleColor),
                const SizedBox(height: 6),
                Text(
                  'No add-ons added yet',
                  style: GoogleFonts.poppins(
                    fontWeight: FontWeight.w600,
                    fontSize: 13.5,
                    color: AppTheme.textColor,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Tap "+ Add Add-On" to offer optional extras',
                  style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.subtitleColor),
                ),
              ],
            ),
          )
        else
          Column(
            children: _addOns.asMap().entries.map((entry) {
              final index = entry.key;
              final item = entry.value;
              final name = item['name']?.toString() ?? '';
              final price = item['price']?.toString() ?? '0';

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.borderColor),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.02),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: AppTheme.tintVioletBg,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.extension_outlined,
                        size: 20,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: GoogleFonts.poppins(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textColor,
                            ),
                          ),
                          Text(
                            '₹$price',
                            style: GoogleFonts.poppins(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.edit_outlined, size: 18, color: AppTheme.primaryColor),
                      onPressed: () => _openAddEditAddOnBottomSheet(index: index, initial: item),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                    const SizedBox(width: 12),
                    IconButton(
                      icon: const Icon(Icons.delete_outline_rounded, size: 18, color: AppTheme.errorColor),
                      onPressed: () => setState(() => _addOns.removeAt(index)),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              );
            }).toList(),
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
                color: AppTheme.primaryColor.withValues(alpha: 0.28),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: InkWell(
            onTap: _loading ? null : _submit,
            borderRadius: BorderRadius.circular(14),
            splashColor: Colors.white.withValues(alpha: 0.15),
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
                          widget.isEditing ? 'Save Changes' : 'Create Service',
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
}

class _ServiceCategoryBottomSheet extends StatefulWidget {
  final String selectedCategory;
  final List<String> categories;
  final ValueChanged<String> onSelect;

  const _ServiceCategoryBottomSheet({
    required this.selectedCategory,
    required this.categories,
    required this.onSelect,
  });

  @override
  State<_ServiceCategoryBottomSheet> createState() => _ServiceCategoryBottomSheetState();
}

class _ServiceCategoryBottomSheetState extends State<_ServiceCategoryBottomSheet> {
  final _searchCtrl = TextEditingController();
  String _query = '';

  static const Map<String, IconData> _categoryIcons = {
    'Catering': Icons.restaurant_rounded,
    'Photography': Icons.camera_alt_rounded,
    'Decoration': Icons.auto_awesome_rounded,
    'Music & DJ': Icons.music_note_rounded,
    'Event Planning': Icons.event_note_rounded,
    'Venue': Icons.location_on_rounded,
    'Transportation': Icons.directions_bus_rounded,
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
                  'Choose your service category',
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
                    separatorBuilder: (context, index) => const SizedBox(height: 4),
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
                                        ? AppTheme.primaryColor.withValues(alpha: 0.15)
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

class _AddHighlightBottomSheet extends StatefulWidget {
  final ValueChanged<String> onAdd;

  const _AddHighlightBottomSheet({required this.onAdd});

  @override
  State<_AddHighlightBottomSheet> createState() => _AddHighlightBottomSheetState();
}

class _AddHighlightBottomSheetState extends State<_AddHighlightBottomSheet> {
  final _ctrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    widget.onAdd(_ctrl.text.trim());
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 12,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 38,
                height: 4.5,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2.25),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Add Highlight',
              style: GoogleFonts.poppins(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppTheme.textColor,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Add a key feature or benefit customers should know about',
              style: GoogleFonts.poppins(
                fontSize: 12.5,
                color: AppTheme.subtitleColor,
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _ctrl,
              autofocus: true,
              style: GoogleFonts.poppins(fontSize: 13.5, color: AppTheme.textColor),
              decoration: InputDecoration(
                hintText: 'e.g. Professional photography setup included',
                hintStyle: GoogleFonts.poppins(fontSize: 13, color: const Color(0xFF94A3B8)),
                filled: true,
                fillColor: AppTheme.inputFillColor,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppTheme.borderColor),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppTheme.primaryColor, width: 1.5),
                ),
              ),
              validator: (v) => v == null || v.trim().isEmpty ? 'Please enter a highlight' : null,
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      side: const BorderSide(color: AppTheme.borderColor),
                    ),
                    child: Text(
                      'Cancel',
                      style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w600,
                        color: AppTheme.subtitleColor,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      'Add Highlight',
                      style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _AddEditAddOnBottomSheet extends StatefulWidget {
  final Map<String, dynamic>? initialAddOn;
  final ValueChanged<Map<String, dynamic>> onSubmit;

  const _AddEditAddOnBottomSheet({
    this.initialAddOn,
    required this.onSubmit,
  });

  bool get isEditing => initialAddOn != null;

  @override
  State<_AddEditAddOnBottomSheet> createState() => _AddEditAddOnBottomSheetState();
}

class _AddEditAddOnBottomSheetState extends State<_AddEditAddOnBottomSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.initialAddOn != null) {
      _nameCtrl.text = widget.initialAddOn!['name']?.toString() ?? '';
      _priceCtrl.text = widget.initialAddOn!['price']?.toString() ?? '';
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    widget.onSubmit({
      'name': _nameCtrl.text.trim(),
      'price': _priceCtrl.text.trim(),
    });
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 12,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 38,
                height: 4.5,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2.25),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              widget.isEditing ? 'Edit Add-On' : 'Add Add-On',
              style: GoogleFonts.poppins(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppTheme.textColor,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Add an optional extra service or upgrade for your customers',
              style: GoogleFonts.poppins(
                fontSize: 12.5,
                color: AppTheme.subtitleColor,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'ADD-ON NAME *',
              style: GoogleFonts.poppins(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                color: AppTheme.subtitleColor,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 6),
            TextFormField(
              controller: _nameCtrl,
              autofocus: !widget.isEditing,
              style: GoogleFonts.poppins(fontSize: 13.5, color: AppTheme.textColor),
              decoration: InputDecoration(
                hintText: 'e.g. Extra Decoration',
                hintStyle: GoogleFonts.poppins(fontSize: 13, color: const Color(0xFF94A3B8)),
                prefixIcon: const Icon(Icons.extension_outlined, size: 20, color: AppTheme.subtitleColor),
                filled: true,
                fillColor: AppTheme.inputFillColor,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppTheme.borderColor),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppTheme.primaryColor, width: 1.5),
                ),
              ),
              validator: (v) => v == null || v.trim().isEmpty ? 'Please enter add-on name' : null,
            ),
            const SizedBox(height: 14),
            Text(
              'PRICE (₹) *',
              style: GoogleFonts.poppins(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                color: AppTheme.subtitleColor,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 6),
            TextFormField(
              controller: _priceCtrl,
              keyboardType: TextInputType.number,
              style: GoogleFonts.poppins(fontSize: 13.5, color: AppTheme.textColor),
              decoration: InputDecoration(
                hintText: 'e.g. 2000',
                prefixIcon: const Icon(Icons.currency_rupee_rounded, size: 20, color: AppTheme.subtitleColor),
                filled: true,
                fillColor: AppTheme.inputFillColor,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppTheme.borderColor),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppTheme.primaryColor, width: 1.5),
                ),
              ),
              validator: (v) => v == null || v.trim().isEmpty ? 'Please enter price' : null,
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      side: const BorderSide(color: AppTheme.borderColor),
                    ),
                    child: Text(
                      'Cancel',
                      style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w600,
                        color: AppTheme.subtitleColor,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      widget.isEditing ? 'Update Add-On' : 'Add Add-On',
                      style: GoogleFonts.poppins(
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
