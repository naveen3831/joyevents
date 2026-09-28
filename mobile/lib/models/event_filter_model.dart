import 'event_model.dart';

enum DateFilterType { all, today, tomorrow, thisWeek, thisWeekend, custom }
enum PriceFilterType { all, free, paid }
enum TimeFilterType { all, morning, afternoon, evening }
enum EventSortOption { nearestDate, priceLowToHigh, priceHighToLow }

class EventFilterModel {
  final DateFilterType dateFilter;
  final DateTime? customDate;
  final String? selectedLocation;
  final PriceFilterType priceFilter;
  final double? minPrice;
  final double? maxPrice;
  final TimeFilterType timeFilter;
  final EventSortOption sortBy;

  const EventFilterModel({
    this.dateFilter = DateFilterType.all,
    this.customDate,
    this.selectedLocation,
    this.priceFilter = PriceFilterType.all,
    this.minPrice,
    this.maxPrice,
    this.timeFilter = TimeFilterType.all,
    this.sortBy = EventSortOption.nearestDate,
  });

  EventFilterModel copyWith({
    DateFilterType? dateFilter,
    DateTime? customDate,
    bool clearCustomDate = false,
    String? selectedLocation,
    bool clearLocation = false,
    PriceFilterType? priceFilter,
    double? minPrice,
    bool clearMinPrice = false,
    double? maxPrice,
    bool clearMaxPrice = false,
    TimeFilterType? timeFilter,
    EventSortOption? sortBy,
  }) {
    return EventFilterModel(
      dateFilter: dateFilter ?? this.dateFilter,
      customDate: clearCustomDate ? null : (customDate ?? this.customDate),
      selectedLocation: clearLocation ? null : (selectedLocation ?? this.selectedLocation),
      priceFilter: priceFilter ?? this.priceFilter,
      minPrice: clearMinPrice ? null : (minPrice ?? this.minPrice),
      maxPrice: clearMaxPrice ? null : (maxPrice ?? this.maxPrice),
      timeFilter: timeFilter ?? this.timeFilter,
      sortBy: sortBy ?? this.sortBy,
    );
  }

  int get activeFilterCount {
    int count = 0;
    if (dateFilter != DateFilterType.all) {
      count++;
    }
    if (selectedLocation != null &&
        selectedLocation!.isNotEmpty &&
        selectedLocation != 'All Locations') {
      count++;
    }
    if (priceFilter != PriceFilterType.all) {
      count++;
    }
    if (minPrice != null || maxPrice != null) {
      count++;
    }
    if (timeFilter != TimeFilterType.all) {
      count++;
    }
    if (sortBy != EventSortOption.nearestDate) {
      count++;
    }
    return count;
  }

  bool get hasActiveFilters => activeFilterCount > 0;

  /// Helper method to filter and sort event list
  List<EventModel> applyTo(
    List<EventModel> allEvents, {
    String searchQuery = '',
    String category = 'All',
  }) {
    List<EventModel> result = List.from(allEvents);

    // 1. Search Query Filter
    if (searchQuery.trim().isNotEmpty) {
      final q = searchQuery.trim().toLowerCase();
      result = result.where((e) {
        return e.title.toLowerCase().contains(q) ||
            e.description.toLowerCase().contains(q) ||
            e.location.toLowerCase().contains(q) ||
            e.category.toLowerCase().contains(q) ||
            (e.createdByName != null && e.createdByName!.toLowerCase().contains(q));
      }).toList();
    }

    // 2. Category Filter
    if (category.isNotEmpty && category.toLowerCase() != 'all') {
      result = result
          .where((e) => e.category.toLowerCase() == category.toLowerCase())
          .toList();
    }

    // 3. Location Filter
    if (selectedLocation != null &&
        selectedLocation!.isNotEmpty &&
        selectedLocation != 'All Locations') {
      final loc = selectedLocation!.toLowerCase();
      result = result.where((e) => e.location.toLowerCase().contains(loc)).toList();
    }

    // 4. Date Filter
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final todayEnd = DateTime(now.year, now.month, now.day, 23, 59, 59);

    if (dateFilter != DateFilterType.all) {
      result = result.where((e) {
        final eDt = _parseEventDateTime(e);
        if (eDt == null) return false;

        switch (dateFilter) {
          case DateFilterType.today:
            return eDt.isAfter(todayStart.subtract(const Duration(seconds: 1))) &&
                eDt.isBefore(todayEnd);
          case DateFilterType.tomorrow:
            final tomStart = todayStart.add(const Duration(days: 1));
            final tomEnd = todayEnd.add(const Duration(days: 1));
            return eDt.isAfter(tomStart.subtract(const Duration(seconds: 1))) &&
                eDt.isBefore(tomEnd);
          case DateFilterType.thisWeek:
            final weekday = now.weekday; // 1 = Mon, 7 = Sun
            final weekStart = todayStart.subtract(Duration(days: weekday - 1));
            final weekEnd = todayEnd.add(Duration(days: 7 - weekday));
            return eDt.isAfter(weekStart.subtract(const Duration(seconds: 1))) &&
                eDt.isBefore(weekEnd);
          case DateFilterType.thisWeekend:
            final weekday = now.weekday;
            final saturdayStart = todayStart.add(Duration(days: 6 - weekday));
            final sundayEnd = todayEnd.add(Duration(days: 7 - weekday));
            return eDt.isAfter(saturdayStart.subtract(const Duration(seconds: 1))) &&
                eDt.isBefore(sundayEnd);
          case DateFilterType.custom:
            if (customDate == null) return true;
            return eDt.year == customDate!.year &&
                eDt.month == customDate!.month &&
                eDt.day == customDate!.day;
          case DateFilterType.all:
            return true;
        }
      }).toList();
    }

    // 5. Price Filter
    if (priceFilter == PriceFilterType.free) {
      result = result.where((e) => e.price == 0).toList();
    } else if (priceFilter == PriceFilterType.paid) {
      result = result.where((e) => e.price > 0).toList();
    }

    if (minPrice != null) {
      result = result.where((e) => e.price >= minPrice!).toList();
    }
    if (maxPrice != null) {
      result = result.where((e) => e.price <= maxPrice!).toList();
    }

    // 6. Time Filter
    if (timeFilter != TimeFilterType.all) {
      result = result.where((e) {
        final hour = _parseEventHour(e);
        if (hour == null) return true;
        switch (timeFilter) {
          case TimeFilterType.morning:
            return hour < 12;
          case TimeFilterType.afternoon:
            return hour >= 12 && hour < 17;
          case TimeFilterType.evening:
            return hour >= 17;
          case TimeFilterType.all:
            return true;
        }
      }).toList();
    }

    // 7. Sort Option
    switch (sortBy) {
      case EventSortOption.nearestDate:
        result.sort((a, b) {
          final dtA = _parseEventDateTime(a);
          final dtB = _parseEventDateTime(b);

          if (dtA != null && dtB != null) {
            final isPastA = dtA.isBefore(todayStart);
            final isPastB = dtB.isBefore(todayStart);

            if (!isPastA && isPastB) return -1;
            if (isPastA && !isPastB) return 1;

            if (!isPastA && !isPastB) {
              return dtA.compareTo(dtB); // Upcoming: nearest first
            } else {
              return dtB.compareTo(dtA); // Past: most recent first
            }
          } else if (dtA != null) {
            return -1;
          } else if (dtB != null) {
            return 1;
          }
          return 0;
        });
        break;

      case EventSortOption.priceLowToHigh:
        result.sort((a, b) => a.price.compareTo(b.price));
        break;

      case EventSortOption.priceHighToLow:
        result.sort((a, b) => b.price.compareTo(a.price));
        break;
    }

    return result;
  }

  static DateTime? _parseEventDateTime(EventModel e) {
    if (e.date.isEmpty || e.date.toLowerCase() == 'null' || e.date.toLowerCase() == 'n/a') {
      return null;
    }
    try {
      if (e.date.contains('T')) {
        return DateTime.parse(e.date);
      }
      final parts = e.date.split('-');
      if (parts.length == 3) {
        final y = int.tryParse(parts[0]);
        final m = int.tryParse(parts[1]);
        final d = int.tryParse(parts[2]);
        if (y != null && m != null && d != null) {
          return DateTime(y, m, d);
        }
      }
      return DateTime.tryParse(e.date);
    } catch (_) {
      return null;
    }
  }

  static int? _parseEventHour(EventModel e) {
    final t = e.time.trim();
    if (t.isEmpty) return null;

    final match12 = RegExp(r'^(\d{1,2}):(\d{2})\s*(AM|PM)$', caseSensitive: false).firstMatch(t);
    if (match12 != null) {
      int hour = int.parse(match12.group(1)!);
      final ampm = match12.group(3)!.toUpperCase();
      if (ampm == 'PM' && hour < 12) hour += 12;
      if (ampm == 'AM' && hour == 12) hour = 0;
      return hour;
    }

    final match24 = RegExp(r'^(\d{1,2}):(\d{2})$').firstMatch(t);
    if (match24 != null) {
      return int.parse(match24.group(1)!);
    }

    return null;
  }
}
