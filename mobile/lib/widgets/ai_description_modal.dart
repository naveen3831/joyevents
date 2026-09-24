import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/app_theme.dart';
import '../services/merchant_service.dart';

class AIDescriptionModal extends StatefulWidget {
  final String title;
  final String currentDescription;
  final String category;
  final String location;
  final String eventType;
  final ValueChanged<String> onSelectDescription;

  const AIDescriptionModal({
    super.key,
    required this.title,
    required this.currentDescription,
    required this.category,
    required this.location,
    required this.eventType,
    required this.onSelectDescription,
  });

  @override
  State<AIDescriptionModal> createState() => _AIDescriptionModalState();
}

class _AIDescriptionModalState extends State<AIDescriptionModal> {
  final MerchantService _merchantService = MerchantService();
  String _selectedTone = 'standard';
  String _generatedDesc = '';
  bool _loading = false;
  String? _error;

  final List<Map<String, String>> _tones = [
    {'id': 'standard', 'label': 'Standard'},
    {'id': 'professional', 'label': 'Professional'},
    {'id': 'casual', 'label': 'Casual'},
    {'id': 'punchy', 'label': 'Punchy'},
    {'id': 'expand', 'label': 'Expand'},
    {'id': 'improve', 'label': 'Improve Draft'},
  ];

  @override
  void initState() {
    super.initState();
    _generateDescription('standard');
  }

  Future<void> _generateDescription(String tone) async {
    if (_loading) return;

    if (widget.title.trim().isEmpty) {
      setState(() {
        _loading = false;
        _error = "Please enter an event title or topic first.";
      });
      return;
    }

    setState(() {
      _selectedTone = tone;
      _loading = true;
      _error = null;
    });

    try {
      final res = await _merchantService.generateAISuggestions({
        'type': 'description',
        'title': widget.title.trim(),
        'category': widget.category,
        'location': widget.location,
        'eventType': widget.eventType == 'fullService' ? 'Single Ticket Event' : 'Ticketed Event',
        'currentDescription': widget.currentDescription,
        'tone': tone,
      });

      if (mounted) {
        final desc = res['description']?.toString() ?? '';
        if (desc.isNotEmpty) {
          setState(() {
            _generatedDesc = desc;
            _loading = false;
          });
        } else {
          setState(() {
            _error = "Could not generate description right now. Please try again.";
            _loading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        String errStr = e.toString();
        if (errStr.contains('404')) {
          errStr = "AI description service unavailable (404). Please try again later.";
        } else if (errStr.contains('401') || errStr.contains('403')) {
          errStr = "Session expired. Please log in again.";
        }
        setState(() {
          _error = errStr;
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.indigo.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.auto_awesome, color: Colors.indigo, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      'AI Description Generator',
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textColor,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppTheme.subtitleColor),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),

            const SizedBox(height: 12),
            Text(
              'Select tone to generate for: "${widget.title}"',
              style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.subtitleColor),
            ),
            const SizedBox(height: 12),

            // Tone pills
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _tones.map((t) {
                final isSelected = _selectedTone == t['id'];
                return ChoiceChip(
                  label: Text(
                    t['label']!,
                    style: GoogleFonts.poppins(
                      fontSize: 11.5,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected ? Colors.white : AppTheme.textColor,
                    ),
                  ),
                  selected: isSelected,
                  selectedColor: Colors.indigo,
                  backgroundColor: AppTheme.inputFillColor,
                  onSelected: (selected) {
                    if (selected) _generateDescription(t['id']!);
                  },
                );
              }).toList(),
            ),

            const SizedBox(height: 16),

            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Center(
                  child: Column(
                    children: [
                      CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Colors.indigo)),
                      SizedBox(height: 12),
                      Text('Crafting description...', style: TextStyle(fontSize: 13, color: AppTheme.subtitleColor)),
                    ],
                  ),
                ),
              )
            else if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 20),
                child: Center(
                  child: Column(
                    children: [
                      Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.errorColor, fontSize: 13)),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        onPressed: _loading ? null : () => _generateDescription(_selectedTone),
                        icon: const Icon(Icons.refresh, size: 16),
                        label: const Text('Retry'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.indigo,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.inputFillColor,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.borderColor),
                ),
                child: Text(
                  _generatedDesc,
                  style: GoogleFonts.poppins(fontSize: 12.5, color: AppTheme.textColor, height: 1.5),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () {
                    widget.onSelectDescription(_generatedDesc);
                    Navigator.pop(context);
                  },
                  icon: const Icon(Icons.check, size: 18),
                  label: Text(
                    'Apply Description',
                    style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.indigo,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
