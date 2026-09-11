class TicketTier {
  final String type;
  final double price;
  final int available;
  final int sold;

  TicketTier({
    required this.type,
    required this.price,
    required this.available,
    required this.sold,
  });

  factory TicketTier.fromJson(Map<String, dynamic> json) {
    return TicketTier(
      type: json['type']?.toString() ?? 'Standard',
      price: (json['price'] is num)
          ? (json['price'] as num).toDouble()
          : double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      available: (json['available'] is num)
          ? (json['available'] as num).toInt()
          : int.tryParse(json['available']?.toString() ?? '100') ?? 100,
      sold: (json['sold'] is num)
          ? (json['sold'] as num).toInt()
          : int.tryParse(json['sold']?.toString() ?? '0') ?? 0,
    );
  }

  int get remaining => available - sold;
}

class EventModel {
  final String id;
  final String title;
  final String description;
  final String category;
  final String eventType; // 'ticketed' or 'fullService'
  final String date;
  final String time;
  final String location;
  final double price;
  final List<String> images;
  final List<TicketTier> tickets;
  final int attendeesCount;
  final int maxAttendees;
  final String? createdByName;
  final String? createdById;
  final double averageRating;
  final int ratingCount;
  final String status;
  final bool isFeatured;

  EventModel({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.eventType,
    required this.date,
    required this.time,
    required this.location,
    required this.price,
    required this.images,
    required this.tickets,
    required this.attendeesCount,
    required this.maxAttendees,
    this.createdByName,
    this.createdById,
    this.averageRating = 0.0,
    this.ratingCount = 0,
    this.status = 'upcoming',
    this.isFeatured = false,
  });

  factory EventModel.fromJson(Map<String, dynamic> json) {
    // Debug logging for date/time field mapping
    assert(() {
      // ignore: avoid_print
      print('Event date debug: id=${json['_id'] ?? json['id']}, startDate=${json['startDate']}, startTime=${json['startTime']}, date=${json['date']}, time=${json['time']}, datetime=${json['datetime']}');
      return true;
    }());

    List<String> parsedImages = [];
    if (json['images'] is List) {
      parsedImages = (json['images'] as List)
          .map((e) => e.toString())
          .where((e) => e.isNotEmpty)
          .toList();
    } else if (json['image'] != null && json['image'].toString().isNotEmpty) {
      parsedImages = [json['image'].toString()];
    }

    List<TicketTier> parsedTickets = [];
    if (json['tickets'] is List) {
      parsedTickets = (json['tickets'] as List)
          .map((e) => TicketTier.fromJson(e as Map<String, dynamic>))
          .toList();
    }

    // Date parsing fallback (startDate -> date -> datetime)
    String rawDate = json['startDate']?.toString() ?? json['date']?.toString() ?? '';
    if (rawDate.isEmpty && json['datetime'] != null) {
      rawDate = json['datetime'].toString();
    }

    // Time parsing fallback (startTime -> time -> datetime)
    String rawTime = json['startTime']?.toString() ?? json['time']?.toString() ?? '';
    if (rawTime.isEmpty && json['datetime'] != null) {
      final dtStr = json['datetime'].toString();
      if (dtStr.contains('T')) {
        try {
          final parsedDt = DateTime.tryParse(dtStr);
          if (parsedDt != null) {
            final hour = parsedDt.hour;
            final minute = parsedDt.minute.toString().padLeft(2, '0');
            final ampm = hour >= 12 ? 'PM' : 'AM';
            final hour12 = (hour % 12 == 0) ? 12 : hour % 12;
            rawTime = '$hour12:$minute $ampm';
          }
        } catch (_) {}
      }
    }

    String? cName;
    String? cId;
    if (json['createdBy'] is Map) {
      cName = json['createdBy']['name']?.toString();
      cId = json['createdBy']['_id']?.toString();
    } else if (json['createdBy'] != null) {
      cId = json['createdBy'].toString();
    }

    return EventModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? json['eventName']?.toString() ?? 'Event',
      description: json['description']?.toString() ?? '',
      category: json['category']?.toString() ?? 'General',
      eventType: json['eventType']?.toString() ?? 'ticketed',
      date: rawDate,
      time: rawTime,
      location: json['location']?.toString() ?? json['venue']?.toString() ?? '',
      price: (json['price'] is num)
          ? (json['price'] as num).toDouble()
          : double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      images: parsedImages,
      tickets: parsedTickets,
      attendeesCount: (json['attendeesCount'] is num)
          ? (json['attendeesCount'] as num).toInt()
          : 0,
      maxAttendees: (json['maxAttendees'] is num)
          ? (json['maxAttendees'] as num).toInt()
          : 100,
      createdByName: cName,
      createdById: cId,
      averageRating: (json['averageRating'] is num)
          ? (json['averageRating'] as num).toDouble()
          : 0.0,
      ratingCount: (json['ratingCount'] is num)
          ? (json['ratingCount'] as num).toInt()
          : 0,
      status: json['status']?.toString() ?? 'upcoming',
      isFeatured: json['isFeatured'] == true,
    );
  }
  bool get isTicketed => eventType == 'ticketed';

  String get mainImage => images.isNotEmpty ? images.first : '';


  String get formattedDate {
    if (date.isEmpty) return '';
    String ymd = date;
    if (ymd.contains('T')) {
      ymd = ymd.split('T').first;
    }
    if (RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(ymd)) {
      try {
        final parts = ymd.split('-');
        final year = parts[0];
        final monthInt = int.parse(parts[1]);
        final day = int.parse(parts[2]).toString();
        const months = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        if (monthInt >= 1 && monthInt <= 12) {
          return '$day ${months[monthInt - 1]} $year';
        }
      } catch (_) {}
    }
    return date;
  }

  String get formattedTime {
    if (time.isEmpty) return '';
    final trimmed = time.trim();
    if (RegExp(r'^\d{1,2}:\d{2}$').hasMatch(trimmed)) {
      try {
        final parts = trimmed.split(':');
        final hour = int.parse(parts[0]);
        final minute = parts[1];
        final ampm = hour >= 12 ? 'PM' : 'AM';
        final hour12 = (hour % 12 == 0) ? 12 : hour % 12;
        return '$hour12:$minute $ampm';
      } catch (_) {}
    }
    return time;
  }

  String get formattedSchedule {
    final d = formattedDate;
    final t = formattedTime;
    if (d.isNotEmpty && t.isNotEmpty) {
      return '$d at $t';
    }
    if (d.isNotEmpty) return d;
    if (t.isNotEmpty) return t;
    return 'Schedule TBD';
  }
}

