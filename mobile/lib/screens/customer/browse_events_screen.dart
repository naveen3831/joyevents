import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/app_theme.dart';
import '../../models/event_filter_model.dart';
import '../../models/event_model.dart';
import '../../services/event_service.dart';
import '../../widgets/customer_app_bar.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_view.dart';
import '../../widgets/event_card.dart';
import '../../widgets/event_filter_bottom_sheet.dart';
import '../../widgets/loading_view.dart';

class BrowseEventsScreen extends StatefulWidget {
  const BrowseEventsScreen({super.key});

  @override
  State<BrowseEventsScreen> createState() => _BrowseEventsScreenState();
}

class _BrowseEventsScreenState extends State<BrowseEventsScreen> {
  final EventService _eventService = EventService();
  final _searchController = TextEditingController();

  List<EventModel> _allEvents = [];
  List<EventModel> _filteredEvents = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _selectedCategory = 'All';
  EventFilterModel _currentFilter = const EventFilterModel();

  final List<String> _categories = [
    'All',
    'Music',
    'Wedding',
    'Corporate',
    'Birthday',
    'Catering',
    'Festival',
  ];

  @override
  void initState() {
    super.initState();
    _fetchEvents();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchEvents() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Fetch complete events collection so multi-faceted local filtering works seamlessly
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

  void _applyFilters() {
    setState(() {
      _filteredEvents = _currentFilter.applyTo(
        _allEvents,
        searchQuery: _searchController.text,
        category: _selectedCategory,
      );
    });
  }

  void _resetAllFilters() {
    setState(() {
      _searchController.clear();
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
    return Scaffold(
      appBar: const CustomerAppBar(title: 'Browse Events'),
      body: Column(
        children: [
          // 1. Prominent Search Bar with Filter/Tune Icon
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Container(
              height: 50,
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300, width: 1),
              ),
              child: TextField(
                controller: _searchController,
                onChanged: (_) => _applyFilters(),
                onSubmitted: (_) => _applyFilters(),
                textAlignVertical: TextAlignVertical.center,
                style: const TextStyle(fontSize: 14, color: AppTheme.textColor),
                decoration: InputDecoration(
                  border: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  hintText: 'Search events by name, location...',
                  hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade500),
                  prefixIcon: const Icon(
                    Icons.search_rounded,
                    color: AppTheme.primaryColor,
                    size: 22,
                  ),
                  suffixIcon: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (_searchController.text.isNotEmpty)
                        IconButton(
                          icon: const Icon(Icons.clear_rounded, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            _applyFilters();
                          },
                        ),
                      Stack(
                        alignment: Alignment.topRight,
                        children: [
                          IconButton(
                            icon: Icon(
                              Icons.tune_rounded,
                              size: 22,
                              color: _currentFilter.hasActiveFilters
                                  ? AppTheme.primaryColor
                                  : AppTheme.subtitleColor,
                            ),
                            onPressed: _openFilterBottomSheet,
                          ),
                          if (_currentFilter.hasActiveFilters)
                            Positioned(
                              right: 6,
                              top: 6,
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: const BoxDecoration(
                                  color: AppTheme.primaryColor,
                                  shape: BoxShape.circle,
                                ),
                                constraints: const BoxConstraints(
                                  minWidth: 16,
                                  minHeight: 16,
                                ),
                                child: Text(
                                  '${_currentFilter.activeFilterCount}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // 2. Horizontal Category Filters
          SizedBox(
            height: 38,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _categories.length,
              separatorBuilder: (_, index) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final cat = _categories[index];
                final isSelected = _selectedCategory == cat;
                return InkWell(
                  onTap: () {
                    if (_selectedCategory != cat) {
                      setState(() {
                        _selectedCategory = cat;
                      });
                      _applyFilters();
                    }
                  },
                  borderRadius: BorderRadius.circular(20),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? AppTheme.primaryColor : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected ? AppTheme.primaryColor : Colors.grey.shade300,
                        width: 1,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        cat,
                        style: TextStyle(
                          color: isSelected ? Colors.white : AppTheme.textColor,
                          fontSize: 13,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // 3. Active Removable Filter Chips (if any filters active)
          if (_currentFilter.hasActiveFilters) ...[
            const SizedBox(height: 8),
            SizedBox(
              height: 32,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
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
                  // Clear All Chip
                  ActionChip(
                    label: const Text('Clear All', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
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

          const SizedBox(height: 8),

          // 4. Event Grid Area
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
                              message: 'Try changing your search or filters.',
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
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
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
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.primaryColor),
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
