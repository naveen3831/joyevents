import 'dart:async';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/app_theme.dart';
import '../models/location_suggestion.dart';
import '../services/geocoding_service.dart';

class LocationAutocomplete extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final String hintText;
  final bool isRequired;
  final FormFieldValidator<String>? validator;
  final ValueChanged<LocationSuggestion>? onSuggestionSelected;
  final ValueChanged<String>? onChanged;

  const LocationAutocomplete({
    super.key,
    required this.controller,
    this.label = 'VENUE / LOCATION',
    this.hintText = 'e.g. Palace Grounds, Bengaluru',
    this.isRequired = true,
    this.validator,
    this.onSuggestionSelected,
    this.onChanged,
  });

  @override
  State<LocationAutocomplete> createState() => _LocationAutocompleteState();
}

class _LocationAutocompleteState extends State<LocationAutocomplete> {
  final GeocodingService _geocodingService = GeocodingService();
  final LayerLink _layerLink = LayerLink();
  final FocusNode _focusNode = FocusNode();

  Timer? _debounceTimer;
  CancelToken? _cancelToken;
  OverlayEntry? _overlayEntry;

  List<LocationSuggestion> _suggestions = [];
  bool _loading = false;
  bool _searchError = false;
  bool _isOpen = false;
  
  // Track confirmed selection state
  bool _isConfirmedSelection = false;
  String? _confirmedText;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(_onFocusChange);
    widget.controller.addListener(_onControllerChange);
    
    // If field starts with an existing address, mark it as confirmed selection
    if (widget.controller.text.trim().isNotEmpty) {
      _isConfirmedSelection = true;
      _confirmedText = widget.controller.text;
    }
  }

  @override
  void didUpdateWidget(LocationAutocomplete oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_onControllerChange);
      widget.controller.addListener(_onControllerChange);
      if (widget.controller.text.trim().isNotEmpty) {
        _isConfirmedSelection = true;
        _confirmedText = widget.controller.text;
      }
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _cancelToken?.cancel();
    _hideOverlay();
    _focusNode.removeListener(_onFocusChange);
    widget.controller.removeListener(_onControllerChange);
    _focusNode.dispose();
    super.dispose();
  }

  void _onFocusChange() {
    if (_focusNode.hasFocus) {
      // Do not trigger autocomplete search on focus if text is already confirmed
      if (!_isConfirmedSelection && widget.controller.text.trim().length >= 3) {
        _performSearch(widget.controller.text);
      }
    } else {
      // Delay slightly to allow tap events on overlay to register
      Future.delayed(const Duration(milliseconds: 200), () {
        if (mounted && !_focusNode.hasFocus) {
          _hideOverlay();
        }
      });
    }
  }

  void _onControllerChange() {
    final text = widget.controller.text;

    // If the text matches confirmed selection, ignore programmatic update
    if (_isConfirmedSelection && text == _confirmedText) {
      return;
    }

    // If user modified text away from confirmed selection, clear confirmation state
    if (_isConfirmedSelection && text != _confirmedText) {
      _isConfirmedSelection = false;
      _confirmedText = null;
    }

    if (widget.onChanged != null) {
      widget.onChanged!(text);
    }

    _debounceTimer?.cancel();

    if (text.trim().length >= 3) {
      if (!_loading && !_isOpen) {
        setState(() => _loading = true);
      }
      _debounceTimer = Timer(const Duration(milliseconds: 350), () {
        _performSearch(text);
      });
    } else {
      _cancelToken?.cancel();
      setState(() {
        _suggestions = [];
        _loading = false;
        _searchError = false;
      });
      _hideOverlay();
    }
  }

  Future<void> _performSearch(String query) async {
    // If text has already been confirmed, abort search
    if (_isConfirmedSelection) {
      setState(() {
        _suggestions = [];
        _loading = false;
        _searchError = false;
      });
      _hideOverlay();
      return;
    }

    final trimmed = query.trim();
    if (trimmed.length < 3) {
      setState(() {
        _suggestions = [];
        _loading = false;
        _searchError = false;
      });
      _hideOverlay();
      return;
    }

    _cancelToken?.cancel();
    _cancelToken = CancelToken();

    if (mounted) {
      setState(() {
        _loading = true;
        _searchError = false;
      });
    }

    try {
      final results = await _geocodingService.searchLocations(
        trimmed,
        cancelToken: _cancelToken,
      );
      // Guard against component unmount or selection occurring while request was in-flight
      if (!mounted || _isConfirmedSelection) return;
      
      setState(() {
        _suggestions = results;
        _loading = false;
        _searchError = false;
      });
      _showOverlay();
    } catch (e) {
      if (e is DioException && CancelToken.isCancel(e)) return;
      if (!mounted || _isConfirmedSelection) return;

      setState(() {
        _suggestions = [];
        _loading = false;
        _searchError = true;
      });
      _showOverlay();
    }
  }

  void _selectSuggestion(LocationSuggestion suggestion) {
    final selectedText = suggestion.fullAddress.isNotEmpty ? suggestion.fullAddress : suggestion.name;

    // 1. Cancel pending timer and in-flight API calls immediately
    _debounceTimer?.cancel();
    _cancelToken?.cancel();

    // 2. Mark address as confirmed selection BEFORE modifying text controller
    _isConfirmedSelection = true;
    _confirmedText = selectedText;

    // 3. Clear suggestions and state
    setState(() {
      _suggestions = [];
      _loading = false;
      _searchError = false;
    });

    // 4. Update controller text
    widget.controller.text = selectedText;

    if (widget.onChanged != null) {
      widget.onChanged!(selectedText);
    }
    if (widget.onSuggestionSelected != null) {
      widget.onSuggestionSelected!(suggestion);
    }

    // 5. Hide overlay and dismiss keyboard
    _hideOverlay();
    _focusNode.unfocus();
    FocusScope.of(context).unfocus();
  }

  void _selectManual() {
    final manualText = widget.controller.text.trim();
    final suggestion = LocationSuggestion(
      name: manualText,
      address: manualText,
      fullAddress: manualText,
      lat: 0.0,
      lng: 0.0,
      isManual: true,
    );

    // 1. Cancel pending timer and in-flight API calls immediately
    _debounceTimer?.cancel();
    _cancelToken?.cancel();

    // 2. Mark address as confirmed selection BEFORE modifying text controller
    _isConfirmedSelection = true;
    _confirmedText = manualText;

    // 3. Clear suggestions and state
    setState(() {
      _suggestions = [];
      _loading = false;
      _searchError = false;
    });

    // 4. Update controller text
    widget.controller.text = manualText;

    if (widget.onChanged != null) {
      widget.onChanged!(manualText);
    }
    if (widget.onSuggestionSelected != null) {
      widget.onSuggestionSelected!(suggestion);
    }

    // 5. Hide overlay and dismiss keyboard
    _hideOverlay();
    _focusNode.unfocus();
    FocusScope.of(context).unfocus();
  }

  void _showOverlay() {
    if (_isConfirmedSelection) return;

    if (_overlayEntry != null) {
      _overlayEntry!.markNeedsBuild();
      return;
    }

    final overlay = Overlay.of(context);
    _overlayEntry = _createOverlayEntry();
    overlay.insert(_overlayEntry!);
    _isOpen = true;
  }

  void _hideOverlay() {
    _overlayEntry?.remove();
    _overlayEntry = null;
    _isOpen = false;
  }

  OverlayEntry _createOverlayEntry() {
    final renderBox = context.findRenderObject() as RenderBox?;
    final size = renderBox?.size ?? Size.zero;

    return OverlayEntry(
      builder: (context) {
        final query = widget.controller.text.trim();

        return Positioned(
          width: size.width,
          child: CompositedTransformFollower(
            link: _layerLink,
            showWhenUnlinked: false,
            offset: Offset(0, size.height + 6),
            child: Material(
              elevation: 8,
              borderRadius: BorderRadius.circular(16),
              color: Colors.white,
              shadowColor: Colors.black.withOpacity(0.15),
              child: Container(
                constraints: const BoxConstraints(maxHeight: 230),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.borderColor),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (_suggestions.isNotEmpty)
                          ListView.separated(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: _suggestions.length,
                            separatorBuilder: (_, __) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
                            itemBuilder: (context, index) {
                              final item = _suggestions[index];
                              return InkWell(
                                onTap: () => _selectSuggestion(item),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(6),
                                        decoration: BoxDecoration(
                                          color: AppTheme.tintVioletBg,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: const Icon(
                                          Icons.location_on_outlined,
                                          size: 16,
                                          color: AppTheme.primaryColor,
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              item.name,
                                              style: GoogleFonts.poppins(
                                                fontSize: 13,
                                                fontWeight: FontWeight.w600,
                                                color: AppTheme.textColor,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            if (item.address.isNotEmpty)
                                              Text(
                                                item.address,
                                                style: GoogleFonts.poppins(
                                                  fontSize: 11,
                                                  color: AppTheme.subtitleColor,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          )
                        else if (query.length >= 3 && !_loading)
                          Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  _searchError ? Icons.error_outline_rounded : Icons.location_off_outlined,
                                  size: 16,
                                  color: AppTheme.subtitleColor,
                                ),
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    _searchError
                                        ? 'Unable to load location suggestions'
                                        : 'No exact places found for "$query"',
                                    style: GoogleFonts.poppins(
                                      fontSize: 12,
                                      color: AppTheme.subtitleColor,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ],
                            ),
                          ),

                        // Manual Location selection option
                        if (query.length >= 3) ...[
                          const Divider(height: 1, color: AppTheme.borderColor),
                          InkWell(
                            onTap: _selectManual,
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryColor.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(
                                      Icons.check_circle_outline_rounded,
                                      size: 16,
                                      color: AppTheme.primaryColor,
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        RichText(
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          text: TextSpan(
                                            style: GoogleFonts.poppins(
                                              fontSize: 12.5,
                                              color: AppTheme.textColor,
                                            ),
                                            children: [
                                              const TextSpan(text: 'Use '),
                                              TextSpan(
                                                text: '"$query"',
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  color: AppTheme.primaryColor,
                                                ),
                                              ),
                                              const TextSpan(text: ' as entered'),
                                            ],
                                          ),
                                        ),
                                        Text(
                                          'Save as custom venue name / manual location',
                                          style: GoogleFonts.poppins(
                                            fontSize: 10.5,
                                            color: AppTheme.subtitleColor,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return CompositedTransformTarget(
      link: _layerLink,
      child: TextFormField(
        controller: widget.controller,
        focusNode: _focusNode,
        style: GoogleFonts.poppins(
          fontSize: 13.5,
          color: AppTheme.textColor,
          fontWeight: FontWeight.w400,
        ),
        decoration: InputDecoration(
          hintText: widget.hintText,
          hintStyle: GoogleFonts.poppins(
            fontSize: 13,
            color: const Color(0xFF94A3B8),
          ),
          filled: true,
          fillColor: AppTheme.inputFillColor,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          prefixIcon: const Icon(
            Icons.location_on_outlined,
            color: AppTheme.subtitleColor,
            size: 20,
          ),
          suffixIcon: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_loading)
                const Padding(
                  padding: EdgeInsets.only(right: 12),
                  child: SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                    ),
                  ),
                )
              else if (widget.controller.text.isNotEmpty)
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 18, color: AppTheme.subtitleColor),
                  onPressed: () {
                    _isConfirmedSelection = false;
                    _confirmedText = null;
                    widget.controller.clear();
                    if (widget.onChanged != null) widget.onChanged!('');
                    setState(() {
                      _suggestions = [];
                      _searchError = false;
                    });
                    _hideOverlay();
                  },
                ),
            ],
          ),
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
        ),
        validator: widget.validator ??
            (v) => (widget.isRequired && (v == null || v.trim().isEmpty))
                ? 'Please enter location'
                : null,
      ),
    );
  }
}
