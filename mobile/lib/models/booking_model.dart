class RatingInfo {
  final double score;
  final String? comment;

  RatingInfo({required this.score, this.comment});

  factory RatingInfo.fromJson(Map<String, dynamic> json) {
    return RatingInfo(
      score: (json['score'] is num)
          ? (json['score'] as num).toDouble()
          : double.tryParse(json['score']?.toString() ?? '0') ?? 0.0,
      comment: json['comment']?.toString(),
    );
  }
}

class BookingModel {
  final String id;
  final String title;
  final String? eventId;
  final String? serviceId;
  final bool isEvent;
  final double price;
  final String status;
  final String paymentStatus;
  final String paymentMethod;
  final String? ticketId;
  final String date;
  final String time;
  final String? ticketType;
  final int quantity;
  final String? merchantName;
  final String? customerLocation;
  final RatingInfo? rating;
  final String? createdAt;

  BookingModel({
    required this.id,
    required this.title,
    this.eventId,
    this.serviceId,
    required this.isEvent,
    required this.price,
    required this.status,
    required this.paymentStatus,
    required this.paymentMethod,
    this.ticketId,
    required this.date,
    required this.time,
    this.ticketType,
    this.quantity = 1,
    this.merchantName,
    this.customerLocation,
    this.rating,
    this.createdAt,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) {
    final eName = json['eventName']?.toString();
    final sName = json['serviceName']?.toString();
    final title = (eName != null && eName.isNotEmpty)
        ? eName
        : (sName != null && sName.isNotEmpty)
            ? sName
            : 'Booking';

    String? mName;
    if (json['assignedTo'] is Map) {
      mName = json['assignedTo']['name']?.toString();
    } else if (json['merchant'] is Map) {
      mName = json['merchant']['name']?.toString();
    }

    String? eId;
    if (json['event'] is Map) {
      eId = json['event']['_id']?.toString();
    } else if (json['event'] != null) {
      eId = json['event'].toString();
    } else if (json['eventId'] != null) {
      eId = json['eventId'].toString();
    }

    String? sId;
    if (json['service'] is Map) {
      sId = json['service']['_id']?.toString();
    } else if (json['service'] != null) {
      sId = json['service'].toString();
    } else if (json['serviceId'] != null) {
      sId = json['serviceId'].toString();
    }

    RatingInfo? ratingObj;
    if (json['rating'] is Map && json['rating']['score'] != null) {
      ratingObj = RatingInfo.fromJson(json['rating'] as Map<String, dynamic>);
    }

    return BookingModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: title,
      eventId: eId,
      serviceId: sId,
      isEvent: eId != null || (eName != null && eName.isNotEmpty),
      price: (json['price'] is num)
          ? (json['price'] as num).toDouble()
          : double.tryParse(json['price']?.toString() ?? '0') ?? 0.0,
      status: json['status']?.toString() ?? 'confirmed',
      paymentStatus: json['paymentStatus']?.toString() ?? 'paid',
      paymentMethod: json['paymentMethod']?.toString() ?? 'card',
      ticketId: json['ticketId']?.toString(),
      date: json['date']?.toString() ?? '',
      time: json['time']?.toString() ?? '',
      ticketType: json['ticketType']?.toString(),
      quantity: (json['quantity'] is num)
          ? (json['quantity'] as num).toInt()
          : int.tryParse(json['quantity']?.toString() ?? '1') ?? 1,
      merchantName: mName,
      customerLocation: json['customerLocation']?.toString(),
      rating: ratingObj,
      createdAt: json['createdAt']?.toString(),
    );
  }

  bool get isConfirmed => status == 'confirmed';
  bool get isPending => status == 'pending_approval' || status == 'awaiting_payment';
  bool get isCompleted => status == 'completed';
  bool get isCancelled => status == 'cancelled' || status == 'rejected';
}
