import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/app_theme.dart';
import '../services/merchant_service.dart';

class AITitleSuggestionsBottomSheet extends StatefulWidget {
  final String topic;
  final String category;
  final String location;
  final String eventType;
  final ValueChanged<String> onSelectTitle;

  const AITitleSuggestionsBottomSheet({
    super.key,
    required this.topic,
    required this.category,
    required this.location,
    required this.eventType,
    required this.onSelectTitle,
  });

  @override
  State<AITitleSuggestionsBottomSheet> createState() => _AITitleSuggestionsBottomSheetState();
}

class _AITitleSuggestionsBottomSheetState extends State<AITitleSuggestionsBottomSheet> {
  final MerchantService _merchantService = MerchantService();
  List<String> _suggestions = [];
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchSuggestions();
  }

  Future<void> _fetchSuggestions([bool isGenerateMore = false]) async {
    if (widget.topic.trim().isEmpty) return;

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final res = await _merchantService.generateAISuggestions({
        'type': 'title',
        'topic': widget.topic.trim(),
        'eventType': widget.eventType == 'fullService' ? 'Single Ticket Event' : 'Ticketed Event',
        'location': widget.location,
        'category': widget.category,
        'excludeList': isGenerateMore ? _suggestions : [],
      });

      if (mounted) {
        final titles = res['titles'];
        if (titles is List && titles.isNotEmpty) {
          setState(() {
            _suggestions = titles.map((e) => e.toString()).toList();
            _loading = false;
          });
        } else {
          setState(() {
            _error = "Could not generate title suggestions. Please try again.";
            _loading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
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
                      color: Colors.purple.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.auto_awesome, color: Colors.purple, size: 20),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'AI Title Suggestions',
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
            'Based on topic: "${widget.topic}"',
            style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.subtitleColor),
          ),
          const SizedBox(height: 16),

          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Center(
                child: Column(
                  children: [
                    CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Colors.purple)),
                    SizedBox(height: 12),
                    Text('Generating suggestions...', style: TextStyle(fontSize: 13, color: AppTheme.subtitleColor)),
                  ],
                ),
              ),
            )
          else if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Center(
                child: Text(_error!, style: const TextStyle(color: AppTheme.errorColor, fontSize: 13)),
              ),
            )
          else ...[
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 280),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: _suggestions.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final title = _suggestions[index];
                  return InkWell(
                    onTap: () {
                      widget.onSelectTitle(title);
                      Navigator.pop(context);
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.inputFillColor,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              title,
                              style: GoogleFonts.poppins(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: AppTheme.textColor,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Apply ↵',
                            style: GoogleFonts.poppins(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Colors.purple,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => _fetchSuggestions(true),
                icon: const Icon(Icons.refresh, size: 16, color: Colors.purple),
                label: Text(
                  'Generate More',
                  style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.purple),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
