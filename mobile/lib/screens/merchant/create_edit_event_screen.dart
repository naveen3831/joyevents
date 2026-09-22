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
import '../../widgets/location_autocomplete.dart';
import '../../widgets/event_schedule_picker.dart';
import '../../widgets/ai_title_suggestions_bottom_sheet.dart';
import '../../widgets/ai_description_modal.dart';

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
  bool _loadingCategories = false;
  bool _loadingCatAI = false;

  // Form controllers
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _maxAttendeesCtrl = TextEditingController();

  // Session & Ticket Controllers for Ticketed Events
  bool _hasMultipleSessions = false;
  final _silverPriceCtrl = TextEditingController();
  final _silverQtyCtrl = TextEditingController(text: '100');
  final _goldPriceCtrl = TextEditingController();
  final _goldQtyCtrl = TextEditingController(text: '100');
  final _diamondPriceCtrl = TextEditingController();
  final _diamondQtyCtrl = TextEditingController(text: '100');

  // Day / Night Session Controllers
  final _dayTimeCtrl = TextEditingController(text: '09:00 AM');
  final _daySilverPriceCtrl = TextEditingController();
  final _daySilverQtyCtrl = TextEditingController(text: '100');
  final _dayGoldPriceCtrl = TextEditingController();
  final _dayGoldQtyCtrl = TextEditingController(text: '100');
  final _dayDiamondPriceCtrl = TextEditingController();
  final _dayDiamondQtyCtrl = TextEditingController(text: '100');

  final _nightTimeCtrl = TextEditingController(text: '06:00 PM');
  final _nightSilverPriceCtrl = TextEditingController();
  final _nightSilverQtyCtrl = TextEditingController(text: '100');
  final _nightGoldPriceCtrl = TextEditingController();
  final _nightGoldQtyCtrl = TextEditingController(text: '100');
  final _nightDiamondPriceCtrl = TextEditingController();
  final _nightDiamondQtyCtrl = TextEditingController(text: '100');

  // Configuration & Type States
  String _category = 'Music';
  String _eventType = 'fullService'; // 'fullService' or 'ticketed'
  File? _imageFile;

  // Schedule & Duration States
  String _durationType = 'single'; // 'single' or 'multiple'
  DateTime? _startDate;
  DateTime? _endDate;
  TimeOfDay? _startTime;
  TimeOfDay? _endTime;
  bool _hasCustomSchedule = false;
  List<Map<String, dynamic>> _dailySchedule = [];

  // Dynamic Categories from backend
  List<String> _categories = [
    'Music',
    'Sports',
    'Food & Drink',
    'Arts & Culture',
    'Business',
    'Technology',
    'Health & Wellness',
    'Education',
    'General',
    'Other'
  ];

  // AI Suggestions
  String? _aiSuggestedCategory;
  List<String> _aiSuggestedTags = [];

  @override
  void initState() {
    super.initState();
    _loadCategories();
    _prefillFromInitialData();
  }

  Future<void> _loadCategories() async {
    setState(() => _loadingCategories = true);
    try {
      final list = await _merchantService.getCategories(type: 'event');
      if (mounted && list.isNotEmpty) {
        final names = list
            .map((e) => (e is Map) ? e['name']?.toString() : e.toString())
            .whereType<String>()
            .where((e) => e.isNotEmpty)
            .toList();
        if (names.isNotEmpty) {
          setState(() {
            _categories = names.toSet().toList();
            if (!_categories.contains(_category)) {
              _category = _categories.first;
            }
          });
        }
      }
    } catch (_) {
      // Graceful fallback to default categories
    } finally {
      if (mounted) setState(() => _loadingCategories = false);
    }
  }

  void _prefillFromInitialData() {
    final d = widget.initialData;
    if (d == null) return;
    _titleCtrl.text = d['title']?.toString() ?? '';
    _descCtrl.text = d['description']?.toString() ?? '';
    _locationCtrl.text = d['location']?.toString() ?? '';
    _priceCtrl.text = d['price']?.toString() ?? '';
    _maxAttendeesCtrl.text = d['maxAttendees']?.toString() ?? '';

    if (d['category'] != null) {
      _category = d['category'].toString();
    }

    final rawEventType = d['eventType']?.toString() ?? 'fullService';
    _eventType = (rawEventType.toLowerCase() == 'ticketed') ? 'ticketed' : 'fullService';

    _durationType = d['durationType']?.toString() ?? 'single';
    _hasCustomSchedule = d['hasCustomSchedule'] == true || d['hasCustomSchedule']?.toString() == 'true';

    final startStr = d['startDate']?.toString() ?? d['date']?.toString() ?? '';
    if (startStr.isNotEmpty) {
      try {
        _startDate = DateTime.parse(startStr);
      } catch (_) {}
    }

    final endStr = d['endDate']?.toString() ?? '';
    if (endStr.isNotEmpty) {
      try {
        _endDate = DateTime.parse(endStr);
      } catch (_) {}
    }

    final startT = d['startTime']?.toString() ?? d['time']?.toString() ?? '';
    if (startT.isNotEmpty) {
      _startTime = _parseTimeOfDay(startT);
    }

    final endT = d['endTime']?.toString() ?? '';
    if (endT.isNotEmpty) {
      _endTime = _parseTimeOfDay(endT);
    }

    // Prefill tickets if present
    if (d['tickets'] is List && (d['tickets'] as List).isNotEmpty) {
      final tList = d['tickets'] as List;
      for (final t in tList) {
        if (t is Map) {
          final type = t['type']?.toString().toLowerCase();
          final p = t['price']?.toString() ?? '';
          final a = t['available']?.toString() ?? '100';
          if (type == 'silver') {
            _silverPriceCtrl.text = p;
            _silverQtyCtrl.text = a;
          } else if (type == 'gold') {
            _goldPriceCtrl.text = p;
            _goldQtyCtrl.text = a;
          } else if (type == 'diamond') {
            _diamondPriceCtrl.text = p;
            _diamondQtyCtrl.text = a;
          }
        }
      }
    }
  }

  TimeOfDay? _parseTimeOfDay(String timeStr) {
    try {
      if (timeStr.contains(':')) {
        final parts = timeStr.split(':');
        int hour = int.parse(parts[0]);
        int minute = int.parse(parts[1].split(' ')[0]);
        if (timeStr.toLowerCase().contains('pm') && hour < 12) hour += 12;
        if (timeStr.toLowerCase().contains('am') && hour == 12) hour = 0;
        return TimeOfDay(hour: hour, minute: minute);
      }
    } catch (_) {}
    return null;
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _locationCtrl.dispose();
    _priceCtrl.dispose();
    _maxAttendeesCtrl.dispose();
    _silverPriceCtrl.dispose();
    _silverQtyCtrl.dispose();
    _goldPriceCtrl.dispose();
    _goldQtyCtrl.dispose();
    _diamondPriceCtrl.dispose();
    _diamondQtyCtrl.dispose();
    _dayTimeCtrl.dispose();
    _daySilverPriceCtrl.dispose();
    _daySilverQtyCtrl.dispose();
    _dayGoldPriceCtrl.dispose();
    _dayGoldQtyCtrl.dispose();
    _dayDiamondPriceCtrl.dispose();
    _dayDiamondQtyCtrl.dispose();
    _nightTimeCtrl.dispose();
    _nightSilverPriceCtrl.dispose();
    _nightSilverQtyCtrl.dispose();
    _nightGoldPriceCtrl.dispose();
    _nightGoldQtyCtrl.dispose();
    _nightDiamondPriceCtrl.dispose();
    _nightDiamondQtyCtrl.dispose();
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
      builder: (ctx) => _CategoryBottomSheet(
        selectedCategory: _category,
        categories: _categories,
        onSelect: (selected) {
          setState(() => _category = selected);
        },
        onAddNew: _showAddCategoryDialog,
      ),
    );
  }

  Future<void> _showAddCategoryDialog() async {
    final textCtrl = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Create New Category', style: GoogleFonts.poppins(fontWeight: FontWeight.w700, fontSize: 16)),
        content: TextField(
          controller: textCtrl,
          decoration: const InputDecoration(
            hintText: 'e.g. Concert, Workshop, Festival',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final newName = textCtrl.text.trim();
              if (newName.isNotEmpty) {
                Navigator.pop(ctx);
                try {
                  await _merchantService.createCategory(newName, type: 'event');
                  await _loadCategories();
                  setState(() => _category = newName);
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Category "$newName" created!'), backgroundColor: AppTheme.successColor),
                    );
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.errorColor),
                    );
                  }
                }
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor, foregroundColor: Colors.white),
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  Future<void> _fetchCategoryAndTagsAI() async {
    setState(() => _loadingCatAI = true);
    try {
      final res = await _merchantService.generateAISuggestions({
        'type': 'category_tags',
        'title': _titleCtrl.text.trim(),
        'currentDescription': _descCtrl.text.trim(),
      });
      if (mounted) {
        setState(() {
          _aiSuggestedCategory = res['category']?.toString();
          if (res['tags'] is List) {
            _aiSuggestedTags = (res['tags'] as List).map((e) => e.toString()).toList();
          }
          _loadingCatAI = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('AI analyzed content and generated suggestions!'), backgroundColor: AppTheme.successColor),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loadingCatAI = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to generate suggestions: ${e.toString()}'), backgroundColor: AppTheme.errorColor),
        );
      }
    }
  }

  String _formatDateIso(DateTime? dt) {
    if (dt == null) return '';
    return '${dt.year}-${dt.month.toString().padLeft(2, '0')}-${dt.day.toString().padLeft(2, '0')}';
  }

  String _formatTimeStr(TimeOfDay? time) {
    if (time == null) return '09:00';
    final h = time.hour.toString().padLeft(2, '0');
    final m = time.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_startDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an event start date'), backgroundColor: AppTheme.errorColor),
      );
      return;
    }

    if (_eventType == 'ticketed') {
      if (!_hasMultipleSessions) {
        if (_silverPriceCtrl.text.trim().isEmpty || double.tryParse(_silverPriceCtrl.text.trim()) == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please enter valid Silver ticket price'), backgroundColor: AppTheme.errorColor),
          );
          return;
        }
      }
    }

    setState(() => _loading = true);
    try {
      final startDateStr = _formatDateIso(_startDate);
      final endDateStr = _durationType == 'multiple' ? _formatDateIso(_endDate ?? _startDate) : startDateStr;
      final startTimeStr = _formatTimeStr(_startTime);
      final endTimeStr = _formatTimeStr(_endTime);

      final map = <String, dynamic>{
        'title': _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'durationType': _durationType,
        'startDate': startDateStr,
        'endDate': endDateStr,
        'startTime': startTimeStr,
        'endTime': endTimeStr,
        'date': startDateStr,
        'time': startTimeStr,
        'hasCustomSchedule': (_hasCustomSchedule && _durationType == 'multiple').toString(),
        'location': _locationCtrl.text.trim(),
        'category': _category,
        'status': 'upcoming',
        'eventType': _eventType, // Normalized 'fullService' or 'ticketed'
        'maxAttendees': _eventType == 'fullService' ? (_maxAttendeesCtrl.text.trim().isEmpty ? '0' : _maxAttendeesCtrl.text.trim()) : '0',
        'price': _eventType == 'fullService' ? (_priceCtrl.text.trim().isEmpty ? '0' : _priceCtrl.text.trim()) : '0',
      };

      if (_hasCustomSchedule && _durationType == 'multiple' && _dailySchedule.isNotEmpty) {
        map['dailySchedule'] = jsonEncode(_dailySchedule);
      }

      if (_eventType == 'ticketed') {
        if (_hasMultipleSessions) {
          map['hasMultipleSessions'] = 'true';
          map['sessions'] = jsonEncode({
            'day': {
              'enabled': true,
              'time': _dayTimeCtrl.text.trim(),
              'tickets': [
                {'type': 'silver', 'price': double.tryParse(_daySilverPriceCtrl.text.trim()) ?? 0.0, 'available': int.tryParse(_daySilverQtyCtrl.text.trim()) ?? 100},
                {'type': 'gold', 'price': double.tryParse(_dayGoldPriceCtrl.text.trim()) ?? 0.0, 'available': int.tryParse(_dayGoldQtyCtrl.text.trim()) ?? 100},
                {'type': 'diamond', 'price': double.tryParse(_dayDiamondPriceCtrl.text.trim()) ?? 0.0, 'available': int.tryParse(_dayDiamondQtyCtrl.text.trim()) ?? 100},
              ],
            },
            'night': {
              'enabled': true,
              'time': _nightTimeCtrl.text.trim(),
              'tickets': [
                {'type': 'silver', 'price': double.tryParse(_nightSilverPriceCtrl.text.trim()) ?? 0.0, 'available': int.tryParse(_nightSilverQtyCtrl.text.trim()) ?? 100},
                {'type': 'gold', 'price': double.tryParse(_nightGoldPriceCtrl.text.trim()) ?? 0.0, 'available': int.tryParse(_nightGoldQtyCtrl.text.trim()) ?? 100},
                {'type': 'diamond', 'price': double.tryParse(_nightDiamondPriceCtrl.text.trim()) ?? 0.0, 'available': int.tryParse(_nightDiamondQtyCtrl.text.trim()) ?? 100},
              ],
            },
          });
        } else {
          map['hasMultipleSessions'] = 'false';
          map['tickets'] = jsonEncode([
            {'type': 'silver', 'price': double.tryParse(_silverPriceCtrl.text.trim()) ?? 0.0, 'available': int.tryParse(_silverQtyCtrl.text.trim()) ?? 100},
            {'type': 'gold', 'price': double.tryParse(_goldPriceCtrl.text.trim()) ?? 0.0, 'available': int.tryParse(_goldQtyCtrl.text.trim()) ?? 100},
            {'type': 'diamond', 'price': double.tryParse(_diamondPriceCtrl.text.trim()) ?? 0.0, 'available': int.tryParse(_diamondQtyCtrl.text.trim()) ?? 100},
          ]);
        }
      }

      if (_imageFile != null) {
        map['image'] = await MultipartFile.fromFile(_imageFile!.path, filename: 'event_cover.jpg');
      }

      final formData = FormData.fromMap(map);

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
          SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.errorColor),
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
            left: 18,
            right: 18,
            top: 16,
            bottom: MediaQuery.of(context).viewInsets.bottom + 32,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Event Cover Image
              _buildSectionHeading('Event Cover'),
              const SizedBox(height: 8),
              _buildCoverImageUploader(),

              const SizedBox(height: 20),

              // Basic Information Section
              _buildSectionHeading('Basic Information'),
              const SizedBox(height: 12),

              // Event Type Toggle (Single Ticket vs Ticketed Event)
              _buildFieldLabel('EVENT TYPE', isRequired: true),
              _buildEventTypeSelector(),

              const SizedBox(height: 14),

              // Event Title with AI Button
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildFieldLabel('EVENT TITLE', isRequired: true),
                  InkWell(
                    onTap: () {
                      if (_titleCtrl.text.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Enter an event title or topic first!')),
                        );
                        return;
                      }
                      showModalBottomSheet(
                        context: context,
                        isScrollControlled: true,
                        backgroundColor: Colors.transparent,
                        builder: (ctx) => AITitleSuggestionsBottomSheet(
                          topic: _titleCtrl.text.trim(),
                          category: _category,
                          location: _locationCtrl.text.trim(),
                          eventType: _eventType,
                          onSelectTitle: (t) => setState(() => _titleCtrl.text = t),
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.purple.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.purple.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.auto_awesome, size: 12, color: Colors.purple),
                          const SizedBox(width: 4),
                          Text('✨ AI Suggestions', style: GoogleFonts.poppins(fontSize: 10.5, fontWeight: FontWeight.w600, color: Colors.purple)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              TextFormField(
                controller: _titleCtrl,
                style: _inputTextStyle(),
                maxLength: 100,
                decoration: _inputDecoration(
                  hintText: 'e.g. Summer Music Festival 2026',
                  prefixIcon: const Icon(Icons.event_outlined),
                ),
                validator: (v) => v == null || v.trim().isEmpty ? 'Please enter event title' : null,
              ),

              const SizedBox(height: 14),

              // Category Selector
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildFieldLabel('CATEGORY', isRequired: true),
                  TextButton.icon(
                    onPressed: _fetchCategoryAndTagsAI,
                    icon: _loadingCatAI
                        ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.purple)))
                        : const Icon(Icons.auto_awesome, size: 12, color: Colors.purple),
                    label: Text('✨ AI Category & Tags', style: GoogleFonts.poppins(fontSize: 10.5, fontWeight: FontWeight.w600, color: Colors.purple)),
                  ),
                ],
              ),
              _buildCategorySelectorField(),

              // AI Category / Tags Banner
              if (_aiSuggestedCategory != null || _aiSuggestedTags.isNotEmpty) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.purple.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.purple.withOpacity(0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_aiSuggestedCategory != null) ...[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                'Suggested Category: ${_aiSuggestedCategory!}',
                                style: GoogleFonts.poppins(fontSize: 11.5, fontWeight: FontWeight.w600, color: Colors.purple),
                              ),
                            ),
                            ElevatedButton(
                              onPressed: () {
                                setState(() {
                                  if (!_categories.contains(_aiSuggestedCategory!)) {
                                    _categories.add(_aiSuggestedCategory!);
                                  }
                                  _category = _aiSuggestedCategory!;
                                });
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.purple,
                                foregroundColor: Colors.white,
                                minimumSize: const Size(60, 28),
                                padding: const EdgeInsets.symmetric(horizontal: 10),
                              ),
                              child: const Text('Apply', style: TextStyle(fontSize: 10.5)),
                            ),
                          ],
                        ),
                      ],
                      if (_aiSuggestedTags.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: _aiSuggestedTags.map((tag) {
                            return InkWell(
                              onTap: () {
                                setState(() {
                                  _descCtrl.text = (_descCtrl.text.isNotEmpty ? '${_descCtrl.text}\n' : '') + tag;
                                });
                              },
                              child: Chip(
                                label: Text(tag, style: const TextStyle(fontSize: 10, color: Colors.purple)),
                                backgroundColor: Colors.white,
                                side: BorderSide(color: Colors.purple.withOpacity(0.3)),
                                padding: EdgeInsets.zero,
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 14),

              // Description with AI Button
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildFieldLabel('DESCRIPTION'),
                  InkWell(
                    onTap: () {
                      if (_titleCtrl.text.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Enter an event title first to generate description!')),
                        );
                        return;
                      }
                      showModalBottomSheet(
                        context: context,
                        isScrollControlled: true,
                        backgroundColor: Colors.transparent,
                        builder: (ctx) => AIDescriptionModal(
                          title: _titleCtrl.text.trim(),
                          currentDescription: _descCtrl.text.trim(),
                          category: _category,
                          location: _locationCtrl.text.trim(),
                          eventType: _eventType,
                          onSelectDescription: (desc) => setState(() => _descCtrl.text = desc),
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.indigo.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.indigo.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.auto_awesome, size: 12, color: Colors.indigo),
                          const SizedBox(width: 4),
                          Text('✨ AI Description', style: GoogleFonts.poppins(fontSize: 10.5, fontWeight: FontWeight.w600, color: Colors.indigo)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              TextFormField(
                controller: _descCtrl,
                minLines: 4,
                maxLines: 6,
                maxLength: 1000,
                style: _inputTextStyle(),
                decoration: _inputDecoration(
                  hintText: 'Tell customers about your event, highlights, and experience...',
                  prefixIcon: const Padding(
                    padding: EdgeInsets.only(bottom: 56),
                    child: Icon(Icons.description_outlined),
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Schedule Section (Single & Multi-Day)
              _buildSectionHeading('Schedule & Duration'),
              const SizedBox(height: 10),
              EventSchedulePicker(
                durationType: _durationType,
                onDurationTypeChanged: (type) => setState(() => _durationType = type),
                startDate: _startDate,
                onStartDateChanged: (d) => setState(() => _startDate = d),
                endDate: _endDate,
                onEndDateChanged: (d) => setState(() => _endDate = d),
                startTime: _startTime,
                onStartTimeChanged: (t) => setState(() => _startTime = t),
                endTime: _endTime,
                onEndTimeChanged: (t) => setState(() => _endTime = t),
                hasCustomSchedule: _hasCustomSchedule,
                onHasCustomScheduleChanged: (val) => setState(() => _hasCustomSchedule = val),
                dailySchedule: _dailySchedule,
                onDailyScheduleChanged: (list) => setState(() => _dailySchedule = list),
              ),

              const SizedBox(height: 20),

              // Location Section with Autocomplete
              _buildSectionHeading('Location'),
              const SizedBox(height: 10),
              _buildFieldLabel('VENUE / LOCATION', isRequired: true),
              LocationAutocomplete(
                controller: _locationCtrl,
                label: 'VENUE / LOCATION',
                hintText: 'e.g. Palace Grounds, Bengaluru',
                isRequired: true,
              ),

              const SizedBox(height: 20),

              // Pricing & Capacity Section
              _buildSectionHeading('Pricing & Capacity'),
              const SizedBox(height: 10),

              if (_eventType == 'fullService') ...[
                _buildFieldLabel('EVENT PRICE (₹)', isRequired: true),
                TextFormField(
                  controller: _priceCtrl,
                  keyboardType: TextInputType.number,
                  style: _inputTextStyle(),
                  decoration: _inputDecoration(
                    hintText: '0 for free',
                    prefixIcon: const Icon(Icons.currency_rupee_rounded),
                  ),
                  validator: (v) => (_eventType == 'fullService' && (v == null || v.trim().isEmpty)) ? 'Required' : null,
                ),
                const SizedBox(height: 14),
              ],

              // Ticketed Event Tiers & Sessions Section
              if (_eventType == 'ticketed') ...[
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.purple.withOpacity(0.06),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.purple.withOpacity(0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildFieldLabel('SESSION TYPE'),
                      Row(
                        children: [
                          Expanded(
                            child: _buildSessionTypeButton(
                              label: 'Single Session',
                              isSelected: !_hasMultipleSessions,
                              onTap: () => setState(() => _hasMultipleSessions = false),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _buildSessionTypeButton(
                              label: 'Day & Night Sessions',
                              isSelected: _hasMultipleSessions,
                              onTap: () => setState(() => _hasMultipleSessions = true),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      if (!_hasMultipleSessions) ...[
                        Text('Ticket Tiers & Pricing', style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 10),
                        _buildTicketTierRow('🥈 Silver (₹)', _silverPriceCtrl, _silverQtyCtrl),
                        const SizedBox(height: 10),
                        _buildTicketTierRow('🥇 Gold (₹)', _goldPriceCtrl, _goldQtyCtrl),
                        const SizedBox(height: 10),
                        _buildTicketTierRow('💎 Diamond (₹)', _diamondPriceCtrl, _diamondQtyCtrl),
                      ] else ...[
                        // Day Session Box
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.amber.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.amber.withOpacity(0.3)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Text('☀️ ', style: TextStyle(fontSize: 16)),
                                  Text('Day Session', style: GoogleFonts.poppins(fontWeight: FontWeight.w700, fontSize: 13)),
                                  const Spacer(),
                                  SizedBox(
                                    width: 100,
                                    height: 36,
                                    child: TextFormField(
                                      controller: _dayTimeCtrl,
                                      style: GoogleFonts.poppins(fontSize: 11),
                                      decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 8), filled: true, fillColor: Colors.white),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              _buildTicketTierRow('🥈 Silver (₹)', _daySilverPriceCtrl, _daySilverQtyCtrl),
                              const SizedBox(height: 8),
                              _buildTicketTierRow('🥇 Gold (₹)', _dayGoldPriceCtrl, _dayGoldQtyCtrl),
                              const SizedBox(height: 8),
                              _buildTicketTierRow('💎 Diamond (₹)', _dayDiamondPriceCtrl, _dayDiamondQtyCtrl),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Night Session Box
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.blue.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.blue.withOpacity(0.3)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Text('🌙 ', style: TextStyle(fontSize: 16)),
                                  Text('Night Session', style: GoogleFonts.poppins(fontWeight: FontWeight.w700, fontSize: 13)),
                                  const Spacer(),
                                  SizedBox(
                                    width: 100,
                                    height: 36,
                                    child: TextFormField(
                                      controller: _nightTimeCtrl,
                                      style: GoogleFonts.poppins(fontSize: 11),
                                      decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 8), filled: true, fillColor: Colors.white),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              _buildTicketTierRow('🥈 Silver (₹)', _nightSilverPriceCtrl, _nightSilverQtyCtrl),
                              const SizedBox(height: 8),
                              _buildTicketTierRow('🥇 Gold (₹)', _nightGoldPriceCtrl, _nightGoldQtyCtrl),
                              const SizedBox(height: 8),
                              _buildTicketTierRow('💎 Diamond (₹)', _nightDiamondPriceCtrl, _nightDiamondQtyCtrl),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Max Attendees Section
              _buildFieldLabel('MAX ATTENDEES / CAPACITY'),
              TextFormField(
                controller: _maxAttendeesCtrl,
                keyboardType: TextInputType.number,
                style: _inputTextStyle(),
                decoration: _inputDecoration(
                  hintText: 'e.g. 500 or leave blank for unlimited',
                  prefixIcon: const Icon(Icons.people_outline_rounded),
                ),
              ),

              // Capacity quick preset pills
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  {'label': 'Unlimited', 'value': '0'},
                  {'label': '50', 'value': '50'},
                  {'label': '100', 'value': '100'},
                  {'label': '250', 'value': '250'},
                  {'label': '500', 'value': '500'},
                  {'label': '1,000', 'value': '1000'},
                  {'label': '5,000', 'value': '5000'},
                ].map((preset) {
                  final val = preset['value']!;
                  final isSelected = (_maxAttendeesCtrl.text.isEmpty && val == '0') || (_maxAttendeesCtrl.text == val);
                  return ChoiceChip(
                    label: Text(preset['label']!, style: TextStyle(fontSize: 11, color: isSelected ? Colors.white : AppTheme.textColor)),
                    selected: isSelected,
                    selectedColor: AppTheme.primaryColor,
                    backgroundColor: AppTheme.inputFillColor,
                    onSelected: (_) {
                      setState(() {
                        _maxAttendeesCtrl.text = val == '0' ? '' : val;
                      });
                    },
                  );
                }).toList(),
              ),

              const SizedBox(height: 32),

              // Submit Primary CTA Button
              _buildSubmitButton(),

              const SizedBox(height: 24),
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
            if (_loadingCategories)
              const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
            else
              const Icon(Icons.keyboard_arrow_down_rounded, color: AppTheme.subtitleColor, size: 22),
          ],
        ),
      ),
    );
  }

  Widget _buildEventTypeSelector() {
    final types = [
      {'id': 'fullService', 'name': 'Single Ticket Event', 'icon': Icons.auto_awesome_outlined},
      {'id': 'ticketed', 'name': 'Ticketed Event', 'icon': Icons.confirmation_number_outlined},
    ];

    return Row(
      children: types.map((item) {
        final id = item['id'] as String;
        final name = item['name'] as String;
        final icon = item['icon'] as IconData;
        final isSelected = _eventType == id;

        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(right: id == 'fullService' ? 6 : 0, left: id == 'fullService' ? 0 : 6),
            child: Material(
              color: isSelected ? AppTheme.tintVioletBg : Colors.white,
              borderRadius: BorderRadius.circular(14),
              child: InkWell(
                onTap: () => setState(() => _eventType = id),
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  height: 52,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
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
                      Icon(icon, size: 18, color: isSelected ? AppTheme.primaryColor : AppTheme.subtitleColor),
                      const SizedBox(width: 6),
                      Flexible(
                        child: Text(
                          name,
                          style: GoogleFonts.poppins(
                            fontSize: 12.5,
                            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                            color: isSelected ? AppTheme.primaryColor : AppTheme.textColor,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
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

  Widget _buildSessionTypeButton({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Material(
      color: isSelected ? Colors.purple.withOpacity(0.12) : Colors.white,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          height: 40,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? Colors.purple : AppTheme.borderColor,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? Colors.purple : AppTheme.textColor,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTicketTierRow(String label, TextEditingController priceCtrl, TextEditingController qtyCtrl) {
    return Row(
      children: [
        Expanded(
          flex: 3,
          child: TextFormField(
            controller: priceCtrl,
            keyboardType: TextInputType.number,
            style: GoogleFonts.poppins(fontSize: 12),
            decoration: InputDecoration(
              labelText: label,
              labelStyle: GoogleFonts.poppins(fontSize: 11),
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          flex: 2,
          child: TextFormField(
            controller: qtyCtrl,
            keyboardType: TextInputType.number,
            style: GoogleFonts.poppins(fontSize: 12),
            decoration: InputDecoration(
              labelText: 'Qty',
              labelStyle: GoogleFonts.poppins(fontSize: 11),
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
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
}

class _CategoryBottomSheet extends StatefulWidget {
  final String selectedCategory;
  final List<String> categories;
  final ValueChanged<String> onSelect;
  final VoidCallback onAddNew;

  const _CategoryBottomSheet({
    required this.selectedCategory,
    required this.categories,
    required this.onSelect,
    required this.onAddNew,
  });

  @override
  State<_CategoryBottomSheet> createState() => _CategoryBottomSheetState();
}

class _CategoryBottomSheetState extends State<_CategoryBottomSheet> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final filtered = widget.categories
        .where((c) => c.toLowerCase().contains(_query.toLowerCase().trim()))
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
          const SizedBox(height: 10),
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFCBD5E1),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 14),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Select Category',
                  style: GoogleFonts.poppins(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textColor,
                  ),
                ),
                TextButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    widget.onAddNew();
                  },
                  icon: const Icon(Icons.add, size: 16),
                  label: const Text('New Category', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: TextField(
              onChanged: (val) => setState(() => _query = val),
              decoration: InputDecoration(
                hintText: 'Search category...',
                hintStyle: GoogleFonts.poppins(fontSize: 13, color: const Color(0xFF94A3B8)),
                prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.subtitleColor, size: 20),
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
                    separatorBuilder: (_, __) => const SizedBox(height: 4),
                    itemBuilder: (context, index) {
                      final cat = filtered[index];
                      final isSelected = cat == widget.selectedCategory;

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
                                    Icons.category_rounded,
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
