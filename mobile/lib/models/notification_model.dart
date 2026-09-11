class NotificationModel {
  final String id;
  final String title;
  final String message;
  final String type;
  final String status;
  final String? actionUrl;
  final String? createdAt;

  NotificationModel({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.status,
    this.actionUrl,
    this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Notification',
      message: json['message']?.toString() ?? '',
      type: json['type']?.toString() ?? 'general',
      status: json['status']?.toString() ?? 'unread',
      actionUrl: json['actionUrl']?.toString(),
      createdAt: json['createdAt']?.toString(),
    );
  }

  bool get isUnread => status == 'unread';
}
