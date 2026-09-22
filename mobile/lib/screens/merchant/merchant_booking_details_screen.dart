import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../services/merchant_service.dart';
import '../../widgets/loading_view.dart';

class MerchantBookingDetailsScreen extends StatefulWidget {
  final String bookingId;
  final dynamic initialData;

  const MerchantBookingDetailsScreen({
    super.key,
    required this.bookingId,
    this.initialData,
  });

  @override
  State<MerchantBookingDetailsScreen> createState() => _MerchantBookingDetailsScreenState();
}

class _MerchantBookingDetailsScreenState extends State<MerchantBookingDetailsScreen> {
  final _merchantService = MerchantService();
  late Map<String, dynamic> _booking;
  bool _actionLoading = false;

  @override
  void initState() {
    super.initState();
    _booking = (widget.initialData is Map<String, dynamic>)
        ? widget.initialData as Map<String, dynamic>
        : {};
  }

  String get _status => _booking['status']?.toString() ?? 'pending';

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'accepted':
        return AppTheme.successColor;
      case 'pending':
        return AppTheme.warningColor;
      case 'awaiting payment':
        return AppTheme.tintBlueFg;
      case 'cancelled':
        return AppTheme.errorColor;
      case 'completed':
        return AppTheme.primaryColor;
      default:
        return AppTheme.subtitleColor;
    }
  }

  Future<void> _doAction(String action) async {
    setState(() => _actionLoading = true);
    try {
      final id = widget.bookingId;
      switch (action) {
        case 'approve':
          await _showApproveModal();
          break;
        case 'accept':
          await _merchantService.updateBookingStatus(id, 'accepted');
          setState(() => _booking = {..._booking, 'status': 'accepted'});
          break;
        case 'complete':
          await _merchantService.completeBooking(id);
          setState(() => _booking = {..._booking, 'status': 'completed'});
          break;
        case 'cancel':
          final confirm = await _showConfirmDialog(
              'Cancel Booking', 'Are you sure you want to cancel this booking?');
          if (confirm == true) {
            await _merchantService.updateBookingStatus(id, 'cancelled');
            setState(() => _booking = {..._booking, 'status': 'cancelled'});
          }
          break;
      }
      if (mounted && action != 'approve' && action != 'cancel') {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Booking ${action}d successfully'),
          backgroundColor: AppTheme.successColor,
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.errorColor),
        );
      }
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _showApproveModal() async {
    final advanceCtrl = TextEditingController(text: '30');
    final confirmDate = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Approve Booking',
                style: TextStyle(
                    fontSize: 18, fontWeight: FontWeight.w700, color: AppTheme.textColor)),
            const SizedBox(height: 4),
            const Text('Set advance payment percentage',
                style: TextStyle(fontSize: 13, color: AppTheme.subtitleColor)),
            const SizedBox(height: 20),
            TextField(
              controller: advanceCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Advance Percentage (%)',
                prefixIcon: Icon(Icons.percent),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context, {
                        'advancePercentage': int.tryParse(advanceCtrl.text.trim()) ?? 30,
                      });
                    },
                    child: const Text('Approve'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );

    if (confirmDate != null) {
      await _merchantService.approveBooking(widget.bookingId, confirmDate);
      setState(() => _booking = {..._booking, 'status': 'awaiting payment'});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Booking approved — awaiting customer payment'),
          backgroundColor: AppTheme.successColor,
        ));
      }
    }
  }

  Future<bool?> _showConfirmDialog(String title, String message) {
    return showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final customer = _booking['customer'] as Map<String, dynamic>? ?? {};
    final customerName = customer['name']?.toString() ?? 'Customer';
    final customerEmail = customer['email']?.toString() ?? '';
    final itemTitle = _booking['eventTitle']?.toString() ??
        _booking['serviceTitle']?.toString() ??
        'Item';
    final total = (_booking['price'] as num?)?.toDouble() ?? 0.0;
    final paymentMethod = _booking['paymentMethod']?.toString() ?? '';
    final paymentStatus = _booking['paymentStatus']?.toString() ?? '';
    final bookingId = widget.bookingId.length > 8
        ? '#${widget.bookingId.substring(widget.bookingId.length - 8).toUpperCase()}'
        : '#${widget.bookingId}';

    final createdAt = _booking['createdAt']?.toString() ?? '';
    String formattedDate = '';
    if (createdAt.isNotEmpty) {
      try {
        final d = DateTime.parse(createdAt);
        formattedDate =
            '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
      } catch (_) {}
    }

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: Text('Booking $bookingId'),
        backgroundColor: Colors.white,
      ),
      body: _actionLoading
          ? const LoadingView()
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status banner
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: _statusColor(_status).withOpacity(0.08),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                          color: _statusColor(_status).withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline,
                            color: _statusColor(_status), size: 20),
                        const SizedBox(width: 10),
                        Text(
                          'Status: ${_status[0].toUpperCase()}${_status.substring(1)}',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: _statusColor(_status),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Customer info
                  _sectionCard('Customer Information', [
                    _detailRow(Icons.person_outline, 'Name', customerName),
                    if (customerEmail.isNotEmpty)
                      _detailRow(Icons.email_outlined, 'Email', customerEmail),
                  ]),
                  const SizedBox(height: 12),

                  // Booking info
                  _sectionCard('Booking Details', [
                    _detailRow(Icons.confirmation_number_outlined, 'Booking ID', bookingId),
                    _detailRow(Icons.event_outlined, 'Item', itemTitle),
                    if (formattedDate.isNotEmpty)
                      _detailRow(Icons.calendar_today_outlined, 'Booked On', formattedDate),
                  ]),
                  const SizedBox(height: 12),

                  // Payment
                  _sectionCard('Payment', [
                    _detailRow(Icons.currency_rupee_rounded, 'Total Amount',
                        '₹${total.toStringAsFixed(2)}'),
                    if (paymentMethod.isNotEmpty)
                      _detailRow(Icons.payment_outlined, 'Payment Method', paymentMethod),
                    if (paymentStatus.isNotEmpty)
                      _detailRow(Icons.receipt_outlined, 'Payment Status', paymentStatus),
                  ]),
                  const SizedBox(height: 24),

                  // Action buttons
                  _buildActionButtons(),
                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }

  Widget _buildActionButtons() {
    final status = _status.toLowerCase();

    if (status == 'completed' || status == 'cancelled') {
      return const SizedBox.shrink();
    }

    return Column(
      children: [
        if (status == 'pending')
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _doAction('approve'),
              icon: const Icon(Icons.check_circle_outline, color: Colors.white),
              label: const Text('Approve Booking',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.successColor,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
        if (status == 'awaiting payment') ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.tintBlueBg,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.tintBlueFg.withOpacity(0.3)),
            ),
            child: const Text(
              'Waiting for customer to complete payment.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: AppTheme.tintBlueFg, fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ),
        ],
        if (status == 'confirmed' || status == 'accepted') ...[
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _doAction('complete'),
              icon: const Icon(Icons.done_all, color: Colors.white),
              label: const Text('Mark as Completed',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
        ],
        if (status != 'completed' && status != 'cancelled') ...[
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => _doAction('cancel'),
              icon: const Icon(Icons.cancel_outlined, color: AppTheme.errorColor),
              label: const Text('Cancel Booking',
                  style: TextStyle(color: AppTheme.errorColor, fontWeight: FontWeight.w600)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppTheme.errorColor),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _sectionCard(String title, List<Widget> rows) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.borderColor),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppTheme.textColor)),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 12),
          ...rows,
        ],
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: AppTheme.primaryColor),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        fontSize: 11,
                        color: AppTheme.subtitleColor,
                        fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                Text(value,
                    style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textColor)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
