import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/app_theme.dart';
import '../../services/merchant_service.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/empty_state.dart';

class MerchantBookingsScreen extends StatefulWidget {
  const MerchantBookingsScreen({super.key});

  @override
  State<MerchantBookingsScreen> createState() => _MerchantBookingsScreenState();
}

class _MerchantBookingsScreenState extends State<MerchantBookingsScreen> {
  final _merchantService = MerchantService();

  bool _loading = true;
  String? _error;
  List<dynamic> _bookings = [];
  String _filterStatus = 'All';

  final List<String> _filters = [
    'All', 'Pending', 'Awaiting Payment', 'Confirmed', 'Accepted', 'Completed', 'Cancelled'
  ];

  @override
  void initState() {
    super.initState();
    _loadBookings();
  }

  Future<void> _loadBookings() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final bookings = await _merchantService.getAssignedBookings();
      setState(() => _bookings = bookings);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  List<dynamic> get _filtered {
    if (_filterStatus == 'All') return _bookings;
    return _bookings.where((b) {
      final status = b['status']?.toString().toLowerCase() ?? '';
      return status == _filterStatus.toLowerCase();
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Bookings'),
        backgroundColor: Colors.white,
        automaticallyImplyLeading: false,
      ),
      body: _loading
          ? const LoadingView()
          : _error != null
              ? _buildError()
              : Column(
                  children: [
                    _buildFilters(),
                    Expanded(child: _buildList()),
                  ],
                ),
    );
  }

  Widget _buildFilters() {
    return Container(
      color: Colors.white,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: _filters.map((f) {
            final isSelected = f == _filterStatus;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                label: Text(f),
                selected: isSelected,
                onSelected: (_) => setState(() => _filterStatus = f),
                selectedColor: AppTheme.primaryColor,
                checkmarkColor: Colors.white,
                labelStyle: TextStyle(
                  color: isSelected ? Colors.white : AppTheme.subtitleColor,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                  fontSize: 13,
                ),
                backgroundColor: AppTheme.inputFillColor,
                side: BorderSide(
                    color: isSelected ? AppTheme.primaryColor : AppTheme.borderColor),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildList() {
    final list = _filtered;
    if (list.isEmpty) {
      return EmptyState(
        icon: Icons.confirmation_number_outlined,
        title: _filterStatus == 'All' ? 'No Bookings Yet' : 'No ${_filterStatus} Bookings',
        message: 'Bookings from your events and services will appear here.',
      );
    }
    return RefreshIndicator(
      onRefresh: _loadBookings,
      color: AppTheme.primaryColor,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: list.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, i) => _BookingCard(
          booking: list[i],
          onRefresh: _loadBookings,
        ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: AppTheme.errorColor),
          const SizedBox(height: 12),
          Text(_error ?? 'Error', style: const TextStyle(color: AppTheme.subtitleColor)),
          const SizedBox(height: 16),
          ElevatedButton(onPressed: _loadBookings, child: const Text('Retry')),
        ],
      ),
    );
  }
}

class _BookingCard extends StatelessWidget {
  final Map<String, dynamic> booking;
  final VoidCallback onRefresh;

  const _BookingCard({required this.booking, required this.onRefresh});

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

  @override
  Widget build(BuildContext context) {
    final id = booking['_id']?.toString() ?? '';
    final customer = booking['customer'] as Map<String, dynamic>? ?? {};
    final customerName = customer['name']?.toString() ?? 'Customer';
    final itemTitle = booking['eventTitle']?.toString() ??
        booking['serviceTitle']?.toString() ??
        'Booking';
    final status = booking['status']?.toString() ?? 'pending';
    final total = (booking['totalAmount'] as num?)?.toDouble() ?? 0.0;
    final bookingDate = booking['createdAt']?.toString() ?? '';
    final bookingId = id.length > 8 ? '#${id.substring(id.length - 8).toUpperCase()}' : '#$id';

    String formattedDate = '';
    if (bookingDate.isNotEmpty) {
      try {
        final d = DateTime.parse(bookingDate);
        formattedDate = '${d.day}/${d.month}/${d.year}';
      } catch (_) {}
    }

    return GestureDetector(
      onTap: () async {
        await context.push('/merchant/booking-details/$id', extra: booking);
        onRefresh();
      },
      child: Container(
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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(bookingId,
                    style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.subtitleColor,
                        letterSpacing: 0.5)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _statusColor(status).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    status[0].toUpperCase() + status.substring(1),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: _statusColor(status),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(customerName,
                style: const TextStyle(
                    fontSize: 15, fontWeight: FontWeight.w700, color: AppTheme.textColor)),
            const SizedBox(height: 4),
            Text(itemTitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13, color: AppTheme.subtitleColor)),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (formattedDate.isNotEmpty)
                  Row(
                    children: [
                      const Icon(Icons.calendar_today_outlined,
                          size: 13, color: AppTheme.subtitleColor),
                      const SizedBox(width: 4),
                      Text(formattedDate,
                          style: const TextStyle(
                              fontSize: 12, color: AppTheme.subtitleColor)),
                    ],
                  ),
                Text('₹${total.toStringAsFixed(0)}',
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textColor)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
