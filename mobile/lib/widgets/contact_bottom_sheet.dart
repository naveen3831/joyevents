import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../config/app_theme.dart';
import 'app_button.dart';

class ContactBottomSheet extends StatefulWidget {
  final String title;
  final String personName;
  final String description;
  final String hintText;
  final Future<void> Function(String message) onSend;

  const ContactBottomSheet({
    super.key,
    required this.title,
    required this.personName,
    required this.description,
    required this.hintText,
    required this.onSend,
  });

  /// Helper static method to show the bottom sheet cleanly
  static Future<dynamic> show({
    required BuildContext context,
    required String title,
    required String personName,
    required String description,
    required String hintText,
    required Future<void> Function(String message) onSend,
  }) {
    return showModalBottomSheet<dynamic>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ContactBottomSheet(
        title: title,
        personName: personName,
        description: description,
        hintText: hintText,
        onSend: onSend,
      ),
    );
  }

  @override
  State<ContactBottomSheet> createState() => _ContactBottomSheetState();
}

class _ContactBottomSheetState extends State<ContactBottomSheet> {
  final TextEditingController _messageController = TextEditingController();
  bool _isSending = false;
  String? _errorText;

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _handleSend() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) {
      setState(() {
        _errorText = 'Please enter a message';
      });
      return;
    }

    setState(() {
      _isSending = true;
      _errorText = null;
    });

    try {
      await widget.onSend(text);
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSending = false;
        });
        Navigator.of(context).pop(e.toString());
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 12,
        bottom: 24 + bottomInset,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Drag Handle ──────────────────────────────────────
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // ── Header Hierarchy ─────────────────────────────────
            Text(
              widget.title,
              style: GoogleFonts.poppins(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppTheme.textColor,
                height: 1.2,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              widget.personName,
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(height: 12),

            // ── Description ──────────────────────────────────────
            Text(
              widget.description,
              style: GoogleFonts.poppins(
                fontSize: 13,
                fontWeight: FontWeight.w400,
                color: AppTheme.subtitleColor,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),

            // ── Message Label ────────────────────────────────────
            Text(
              'Message',
              style: GoogleFonts.poppins(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppTheme.textColor,
              ),
            ),
            const SizedBox(height: 8),

            // ── Multiline Field ──────────────────────────────────
            TextField(
              controller: _messageController,
              enabled: !_isSending,
              maxLines: 4,
              minLines: 3,
              onChanged: (_) {
                if (_errorText != null) {
                  setState(() => _errorText = null);
                }
              },
              style: GoogleFonts.poppins(
                fontSize: 14,
                color: AppTheme.textColor,
              ),
              decoration: InputDecoration(
                hintText: widget.hintText,
                hintStyle: GoogleFonts.poppins(
                  color: const Color(0xFF94A3B8),
                  fontSize: 13,
                ),
                filled: true,
                fillColor: AppTheme.inputFillColor,
                errorText: _errorText,
                contentPadding: const EdgeInsets.all(14),
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
                  borderSide: const BorderSide(
                    color: AppTheme.primaryColor,
                    width: 1.5,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // ── Primary Action Button ────────────────────────────
            AppButton(
              text: 'Send Message',
              isLoading: _isSending,
              showArrow: true,
              onPressed: _isSending ? null : _handleSend,
            ),
            const SizedBox(height: 8),

            // ── Secondary Cancel Action ──────────────────────────
            Center(
              child: TextButton(
                onPressed: _isSending
                    ? null
                    : () => Navigator.of(context).pop(false),
                child: Text(
                  'Cancel',
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppTheme.subtitleColor,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
