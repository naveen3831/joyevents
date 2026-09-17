import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_theme.dart';
import '../../models/booking_model.dart';
import '../../services/booking_service.dart';
import '../../widgets/booking_card.dart';
import '../../widgets/customer_app_bar.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_view.dart';
import '../../widgets/loading_view.dart';

class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen>
    with SingleTickerProviderStateMixin {
  final BookingService _bookingService = BookingService();
  late TabController _tabController;

  List<BookingModel> _allBookings = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _fetchBookings();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchBookings() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await _bookingService.getMyBookings();
      if (mounted) {
        setState(() {
          _allBookings = list;
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

  List<BookingModel> _filterBookings(int tabIndex) {
    switch (tabIndex) {
      case 0:
        return _allBookings;
      case 1:
        return _allBookings.where((b) => b.isConfirmed || b.isPending).toList();
      case 2:
        return _allBookings.where((b) => b.isCompleted).toList();
      case 3:
        return _allBookings.where((b) => b.isCancelled).toList();
      default:
        return _allBookings;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const CustomerAppBar(title: 'My Bookings'),
      body: Column(
        children: [
          // Filter Tabs (Eventoza style - Pill Chips)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            color: Colors.white,
            child: TabBar(
              controller: _tabController,
              onTap: (_) => setState(() {}),
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              dividerColor: Colors.transparent,
              indicatorSize: TabBarIndicatorSize.tab,
              indicator: BoxDecoration(
                color: AppTheme.primaryColor,
                borderRadius: BorderRadius.circular(20),
              ),
              labelColor: Colors.white,
              unselectedLabelColor: AppTheme.subtitleColor,
              labelStyle: GoogleFonts.poppins(
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
              unselectedLabelStyle: GoogleFonts.poppins(
                fontWeight: FontWeight.w500,
                fontSize: 13,
              ),
              tabs: const [
                Tab(height: 34, text: 'All'),
                Tab(height: 34, text: 'Upcoming'),
                Tab(height: 34, text: 'Completed'),
                Tab(height: 34, text: 'Cancelled'),
              ],
            ),
          ),

          // Bookings List Area
          Expanded(
            child: RefreshIndicator(
              onRefresh: _fetchBookings,
              child: _isLoading
                  ? const LoadingView(message: 'Loading your bookings...')
                  : _errorMessage != null
                      ? ErrorView(
                          message: _errorMessage!,
                          onRetry: _fetchBookings,
                        )
                      : TabBarView(
                          controller: _tabController,
                          children: List.generate(4, (index) {
                            final filteredList = _filterBookings(index);

                            if (filteredList.isEmpty) {
                              return const EmptyState(
                                title: 'No Bookings Found',
                                message:
                                    'You have no bookings in this category.',
                                icon: Icons.confirmation_number_outlined,
                              );
                            }

                            return ListView.builder(
                              padding:
                                  const EdgeInsets.fromLTRB(16, 12, 16, 80),
                              itemCount: filteredList.length,
                              itemBuilder: (context, idx) {
                                final booking = filteredList[idx];
                                return BookingCard(
                                  booking: booking,
                                  onTap: () => context.push(
                                    '/customer/booking-details/${booking.id}',
                                    extra: booking,
                                  ),
                                );
                              },
                            );
                          }),
                        ),
            ),
          ),
        ],
      ),
    );
  }
}
