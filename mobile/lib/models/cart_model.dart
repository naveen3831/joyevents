class CartItem {
  final String id;
  final String title;
  final String type; // 'event' or 'service'
  final String? eventId;
  final String? serviceId;
  final double price;
  final String? image;
  final String date;
  final String time;
  final String? ticketType;
  int quantity;

  CartItem({
    required this.id,
    required this.title,
    required this.type,
    this.eventId,
    this.serviceId,
    required this.price,
    this.image,
    required this.date,
    required this.time,
    this.ticketType,
    this.quantity = 1,
  });

  double get totalPrice => price * quantity;
}
