import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/app_theme.dart';
import '../models/event_filter_model.dart';

class EventFilterBottomSheet extends StatefulWidget {
  final EventFilterModel currentFilter;
  final List<String> availableLocations;
  final double maxPriceAvailable;

  const EventFilterBottomSheet({
    super.key,
    required this.currentFilter,
    required this.availableLocations,
    this.maxPriceAvailable = 10000,
  });

  @override
  State<EventFilterBottomSheet> createState() => _EventFilterBottomSheetState();
}

class _EventFilterBottomSheetState extends State<EventFilterBottomSheet> {
  late EventFilterModel _tempFilter;
  RangeValues? _priceRange;

  @override
  void initState() {
    super.initState();
    _tempFilter = widget.currentFilter;
    if (_tempFilter.minPrice != null || _tempFilter.maxPrice != null) {
      final minP = _tempFilter.minPrice ?? 0;
      final maxP = _tempFilter.maxPrice ?? (widget.maxPriceAvailable > 0 ? widget.maxPriceAvailable : 10000);
      _priceRange = RangeValues(minP, maxP);
    }
  }

  void _resetFilters() {
    setState(() {
      _tempFilter = const EventFilterModel();
      _priceRange = null;
    });
  }

  Future<void> _selectCustomDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _tempFilter.customDate ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 2),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppTheme.primaryColor,
              onPrimary: Colors.white,
              onSurface: AppTheme.textColor,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _tempFilter = _tempFilter.copyWith(
          dateFilter: DateFilterType.custom,
          customDate: picked,
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final double maxSliderVal = widget.maxPriceAvailable > 0 ? widget.maxPriceAvailable : 10000;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle Bar
            const SizedBox(height: 10),
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Header Row
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 12, 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Filter Events',
                    style: GoogleFonts.poppins(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textColor,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 22),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            const Divider(height: 1),

            // Scrollable Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 1. SORT BY
                    _buildSectionHeader('Sort By'),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildChoiceChip<EventSortOption>(
                          label: 'Nearest Date',
                          value: EventSortOption.nearestDate,
                          groupValue: _tempFilter.sortBy,
                          onSelected: (val) => setState(() {
                            _tempFilter = _tempFilter.copyWith(sortBy: val);
                          }),
                        ),
                        _buildChoiceChip<EventSortOption>(
                          label: 'Price: Low to High',
                          value: EventSortOption.priceLowToHigh,
                          groupValue: _tempFilter.sortBy,
                          onSelected: (val) => setState(() {
                            _tempFilter = _tempFilter.copyWith(sortBy: val);
                          }),
                        ),
                        _buildChoiceChip<EventSortOption>(
                          label: 'Price: High to Low',
                          value: EventSortOption.priceHighToLow,
                          groupValue: _tempFilter.sortBy,
                          onSelected: (val) => setState(() {
                            _tempFilter = _tempFilter.copyWith(sortBy: val);
                          }),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // 2. DATE FILTER
                    _buildSectionHeader('Date'),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildChoiceChip<DateFilterType>(
                          label: 'All Dates',
                          value: DateFilterType.all,
                          groupValue: _tempFilter.dateFilter,
                          onSelected: (val) => setState(() {
                            _tempFilter = _tempFilter.copyWith(
                              dateFilter: val,
                              clearCustomDate: true,
                            );
                          }),
                        ),
                        _buildChoiceChip<DateFilterType>(
                          label: 'Today',
                          value: DateFilterType.today,
                          groupValue: _tempFilter.dateFilter,
                          onSelected: (val) => setState(() {
                            _tempFilter = _tempFilter.copyWith(dateFilter: val);
                          }),
                        ),
                        _buildChoiceChip<DateFilterType>(
                          label: 'Tomorrow',
                          value: DateFilterType.tomorrow,
                          groupValue: _tempFilter.dateFilter,
                          onSelected: (val) => setState(() {
                            _tempFilter = _tempFilter.copyWith(dateFilter: val);
                          }),
                        ),
                        _buildChoiceChip<DateFilterType>(
                          label: 'This Week',
                          value: DateFilterType.thisWeek,
                          groupValue: _tempFilter.dateFilter,
                          onSelected: (val) => setState(() {
                            _tempFilter = _tempFilter.copyWith(dateFilter: val);
                          }),
                        ),
                        _buildChoiceChip<DateFilterType>(
                          label: 'This Weekend',
                          value: DateFilterType.thisWeekend,
                          groupValue: _tempFilter.dateFilter,
                          onSelected: (val) => setState(() {
                            _tempFilter = _tempFilter.copyWith(dateFilter: val);
                          }),
                        ),
                        ChoiceChip(
                          label: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.calendar_today_rounded, size: 13),
                              const SizedBox(width: 4),
                              Text(
                                _tempFilter.customDate != null
                                    ? '${_tempFilter.customDate!.day}/${_tempFilter.customDate!.month}/${_tempFilter.customDate!.year}'
                                    : 'Custom Date',
                              ),
                            ],
                          ),
                          selected: _tempFilter.dateFilter == DateFilterType.custom,
                          selectedColor: AppTheme.primaryColor,
                          labelStyle: TextStyle(
                            color: _tempFilter.dateFilter == DateFilterType.custom
                                ? Colors.white
                                : AppTheme.textColor,
                            fontSize: 12.5,
                            fontWeight: _tempFilter.dateFilter == DateFilterType.custom
                                ? FontWeight.w600
                                : FontWeight.w500,
                          ),
                          onSelected: (_) => _selectCustomDate(),
                        ),
                      ],
                    ),

                    const SizedBox(height: 20),

                    // 3. LOCATION FILTER
                    if (widget.availableLocations.isNotEmpty) ...[
                      _buildSectionHeader('Location'),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: widget.availableLocations.map((loc) {
                          final isSelected = (_tempFilter.selectedLocation == loc) ||
                              (loc == 'All Locations' && _tempFilter.selectedLocation == null);
                          return ChoiceChip(
                            label: Text(loc),
                            selected: isSelected,
                            selectedColor: AppTheme.primaryColor,
                            labelStyle: TextStyle(
                              color: isSelected ? Colors.white : AppTheme.textColor,
                              fontSize: 12.5,
                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                            ),
                            onSelected: (val) {
                              setState(() {
                                if (loc == 'All Locations' || !val) {
                                  _tempFilter = _tempFilter.copyWith(clearLocation: true);
                                } else {
                                  _tempFilter = _tempFilter.copyWith(selectedLocation: loc);
                                }
                              });
                            },
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // 4. PRICE FILTER
                    _buildSectionHeader('Price'),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildChoiceChip<PriceFilterType>(
                          label: 'All Prices',
                          value: PriceFilterType.all,
                          groupValue: _tempFilter.priceFilter,
                          onSelected: (val) => setState(() {
                            _tempFilter = _tempFilter.copyWith(priceFilter: val);
                          }),
                        ),
                        _buildChoiceChip<PriceFilterType>(
                          label: 'Free',
                          value: PriceFilterType.free,
                          groupValue: _tempFilter.priceFilter,
                          onSelected: (val) => setState(() {
                            _tempFilter = _tempFilter.copyWith(priceFilter: val);
                          }),
                        ),
                        _buildChoiceChip<PriceFilterType>(
                          label: 'Paid',
                          value: PriceFilterType.paid,
                          groupValue: _tempFilter.priceFilter,
                          onSelected: (val) => setState(() {
                            _tempFilter = _tempFilter.copyWith(priceFilter: val);
                          }),
                        ),
                      ],
                    ),

                    if (maxSliderVal > 0) ...[
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Price Range:',
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              color: AppTheme.subtitleColor,
                            ),
                          ),
                          Text(
                            _priceRange != null
                                ? '₹${_priceRange!.start.round()} - ₹${_priceRange!.end.round()}'
                                : 'Any Price',
                            style: GoogleFonts.poppins(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                        ],
                      ),
                      RangeSlider(
                        values: _priceRange ?? RangeValues(0, maxSliderVal),
                        min: 0,
                        max: maxSliderVal,
                        activeColor: AppTheme.primaryColor,
                        inactiveColor: Colors.grey.shade200,
                        onChanged: (values) {
                          setState(() {
                            _priceRange = values;
                            _tempFilter = _tempFilter.copyWith(
                              minPrice: values.start > 0 ? values.start : null,
                              clearMinPrice: values.start <= 0,
                              maxPrice: values.end < maxSliderVal ? values.end : null,
                              clearMaxPrice: values.end >= maxSliderVal,
                            );
                          });
                        },
                      ),
                    ],

                    const SizedBox(height: 20),

                    // 5. TIME OF DAY FILTER
                    _buildSectionHeader('Time of Day'),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildChoiceChip<TimeFilterType>(
                          label: 'Any Time',
                          value: TimeFilterType.all,
                          groupValue: _tempFilter.timeFilter,
                          onSelected: (val) => setState(() {
                            _tempFilter = _tempFilter.copyWith(timeFilter: val);
                          }),
                        ),
                        _buildChoiceChip<TimeFilterType>(
                          label: 'Morning (<12 PM)',
                          value: TimeFilterType.morning,
                          groupValue: _tempFilter.timeFilter,
                          onSelected: (val) => setState(() {
                            _tempFilter = _tempFilter.copyWith(timeFilter: val);
                          }),
                        ),
                        _buildChoiceChip<TimeFilterType>(
                          label: 'Afternoon (12-5 PM)',
                          value: TimeFilterType.afternoon,
                          groupValue: _tempFilter.timeFilter,
                          onSelected: (val) => setState(() {
                            _tempFilter = _tempFilter.copyWith(timeFilter: val);
                          }),
                        ),
                        _buildChoiceChip<TimeFilterType>(
                          label: 'Evening (5+ PM)',
                          value: TimeFilterType.evening,
                          groupValue: _tempFilter.timeFilter,
                          onSelected: (val) => setState(() {
                            _tempFilter = _tempFilter.copyWith(timeFilter: val);
                          }),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const Divider(height: 1),

            // Bottom Actions Bar
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  // Reset Button
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _resetFilters,
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        side: BorderSide(color: Colors.grey.shade300),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        'Reset',
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textColor,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Show Results Button
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context, _tempFilter),
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        backgroundColor: AppTheme.primaryColor,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        'Show Results',
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: GoogleFonts.poppins(
        fontSize: 14,
        fontWeight: FontWeight.bold,
        color: AppTheme.textColor,
      ),
    );
  }

  Widget _buildChoiceChip<T>({
    required String label,
    required T value,
    required T groupValue,
    required ValueChanged<T> onSelected,
  }) {
    final isSelected = value == groupValue;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: AppTheme.primaryColor,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : AppTheme.textColor,
        fontSize: 12.5,
        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
      ),
      onSelected: (_) => onSelected(value),
    );
  }
}
