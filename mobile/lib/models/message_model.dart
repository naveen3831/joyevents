class ReplyModel {
  final String from; // 'merchant' or 'customer'
  final String text;
  final String? createdAt;

  ReplyModel({
    required this.from,
    required this.text,
    this.createdAt,
  });

  factory ReplyModel.fromJson(Map<String, dynamic> json) {
    return ReplyModel(
      from: json['from']?.toString() ?? 'merchant',
      text: json['text']?.toString() ?? '',
      createdAt: json['createdAt']?.toString(),
    );
  }

  bool get isFromMerchant => from == 'merchant';
}

class MessageModel {
  final String id;
  final String senderName;
  final String senderEmail;
  final String message;
  final String? merchantName;
  final String? merchantId;
  final String itemTitle;
  final List<ReplyModel> replies;
  final bool read;
  final String? createdAt;

  MessageModel({
    required this.id,
    required this.senderName,
    required this.senderEmail,
    required this.message,
    this.merchantName,
    this.merchantId,
    required this.itemTitle,
    required this.replies,
    required this.read,
    this.createdAt,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    List<ReplyModel> parsedReplies = [];
    if (json['replies'] is List) {
      parsedReplies = (json['replies'] as List)
          .map((r) => ReplyModel.fromJson(r as Map<String, dynamic>))
          .toList();
    }

    String? mName;
    String? mId;
    if (json['merchant'] is Map) {
      mName = json['merchant']['name']?.toString();
      mId = json['merchant']['_id']?.toString();
    } else if (json['merchant'] != null) {
      mId = json['merchant'].toString();
    }

    return MessageModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      senderName: json['senderName']?.toString() ?? 'Customer',
      senderEmail: json['senderEmail']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
      merchantName: mName,
      merchantId: mId,
      itemTitle: json['itemTitle']?.toString() ?? 'Enquiry',
      replies: parsedReplies,
      read: json['read'] == true,
      createdAt: json['createdAt']?.toString(),
    );
  }
}
