import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/app_theme.dart';
import '../../models/event_filter_model.dart';
import '../../models/event_model.dart';
import '../../services/event_service.dart';
import '../../services/merchant_service.dart';
import '../../widgets/customer_gradient_header.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_view.dart';
import '../../widgets/event_card.dart';
import '../../widgets/category_image_card.dart';
import '../../widgets/event_filter_bottom_sheet.dart';
import '../../widgets/loading_view.dart';

/// Redesigned Customer "Browse Events" screen in JoyEvents.
/// Features an extended top hero gradient header, image-based category card carousel,
/// precise category filtering, and a clean 2-column event grid (without search bar).
class BrowseEventsScreen extends StatefulWidget {
  const BrowseEventsScreen({super.key});

  @override
  State<BrowseEventsScreen> createState() => _BrowseEventsScreenState();
}

class _BrowseEventsScreenState extends State<BrowseEventsScreen> {
  final EventService _eventService = EventService();

  List<EventModel> _allEvents = [];
  List<EventModel> _filteredEvents = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _selectedCategory = 'All';
  EventFilterModel _currentFilter = const EventFilterModel();

  List<Map<String, dynamic>> _categoriesList = [
    {'name': 'All'},
    {'name': 'Music'},
    {'name': 'Wedding'},
    {'name': 'Corporate'},
    {'name': 'Birthday'},
    {'name': 'Sports'},
    {'name': 'Cricket'},
    {'name': 'Catering'},
    {'name': 'Festival'},
    {'name': 'Photography'},
  ];

  @override
  void initState() {
    super.initState();
    _fetchCategories();
    _fetchEvents();
  }

  Future<void> _fetchCategories() async {
    try {
      final rawCats = await MerchantService().getCategories(type: 'event');
      if (rawCats.isNotEmpty && mounted) {
        final List<Map<String, dynamic>> loaded = [
          {'name': 'All'}
        ];
        for (var c in rawCats) {
          if (c is Map && c.containsKey('name')) {
            final name = c['name'].toString();
            if (name.toLowerCase() != 'all') {
              loaded.add({
                'name': name,
                'imageUrl': c['imageUrl']?.toString(),
              });
            }
          }
        }
        setState(() {
          _categoriesList = loaded;
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchEvents() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await _eventService.getEvents();
      if (mounted) {
        setState(() {
          _allEvents = list;
          _applyFilters();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  /// Combine categories from _categoriesList (default + API-loaded) with any
  /// additional categories present in loaded events.
  List<String> get _dynamicCategories {
    // Seed from the existing _categoriesList field which already holds
    // the curated default list and any categories fetched from the backend.
    final categoriesSet = <String>{
      for (final item in _categoriesList) item['name'] as String,
    };
    for (final event in _allEvents) {
      if (event.category.trim().isNotEmpty) {
        // Find existing category matching case-insensitively or add formatted category
        final match = categoriesSet.firstWhere(
          (c) => c.trim().toLowerCase() == event.category.trim().toLowerCase(),
          orElse: () => '',
        );
        if (match.isEmpty) {
          categoriesSet.add(event.category.trim());
        }
      }
    }
    return categoriesSet.toList();
  }

  void _applyFilters() {
    setState(() {
      _filteredEvents = _currentFilter.applyTo(
        _allEvents,
        searchQuery: '', // Search removed
        category: _selectedCategory,
      );
    });
  }

  void _resetAllFilters() {
    setState(() {
      _selectedCategory = 'All';
      _currentFilter = const EventFilterModel();
      _applyFilters();
    });
  }

  List<String> _extractAvailableLocations() {
    final Set<String> locs = {'All Locations'};
    for (final e in _allEvents) {
      final loc = e.location.trim();
      if (loc.isNotEmpty && loc.toLowerCase() != 'null' && loc.toLowerCase() != 'n/a') {
        final parts = loc.split(',');
        final cityName = parts[0].trim();
        if (cityName.isNotEmpty) {
          locs.add(cityName);
        }
      }
    }
    return locs.toList();
  }

  double _extractMaxPrice() {
    double maxP = 0;
    for (final e in _allEvents) {
      if (e.price > maxP) maxP = e.price;
    }
    return maxP;
  }

  void _openFilterBottomSheet() async {
    final result = await showModalBottomSheet<EventFilterModel>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => EventFilterBottomSheet(
        currentFilter: _currentFilter,
        availableLocations: _extractAvailableLocations(),
        maxPriceAvailable: _extractMaxPrice(),
      ),
    );

    if (result != null) {
      setState(() {
        _currentFilter = result;
      });
      _applyFilters();
    }
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;
    // _dynamicCategories merges _categoriesList names with event-derived categories.
    // The carousel below uses _categoriesList directly (with imageUrl).
    // ignore: unused_local_variable
    final unusedDyn = _dynamicCategories;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ═══════════════════════════════════════════
          // 1. EXTENDED TOP HERO GRADIENT HEADER
          // ═══════════════════════════════════════════
          CustomerGradientHeader(
            title: 'Browse Events',
            subtitle: 'Discover & filter exciting events near you',
            borderRadius: 28.0,
            padding: EdgeInsets.only(
              top: topPadding + 14,
              left: 20,
              right: 12,
              bottom: 24,
            ),
          ),

          const SizedBox(height: 18),

          // ═══════════════════════════════════════════
          // 2. CATEGORIES HEADER & CAROUSEL
          // ═══════════════════════════════════════════
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Categories',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textColor,
                    letterSpacing: -0.2,
                  ),
                ),
                if (_currentFilter.hasActiveFilters || _selectedCategory != 'All')
                  InkWell(
                    onTap: _resetAllFilters,
                    borderRadius: BorderRadius.circular(12),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: Text(
                        'Reset Filters',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Image-based Horizontal Category Cards Carousel
          SizedBox(
            height: 104,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: _categoriesList.length,
              itemBuilder: (context, index) {
                final item = _categoriesList[index];
                final cat = item['name'] as String;
                final imageUrl = item['imageUrl'] as String?;
                final isSelected = _selectedCategory.toLowerCase() == cat.toLowerCase();
                return CategoryImageCard(
                  title: cat,
                  imageUrl: imageUrl,
                  isSelected: isSelected,
                  width: 110,
                  height: 100,
                  allLabel: 'All Events',
                  onTap: () {
                    if (!isSelected) {
                      setState(() {
                        _selectedCategory = cat;
                      });
                      _applyFilters();
                    }
                  },
                );
              },
            ),
          ),

          // ═══════════════════════════════════════════
          // 3. ACTIVE REMOVABLE FILTER CHIPS (IF ANY)
          // ═══════════════════════════════════════════
          if (_currentFilter.hasActiveFilters) ...[
            const SizedBox(height: 10),
            SizedBox(
              height: 32,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: [
                  if (_currentFilter.dateFilter != DateFilterType.all)
                    _buildActiveChip(
                      label: _getDateChipLabel(_currentFilter),
                      onDeleted: () {
                        setState(() {
                          _currentFilter = _currentFilter.copyWith(
                            dateFilter: DateFilterType.all,
                            clearCustomDate: true,
                          );
                        });
                        _applyFilters();
                      },
                    ),
                  if (_currentFilter.selectedLocation != null &&
                      _currentFilter.selectedLocation!.isNotEmpty &&
                      _currentFilter.selectedLocation != 'All Locations')
                    _buildActiveChip(
                      label: 'Loc: ${_currentFilter.selectedLocation}',
                      onDeleted: () {
                        setState(() {
                          _currentFilter = _currentFilter.copyWith(clearLocation: true);
                        });
                        _applyFilters();
                      },
                    ),
                  if (_currentFilter.priceFilter != PriceFilterType.all)
                    _buildActiveChip(
                      label: _currentFilter.priceFilter == PriceFilterType.free ? 'Free' : 'Paid',
                      onDeleted: () {
                        setState(() {
                          _currentFilter = _currentFilter.copyWith(priceFilter: PriceFilterType.all);
                        });
                        _applyFilters();
                      },
                    ),
                  if (_currentFilter.minPrice != null || _currentFilter.maxPrice != null)
                    _buildActiveChip(
                      label: 'Price: ₹${_currentFilter.minPrice?.round() ?? 0} - ₹${_currentFilter.maxPrice?.round() ?? '+'}',
                      onDeleted: () {
                        setState(() {
                          _currentFilter = _currentFilter.copyWith(
                            clearMinPrice: true,
                            clearMaxPrice: true,
                          );
                        });
                        _applyFilters();
                      },
                    ),
                  if (_currentFilter.timeFilter != TimeFilterType.all)
                    _buildActiveChip(
                      label: _getTimeChipLabel(_currentFilter.timeFilter),
                      onDeleted: () {
                        setState(() {
                          _currentFilter = _currentFilter.copyWith(timeFilter: TimeFilterType.all);
                        });
                        _applyFilters();
                      },
                    ),
                  if (_currentFilter.sortBy != EventSortOption.nearestDate)
                    _buildActiveChip(
                      label: _getSortChipLabel(_currentFilter.sortBy),
                      onDeleted: () {
                        setState(() {
                          _currentFilter = _currentFilter.copyWith(sortBy: EventSortOption.nearestDate);
                        });
                        _applyFilters();
                      },
                    ),
                  ActionChip(
                    label: const Text(
                      'Clear All',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                    backgroundColor: AppTheme.tintVioletBg,
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    onPressed: () {
                      setState(() {
                        _currentFilter = const EventFilterModel();
                      });
                      _applyFilters();
                    },
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 12),

          // ═══════════════════════════════════════════
          // 4. EVENT GRID AREA
          // ═══════════════════════════════════════════
          Expanded(
            child: RefreshIndicator(
              onRefresh: _fetchEvents,
              child: _isLoading
                  ? const LoadingView(message: 'Loading events...')
                  : _errorMessage != null
                      ? ErrorView(message: _errorMessage!, onRetry: _fetchEvents)
                      : _filteredEvents.isEmpty
                          ? EmptyState(
                              title: 'No events found',
                              message: 'No events match the selected category or filters.',
                              icon: Icons.filter_alt_off_rounded,
                              action: ElevatedButton(
                                onPressed: _resetAllFilters,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primaryColor,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: const Text('Clear Filters'),
                              ),
                            )
                          : GridView.builder(
                              padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                                childAspectRatio: 0.60,
                              ),
                              itemCount: _filteredEvents.length,
                              itemBuilder: (context, index) {
                                final event = _filteredEvents[index];
                                return EventCard(
                                  event: event,
                                  onTap: () => context.push(
                                    '/customer/event-details/${event.id}',
                                    extra: event,
                                  ),
                                );
                              },
                            ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveChip({required String label, required VoidCallback onDeleted}) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: Chip(
        label: Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: AppTheme.primaryColor,
          ),
        ),
        backgroundColor: AppTheme.tintVioletBg,
        deleteIcon: const Icon(Icons.close_rounded, size: 14, color: AppTheme.primaryColor),
        onDeleted: onDeleted,
        padding: const EdgeInsets.symmetric(horizontal: 4),
        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
        visualDensity: VisualDensity.compact,
      ),
    );
  }

  String _getDateChipLabel(EventFilterModel filter) {
    switch (filter.dateFilter) {
      case DateFilterType.today:
        return 'Today';
      case DateFilterType.tomorrow:
        return 'Tomorrow';
      case DateFilterType.thisWeek:
        return 'This Week';
      case DateFilterType.thisWeekend:
        return 'This Weekend';
      case DateFilterType.custom:
        if (filter.customDate != null) {
          return 'Date: ${filter.customDate!.day}/${filter.customDate!.month}';
        }
        return 'Custom Date';
      case DateFilterType.all:
        return 'All Dates';
    }
  }

  String _getTimeChipLabel(TimeFilterType type) {
    switch (type) {
      case TimeFilterType.morning:
        return 'Morning';
      case TimeFilterType.afternoon:
        return 'Afternoon';
      case TimeFilterType.evening:
        return 'Evening';
      case TimeFilterType.all:
        return 'Any Time';
    }
  }

  String _getSortChipLabel(EventSortOption sort) {
    switch (sort) {
      case EventSortOption.nearestDate:
        return 'Nearest Date';
      case EventSortOption.priceLowToHigh:
        return 'Price: Low→High';
      case EventSortOption.priceHighToLow:
        return 'Price: High→Low';
    }
  }
}
