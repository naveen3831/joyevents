import 'dart:convert';
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
  final _maxGuestsCtrl = TextEditingController(text: '100');
  
  String _category = 'Catering';
  bool _active = true;
  bool _allowGuests = false;

  File? _imageFile;
  String? _existingImageUrl;

  final List<File> _galleryFiles = [];
  List<String> _existingGalleryUrls = [];

  List<Map<String, dynamic>> _addOns = [];
  List<String> _highlights = [];

  List<String> _categories = [
    'Photography',
    'Decoration',
    'Catering',
    'General',
    'Music & DJ',
    'Lighting',
    'Security',
    'Venue Hire',
    'Event Planning',
    'Transportation',
    'Other'
  ];

  @override
  void initState() {
    super.initState();
    _fetchCategories();
    _prefill();
  }

  Future<void> _fetchCategories() async {
    try {
      final rawCats = await _merchantService.getCategories(type: 'service');
      final fetchedNames = rawCats
          .map((c) => (c is Map ? c['name'] : c).toString())
          .where((name) => name.isNotEmpty)
          .toList();

      if (mounted) {
        setState(() {
          final set = <String>{...fetchedNames, ..._categories};
          _categories = set.toList();
        });
      }
    } catch (_) {
      // Keep defaults
    }
  }

  void _prefill() {
    final d = widget.initialData;
    if (d == null) return;

    _nameCtrl.text = d['name']?.toString() ?? '';
    _descCtrl.text = d['description']?.toString() ?? '';
    _priceCtrl.text = d['price']?.toString() ?? d['basePrice']?.toString() ?? '';
    
    _active = d['active'] != false;
    _allowGuests = d['allowGuests'] == true;
    _maxGuestsCtrl.text = d['maxGuests']?.toString() ?? '100';

    if (d['category'] != null && d['category'].toString().isNotEmpty) {
      final cat = d['category'].toString();
      if (!_categories.contains(cat)) {
        _categories.add(cat);
      }
      _category = cat;
    }

    if (d['image'] != null && d['image'].toString().isNotEmpty) {
      _existingImageUrl = ApiConfig.resolveImageUrl(d['image'].toString());
    } else if (d['coverImage'] != null && d['coverImage'].toString().isNotEmpty) {
      _existingImageUrl = ApiConfig.resolveImageUrl(d['coverImage'].toString());
    }

    if (d['gallery'] is List) {
      _existingGalleryUrls = (d['gallery'] as List)
          .map((g) => ApiConfig.resolveImageUrl(g.toString()))
          .where((g) => g.isNotEmpty)
          .toList();
    }

    final rawAddOns = d['addOns'] as List? ?? [];
    _addOns = rawAddOns.map((a) {
      if (a is Map) {
        return {
          'name': a['name']?.toString() ?? '',
          'price': a['price']?.toString() ?? '0',
          'maxQuantity': a['maxQuantity']?.toString() ?? '1',
          'minQuantity': a['minQuantity']?.toString() ?? '1',
          'guestLabel': a['guestLabel']?.toString() ?? 'guests',
          'showGuestCount': a['showGuestCount'] == true,
        };
      }
      return <String, dynamic>{};
    }).where((m) => m.isNotEmpty).toList();

    final rawHighlights = d['highlights'] as List? ?? [];
    _highlights = rawHighlights.map((h) => h.toString()).toList();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _priceCtrl.dispose();
    _maxGuestsCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickCoverImage() async {
    final xfile = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
      maxWidth: 1200,
    );
    if (xfile != null) {
      final file = File(xfile.path);
      final sizeMB = (await file.length()) / (1024 * 1024);
      if (sizeMB > 5) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Image size must not exceed 5MB.'),
            backgroundColor: AppTheme.errorColor,
          ));
        }
        return;
      }
      setState(() => _imageFile = file);
    }
  }

  Future<void> _pickGalleryImages() async {
    final totalExisting = _existingGalleryUrls.length + _galleryFiles.length;
    if (totalExisting >= 4) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Maximum 4 gallery images allowed.'),
        backgroundColor: AppTheme.errorColor,
      ));
      return;
    }

    final xfiles = await _picker.pickMultiImage(
      imageQuality: 85,
      maxWidth: 1200,
    );

    if (xfiles.isNotEmpty) {
      final validFiles = <File>[];
      for (final x in xfiles) {
        if (totalExisting + validFiles.length >= 4) break;
        final file = File(x.path);
        final sizeMB = (await file.length()) / (1024 * 1024);
        if (sizeMB <= 5) {
          validFiles.add(file);
        }
      }
      setState(() => _galleryFiles.addAll(validFiles));
    }
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
        onCategoryAdded: (newCategory) {
          setState(() {
            if (!_categories.contains(newCategory)) {
              _categories.add(newCategory);
            }
            _category = newCategory;
          });
        },
      ),
    );
  }

  void _openAISuggestionsModal() {
    final serviceName = _nameCtrl.text.trim();
    if (serviceName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Enter a service name first to generate AI suggestions.'),
        backgroundColor: AppTheme.errorColor,
      ));
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _AISuggestionsBottomSheet(
        serviceName: serviceName,
        category: _category,
        currentDescription: _descCtrl.text.trim(),
        onApplyDescription: (desc) {
          setState(() => _descCtrl.text = desc);
        },
        onApplyHighlights: (hlList) {
          setState(() {
            final set = <String>{..._highlights, ...hlList};
            _highlights = set.toList();
          });
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

    if (_nameCtrl.text.trim().length > 100) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Service name cannot exceed 100 characters.'),
        backgroundColor: AppTheme.errorColor,
      ));
      return;
    }

    if (_descCtrl.text.trim().length > 1000) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Description cannot exceed 1000 characters.'),
        backgroundColor: AppTheme.errorColor,
      ));
      return;
    }

    setState(() => _loading = true);
    try {
      final map = <String, dynamic>{
        'name': _nameCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'price': _priceCtrl.text.trim(),
        'category': _category,
        'active': _active ? 'true' : 'false',
        'allowGuests': _allowGuests ? 'true' : 'false',
        'maxGuests': _allowGuests ? (_maxGuestsCtrl.text.trim().isEmpty ? '100' : _maxGuestsCtrl.text.trim()) : '100',
        'highlights': jsonEncode(_highlights),
        'addOns': jsonEncode(_addOns),
      };

      if (_imageFile != null) {
        map['image'] = await MultipartFile.fromFile(
          _imageFile!.path,
          filename: 'service_cover.jpg',
        );
      }

      if (_galleryFiles.isNotEmpty) {
        final galleryList = <MultipartFile>[];
        for (int i = 0; i < _galleryFiles.length; i++) {
          galleryList.add(await MultipartFile.fromFile(
            _galleryFiles[i].path,
            filename: 'gallery_$i.jpg',
          ));
        }
        map['gallery'] = galleryList;
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
              // Service Status Toggle
              _buildStatusCard(),
              const SizedBox(height: 20),

              // Service Cover Image
              _buildSectionHeading('Service Cover'),
              const SizedBox(height: 8),
              _buildCoverImageUploader(),

              const SizedBox(height: 20),

              // Gallery Images Section
              _buildSectionHeading('Gallery Images (Optional, Max 4)'),
              const SizedBox(height: 8),
              _buildGalleryUploader(),

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
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Please enter service name';
                  if (v.trim().length > 100) return 'Name cannot exceed 100 characters';
                  return null;
                },
              ),

              const SizedBox(height: 14),

              _buildFieldLabel('CATEGORY', isRequired: true),
              _buildCategorySelectorField(),

              const SizedBox(height: 14),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildFieldLabel('DESCRIPTION'),
                  GestureDetector(
                    onTap: _openAISuggestionsModal,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.tintVioletBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.auto_awesome_rounded, size: 14, color: AppTheme.primaryColor),
                          const SizedBox(width: 4),
                          Text(
                            'AI Assistant',
                            style: GoogleFonts.poppins(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
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
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Please enter base price';
                  final numVal = int.tryParse(v.trim());
                  if (numVal == null || numVal < 1) return 'Price must be a whole number of 1 or greater';
                  return null;
                },
              ),

              const SizedBox(height: 24),

              // Guest Capacity
              _buildSectionHeading('Guest Capacity'),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.borderColor),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.people_outline_rounded, color: AppTheme.primaryColor),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Limit Guest Capacity',
                            style: GoogleFonts.poppins(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textColor,
                            ),
                          ),
                          Text(
                            'Enable if this service has a maximum guest limit',
                            style: GoogleFonts.poppins(fontSize: 11.5, color: AppTheme.subtitleColor),
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: _allowGuests,
                      activeThumbColor: AppTheme.primaryColor,
                      onChanged: (val) => setState(() => _allowGuests = val),
                    ),
                  ],
                ),
              ),
              if (_allowGuests) ...[
                const SizedBox(height: 12),
                _buildFieldLabel('MAXIMUM GUESTS'),
                TextFormField(
                  controller: _maxGuestsCtrl,
                  keyboardType: TextInputType.number,
                  style: _inputTextStyle(),
                  decoration: _inputDecoration(
                    hintText: 'e.g. 100',
                    prefixIcon: const Icon(Icons.people_alt_outlined),
                  ),
                  validator: (v) {
                    if (_allowGuests) {
                      if (v == null || v.trim().isEmpty) return 'Please enter maximum guests';
                      final numVal = int.tryParse(v.trim());
                      if (numVal == null || numVal < 1) return 'Max guests must be at least 1';
                    }
                    return null;
                  },
                ),
              ],

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

  Widget _buildStatusCard() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Row(
        children: [
          Icon(
            _active ? Icons.visibility_rounded : Icons.visibility_off_rounded,
            color: _active ? AppTheme.successColor : AppTheme.subtitleColor,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _active ? 'Service Active' : 'Service Inactive',
                  style: GoogleFonts.poppins(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textColor,
                  ),
                ),
                Text(
                  _active ? 'Visible in customer search & directory' : 'Hidden from customers',
                  style: GoogleFonts.poppins(fontSize: 11.5, color: AppTheme.subtitleColor),
                ),
              ],
            ),
          ),
          Switch(
            value: _active,
            activeThumbColor: AppTheme.successColor,
            onChanged: (val) => setState(() => _active = val),
          ),
        ],
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
    final hasImage = _imageFile != null || (_existingImageUrl != null && _existingImageUrl!.isNotEmpty);

    return GestureDetector(
      onTap: _pickCoverImage,
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
                        _existingImageUrl!,
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
          'JPG / PNG / WEBP • max 5MB',
          style: GoogleFonts.poppins(
            fontSize: 12,
            color: AppTheme.subtitleColor,
          ),
        ),
      ],
    );
  }

  Widget _buildGalleryUploader() {
    final totalCount = _existingGalleryUrls.length + _galleryFiles.length;

    return SizedBox(
      height: 90,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          ..._existingGalleryUrls.map((url) => _buildGalleryItemThumbnail(imageUrl: url)),
          ..._galleryFiles.asMap().entries.map((e) => _buildGalleryItemThumbnail(
                file: e.value,
                onRemove: () => setState(() => _galleryFiles.removeAt(e.key)),
              )),
          if (totalCount < 4)
            GestureDetector(
              onTap: _pickGalleryImages,
              child: Container(
                width: 90,
                height: 90,
                margin: const EdgeInsets.only(right: 8),
                decoration: BoxDecoration(
                  color: AppTheme.inputFillColor,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.borderColor, style: BorderStyle.solid),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.add_photo_alternate_outlined, size: 24, color: AppTheme.primaryColor),
                    const SizedBox(height: 4),
                    Text(
                      'Add',
                      style: GoogleFonts.poppins(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppTheme.textColor),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildGalleryItemThumbnail({String? imageUrl, File? file, VoidCallback? onRemove}) {
    return Container(
      width: 90,
      height: 90,
      margin: const EdgeInsets.only(right: 8),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (file != null)
            Image.file(file, fit: BoxFit.cover)
          else if (imageUrl != null)
            Image.network(imageUrl, fit: BoxFit.cover, errorBuilder: (c, e, s) => const Icon(Icons.broken_image))
          else
            Container(color: Colors.grey.shade200),
          if (onRemove != null)
            Positioned(
              top: 4,
              right: 4,
              child: GestureDetector(
                onTap: onRemove,
                child: Container(
                  padding: const EdgeInsets.all(3),
                  decoration: const BoxDecoration(
                    color: Color(0xB3000000),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.close_rounded, size: 14, color: Colors.white),
                ),
              ),
            ),
        ],
      ),
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
              final showGuests = item['showGuestCount'] == true;
              final guestLabel = item['guestLabel']?.toString() ?? 'guests';

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
                          Row(
                            children: [
                              Text(
                                '₹$price',
                                style: GoogleFonts.poppins(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.primaryColor,
                                ),
                              ),
                              if (showGuests) ...[
                                const SizedBox(width: 8),
                                Text(
                                  '• Per $guestLabel',
                                  style: GoogleFonts.poppins(
                                    fontSize: 11.5,
                                    color: AppTheme.subtitleColor,
                                  ),
                                ),
                              ],
                            ],
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
  final ValueChanged<String> onCategoryAdded;

  const _ServiceCategoryBottomSheet({
    required this.selectedCategory,
    required this.categories,
    required this.onSelect,
    required this.onCategoryAdded,
  });

  @override
  State<_ServiceCategoryBottomSheet> createState() => _ServiceCategoryBottomSheetState();
}

class _ServiceCategoryBottomSheetState extends State<_ServiceCategoryBottomSheet> {
  final _searchCtrl = TextEditingController();
  final _newCatCtrl = TextEditingController();
  final _merchantService = MerchantService();
  String _query = '';
  bool _showNewCatInput = false;
  bool _creatingCat = false;

  static const Map<String, IconData> _categoryIcons = {
    'Catering': Icons.restaurant_rounded,
    'Photography': Icons.camera_alt_rounded,
    'Decoration': Icons.auto_awesome_rounded,
    'Music & DJ': Icons.music_note_rounded,
    'Event Planning': Icons.event_note_rounded,
    'Venue': Icons.location_on_rounded,
    'Transportation': Icons.directions_bus_rounded,
    'General': Icons.design_services_outlined,
    'Lighting': Icons.lightbulb_outlined,
    'Security': Icons.security_rounded,
    'Venue Hire': Icons.apartment_rounded,
    'Other': Icons.category_rounded,
  };

  @override
  void dispose() {
    _searchCtrl.dispose();
    _newCatCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleCreateCategory() async {
    final name = _newCatCtrl.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter category name.')));
      return;
    }
    if (name.length > 50) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Category name cannot exceed 50 characters.')));
      return;
    }

    setState(() => _creatingCat = true);
    try {
      await _merchantService.createCategory(name, type: 'service');
      widget.onCategoryAdded(name);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Category created successfully!'),
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
      if (mounted) setState(() => _creatingCat = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = widget.categories
        .where((c) => c.toLowerCase().contains(_query.toLowerCase()))
        .toList();

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.75,
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
                    TextButton.icon(
                      onPressed: () => setState(() => _showNewCatInput = !_showNewCatInput),
                      icon: Icon(_showNewCatInput ? Icons.close : Icons.add_rounded, size: 16),
                      label: Text(_showNewCatInput ? 'Cancel' : '+ Add New'),
                      style: TextButton.styleFrom(foregroundColor: AppTheme.primaryColor),
                    ),
                  ],
                ),
                if (_showNewCatInput) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _newCatCtrl,
                          style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textColor),
                          decoration: InputDecoration(
                            hintText: 'New category name...',
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: _creatingCat ? null : _handleCreateCategory,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: _creatingCat
                            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : Text('Add', style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),
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

class _AISuggestionsBottomSheet extends StatefulWidget {
  final String serviceName;
  final String category;
  final String currentDescription;
  final ValueChanged<String> onApplyDescription;
  final ValueChanged<List<String>> onApplyHighlights;

  const _AISuggestionsBottomSheet({
    required this.serviceName,
    required this.category,
    required this.currentDescription,
    required this.onApplyDescription,
    required this.onApplyHighlights,
  });

  @override
  State<_AISuggestionsBottomSheet> createState() => _AISuggestionsBottomSheetState();
}

class _AISuggestionsBottomSheetState extends State<_AISuggestionsBottomSheet> {
  final _merchantService = MerchantService();
  bool _loading = true;
  String? _error;

  List<Map<String, dynamic>> _descriptions = [];
  List<Map<String, dynamic>> _highlightSets = [];
  
  int _selectedDescIndex = 0;
  int _selectedHlIndex = 0;

  @override
  void initState() {
    super.initState();
    _fetchSuggestions();
  }

  Future<void> _fetchSuggestions() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final res = await _merchantService.generateServiceAISuggestions({
        'serviceName': widget.serviceName,
        'category': widget.category,
        'currentDescription': widget.currentDescription,
        'type': 'service_content',
      });

      if (res['descriptions'] is List) {
        _descriptions = (res['descriptions'] as List).map((d) => Map<String, dynamic>.from(d as Map)).toList();
      }
      if (res['highlightSets'] is List) {
        _highlightSets = (res['highlightSets'] as List).map((h) => Map<String, dynamic>.from(h as Map)).toList();
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
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
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: const BoxDecoration(
                  color: AppTheme.tintVioletBg,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.auto_awesome_rounded, color: AppTheme.primaryColor, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AI Content Suggestions',
                      style: GoogleFonts.poppins(fontSize: 17, fontWeight: FontWeight.w700, color: AppTheme.textColor),
                    ),
                    Text(
                      'Tailored for "${widget.serviceName}"',
                      style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.subtitleColor),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.refresh_rounded, size: 20, color: AppTheme.primaryColor),
                onPressed: _loading ? null : _fetchSuggestions,
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Center(child: CircularProgressIndicator(color: AppTheme.primaryColor)),
            )
          else if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: Column(
                  children: [
                    Text(_error!, style: GoogleFonts.poppins(color: AppTheme.errorColor, fontSize: 13)),
                    const SizedBox(height: 10),
                    ElevatedButton(
                      onPressed: _fetchSuggestions,
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor),
                      child: const Text('Try Again', style: TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_descriptions.isNotEmpty) ...[
                      Text('DESCRIPTIONS', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.subtitleColor)),
                      const SizedBox(height: 8),
                      ..._descriptions.asMap().entries.map((e) {
                        final idx = e.key;
                        final item = e.value;
                        final isSel = idx == _selectedDescIndex;
                        return GestureDetector(
                          onTap: () => setState(() => _selectedDescIndex = idx),
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isSel ? AppTheme.tintVioletBg : AppTheme.inputFillColor,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: isSel ? AppTheme.primaryColor : AppTheme.borderColor),
                            ),
                            child: Row(
                              children: [
                                Radio<int>(
                                  value: idx,
                                  groupValue: _selectedDescIndex,
                                  onChanged: (v) => setState(() => _selectedDescIndex = v!),
                                  activeColor: AppTheme.primaryColor,
                                ),
                                Expanded(
                                  child: Text(
                                    item['text']?.toString() ?? '',
                                    style: GoogleFonts.poppins(fontSize: 12.5, color: AppTheme.textColor),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                    ],
                    if (_highlightSets.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Text('HIGHLIGHT SETS', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.subtitleColor)),
                      const SizedBox(height: 8),
                      ..._highlightSets.asMap().entries.map((e) {
                        final idx = e.key;
                        final item = e.value;
                        final items = (item['items'] as List? ?? []).map((x) => x.toString()).toList();
                        final isSel = idx == _selectedHlIndex;
                        return GestureDetector(
                          onTap: () => setState(() => _selectedHlIndex = idx),
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isSel ? AppTheme.tintVioletBg : AppTheme.inputFillColor,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: isSel ? AppTheme.primaryColor : AppTheme.borderColor),
                            ),
                            child: Row(
                              children: [
                                Radio<int>(
                                  value: idx,
                                  groupValue: _selectedHlIndex,
                                  onChanged: (v) => setState(() => _selectedHlIndex = v!),
                                  activeColor: AppTheme.primaryColor,
                                ),
                                Expanded(
                                  child: Wrap(
                                    spacing: 6,
                                    runSpacing: 4,
                                    children: items.map((h) => Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(color: AppTheme.borderColor),
                                      ),
                                      child: Text(h, style: GoogleFonts.poppins(fontSize: 11, color: AppTheme.textColor)),
                                    )).toList(),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                    ],
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () {
                              if (_descriptions.isNotEmpty) {
                                widget.onApplyDescription(_descriptions[_selectedDescIndex]['text']?.toString() ?? '');
                              }
                              if (_highlightSets.isNotEmpty) {
                                final hlList = (_highlightSets[_selectedHlIndex]['items'] as List? ?? []).map((x) => x.toString()).toList();
                                widget.onApplyHighlights(hlList);
                              }
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                                content: Text('AI content applied to form!'),
                                backgroundColor: AppTheme.successColor,
                              ));
                            },
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              side: const BorderSide(color: AppTheme.primaryColor),
                            ),
                            child: Text('Apply Both', style: GoogleFonts.poppins(fontWeight: FontWeight.w700, color: AppTheme.primaryColor)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
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
  final _guestLabelCtrl = TextEditingController(text: 'guests');
  final _maxQtyCtrl = TextEditingController(text: '1');
  bool _showGuestCount = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialAddOn != null) {
      _nameCtrl.text = widget.initialAddOn!['name']?.toString() ?? '';
      _priceCtrl.text = widget.initialAddOn!['price']?.toString() ?? '';
      _guestLabelCtrl.text = widget.initialAddOn!['guestLabel']?.toString() ?? 'guests';
      _maxQtyCtrl.text = widget.initialAddOn!['maxQuantity']?.toString() ?? '1';
      _showGuestCount = widget.initialAddOn!['showGuestCount'] == true;
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _priceCtrl.dispose();
    _guestLabelCtrl.dispose();
    _maxQtyCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    widget.onSubmit({
      'name': _nameCtrl.text.trim(),
      'price': _priceCtrl.text.trim(),
      'showGuestCount': _showGuestCount,
      'guestLabel': _guestLabelCtrl.text.trim().isEmpty ? 'guests' : _guestLabelCtrl.text.trim(),
      'minQuantity': '1',
      'maxQuantity': _maxQtyCtrl.text.trim().isEmpty ? '1' : _maxQtyCtrl.text.trim(),
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
        child: SingleChildScrollView(
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
                  hintText: 'e.g. Extra Drone Coverage',
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
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Please enter add-on name';
                  if (v.trim().length > 100) return 'Add-on name cannot exceed 100 characters';
                  return null;
                },
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
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Please enter price';
                  final numVal = int.tryParse(v.trim());
                  if (numVal == null || numVal < 1) return 'Price must be a whole number of 1 or greater';
                  return null;
                },
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Checkbox(
                    value: _showGuestCount,
                    activeColor: AppTheme.primaryColor,
                    onChanged: (val) => setState(() => _showGuestCount = val ?? false),
                  ),
                  Expanded(
                    child: Text(
                      'Price depends on quantity / guest count',
                      style: GoogleFonts.poppins(fontSize: 13, color: AppTheme.textColor),
                    ),
                  ),
                ],
              ),
              if (_showGuestCount) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('UNIT LABEL', style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.subtitleColor)),
                          const SizedBox(height: 4),
                          TextFormField(
                            controller: _guestLabelCtrl,
                            style: GoogleFonts.poppins(fontSize: 13),
                            decoration: InputDecoration(
                              hintText: 'e.g. guests / hours',
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
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
                          Text('MAX QUANTITY', style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.subtitleColor)),
                          const SizedBox(height: 4),
                          TextFormField(
                            controller: _maxQtyCtrl,
                            keyboardType: TextInputType.number,
                            style: GoogleFonts.poppins(fontSize: 13),
                            decoration: InputDecoration(
                              hintText: 'e.g. 10',
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
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
      ),
    );
  }
}
